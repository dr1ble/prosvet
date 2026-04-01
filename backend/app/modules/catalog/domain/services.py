import hashlib
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.catalog.api.schemas import (
    BulkCourseStructureIn,
    CourseCreateIn,
    CourseListQuery,
    CourseReleaseCreateIn,
    CourseUpdateIn,
    ReleaseListQuery,
    ReleaseScreenIn,
)
from app.modules.catalog.domain.errors import CatalogError
from app.modules.catalog.infra.models import (
    Course,
    CourseLesson,
    CourseRelease,
    CourseReleaseScreen,
    CourseStatus,
    LessonStatus,
    LessonTask,
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
        return course

    def update_course(self, course_id: UUID, payload: CourseUpdateIn) -> Course:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        return self.repo.update_course(
            course=course,
            title=payload.title,
            description=payload.description,
        )

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
            raise CatalogError(
                f"Course validation failed: {len(validation['errors'])} errors.",
                status_code=422,
            )

        existing = self.repo.get_release_by_version(course_id=course.id, version=version)
        if existing is not None:
            raise CatalogError("Release version already exists.", status_code=409)

        now = _utcnow()
        release = self.repo.create_release(
            course_id=course.id,
            version=version,
            changelog=changelog,
            status=ReleaseStatus.PUBLISHED.value,
            published_at=now,
        )

        lessons = self.repo.list_lessons_by_course(course_id, include_archived=False)
        order = 1
        for lesson in lessons:
            tasks = self.repo.list_tasks_by_lesson(lesson.id)
            for task in tasks:
                screen_key = f"lesson_{lesson.order_index}_task_{task.order_index}"
                self.repo.add_release_screen(
                    release_id=release.id,
                    screen_key=screen_key,
                    title=task.title,
                    order_index=order,
                    payload={
                        "lesson_id": str(lesson.id),
                        "lesson_title": lesson.title,
                        "task_id": str(task.id),
                        "task_type": task.task_type,
                        "content": task.payload_json,
                    },
                    checksum=_checksum_payload(task.payload_json),
                )
                order += 1

        course.status = CourseStatus.ACTIVE.value
        return release

    def rollback_course(
        self,
        course_id: UUID,
        release_id: UUID,
        version: str,
        changelog: str | None = None,
    ) -> CourseRelease:
        course = self.repo.get_course_by_id(course_id)
        if course is None:
            raise CatalogError("Course not found.", status_code=404)

        source_release = self.repo.get_release_by_id(release_id)
        if source_release is None or source_release.course_id != course_id:
            raise CatalogError("Release not found for this course.", status_code=404)

        existing = self.repo.get_release_by_version(course_id=course.id, version=version)
        if existing is not None:
            raise CatalogError("Release version already exists.", status_code=409)

        screens = self.repo.list_release_screens(source_release.id)
        if not screens:
            raise CatalogError("Selected release has no screens.", status_code=422)

        now = _utcnow()
        release = self.repo.create_release(
            course_id=course.id,
            version=version,
            changelog=changelog or f"Rollback to release {source_release.version}",
            status=ReleaseStatus.PUBLISHED.value,
            published_at=now,
        )

        for screen in screens:
            self.repo.add_release_screen(
                release_id=release.id,
                screen_key=screen.screen_key,
                title=screen.title,
                order_index=screen.order_index,
                payload=screen.payload_json,
                checksum=screen.checksum,
            )

        course.status = CourseStatus.ACTIVE.value
        return release

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

        processed_lesson_ids: set[str] = set()

        for lesson_payload in payload.lessons:
            lesson_id = str(lesson_payload.id) if lesson_payload.id else None

            if lesson_id and lesson_id in existing_lesson_map:
                lesson = existing_lesson_map[lesson_id]
                processed_lesson_ids.add(lesson_id)
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
                processed_lesson_ids.add(lesson_id)

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

        for lesson_id, lesson in existing_lesson_map.items():
            if lesson_id not in processed_lesson_ids:
                self.repo.archive_lesson(lesson.id)

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
            "status": course.status,
            "lessons": lessons_data,
        }
