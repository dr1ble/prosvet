from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

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


class CatalogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_courses(
        self,
        include_drafts: bool,
        include_archived: bool,
        author_id: UUID | None = None,
    ) -> list[Course]:
        stmt = select(Course)
        if author_id is not None:
            stmt = stmt.where(Course.author_id == author_id)
        if not include_drafts:
            stmt = stmt.where(Course.status != CourseStatus.DRAFT.value)
        if not include_archived:
            stmt = stmt.where(Course.status != CourseStatus.ARCHIVED.value)
        stmt = stmt.order_by(desc(Course.updated_at), desc(Course.created_at))
        return list(self.db.scalars(stmt).all())

    def get_course_by_id(self, course_id: UUID) -> Course | None:
        stmt = select(Course).where(Course.id == course_id)
        return self.db.scalar(stmt)

    def get_course_by_slug(self, slug: str) -> Course | None:
        stmt = select(Course).where(Course.slug == slug)
        return self.db.scalar(stmt)

    def create_course(
        self, slug: str, title: str, description: str | None, status: str,
        author_id: UUID | None = None,
    ) -> Course:
        course = Course(
            slug=slug, title=title, description=description, status=status,
            author_id=author_id,
        )
        self.db.add(course)
        self.db.flush()
        return course

    def update_course(
        self,
        course: Course,
        title: str | None,
        description: str | None,
        status: str | None,
    ) -> Course:
        if title is not None:
            course.title = title
        if description is not None:
            course.description = description
        if status is not None:
            course.status = status
        self.db.flush()
        return course

    def delete_course(self, course: Course) -> None:
        self.db.delete(course)
        self.db.flush()

    def get_release_by_version(self, course_id: UUID, version: str) -> CourseRelease | None:
        stmt = select(CourseRelease).where(
            CourseRelease.course_id == course_id,
            CourseRelease.version == version,
        )
        return self.db.scalar(stmt)

    def get_release_by_id(self, release_id: UUID) -> CourseRelease | None:
        stmt = select(CourseRelease).where(CourseRelease.id == release_id)
        return self.db.scalar(stmt)

    def create_release(
        self,
        course_id: UUID,
        version: str,
        changelog: str | None,
        status: str,
        published_at: datetime | None,
    ) -> CourseRelease:
        release = CourseRelease(
            course_id=course_id,
            version=version,
            changelog=changelog,
            status=status,
            published_at=published_at,
        )
        self.db.add(release)
        self.db.flush()
        return release

    def add_release_screen(
        self,
        release_id: UUID,
        screen_key: str,
        title: str,
        order_index: int,
        payload: dict[str, Any],
        checksum: str,
    ) -> CourseReleaseScreen:
        screen = CourseReleaseScreen(
            release_id=release_id,
            screen_key=screen_key,
            title=title,
            order_index=order_index,
            payload_json=payload,
            checksum=checksum,
        )
        self.db.add(screen)
        self.db.flush()
        return screen

    def list_release_screens(self, release_id: UUID) -> list[CourseReleaseScreen]:
        stmt = (
            select(CourseReleaseScreen)
            .where(CourseReleaseScreen.release_id == release_id)
            .order_by(CourseReleaseScreen.order_index.asc(), CourseReleaseScreen.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_latest_published_release(self, course_id: UUID) -> CourseRelease | None:
        stmt = (
            select(CourseRelease)
            .where(
                CourseRelease.course_id == course_id,
                CourseRelease.status == ReleaseStatus.PUBLISHED.value,
            )
            .order_by(desc(CourseRelease.published_at).nulls_last(), desc(CourseRelease.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_previous_release(self, course_id: UUID, exclude_id: UUID) -> CourseRelease | None:
        stmt = (
            select(CourseRelease)
            .where(
                CourseRelease.course_id == course_id,
                CourseRelease.id != exclude_id,
                CourseRelease.status.in_(
                    [ReleaseStatus.PUBLISHED.value, ReleaseStatus.PENDING_REVIEW.value]
                ),
            )
            .order_by(desc(CourseRelease.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def list_releases(
        self,
        course_id: UUID,
        release_status: str | None = None,
        version_query: str | None = None,
        limit: int = 50,
    ) -> list[tuple[CourseRelease, int]]:
        stmt = (
            select(CourseRelease, func.count(CourseReleaseScreen.id))
            .outerjoin(CourseReleaseScreen, CourseReleaseScreen.release_id == CourseRelease.id)
            .where(CourseRelease.course_id == course_id)
        )
        if release_status is not None:
            stmt = stmt.where(CourseRelease.status == release_status)
        if version_query is not None:
            stmt = stmt.where(CourseRelease.version.ilike(f"%{version_query}%"))

        stmt = stmt.group_by(CourseRelease.id).order_by(
            desc(CourseRelease.published_at).nulls_last(),
            desc(CourseRelease.created_at),
        )
        stmt = stmt.limit(limit)
        rows = self.db.execute(stmt).all()
        return [(release, int(screen_count)) for release, screen_count in rows]

    def create_lesson(
        self,
        course_id: UUID,
        title: str,
        description: str | None,
        order_index: int,
        status: str,
    ) -> CourseLesson:
        lesson = CourseLesson(
            course_id=course_id,
            title=title,
            description=description,
            order_index=order_index,
            status=status,
        )
        self.db.add(lesson)
        self.db.flush()
        return lesson

    def list_lessons_by_course(
        self,
        course_id: UUID,
        include_archived: bool = False,
    ) -> list[CourseLesson]:
        stmt = select(CourseLesson).where(CourseLesson.course_id == course_id)
        if not include_archived:
            stmt = stmt.where(CourseLesson.status != LessonStatus.ARCHIVED.value)
        stmt = stmt.order_by(CourseLesson.order_index.asc(), CourseLesson.created_at.asc())
        return list(self.db.scalars(stmt).all())

    def get_lesson_by_id(self, lesson_id: UUID) -> CourseLesson | None:
        stmt = select(CourseLesson).where(CourseLesson.id == lesson_id)
        return self.db.scalar(stmt)

    def update_lesson(self, lesson_id: UUID, **fields) -> CourseLesson | None:
        lesson = self.get_lesson_by_id(lesson_id)
        if lesson is None:
            return None
        for key, value in fields.items():
            setattr(lesson, key, value)
        self.db.flush()
        return lesson

    def archive_lesson(self, lesson_id: UUID) -> CourseLesson | None:
        return self.update_lesson(lesson_id, status=LessonStatus.ARCHIVED.value)

    def restore_lesson(self, lesson_id: UUID) -> CourseLesson | None:
        return self.update_lesson(lesson_id, status=LessonStatus.DRAFT.value)

    def delete_lesson(self, lesson: CourseLesson) -> None:
        self.db.delete(lesson)
        self.db.flush()

    def get_next_lesson_order_index(self, course_id: UUID) -> int:
        stmt = select(func.max(CourseLesson.order_index)).where(CourseLesson.course_id == course_id)
        max_index = self.db.scalar(stmt)
        return (max_index or 0) + 1

    def reorder_lesson(self, course_id: UUID, lesson_id: UUID, new_index: int) -> None:
        lessons = self.list_lessons_by_course(course_id, include_archived=False)
        current_lesson = next((lesson for lesson in lessons if lesson.id == lesson_id), None)
        if current_lesson is None:
            return
        old_index = current_lesson.order_index
        if new_index > old_index:
            for lesson in lessons:
                if old_index < lesson.order_index <= new_index:
                    lesson.order_index -= 1
            current_lesson.order_index = new_index
        elif new_index < old_index:
            for lesson in lessons:
                if new_index <= lesson.order_index < old_index:
                    lesson.order_index += 1
            current_lesson.order_index = new_index
        self.db.flush()

    def create_task(
        self,
        lesson_id: UUID,
        task_type: str,
        title: str,
        order_index: int,
        required: bool,
        payload: dict[str, Any],
        checksum: str,
    ) -> LessonTask:
        task = LessonTask(
            lesson_id=lesson_id,
            task_type=task_type,
            title=title,
            order_index=order_index,
            required=required,
            payload_json=payload,
            checksum=checksum,
        )
        self.db.add(task)
        self.db.flush()
        return task

    def list_tasks_by_lesson(
        self,
        lesson_id: UUID,
        include_archived: bool = False,
    ) -> list[LessonTask]:
        del include_archived
        stmt = select(LessonTask).where(LessonTask.lesson_id == lesson_id)
        stmt = stmt.order_by(LessonTask.order_index.asc(), LessonTask.created_at.asc())
        return list(self.db.scalars(stmt).all())

    def get_task_by_id(self, task_id: UUID) -> LessonTask | None:
        stmt = select(LessonTask).where(LessonTask.id == task_id)
        return self.db.scalar(stmt)

    def update_task(self, task_id: UUID, **fields) -> LessonTask | None:
        task = self.get_task_by_id(task_id)
        if task is None:
            return None
        for key, value in fields.items():
            setattr(task, key, value)
        self.db.flush()
        return task

    def archive_task(self, task_id: UUID) -> LessonTask | None:
        task = self.get_task_by_id(task_id)
        if task is None:
            return None
        self.db.delete(task)
        self.db.flush()
        return None

    def get_next_task_order_index(self, lesson_id: UUID) -> int:
        stmt = select(func.max(LessonTask.order_index)).where(LessonTask.lesson_id == lesson_id)
        max_index = self.db.scalar(stmt)
        return (max_index or 0) + 1

    def reorder_task(self, lesson_id: UUID, task_id: UUID, new_index: int) -> None:
        tasks = self.list_tasks_by_lesson(lesson_id, include_archived=False)
        current_task = next((t for t in tasks if t.id == task_id), None)
        if current_task is None:
            return
        old_index = current_task.order_index
        if new_index > old_index:
            for task in tasks:
                if old_index < task.order_index <= new_index:
                    task.order_index -= 1
            current_task.order_index = new_index
        elif new_index < old_index:
            for task in tasks:
                if new_index <= task.order_index < old_index:
                    task.order_index += 1
            current_task.order_index = new_index
        self.db.flush()

    def duplicate_task(self, task_id: UUID, new_order_index: int) -> LessonTask | None:
        task = self.get_task_by_id(task_id)
        if task is None:
            return None
        new_task = LessonTask(
            lesson_id=task.lesson_id,
            task_type=task.task_type,
            title=f"{task.title} (copy)",
            order_index=new_order_index,
            required=task.required,
            payload_json=task.payload_json.copy(),
            checksum=task.checksum,
        )
        self.db.add(new_task)
        self.db.flush()
        return new_task
