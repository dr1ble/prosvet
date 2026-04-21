from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.groups.api.schemas import (
    GroupAssignmentCreateIn,
    GroupAssignmentUpdateIn,
    GroupCreateIn,
    GroupMemberOut,
    GroupMembersUpdateIn,
    GroupUpdateIn,
    GroupUserOptionOut,
)
from app.modules.groups.domain.errors import GroupsError
from app.modules.groups.infra.models import GroupStatus, LearningGroup
from app.modules.groups.infra.repository import GroupsRepository
from app.modules.users.models import UserStatus
from app.shared.security.hashing import stable_hash
from app.shared.security.tokens import generate_token


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class GroupQrIssueResult:
    group_id: UUID
    group_name: str
    deep_link_url: str
    expires_at: datetime


@dataclass(frozen=True)
class GroupQrResolveResult:
    group_id: UUID
    group_name: str
    course_slug: str


class GroupsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = GroupsRepository(db)

    def list_groups(self) -> list[LearningGroup]:
        return self.repo.list_groups(include_archived=True)

    def create_group(self, payload: GroupCreateIn) -> LearningGroup:
        existing = self.repo.get_group_by_name(payload.name)
        if existing is not None:
            raise GroupsError("Group with this name already exists.", status_code=409)
        return self.repo.create_group(
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )

    def update_group(self, group_id: UUID, payload: GroupUpdateIn) -> LearningGroup:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)

        if payload.name is not None and payload.name.lower() != group.name.lower():
            existing = self.repo.get_group_by_name(payload.name)
            if existing is not None:
                raise GroupsError("Group with this name already exists.", status_code=409)

        return self.repo.update_group(
            group=group,
            name=payload.name,
            description=payload.description,
            status=payload.status,
        )

    def archive_group(self, group_id: UUID) -> LearningGroup:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)
        return self.repo.update_group(
            group=group, name=None, description=None, status=GroupStatus.ARCHIVED.value
        )

    def restore_group(self, group_id: UUID) -> LearningGroup:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)
        return self.repo.update_group(
            group=group, name=None, description=None, status=GroupStatus.ACTIVE.value
        )

    def list_group_members(self, group_id: UUID) -> list[GroupMemberOut]:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)

        memberships = self.repo.list_group_memberships(group_id)
        users = self.repo.list_users_by_ids(item.user_id for item in memberships)
        users_map = {user.id: user for user in users}

        result: list[GroupMemberOut] = []
        for membership in memberships:
            user = users_map.get(membership.user_id)
            if user is None:
                continue
            result.append(
                GroupMemberOut(
                    user_id=user.id,
                    login=user.login,
                    display_name=user.display_name,
                    role=user.role.value,
                    status=user.status.value,
                    joined_at=membership.joined_at,
                )
            )
        return result

    def list_users_for_membership(self) -> list[GroupUserOptionOut]:
        users = self.repo.list_users(include_inactive=False)
        return [
            GroupUserOptionOut(
                user_id=user.id,
                login=user.login,
                display_name=user.display_name,
                role=user.role.value,
                status=user.status.value,
            )
            for user in users
        ]

    def replace_group_members(
        self, group_id: UUID, payload: GroupMembersUpdateIn
    ) -> list[GroupMemberOut]:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)

        user_ids = set(payload.user_ids)
        users = self.repo.list_users_by_ids(user_ids)
        active_user_ids = {user.id for user in users if user.status == UserStatus.ACTIVE}
        missing = user_ids - active_user_ids
        if missing:
            raise GroupsError("Some users were not found or are not active.", status_code=422)

        self.repo.replace_group_members(group_id=group_id, user_ids=active_user_ids)
        return self.list_group_members(group_id)

    def list_group_assignments(self, group_id: UUID):
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)
        return self.repo.list_group_assignments(group_id)

    def _validate_active_user_ids(self, user_ids: set[UUID]) -> set[UUID]:
        users = self.repo.list_users_by_ids(user_ids)
        active_user_ids = {user.id for user in users if user.status == UserStatus.ACTIVE}
        missing = user_ids - active_user_ids
        if missing:
            raise GroupsError(
                "Some target users were not found or are not active.", status_code=422
            )
        return active_user_ids

    def create_group_assignment(
        self,
        group_id: UUID,
        actor_user_id: UUID,
        payload: GroupAssignmentCreateIn,
    ):
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)
        if group.status != GroupStatus.ACTIVE.value:
            raise GroupsError("Assignment is allowed only for active groups.", status_code=409)

        course = self.repo.get_course_by_id(payload.course_id)
        if course is None:
            raise GroupsError("Course not found.", status_code=404)
        if not self.repo.is_course_assignable(course):
            raise GroupsError("Archived course cannot be assigned.", status_code=409)

        assignment = self.repo.create_group_assignment(
            group_id=group_id,
            course_id=payload.course_id,
            created_by_user_id=actor_user_id,
            start_policy=payload.start_policy,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            status=payload.status,
        )
        target_user_ids = self._validate_active_user_ids(set(payload.target_user_ids))
        self.repo.replace_assignment_target_users(assignment.id, target_user_ids)
        return assignment

    def update_group_assignment(
        self,
        group_id: UUID,
        assignment_id: UUID,
        payload: GroupAssignmentUpdateIn,
    ):
        assignment = self.repo.get_group_assignment_by_id(
            group_id=group_id, assignment_id=assignment_id
        )
        if assignment is None:
            raise GroupsError("Assignment not found.", status_code=404)

        updated = self.repo.update_group_assignment(
            assignment=assignment,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at,
            status=payload.status,
        )
        if payload.target_user_ids is not None:
            target_user_ids = self._validate_active_user_ids(set(payload.target_user_ids))
            self.repo.replace_assignment_target_users(assignment.id, target_user_ids)
        return updated

    def create_group_qr_link(self, group_id: UUID, actor_user_id: UUID) -> GroupQrIssueResult:
        group = self.repo.get_group_by_id(group_id)
        if group is None:
            raise GroupsError("Group not found.", status_code=404)
        if group.status != GroupStatus.ACTIVE.value:
            raise GroupsError("QR is available only for active groups.", status_code=409)

        token = generate_token(24)
        now = _utcnow()
        expires_at = now + timedelta(hours=max(1, settings.qr_ttl_hours))
        self.repo.delete_group_join_qr_tokens(group_id=group_id)
        self.repo.create_group_join_qr_token(
            group_id=group_id,
            created_by_user_id=actor_user_id,
            token_hash=stable_hash(token, settings.security_pepper),
            expires_at=expires_at,
        )

        return GroupQrIssueResult(
            group_id=group.id,
            group_name=group.name,
            deep_link_url=f"digitaledu://group/join/{token}",
            expires_at=expires_at,
        )

    def resolve_group_qr_link(self, token: str, actor_user_id: UUID) -> GroupQrResolveResult:
        now = _utcnow()
        qr_token = self.repo.get_active_group_join_qr_token(
            token_hash=stable_hash(token, settings.security_pepper),
            now=now,
        )
        if qr_token is None:
            raise GroupsError("QR token is invalid or expired.", status_code=404)

        group = self.repo.get_group_by_id(qr_token.group_id)
        if group is None or group.status != GroupStatus.ACTIVE.value:
            raise GroupsError("Group is unavailable.", status_code=404)

        assignments = self.repo.list_group_assignments(group.id)
        eligible: list[GroupQrResolveResult] = []
        for assignment in assignments:
            if assignment.status not in {"active", "scheduled"}:
                continue
            if assignment.starts_at is not None and assignment.starts_at > now:
                continue
            if assignment.ends_at is not None and assignment.ends_at <= now:
                continue

            target_user_ids = set(self.repo.list_assignment_target_user_ids(assignment.id))
            if target_user_ids and actor_user_id not in target_user_ids:
                continue

            course = self.repo.get_course_by_id(assignment.course_id)
            if course is None:
                continue
            if not self.repo.is_course_assignable(course):
                continue

            eligible.append(
                GroupQrResolveResult(
                    group_id=group.id,
                    group_name=group.name,
                    course_slug=course.slug,
                )
            )

        if not eligible:
            raise GroupsError("No active assignment is available for this group.", status_code=404)

        if len(eligible) > 1:
            raise GroupsError(
                "More than one assignment is available. Open a specific assignment manually.",
                status_code=409,
            )

        resolved = eligible[0]
        self.repo.add_group_member_if_missing(group_id=group.id, user_id=actor_user_id)

        return GroupQrResolveResult(
            group_id=resolved.group_id,
            group_name=resolved.group_name,
            course_slug=resolved.course_slug,
        )
