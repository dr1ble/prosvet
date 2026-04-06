from fastapi import APIRouter, Depends, HTTPException

from app.modules.auth.domain.permissions import permissions_for_role
from app.modules.users.api.schemas import UserOverviewItemOut, UsersOverviewOut, UserUpdateIn
from app.modules.users.models import User
from app.shared.auth.deps import get_current_user
from app.shared.di.services import UsersServiceDep

router = APIRouter()


@router.get("/overview", response_model=UsersOverviewOut)
def users_overview(
    service: UsersServiceDep,
    current_user: User = Depends(get_current_user),
) -> UsersOverviewOut:
    permissions = permissions_for_role(current_user.role)
    if "users.manage" not in permissions and "rbac.manage" not in permissions:
        raise HTTPException(status_code=403, detail="Недостаточно прав для этой операции.")
    return service.get_overview()


@router.patch("/{user_id}", response_model=UserOverviewItemOut)
def update_user(
    user_id: str,
    payload: UserUpdateIn,
    service: UsersServiceDep,
    current_user: User = Depends(get_current_user),
) -> UserOverviewItemOut:
    permissions = permissions_for_role(current_user.role)
    if "users.manage" not in permissions and "rbac.manage" not in permissions:
        raise HTTPException(status_code=403, detail="Недостаточно прав для этой операции.")

    try:
        updated = service.update_user(
            user_id,
            actor_user_id=str(current_user.id),
            display_name=payload.display_name,
            role=payload.role,
            status=payload.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if updated is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    return updated
