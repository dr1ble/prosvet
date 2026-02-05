import hashlib
import json
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
