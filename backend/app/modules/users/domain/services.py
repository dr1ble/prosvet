from collections import Counter

from sqlalchemy.orm import Session

from app.modules.auth.domain.permissions import permissions_for_role
from app.modules.users.api.schemas import UserOverviewItemOut, UserRoleSummaryOut, UsersOverviewOut
from app.modules.users.infra.repository import UsersRepository
from app.modules.users.models import UserRole, UserStatus


class UsersService:
    def __init__(self, db: Session) -> None:
        self.repository = UsersRepository(db)

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
        user = self.repository.get_user(user_id)
        if user is None:
            return None

        if str(user.id) == actor_user_id:
            if role is not None and role != user.role.value:
                raise ValueError("You cannot change your own role.")
            if status is not None and status != user.status.value:
                raise ValueError("You cannot change your own status.")

        user.display_name = display_name.strip() if display_name else None
        if role is not None:
            user.role = UserRole(role)
        if status is not None:
            user.status = UserStatus(status)

        self.repository.db.add(user)
        self.repository.db.flush()

        return UserOverviewItemOut(
            user_id=str(user.id),
            login=user.login,
            display_name=user.display_name,
            role=user.role.value,
            status=user.status.value,
            permissions=permissions_for_role(user.role),
        )
