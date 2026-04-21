from collections import Counter
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.auth.domain.permissions import permissions_for_role
from app.modules.users.api.schemas import UserOverviewItemOut, UserRoleSummaryOut, UsersOverviewOut
from app.modules.users.infra.repository import UsersRepository
from app.modules.users.models import UserRole, UserStatus
from app.shared.security.repository import AdminAuditLogRepository


class UsersService:
    def __init__(self, db: Session) -> None:
        self.repository = UsersRepository(db)
        self.audit_repository = AdminAuditLogRepository(db)

    def get_overview(self) -> UsersOverviewOut:
        users = self.repository.list_users()
        role_counts = Counter(user.role.value for user in users)

        return UsersOverviewOut(
            users=[
                UserOverviewItemOut(
                    user_id=str(user.id),
                    login=user.login,
                    display_name=user.display_name,
                    role=user.role.value,
                    status=user.status.value,
                    permissions=permissions_for_role(user.role),
                )
                for user in users
            ],
            role_summary=[
                UserRoleSummaryOut(
                    role=role,
                    count=count,
                    permissions=permissions_for_role(
                        next(user.role for user in users if user.role.value == role)
                    ),
                )
                for role, count in sorted(role_counts.items())
            ],
        )

    def update_user(
        self,
        user_id: str,
        *,
        actor_user_id: str,
        display_name: str | None,
        role: str | None,
        status: str | None,
    ) -> UserOverviewItemOut | None:
        actor_uuid = UUID(actor_user_id)
        user = self.repository.get_user(user_id)
        if user is None:
            return None

        if str(user.id) == actor_user_id:
            if role is not None and role != user.role.value:
                raise ValueError("You cannot change your own role.")
            if status is not None and status != user.status.value:
                raise ValueError("You cannot change your own status.")

        previous_display_name = user.display_name
        previous_role = user.role.value
        previous_status = user.status.value

        user.display_name = display_name.strip() if display_name else None
        if role is not None:
            user.role = UserRole(role)
        if status is not None:
            user.status = UserStatus(status)

        self.repository.db.add(user)
        self.repository.db.flush()

        changes: dict[str, dict[str, str | None]] = {}
        if previous_display_name != user.display_name:
            changes["display_name"] = {"from": previous_display_name, "to": user.display_name}
        if previous_role != user.role.value:
            changes["role"] = {"from": previous_role, "to": user.role.value}
        if previous_status != user.status.value:
            changes["status"] = {"from": previous_status, "to": user.status.value}

        if changes:
            self.audit_repository.append(
                actor_user_id=actor_uuid,
                action_key="users.user.update",
                entity_type="user",
                entity_id=str(user.id),
                details={"changes": changes},
            )

        return UserOverviewItemOut(
            user_id=str(user.id),
            login=user.login,
            display_name=user.display_name,
            role=user.role.value,
            status=user.status.value,
            permissions=permissions_for_role(user.role),
        )
