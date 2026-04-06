from collections.abc import Iterable
from datetime import datetime
from uuid import UUID

from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import Course, CourseStatus
from app.modules.groups.infra.models import (
    GroupCourseAssignment,
    GroupCourseAssignmentTargetUser,
    GroupJoinQrToken,
    GroupMembership,
    LearningGroup,
)
from app.modules.users.models import User, UserStatus


class GroupsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_groups(self, include_archived: bool = True) -> list[LearningGroup]:
        stmt = select(LearningGroup)
        if not include_archived:
            stmt = stmt.where(LearningGroup.status != "archived")
        stmt = stmt.order_by(desc(LearningGroup.updated_at), desc(LearningGroup.created_at))
        return list(self.db.scalars(stmt).all())

    def get_group_by_id(self, group_id: UUID) -> LearningGroup | None:
        stmt = select(LearningGroup).where(LearningGroup.id == group_id)
        return self.db.scalar(stmt)

    def get_group_by_name(self, name: str) -> LearningGroup | None:
        stmt = select(LearningGroup).where(func.lower(LearningGroup.name) == name.lower())
        return self.db.scalar(stmt)

    def create_group_join_qr_token(
        self,
        group_id: UUID,
        created_by_user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> GroupJoinQrToken:
        token = GroupJoinQrToken(
            group_id=group_id,
            created_by_user_id=created_by_user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        self.db.flush()
        return token

    def delete_group_join_qr_tokens(self, group_id: UUID) -> None:
        self.db.execute(
            delete(GroupJoinQrToken).where(GroupJoinQrToken.group_id == group_id)
        )
        self.db.flush()

    def get_active_group_join_qr_token(
        self,
        token_hash: str,
        now: datetime,
    ) -> GroupJoinQrToken | None:
        stmt = select(GroupJoinQrToken).where(
            GroupJoinQrToken.token_hash == token_hash,
            GroupJoinQrToken.expires_at > now,
        )
        return self.db.scalar(stmt)

    def create_group(self, name: str, description: str | None, status: str) -> LearningGroup:
        group = LearningGroup(name=name, description=description, status=status)
        self.db.add(group)
        self.db.flush()
        return group

    def update_group(
        self,
        group: LearningGroup,
        name: str | None,
        description: str | None,
        status: str | None,
    ) -> LearningGroup:
        if name is not None:
            group.name = name
        if description is not None:
            group.description = description
        if status is not None:
            group.status = status
        self.db.flush()
        return group

    def list_group_memberships(self, group_id: UUID) -> list[GroupMembership]:
        stmt = (
            select(GroupMembership)
            .where(GroupMembership.group_id == group_id)
            .order_by(GroupMembership.joined_at.asc())
        )
        return list(self.db.scalars(stmt).all())

    def is_user_group_member(self, group_id: UUID, user_id: UUID) -> bool:
        stmt = (
            select(GroupMembership.id)
            .where(
                GroupMembership.group_id == group_id,
                GroupMembership.user_id == user_id,
            )
            .limit(1)
        )
        return self.db.scalar(stmt) is not None

    def add_group_member_if_missing(self, group_id: UUID, user_id: UUID) -> None:
        if self.is_user_group_member(group_id=group_id, user_id=user_id):
            return

        self.db.add(GroupMembership(group_id=group_id, user_id=user_id))
        self.db.flush()

    def list_users_by_ids(self, user_ids: Iterable[UUID]) -> list[User]:
        ids = list(user_ids)
        if not ids:
            return []
        stmt = select(User).where(User.id.in_(ids))
        return list(self.db.scalars(stmt).all())

    def list_users(self, include_inactive: bool = False) -> list[User]:
        stmt = select(User)
        if not include_inactive:
            stmt = stmt.where(User.status == UserStatus.ACTIVE)
        stmt = stmt.order_by(User.display_name.asc().nulls_last(), User.login.asc().nulls_last())
        return list(self.db.scalars(stmt).all())

    def replace_group_members(self, group_id: UUID, user_ids: set[UUID]) -> None:
        existing = self.list_group_memberships(group_id)
        existing_ids = {item.user_id for item in existing}

        to_remove = existing_ids - user_ids
        to_add = user_ids - existing_ids

        if to_remove:
            self.db.execute(
                delete(GroupMembership).where(
                    GroupMembership.group_id == group_id,
                    GroupMembership.user_id.in_(to_remove),
                )
            )

        for user_id in sorted(to_add):
            self.db.add(GroupMembership(group_id=group_id, user_id=user_id))

        self.db.flush()

    def list_group_assignments(self, group_id: UUID) -> list[GroupCourseAssignment]:
        stmt = (
            select(GroupCourseAssignment)
            .where(GroupCourseAssignment.group_id == group_id)
            .order_by(desc(GroupCourseAssignment.created_at))
        )
        return list(self.db.scalars(stmt).all())

    def get_group_assignment_by_id(
        self,
        group_id: UUID,
        assignment_id: UUID,
    ) -> GroupCourseAssignment | None:
        stmt = select(GroupCourseAssignment).where(
            GroupCourseAssignment.group_id == group_id,
            GroupCourseAssignment.id == assignment_id,
        )
        return self.db.scalar(stmt)

    def create_group_assignment(
        self,
        group_id: UUID,
        course_id: UUID,
        created_by_user_id: UUID,
        start_policy: str,
        starts_at: datetime | None,
        ends_at: datetime | None,
        status: str,
    ) -> GroupCourseAssignment:
        assignment = GroupCourseAssignment(
            group_id=group_id,
            course_id=course_id,
            created_by_user_id=created_by_user_id,
            start_policy=start_policy,
            starts_at=starts_at,
            ends_at=ends_at,
            status=status,
        )
        self.db.add(assignment)
        self.db.flush()
        return assignment

    def update_group_assignment(
        self,
        assignment: GroupCourseAssignment,
        starts_at: datetime | None,
        ends_at: datetime | None,
        status: str | None,
    ) -> GroupCourseAssignment:
        assignment.starts_at = starts_at
        assignment.ends_at = ends_at
        if status is not None:
            assignment.status = status
        self.db.flush()
        return assignment

    def list_assignment_target_user_ids(self, assignment_id: UUID) -> list[UUID]:
        stmt = (
            select(GroupCourseAssignmentTargetUser.user_id)
            .where(GroupCourseAssignmentTargetUser.assignment_id == assignment_id)
            .order_by(GroupCourseAssignmentTargetUser.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())

    def replace_assignment_target_users(self, assignment_id: UUID, user_ids: set[UUID]) -> None:
        existing_ids = set(self.list_assignment_target_user_ids(assignment_id))
        to_remove = existing_ids - user_ids
        to_add = user_ids - existing_ids

        if to_remove:
            self.db.execute(
                delete(GroupCourseAssignmentTargetUser).where(
                    GroupCourseAssignmentTargetUser.assignment_id == assignment_id,
                    GroupCourseAssignmentTargetUser.user_id.in_(to_remove),
                )
            )

        for user_id in sorted(to_add):
            self.db.add(
                GroupCourseAssignmentTargetUser(
                    assignment_id=assignment_id,
                    user_id=user_id,
                )
            )

        self.db.flush()

    def get_course_by_id(self, course_id: UUID) -> Course | None:
        stmt = select(Course).where(Course.id == course_id)
        return self.db.scalar(stmt)

    @staticmethod
    def is_course_assignable(course: Course) -> bool:
        return course.status != CourseStatus.ARCHIVED.value
