from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import Course, CourseLesson, LessonStatus
from app.modules.groups.infra.models import (
    GroupCourseAssignment,
    GroupCourseAssignmentTargetUser,
    GroupMembership,
    LearningGroup,
)
from app.modules.progress.infra.models import (
    LessonGlossaryTerm,
    LessonProgress,
    LessonProgressStatus,
    UserGlossaryTerm,
    UserLessonNote,
)
from app.modules.users.models import User


@dataclass(frozen=True)
class AssignmentTarget:
    assignment: GroupCourseAssignment
    user_ids: set[UUID]


@dataclass(frozen=True)
class UserGlossaryTermRow:
    id: UUID
    lesson_id: UUID
    course_id: UUID
    course_title: str
    term: str
    definition: str
    example: str | None
    is_bookmarked: bool
    unlocked_at: datetime


@dataclass(frozen=True)
class UserLessonNoteRow:
    id: UUID
    lesson_id: UUID
    course_id: UUID
    course_title: str
    lesson_title: str
    content: str
    created_at: datetime
    updated_at: datetime


class ProgressRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_assignments(
        self, group_id: UUID | None, course_id: UUID | None
    ) -> list[GroupCourseAssignment]:
        stmt = select(GroupCourseAssignment)
        if group_id is not None:
            stmt = stmt.where(GroupCourseAssignment.group_id == group_id)
        if course_id is not None:
            stmt = stmt.where(GroupCourseAssignment.course_id == course_id)
        stmt = stmt.order_by(GroupCourseAssignment.created_at.desc())
        return list(self.db.scalars(stmt).all())

    def get_groups_map(self, group_ids: set[UUID]) -> dict[UUID, LearningGroup]:
        if not group_ids:
            return {}
        stmt = select(LearningGroup).where(LearningGroup.id.in_(group_ids))
        groups = list(self.db.scalars(stmt).all())
        return {group.id: group for group in groups}

    def get_courses_map(self, course_ids: set[UUID]) -> dict[UUID, Course]:
        if not course_ids:
            return {}
        stmt = select(Course).where(Course.id.in_(course_ids))
        courses = list(self.db.scalars(stmt).all())
        return {course.id: course for course in courses}

    def get_users_map(self, user_ids: set[UUID]) -> dict[UUID, User]:
        if not user_ids:
            return {}
        stmt = select(User).where(User.id.in_(user_ids))
        users = list(self.db.scalars(stmt).all())
        return {user.id: user for user in users}

    def get_assignment_targets(
        self, assignments: list[GroupCourseAssignment]
    ) -> list[AssignmentTarget]:
        if not assignments:
            return []

        assignment_ids = {assignment.id for assignment in assignments}
        group_ids = {assignment.group_id for assignment in assignments}

        members_stmt = select(GroupMembership.group_id, GroupMembership.user_id).where(
            GroupMembership.group_id.in_(group_ids)
        )
        members_by_group: dict[UUID, set[UUID]] = defaultdict(set)
        for group_id, user_id in self.db.execute(members_stmt).all():
            members_by_group[group_id].add(user_id)

        target_stmt = select(
            GroupCourseAssignmentTargetUser.assignment_id,
            GroupCourseAssignmentTargetUser.user_id,
        ).where(GroupCourseAssignmentTargetUser.assignment_id.in_(assignment_ids))
        extra_by_assignment: dict[UUID, set[UUID]] = defaultdict(set)
        for assignment_id, user_id in self.db.execute(target_stmt).all():
            extra_by_assignment[assignment_id].add(user_id)

        result: list[AssignmentTarget] = []
        for assignment in assignments:
            targets = set(members_by_group.get(assignment.group_id, set()))
            targets.update(extra_by_assignment.get(assignment.id, set()))
            result.append(AssignmentTarget(assignment=assignment, user_ids=targets))
        return result

    def get_course_lessons_count(self, course_ids: set[UUID]) -> dict[UUID, int]:
        if not course_ids:
            return {}
        stmt = (
            select(CourseLesson.course_id, func.count(CourseLesson.id))
            .where(
                CourseLesson.course_id.in_(course_ids),
                CourseLesson.status != LessonStatus.ARCHIVED.value,
            )
            .group_by(CourseLesson.course_id)
        )
        rows = self.db.execute(stmt).all()
        return {course_id: int(count) for course_id, count in rows}

    def get_completed_lessons_count(
        self,
        course_ids: set[UUID],
        user_ids: set[UUID],
        completed_from: datetime | None = None,
        completed_to: datetime | None = None,
    ) -> dict[tuple[UUID, UUID], int]:
        if not course_ids or not user_ids:
            return {}
        stmt = (
            select(CourseLesson.course_id, LessonProgress.user_id, func.count(LessonProgress.id))
            .join(CourseLesson, CourseLesson.id == LessonProgress.lesson_id)
            .where(
                CourseLesson.course_id.in_(course_ids),
                LessonProgress.user_id.in_(user_ids),
                LessonProgress.status == LessonProgressStatus.COMPLETED.value,
            )
            .group_by(CourseLesson.course_id, LessonProgress.user_id)
        )
        if completed_from is not None:
            stmt = stmt.where(LessonProgress.completed_at >= completed_from)
        if completed_to is not None:
            stmt = stmt.where(LessonProgress.completed_at <= completed_to)
        rows = self.db.execute(stmt).all()
        return {(course_id, user_id): int(count) for course_id, user_id, count in rows}

    def upsert_lesson_progress(self, user_id: UUID, lesson_id: UUID, status: str) -> LessonProgress:
        stmt = select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
        item = self.db.scalar(stmt)
        completed_at = (
            datetime.now(timezone.utc) if status == LessonProgressStatus.COMPLETED.value else None
        )
        if item is None:
            item = LessonProgress(
                user_id=user_id,
                lesson_id=lesson_id,
                status=status,
                completed_at=completed_at,
            )
            self.db.add(item)
        else:
            item.status = status
            item.completed_at = completed_at
        self.db.flush()
        return item

    def unlock_glossary_terms(self, user_id: UUID, lesson_id: UUID) -> None:
        term_ids_stmt = select(LessonGlossaryTerm.id).where(LessonGlossaryTerm.lesson_id == lesson_id)
        term_ids = [row[0] for row in self.db.execute(term_ids_stmt).all()]
        if not term_ids:
            return

        existing_stmt = select(UserGlossaryTerm.term_id).where(
            UserGlossaryTerm.user_id == user_id,
            UserGlossaryTerm.term_id.in_(term_ids),
        )
        existing_ids = {row[0] for row in self.db.execute(existing_stmt).all()}

        for term_id in term_ids:
            if term_id not in existing_ids:
                self.db.add(UserGlossaryTerm(user_id=user_id, term_id=term_id))
        self.db.flush()

    def list_user_glossary_terms(self, user_id: UUID) -> list[UserGlossaryTermRow]:
        stmt = (
            select(
                LessonGlossaryTerm.id,
                LessonGlossaryTerm.lesson_id,
                CourseLesson.course_id,
                Course.title,
                LessonGlossaryTerm.term,
                LessonGlossaryTerm.definition,
                LessonGlossaryTerm.example,
                UserGlossaryTerm.is_bookmarked,
                UserGlossaryTerm.unlocked_at,
            )
            .join(UserGlossaryTerm, UserGlossaryTerm.term_id == LessonGlossaryTerm.id)
            .join(CourseLesson, CourseLesson.id == LessonGlossaryTerm.lesson_id)
            .join(Course, Course.id == CourseLesson.course_id)
            .where(UserGlossaryTerm.user_id == user_id)
            .order_by(LessonGlossaryTerm.term.asc(), LessonGlossaryTerm.order_index.asc())
        )
        return [
            UserGlossaryTermRow(
                id=term_id,
                lesson_id=lesson_id,
                course_id=course_id,
                course_title=course_title,
                term=term,
                definition=definition,
                example=example,
                is_bookmarked=is_bookmarked,
                unlocked_at=unlocked_at,
            )
            for (
                term_id,
                lesson_id,
                course_id,
                course_title,
                term,
                definition,
                example,
                is_bookmarked,
                unlocked_at,
            ) in self.db.execute(stmt).all()
        ]

    def set_glossary_term_bookmark(
        self,
        user_id: UUID,
        term_id: UUID,
        is_bookmarked: bool,
    ) -> UserGlossaryTerm | None:
        stmt = select(UserGlossaryTerm).where(
            UserGlossaryTerm.user_id == user_id,
            UserGlossaryTerm.term_id == term_id,
        )
        item = self.db.scalar(stmt)
        if item is None:
            return None
        item.is_bookmarked = is_bookmarked
        self.db.flush()
        return item

    def create_user_note(self, user_id: UUID, lesson_id: UUID, content: str) -> UserLessonNote | None:
        lesson = self.db.scalar(select(CourseLesson).where(CourseLesson.id == lesson_id))
        if lesson is None:
            return None
        item = UserLessonNote(user_id=user_id, lesson_id=lesson_id, content=content)
        self.db.add(item)
        self.db.flush()
        return item

    def list_user_notes(self, user_id: UUID) -> list[UserLessonNoteRow]:
        stmt = (
            select(
                UserLessonNote.id,
                UserLessonNote.lesson_id,
                CourseLesson.course_id,
                Course.title,
                CourseLesson.title,
                UserLessonNote.content,
                UserLessonNote.created_at,
                UserLessonNote.updated_at,
            )
            .join(CourseLesson, CourseLesson.id == UserLessonNote.lesson_id)
            .join(Course, Course.id == CourseLesson.course_id)
            .where(UserLessonNote.user_id == user_id)
            .order_by(UserLessonNote.updated_at.desc())
        )
        return [
            UserLessonNoteRow(
                id=note_id,
                lesson_id=lesson_id,
                course_id=course_id,
                course_title=course_title,
                lesson_title=lesson_title,
                content=content,
                created_at=created_at,
                updated_at=updated_at,
            )
            for (
                note_id,
                lesson_id,
                course_id,
                course_title,
                lesson_title,
                content,
                created_at,
                updated_at,
            ) in self.db.execute(stmt).all()
        ]

    def get_user_note_row(self, user_id: UUID, note_id: UUID) -> UserLessonNoteRow | None:
        rows = [row for row in self.list_user_notes(user_id=user_id) if row.id == note_id]
        return rows[0] if rows else None

    def delete_user_note(self, user_id: UUID, note_id: UUID) -> bool:
        item = self.db.scalar(
            select(UserLessonNote).where(
                UserLessonNote.user_id == user_id,
                UserLessonNote.id == note_id,
            )
        )
        if item is None:
            return False
        self.db.delete(item)
        self.db.flush()
        return True

    def get_courses_with_progress_for_user(self, user_id: UUID) -> set[UUID]:
        stmt = (
            select(CourseLesson.course_id)
            .join(LessonProgress, LessonProgress.lesson_id == CourseLesson.id)
            .where(LessonProgress.user_id == user_id)
            .distinct()
        )
        return {row[0] for row in self.db.execute(stmt).all()}
