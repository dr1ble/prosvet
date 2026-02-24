import hashlib
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.catalog.api.schemas import (
    CourseCreateIn,
    CourseListQuery,
    CourseReleaseCreateIn,
    ReleaseListQuery,
    ReleaseScreenIn,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import (
    Course,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    ReleaseStatus,
)
from app.modules.catalog.infra.repository import CatalogRepository


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_slug(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "-").replace("_", "-")
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized


def _checksum_payload(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CatalogRepository(db)

    def list_courses(self, query: CourseListQuery) -> list[Course]:
        return self.repo.list_courses(
            include_drafts=query.include_drafts,
            include_archived=query.include_archived,
        )

    def create_course(self, payload: CourseCreateIn) -> Course:
        slug = _normalize_slug(payload.slug)
        if not slug:
            raise CatalogError("Course slug is empty after normalization.", status_code=422)

        existing = self.repo.get_course_by_slug(slug)
        if existing is not None:
            raise CatalogError("Course slug already exists.", status_code=409)

        course = self.repo.create_course(
            slug=slug,
            title=payload.title.strip(),
            description=payload.description,
            status=payload.status,
        )
        self.db.commit()
        return course

    def create_release(
        self,
        course_id: UUID,
        payload: CourseReleaseCreateIn,
    ) -> tuple[CourseRelease, list[CourseReleaseScreen], Course]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        existing_release = self.repo.get_release_by_version(course_id=course.id, version=payload.version)
        if existing_release is not None:
            raise CatalogError("Release with this version already exists.", status_code=409)

        self._validate_screens(payload.screens)

        now = _utcnow()
        release_status = payload.status
        published_at = now if release_status == ReleaseStatus.PUBLISHED.value else None
        release = self.repo.create_release(
            course_id=course.id,
            version=payload.version,
            changelog=payload.changelog,
            status=release_status,
            published_at=published_at,
        )

        screens: list[CourseReleaseScreen] = []
        for screen in sorted(payload.screens, key=lambda item: item.order_index):
            db_screen = self.repo.add_release_screen(
                release_id=release.id,
                screen_key=screen.screen_key,
                title=screen.title,
                order_index=screen.order_index,
                payload=screen.payload,
                checksum=_checksum_payload(screen.payload),
            )
            screens.append(db_screen)

        if release_status == ReleaseStatus.PUBLISHED.value and course.status != CourseStatus.ARCHIVED.value:
            course.status = CourseStatus.ACTIVE.value

        self.db.commit()
        return release, screens, course

    def get_latest_course_bundle(self, course_slug: str) -> tuple[Course, CourseRelease, list[CourseReleaseScreen]]:
        slug = _normalize_slug(course_slug)
        course = self.repo.get_course_by_slug(slug)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        release = self.repo.get_latest_published_release(course.id)
        if release is None:
            raise CatalogError("Published release not found for this course.", status_code=404)

        screens = self.repo.list_release_screens(release.id)
        return course, release, screens

    def list_course_releases(
        self,
        course_id: UUID,
        query: ReleaseListQuery,
    ) -> list[tuple[CourseRelease, int]]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        return self.repo.list_releases(
            course_id=course.id,
            release_status=query.status,
            version_query=query.version_query,
            limit=query.limit,
        )

    @staticmethod
    def _validate_screens(screens: list[ReleaseScreenIn]) -> None:
        keys = [screen.screen_key for screen in screens]
        orders = [screen.order_index for screen in screens]
        if len(keys) != len(set(keys)):
            raise CatalogError("screen_key values must be unique per release.", status_code=422)
        if len(orders) != len(set(orders)):
            raise CatalogError("order_index values must be unique per release.", status_code=422)

        known_screen_keys = set(keys)
        simulation_screens = [screen for screen in screens if screen.payload.get("type") == "simulation"]
        if not simulation_screens:
            return

        adjacency: dict[str, set[str]] = {}
        start_screen_keys: list[str] = []
        completion_screen_keys: set[str] = set()

        for screen in simulation_screens:
            is_start, is_completion, targets = CatalogService._validate_simulation_payload(
                screen,
                known_screen_keys,
            )
            adjacency[screen.screen_key] = targets
            if is_start:
                start_screen_keys.append(screen.screen_key)
            if is_completion:
                completion_screen_keys.add(screen.screen_key)

        if len(start_screen_keys) != 1:
            raise CatalogError(
                "Simulation release must contain exactly one start screen (payload.is_start=true).",
                status_code=422,
            )

        if not completion_screen_keys:
            raise CatalogError(
                "Simulation release must contain at least one completion screen (payload.is_completion=true).",
                status_code=422,
            )

        start_key = start_screen_keys[0]
        reachable = CatalogService._collect_reachable_screens(adjacency, start_key)
        if not completion_screen_keys.intersection(reachable):
            raise CatalogError(
                "Simulation release does not have a reachable completion screen from the start.",
                status_code=422,
            )

    @staticmethod
    def _collect_reachable_screens(
        adjacency: dict[str, set[str]],
        start_key: str,
    ) -> set[str]:
        visited: set[str] = set()
        queue: deque[str] = deque([start_key])

        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            for target in adjacency.get(current, set()):
                if target not in visited:
                    queue.append(target)

        return visited

    @staticmethod
    def _validate_simulation_payload(
        screen: ReleaseScreenIn,
        known_screen_keys: set[str],
    ) -> tuple[bool, bool, set[str]]:
        is_start = screen.payload.get("is_start", False)
        if not isinstance(is_start, bool):
            raise CatalogError(
                f"Simulation screen '{screen.screen_key}' has invalid 'is_start' flag.",
                status_code=422,
            )

        is_completion = screen.payload.get("is_completion", False)
        if not isinstance(is_completion, bool):
            raise CatalogError(
                f"Simulation screen '{screen.screen_key}' has invalid 'is_completion' flag.",
                status_code=422,
            )

        hotspots = screen.payload.get("hotspots")
        if not isinstance(hotspots, list):
            raise CatalogError(
                f"Simulation screen '{screen.screen_key}' must include 'hotspots' array.",
                status_code=422,
            )

        targets: set[str] = set()
        for hotspot_index, hotspot in enumerate(hotspots):
            if not isinstance(hotspot, dict):
                raise CatalogError(
                    f"Simulation screen '{screen.screen_key}' has invalid hotspot at index {hotspot_index + 1}.",
                    status_code=422,
                )
            target = CatalogService._validate_simulation_hotspot(
                screen_key=screen.screen_key,
                hotspot=hotspot,
                hotspot_index=hotspot_index,
                known_screen_keys=known_screen_keys,
            )
            if target:
                targets.add(target)

        return is_start, is_completion, targets

    @staticmethod
    def _validate_simulation_hotspot(
        screen_key: str,
        hotspot: dict[str, Any],
        hotspot_index: int,
        known_screen_keys: set[str],
    ) -> str | None:
        coordinates = {
            "x": hotspot.get("x"),
            "y": hotspot.get("y"),
            "width": hotspot.get("width"),
            "height": hotspot.get("height"),
        }

        for field, value in coordinates.items():
            if not _is_number(value):
                raise CatalogError(
                    f"Simulation hotspot #{hotspot_index + 1} in screen '{screen_key}' has non-numeric field '{field}'.",
                    status_code=422,
                )

        x = float(coordinates["x"])  # type: ignore[arg-type]
        y = float(coordinates["y"])  # type: ignore[arg-type]
        width = float(coordinates["width"])  # type: ignore[arg-type]
        height = float(coordinates["height"])  # type: ignore[arg-type]

        if x < 0 or y < 0 or width <= 0 or height <= 0 or x + width > 100 or y + height > 100:
            raise CatalogError(
                f"Simulation hotspot #{hotspot_index + 1} in screen '{screen_key}' is out of bounds.",
                status_code=422,
            )

        target_screen_key = hotspot.get("target_screen_key")
        if target_screen_key is None:
            return None

        if not isinstance(target_screen_key, str):
            raise CatalogError(
                f"Simulation hotspot #{hotspot_index + 1} in screen '{screen_key}' has invalid target_screen_key.",
                status_code=422,
            )

        if target_screen_key not in known_screen_keys:
            raise CatalogError(
                f"Simulation hotspot #{hotspot_index + 1} in screen '{screen_key}' points to unknown target '{target_screen_key}'.",
                status_code=422,
            )

        return target_screen_key
