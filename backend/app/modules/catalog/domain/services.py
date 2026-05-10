import hashlib
import json
import re
from collections import deque
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from markdownify import markdownify as _html_to_markdown
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.catalog.api.schemas import (
    BulkCourseStructureIn,
    CompetencyCreateIn,
    CourseCompetenciesUpdateIn,
    CourseCreateIn,
    CourseListQuery,
    CourseReleaseCreateIn,
    CourseUpdateIn,
    ReleaseListQuery,
    ReleaseScreenIn,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import (
    Competency,
    Course,
    CourseCompetency,
    CourseCompetencyType,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    LessonStatus,
    LessonTask,
    ReleaseStatus,
)
from app.modules.catalog.infra.repository import CatalogRepository
from app.modules.simulation.infra.models import SimulationLibraryItem


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_slug(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "-").replace("_", "-")
    while "--" in normalized:
        normalized = normalized.replace("--", "-")
    return normalized


INITIAL_COMPETENCIES = (
    ("gosuslugi", "Госуслуги", "Работа с порталом и приложением Госуслуги", "Госуслуги"),
    ("banking", "Онлайн-банкинг", "Безопасная работа с банковскими сервисами", "Финансы"),
    ("messengers", "Мессенджеры", "Общение и обмен файлами в мессенджерах", "Коммуникация"),
    ("security", "Кибербезопасность", "Пароли, мошенничество и защита данных", "Безопасность"),
)


def _normalize_competency_key(title: str) -> str:
    normalized = re.sub(r"[^a-z0-9-]+", "-", title.strip().lower())
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or f"competency-{uuid4().hex[:8]}"


def _checksum_payload(payload: dict[str, Any]) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _html_to_markdown_safe(html: str) -> str:
    if not html.strip():
        return ""
    return _html_to_markdown(html, heading_style="ATX", strip=["script", "style"]).strip()


def _normalize_quiz_questions(questions: list[Any]) -> list[dict[str, Any]]:
    """Normalize builder-produced quiz payload to the mobile client contract.

    The course-builder stores questions as
    ``{"question", "options": [{"text", "correct"}]}`` but mobile's
    ``QuizQuestion`` model expects ``{"id", "text", "options": [{"id", "text"}]}``
    plus a ``correct_option_id`` / ``correct_option_ids`` pointer. Inline
    conversion here keeps the published release shape backwards-compatible
    and prevents kotlinx-serialization errors on the device.
    """
    normalized: list[dict[str, Any]] = []
    for q_index, raw in enumerate(questions):
        if not isinstance(raw, dict):
            continue

        q_id = str(raw.get("id") or f"q_{q_index + 1}")
        q_text = str(raw.get("text") or raw.get("question") or "").strip()
        explanation = raw.get("explanation") if raw.get("explanation") else None

        options_raw = raw.get("options")
        if not isinstance(options_raw, list):
            options_raw = []

        normalized_options: list[dict[str, str]] = []
        detected_correct_ids: list[str] = []
        for o_index, option in enumerate(options_raw):
            if isinstance(option, str):
                opt_id = f"{q_id}_opt_{o_index + 1}"
                normalized_options.append({"id": opt_id, "text": option})
                continue
            if not isinstance(option, dict):
                continue
            opt_id = str(option.get("id") or f"{q_id}_opt_{o_index + 1}")
            opt_text = str(option.get("text") or "")
            normalized_options.append({"id": opt_id, "text": opt_text})
            if bool(option.get("correct")) or bool(option.get("is_correct")):
                detected_correct_ids.append(opt_id)

        q_type = str(raw.get("type") or "").lower()
        if q_type not in {"single_choice", "multiple_choice"}:
            q_type = "multiple_choice" if len(detected_correct_ids) > 1 else "single_choice"

        if q_type == "multiple_choice":
            explicit_ids = raw.get("correct_option_ids") or raw.get("correctOptionIds")
            if isinstance(explicit_ids, list) and explicit_ids:
                correct_ids = [str(x) for x in explicit_ids]
            else:
                correct_ids = detected_correct_ids
            normalized.append(
                {
                    "type": "multiple_choice",
                    "id": q_id,
                    "text": q_text,
                    "explanation": explanation,
                    "options": normalized_options,
                    "correct_option_ids": correct_ids,
                }
            )
            continue

        # single_choice
        explicit_id = raw.get("correct_option_id") or raw.get("correctOptionId")
        if explicit_id:
            correct_id = str(explicit_id)
        elif detected_correct_ids:
            correct_id = detected_correct_ids[0]
        elif normalized_options:
            correct_id = normalized_options[0]["id"]
        else:
            correct_id = ""
        normalized.append(
            {
                "type": "single_choice",
                "id": q_id,
                "text": q_text,
                "explanation": explanation,
                "options": normalized_options,
                "correct_option_id": correct_id,
            }
        )
    return normalized


def _task_to_screen_payload(task: LessonTask, lesson: CourseLesson) -> dict[str, Any]:
    body = dict(task.payload_json or {})

    if task.task_type == "theory_text":
        payload: dict[str, Any] = {
            "type": "article",
            "markdown_content": _html_to_markdown_safe(str(body.get("content", ""))),
            "assets": list(body.get("assets", [])) if isinstance(body.get("assets"), list) else [],
        }
    elif task.task_type == "cheat_sheet":
        payload = {
            "type": "cheat_sheet",
            "content": _html_to_markdown_safe(str(body.get("content", ""))),
        }
    elif task.task_type == "theory_video":
        duration = body.get("duration_sec") or body.get("duration") or 0
        try:
            duration_sec = int(duration)
        except (TypeError, ValueError):
            duration_sec = 0
        payload = {
            "type": "video",
            "video_url": str(body.get("video_url", "")),
            "duration_sec": duration_sec,
            "transcript": body.get("transcript"),
        }
    elif task.task_type == "quiz":
        questions = body.get("questions", [])
        if not isinstance(questions, list):
            questions = []
        payload = {
            "type": "quiz",
            "questions": _normalize_quiz_questions(questions),
        }
    elif task.task_type == "simulation":
        config = body.get("config") if isinstance(body.get("config"), dict) else {}
        hotspots = config.get("hotspots", []) if isinstance(config.get("hotspots"), list) else []
        payload = {
            "type": "simulation",
            "image_url": str(config.get("image_url", body.get("image_url", ""))),
            "hotspots": hotspots,
            "is_start": bool(config.get("is_start", False)),
            "is_completion": bool(config.get("is_completion", False)),
            "context_ref": config.get("context_ref"),
        }
    else:
        payload = {
            "type": "unknown",
            "raw": json.dumps(body, ensure_ascii=False),
        }

    payload["lesson_id"] = str(lesson.id)
    payload["lesson_title"] = lesson.title
    payload["task_id"] = str(task.id)
    payload["task_type"] = task.task_type
    return payload


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _expand_library_simulation(
    task: LessonTask,
    lesson: CourseLesson,
    library_item: SimulationLibraryItem,
    base_screen_key: str,
    base_order: int,
) -> list[dict[str, Any]]:
    """Flatten a multi-screen simulation library item into release screens.

    Returns a list of ``{"screen_key", "title", "order_index", "payload", "checksum"}``
    dicts with cross-screen ``target_screen_key`` hotspots preserved.
    """
    raw_payload = library_item.payload_json or {}
    library_screens = raw_payload.get("screens") or []
    if not isinstance(library_screens, list) or not library_screens:
        return []

    start_screen_id = raw_payload.get("startScreenId")

    # Reorder so the declared startScreenId comes first; mobile's player uses
    # the first simulation screen with is_start=true as the entry point.
    if start_screen_id:
        library_screens = sorted(
            library_screens,
            key=lambda s: 0 if s.get("id") == start_screen_id else 1,
        )

    library_id_to_key: dict[str, str] = {}
    for index, screen in enumerate(library_screens):
        library_id = str(screen.get("id") or f"idx_{index}")
        library_id_to_key[library_id] = f"{base_screen_key}_sim_{index}"

    results: list[dict[str, Any]] = []
    for index, screen in enumerate(library_screens):
        library_id = str(screen.get("id") or f"idx_{index}")
        screen_key = library_id_to_key[library_id]

        hotspots_raw = screen.get("hotspots") or []
        hotspots: list[dict[str, Any]] = []
        if isinstance(hotspots_raw, list):
            for hotspot in hotspots_raw:
                if not isinstance(hotspot, dict):
                    continue
                target_library_id = hotspot.get("targetScreenId")
                target_screen_key = (
                    library_id_to_key.get(str(target_library_id))
                    if target_library_id
                    else None
                )
                hotspots.append(
                    {
                        "x": _coerce_float(hotspot.get("x")),
                        "y": _coerce_float(hotspot.get("y")),
                        "width": _coerce_float(hotspot.get("width")),
                        "height": _coerce_float(hotspot.get("height")),
                        "label": str(hotspot.get("label") or ""),
                        "hint": str(hotspot.get("hint") or ""),
                        "target_screen_key": target_screen_key,
                    }
                )

        payload: dict[str, Any] = {
            "type": "simulation",
            "image_url": str(screen.get("imageUrl") or ""),
            "hotspots": hotspots,
            "is_start": library_id == start_screen_id or (index == 0 and not start_screen_id),
            "is_completion": bool(screen.get("isCompletion")),
            "context_ref": str(library_item.id),
            "lesson_id": str(lesson.id),
            "lesson_title": lesson.title,
            "task_id": str(task.id),
            "task_type": task.task_type,
        }
        title = str(screen.get("title") or screen.get("key") or task.title)
        results.append(
            {
                "screen_key": screen_key,
                "title": title,
                "order_index": base_order + index,
                "payload": payload,
            }
        )
    return results


def _build_task_release_screens(
    task: LessonTask,
    lesson: CourseLesson,
    db: Session,
    base_order: int,
) -> list[dict[str, Any]]:
    """Produce the release-screen records for a single lesson task.

    Normally a task maps to exactly one release screen. Simulation tasks that
    reference a reusable ``SimulationLibraryItem`` are expanded into one
    release screen per library screen so the mobile player can walk the
    simulation graph using ``target_screen_key`` hotspots.
    """
    base_screen_key = f"lesson_{lesson.order_index}_task_{task.order_index}"

    if task.task_type == "simulation":
        config = (task.payload_json or {}).get("config")
        library_item_id = None
        if isinstance(config, dict):
            library_item_id = config.get("library_item_id") or config.get("simulation_id")
        if library_item_id:
            try:
                library_uuid = UUID(str(library_item_id))
            except (TypeError, ValueError):
                library_uuid = None
            if library_uuid is not None:
                library_item = db.scalar(
                    select(SimulationLibraryItem).where(SimulationLibraryItem.id == library_uuid)
                )
                if library_item is not None:
                    expanded = _expand_library_simulation(
                        task=task,
                        lesson=lesson,
                        library_item=library_item,
                        base_screen_key=base_screen_key,
                        base_order=base_order,
                    )
                    if expanded:
                        return expanded

    # Fallback: single inline screen from task payload.
    payload = _task_to_screen_payload(task, lesson)
    return [
        {
            "screen_key": base_screen_key,
            "title": task.title,
            "order_index": base_order,
            "payload": payload,
        }
    ]


def _screen_payload_to_task_body(screen_payload: dict[str, Any]) -> dict[str, Any]:
    body = dict(screen_payload or {})
    for key in ("type", "lesson_id", "lesson_title", "task_id", "task_type"):
        body.pop(key, None)

    screen_type = screen_payload.get("type")
    if screen_type == "article":
        return {
            "content": str(screen_payload.get("markdown_content", "")),
            **({"assets": screen_payload["assets"]} if isinstance(screen_payload.get("assets"), list) else {}),
        }
    if screen_type == "cheat_sheet":
        return {"content": str(screen_payload.get("content", ""))}
    if screen_type == "video":
        return {
            "video_url": str(screen_payload.get("video_url", "")),
            "duration_sec": int(screen_payload.get("duration_sec", 0) or 0),
            "transcript": screen_payload.get("transcript"),
        }
    if screen_type == "simulation":
        return {
            "config": {
                "image_url": screen_payload.get("image_url"),
                "hotspots": screen_payload.get("hotspots", []),
                "is_start": screen_payload.get("is_start", False),
                "is_completion": screen_payload.get("is_completion", False),
                "context_ref": screen_payload.get("context_ref"),
            }
        }
    if screen_type == "quiz":
        return {"questions": screen_payload.get("questions", [])}
    return body


class CatalogService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CatalogRepository(db)

    def list_courses(self, query: CourseListQuery, author_id: UUID | None = None) -> list[Course]:
        return self.repo.list_courses(
            include_drafts=query.include_drafts,
            include_archived=query.include_archived,
            author_id=author_id,
        )

    def list_competencies(self) -> list[Competency]:
        self.ensure_initial_competencies()
        return self.repo.list_competencies()

    def create_competency(self, payload: CompetencyCreateIn) -> Competency:
        self.ensure_initial_competencies()
        title = payload.title.strip()
        if self.repo.get_competency_by_title(title) is not None:
            raise CatalogError("Competency title already exists.", status_code=409)

        base_key = _normalize_competency_key(title)
        key = base_key
        while self.repo.get_competency(key) is not None:
            key = f"{base_key}-{uuid4().hex[:6]}"

        return self.repo.create_competency(
            key=key,
            title=title,
            description=payload.description.strip() if payload.description else None,
            category=payload.category.strip() if payload.category else None,
        )

    def ensure_initial_competencies(self) -> None:
        for key, title, description, category in INITIAL_COMPETENCIES:
            if self.repo.get_competency(key) is None:
                self.repo.create_competency(
                    key=key,
                    title=title,
                    description=description,
                    category=category,
                )

    def set_competency_active(self, key: str, *, is_active: bool) -> Competency:
        competency = self.repo.get_competency(key)
        if competency is None:
            raise CatalogError("Competency not found.", status_code=404)
        return self.repo.update_competency_active(competency, is_active)

    def list_course_competencies(self, course_id: UUID) -> list[CourseCompetency]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        self.ensure_initial_competencies()
        return self.repo.list_course_competencies(course_id)

    def replace_course_competencies(
        self,
        course_id: UUID,
        payload: CourseCompetenciesUpdateIn,
    ) -> list[CourseCompetency]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        self.ensure_initial_competencies()

        seen_keys: set[str] = set()
        rows: list[dict[str, str]] = []
        for item in payload.items:
            if item.competency_key in seen_keys:
                raise CatalogError("Competency links must be unique per course.", status_code=422)
            competency = self.repo.get_competency(item.competency_key)
            if competency is None or not competency.is_active:
                raise CatalogError("Competency not found.", status_code=404)
            if item.course_type not in {value.value for value in CourseCompetencyType}:
                raise CatalogError("Invalid course competency type.", status_code=422)
            seen_keys.add(item.competency_key)
            rows.append(
                {
                    "competency_key": item.competency_key,
                    "course_type": item.course_type,
                }
            )

        return self.repo.replace_course_competencies(course_id=course.id, items=rows)

    def create_course(self, payload: CourseCreateIn, author_id: UUID | None = None) -> Course:
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
            author_id=author_id,
        )
        return course

    def update_course(self, course_id: UUID, payload: CourseUpdateIn) -> Course:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        return self.repo.update_course(
            course=course,
            title=payload.title,
            description=payload.description,
            status=payload.status,
        )

    def delete_course(self, course_id: UUID) -> None:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        if course.status != CourseStatus.ARCHIVED.value:
            raise CatalogError("Only archived courses can be deleted.", status_code=409)

        self.repo.delete_course(course)

    def create_release(
        self,
        course_id: UUID,
        payload: CourseReleaseCreateIn,
    ) -> tuple[CourseRelease, list[CourseReleaseScreen], Course]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        existing_release = self.repo.get_release_by_version(
            course_id=course.id, version=payload.version
        )
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

        if (
            release_status == ReleaseStatus.PUBLISHED.value
            and course.status != CourseStatus.ARCHIVED.value
        ):
            course.status = CourseStatus.ACTIVE.value

        return release, screens, course

    def get_latest_course_bundle(
        self, course_slug: str
    ) -> tuple[Course, CourseRelease, list[CourseReleaseScreen]]:
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
        simulation_screens = [
            screen for screen in screens if screen.payload.get("type") == "simulation"
        ]
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

    def list_course_lessons(
        self, course_id: UUID, include_archived: bool = False
    ) -> list[CourseLesson]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        return self.repo.list_lessons_by_course(course_id, include_archived)

    def create_course_lesson(
        self,
        course_id: UUID,
        title: str,
        description: str | None,
        status: str = LessonStatus.DRAFT.value,
    ) -> CourseLesson:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        order_index = self.repo.get_next_lesson_order_index(course_id)
        return self.repo.create_lesson(
            course_id=course_id,
            title=title.strip(),
            description=description,
            order_index=order_index,
            status=status,
        )

    def update_course_lesson(
        self,
        lesson_id: UUID,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
    ) -> CourseLesson:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        update_fields: dict[str, Any] = {}
        if title is not None:
            update_fields["title"] = title.strip()
        if description is not None:
            update_fields["description"] = description
        if status is not None:
            update_fields["status"] = status
        updated = self.repo.update_lesson(lesson_id, **update_fields)
        if updated is None:
            raise CatalogError("Failed to update lesson.", status_code=500)
        return updated

    def archive_course_lesson(self, lesson_id: UUID) -> CourseLesson:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        archived = self.repo.archive_lesson(lesson_id)
        if archived is None:
            raise CatalogError("Failed to archive lesson.", status_code=500)
        return archived

    def restore_course_lesson(self, lesson_id: UUID) -> CourseLesson:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        restored = self.repo.restore_lesson(lesson_id)
        if restored is None:
            raise CatalogError("Failed to restore lesson.", status_code=500)
        return restored

    def reorder_course_lesson(self, course_id: UUID, lesson_id: UUID, new_index: int) -> None:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        self.repo.reorder_lesson(course_id, lesson_id, new_index)

    def create_lesson_task(
        self,
        lesson_id: UUID,
        task_type: str,
        title: str,
        required: bool,
        payload: dict[str, Any],
    ) -> LessonTask:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        order_index = self.repo.get_next_task_order_index(lesson_id)
        checksum = _checksum_payload(payload)
        return self.repo.create_task(
            lesson_id=lesson_id,
            task_type=task_type,
            title=title.strip(),
            order_index=order_index,
            required=required,
            payload=payload,
            checksum=checksum,
        )

    def update_lesson_task(
        self,
        task_id: UUID,
        title: str | None = None,
        required: bool | None = None,
        payload: dict[str, Any] | None = None,
    ) -> LessonTask:
        task = self.repo.get_task_by_id(task_id)
        if task is None:
            raise CatalogError("Task not found.", status_code=404)
        update_fields: dict[str, Any] = {}
        if title is not None:
            update_fields["title"] = title.strip()
        if required is not None:
            update_fields["required"] = required
        if payload is not None:
            update_fields["payload_json"] = payload
            update_fields["checksum"] = _checksum_payload(payload)
        updated = self.repo.update_task(task_id, **update_fields)
        if updated is None:
            raise CatalogError("Failed to update task.", status_code=500)
        return updated

    def archive_lesson_task(self, task_id: UUID) -> None:
        task = self.repo.get_task_by_id(task_id)
        if task is None:
            raise CatalogError("Task not found.", status_code=404)
        self.repo.archive_task(task_id)

    def reorder_lesson_task(self, lesson_id: UUID, task_id: UUID, new_index: int) -> None:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        task = self.repo.get_task_by_id(task_id)
        if task is None:
            raise CatalogError("Task not found.", status_code=404)
        self.repo.reorder_task(lesson_id, task_id, new_index)

    def duplicate_lesson_task(self, task_id: UUID) -> LessonTask:
        task = self.repo.get_task_by_id(task_id)
        if task is None:
            raise CatalogError("Task not found.", status_code=404)
        new_order = self.repo.get_next_task_order_index(task.lesson_id)
        duplicated = self.repo.duplicate_task(task_id, new_order)
        if duplicated is None:
            raise CatalogError("Failed to duplicate task.", status_code=500)
        return duplicated

    def list_lesson_tasks(self, lesson_id: UUID) -> list[LessonTask]:
        lesson = self.repo.get_lesson_by_id(lesson_id)
        if lesson is None:
            raise CatalogError("Lesson not found.", status_code=404)
        return self.repo.list_tasks_by_lesson(lesson_id)

    def get_course_structure(self, course_id: UUID) -> dict[str, Any]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        lessons_list: list[dict[str, Any]] = []
        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            lessons_list.append(
                {
                    "id": str(lesson.id),
                    "title": lesson.title,
                    "description": lesson.description,
                    "order_index": lesson.order_index,
                    "tasks": [
                        {
                            "id": str(task.id),
                            "task_type": task.task_type,
                            "title": task.title,
                            "order_index": task.order_index,
                            "required": task.required,
                            "payload": task.payload_json,
                        }
                        for task in tasks
                    ],
                }
            )
        structure: dict[str, Any] = {
            "course_id": str(course.id),
            "course_title": course.title,
            "course_description": course.description,
            "lessons": lessons_list,
        }
        return structure

    def validate_course(self, course_id: UUID) -> dict[str, Any]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)
        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        errors: list[dict[str, Any]] = []
        warnings: list[dict[str, Any]] = []

        if not lessons:
            errors.append(
                {
                    "type": "empty_course",
                    "message": "Course has no lessons",
                }
            )

        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            if not tasks:
                errors.append(
                    {
                        "type": "empty_lesson",
                        "lesson_id": str(lesson.id),
                        "lesson_title": lesson.title,
                        "message": f"Lesson '{lesson.title}' has no tasks",
                    }
                )
            has_required = any(task.required for task in tasks)
            if not has_required:
                warnings.append(
                    {
                        "type": "no_required_tasks",
                        "lesson_id": str(lesson.id),
                        "lesson_title": lesson.title,
                        "message": f"Lesson '{lesson.title}' has no required tasks",
                    }
                )
            for task in tasks:
                errors.extend(self._validate_task_payload(task))

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
        }

    @staticmethod
    def _validate_task_payload(task: LessonTask) -> list[dict[str, Any]]:
        errors: list[dict[str, Any]] = []
        payload = task.payload_json
        task_type = task.task_type

        if task_type == "quiz":
            questions = payload.get("questions")
            if not questions or not isinstance(questions, list) or len(questions) == 0:
                errors.append(
                    {
                        "type": "invalid_quiz",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "message": f"Quiz '{task.title}' has no questions",
                    }
                )

        elif task_type == "theory_video":
            video_url = payload.get("video_url")
            if not video_url or not isinstance(video_url, str):
                errors.append(
                    {
                        "type": "invalid_video",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "message": f"Video task '{task.title}' missing video_url",
                    }
                )

        elif task_type == "theory_text":
            content = payload.get("content")
            if not content or not isinstance(content, str) or len(content.strip()) < 10:
                errors.append(
                    {
                        "type": "invalid_theory",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "message": f"Theory task '{task.title}' has insufficient content",
                    }
                )

        elif task_type == "simulation":
            config = payload.get("config")
            if not config or not isinstance(config, dict):
                errors.append(
                    {
                        "type": "invalid_simulation",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "message": f"Simulation task '{task.title}' missing config",
                    }
                )

        elif task_type == "cheat_sheet":
            content = payload.get("content")
            if not content or not isinstance(content, str) or len(content.strip()) < 10:
                errors.append(
                    {
                        "type": "invalid_cheatsheet",
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "message": f"Cheat sheet task '{task.title}' has insufficient content",
                    }
                )

        return errors

    def publish_course(
        self,
        course_id: UUID,
        version: str,
        changelog: str | None = None,
    ) -> CourseRelease:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        if course.status == CourseStatus.ARCHIVED.value:
            raise CatalogError("Cannot publish archived course.", status_code=400)

        validation = self.validate_course(course_id)
        if not validation["valid"]:
            reasons = "; ".join(error["message"] for error in validation["errors"][:3])
            suffix = "" if len(validation["errors"]) <= 3 else "; ..."
            raise CatalogError(
                f"Course validation failed: {reasons}{suffix}",
                status_code=422,
            )

        existing = self.repo.get_release_by_version(course_id=course.id, version=version)
        if existing is not None:
            raise CatalogError("Release version already exists.", status_code=409)

        release = self.repo.create_release(
            course_id=course.id,
            version=version,
            changelog=changelog,
            status=ReleaseStatus.PUBLISHED.value,
            published_at=_utcnow(),
        )

        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        order = 1
        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            for task in tasks:
                screens = _build_task_release_screens(task, lesson, self.db, base_order=order)
                for screen in screens:
                    self.repo.add_release_screen(
                        release_id=release.id,
                        screen_key=screen["screen_key"],
                        title=screen["title"],
                        order_index=screen["order_index"],
                        payload=screen["payload"],
                        checksum=_checksum_payload(screen["payload"]),
                    )
                    order = screen["order_index"] + 1

        course.status = CourseStatus.ACTIVE.value
        return release

    def submit_course_for_review(
        self,
        course_id: UUID,
        version: str,
        changelog: str | None = None,
    ) -> CourseRelease:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        if course.status == CourseStatus.ARCHIVED.value:
            raise CatalogError("Cannot publish archived course.", status_code=400)

        validation = self.validate_course(course_id)
        if not validation["valid"]:
            reasons = "; ".join(error["message"] for error in validation["errors"][:3])
            suffix = "" if len(validation["errors"]) <= 3 else "; ..."
            raise CatalogError(
                f"Course validation failed: {reasons}{suffix}",
                status_code=422,
            )

        existing = self.repo.get_release_by_version(course_id=course.id, version=version)
        if existing is not None:
            raise CatalogError("Release version already exists.", status_code=409)

        release = self.repo.create_release(
            course_id=course.id,
            version=version,
            changelog=changelog,
            status=ReleaseStatus.PENDING_REVIEW.value,
            published_at=None,
        )

        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        order = 1
        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            for task in tasks:
                screens = _build_task_release_screens(task, lesson, self.db, base_order=order)
                for screen in screens:
                    self.repo.add_release_screen(
                        release_id=release.id,
                        screen_key=screen["screen_key"],
                        title=screen["title"],
                        order_index=screen["order_index"],
                        payload=screen["payload"],
                        checksum=_checksum_payload(screen["payload"]),
                    )
                    order = screen["order_index"] + 1

        return release

    def rollback_course(
        self,
        course_id: UUID,
        release_id: UUID,
        version: str,
        changelog: str | None = None,
    ) -> CourseRelease:
        del version, changelog
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        source_release = self.repo.get_release_by_id(release_id)
        if source_release is None or source_release.course_id != course_id:
            raise CatalogError("Release not found for this course.", status_code=404)

        screens = self.repo.list_release_screens(source_release.id)
        if not screens:
            raise CatalogError("Selected release has no screens.", status_code=422)

        existing_lessons = self.repo.list_lessons_by_course(course_id, include_archived=True)
        for lesson in existing_lessons:
            self.repo.delete_lesson(lesson)

        restored_lessons: dict[str, CourseLesson] = {}
        restored_task_order: dict[str, int] = {}

        ordered_screens = sorted(screens, key=lambda item: item.order_index)
        for screen in ordered_screens:
            payload = screen.payload_json or {}
            lesson_key = str(payload.get("lesson_id") or f"screen-{screen.order_index}")
            lesson_title = str(payload.get("lesson_title") or "Восстановленный урок").strip()
            if lesson_key not in restored_lessons:
                restored_lessons[lesson_key] = self.repo.create_lesson(
                    course_id=course_id,
                    title=lesson_title or "Восстановленный урок",
                    description=None,
                    order_index=len(restored_lessons),
                    status=LessonStatus.DRAFT.value,
                )
                restored_task_order[lesson_key] = 0

            task_payload = _screen_payload_to_task_body(payload)
            task_type = str(payload.get("task_type") or "theory_text")
            task_title = screen.title.strip() if screen.title else "Восстановленный блок"

            self.repo.create_task(
                lesson_id=restored_lessons[lesson_key].id,
                task_type=task_type,
                title=task_title or "Восстановленный блок",
                order_index=restored_task_order[lesson_key],
                required=True,
                payload=task_payload,
                checksum=_checksum_payload(task_payload),
            )
            restored_task_order[lesson_key] += 1

        source_release.status = ReleaseStatus.PENDING_REVIEW.value
        source_release.published_at = None
        self.db.flush()

        course.status = CourseStatus.ACTIVE.value
        return source_release

    def update_course_structure_bulk(
        self,
        course_id: UUID,
        payload: BulkCourseStructureIn,
    ) -> dict[str, Any]:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        existing_lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        existing_lesson_map: dict[str, CourseLesson] = {
            str(lesson.id): lesson for lesson in existing_lessons
        }

        processed_lesson_ids: set[str] = {
            str(lesson_payload.id)
            for lesson_payload in payload.lessons
            if lesson_payload.id and str(lesson_payload.id) in existing_lesson_map
        }

        # Free order_index slots before reordering/creating lessons. Archived lessons still
        # participate in the DB uniqueness constraint, so they must move out of the active range.
        for lesson_id, lesson in existing_lesson_map.items():
            if lesson_id not in processed_lesson_ids:
                self.repo.archive_lesson(lesson.id)

        for lesson_payload in payload.lessons:
            lesson_id = str(lesson_payload.id) if lesson_payload.id else None

            if lesson_id and lesson_id in existing_lesson_map:
                lesson = existing_lesson_map[lesson_id]
                self.repo.update_lesson(
                    lesson_id=lesson.id,
                    title=lesson_payload.title.strip(),
                    description=lesson_payload.description,
                )
                self.repo.reorder_lesson(course_id, lesson.id, lesson_payload.order_index)
            else:
                order = (
                    lesson_payload.order_index
                    if lesson_payload.order_index is not None
                    else self.repo.get_next_lesson_order_index(course_id)
                )
                lesson = self.repo.create_lesson(
                    course_id=course_id,
                    title=lesson_payload.title.strip(),
                    description=lesson_payload.description,
                    order_index=order,
                    status=LessonStatus.DRAFT.value,
                )
                lesson_id = str(lesson.id)

            existing_tasks = self.repo.list_tasks_by_lesson(lesson.id)
            existing_task_map: dict[str, LessonTask] = {
                str(task.id): task for task in existing_tasks
            }

            processed_task_ids: set[str] = set()

            # First pass: identify which tasks to keep/update vs create
            for task_payload in lesson_payload.tasks:
                task_id = str(task_payload.id) if task_payload.id else None
                if task_id and task_id in existing_task_map:
                    processed_task_ids.add(task_id)

            # Archive removed tasks BEFORE creating new ones (avoid order_index conflicts)
            for task_id, task in existing_task_map.items():
                if task_id not in processed_task_ids:
                    self.repo.archive_task(task.id)

            # Second pass: update existing and create new tasks
            for task_payload in lesson_payload.tasks:
                task_id = str(task_payload.id) if task_payload.id else None

                if task_id and task_id in existing_task_map:
                    task = existing_task_map[task_id]
                    checksum = _checksum_payload(task_payload.payload)
                    self.repo.update_task(
                        task_id=task.id,
                        title=task_payload.title.strip(),
                        required=task_payload.required,
                        payload_json=task_payload.payload,
                        checksum=checksum,
                    )
                    self.repo.reorder_task(lesson.id, task.id, task_payload.order_index)
                else:
                    order = (
                        task_payload.order_index
                        if task_payload.order_index is not None
                        else self.repo.get_next_task_order_index(lesson.id)
                    )
                    checksum = _checksum_payload(task_payload.payload)
                    self.repo.create_task(
                        lesson_id=lesson.id,
                        task_type=task_payload.task_type,
                        title=task_payload.title.strip(),
                        order_index=order,
                        required=task_payload.required,
                        payload=task_payload.payload,
                        checksum=checksum,
                    )

        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        lessons_data: list[dict[str, Any]] = []
        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            lessons_data.append(
                {
                    "id": str(lesson.id),
                    "title": lesson.title,
                    "description": lesson.description,
                    "order_index": lesson.order_index,
                    "tasks": [
                        {
                            "id": str(task.id),
                            "task_type": task.task_type,
                            "title": task.title,
                            "order_index": task.order_index,
                            "required": task.required,
                            "payload": task.payload_json,
                        }
                        for task in tasks
                    ],
                }
            )

        return {
            "course_id": str(course.id),
            "course_title": course.title,
            "course_description": course.description,
            "status": course.status,
            "lessons": lessons_data,
        }
