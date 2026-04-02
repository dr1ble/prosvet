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
from app.modules.progress.infra.models import LessonProgress, LessonProgressStatus
from app.modules.users.models import User


@dataclass(frozen=True)
class AssignmentTarget:
    assignment: GroupCourseAssignment
    user_ids: set[UUID]


class ProgressRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_assignments(self, group_id: UUID | None, course_id: UUID | None) -> list[GroupCourseAssignment]:
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

    def get_assignment_targets(self, assignments: list[GroupCourseAssignment]) -> list[AssignmentTarget]:
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
        rows = self.db.execute(stmt).all()
        return {(course_id, user_id): int(count) for course_id, user_id, count in rows}

    def upsert_lesson_progress(self, user_id: UUID, lesson_id: UUID, status: str) -> LessonProgress:
        stmt = select(LessonProgress).where(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id == lesson_id,
        )
        item = self.db.scalar(stmt)
        completed_at = datetime.now(timezone.utc) if status == LessonProgressStatus.COMPLETED.value else None
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
