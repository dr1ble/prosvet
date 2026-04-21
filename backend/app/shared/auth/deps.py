from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.auth.policies import POLICY_ROLE_MAP
from app.shared.auth.policy_models import RbacPolicyRule
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db
from app.shared.security.tokens import TokenError, parse_access_token

_bearer = HTTPBearer(auto_error=False)


def _auth_error(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _resolve_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None,
    db: Session,
) -> User:
    if credentials is None:
        raise _auth_error("Требуется токен авторизации.")
    if credentials.scheme.lower() != "bearer":
        raise _auth_error("Неподдерживаемая схема авторизации.")

    try:
        claims = parse_access_token(credentials.credentials, secret=settings.access_token_secret)
    except TokenError as exc:
        raise _auth_error("Токен доступа недействителен или истёк.") from exc

    stmt = select(User).where(User.id == claims.user_id)
    user = db.scalar(stmt)
    if user is None or user.status != UserStatus.ACTIVE:
        raise _auth_error("Пользователь неактивен или не найден.")

    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    return _resolve_authenticated_user(credentials=credentials, db=db)


def get_current_actor(
    user: User = Depends(get_current_user),
) -> CurrentActor:
    return CurrentActor(user_id=user.id, role=user.role)


def require_roles(*allowed_roles: UserRole) -> Callable[..., CurrentActor]:
    allowed = {role.value for role in allowed_roles}

    def _dependency(actor: CurrentActor = Depends(get_current_actor)) -> CurrentActor:
        if actor.role.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для этой операции.",
            )
        return actor

    return _dependency


def require_policy(policy_key: str) -> Callable[..., CurrentActor]:
    def _dependency(
        actor: CurrentActor = Depends(get_current_actor),
        db: Session = Depends(get_db),
    ) -> CurrentActor:
        db_roles: set[UserRole] = set()
        try:
            rows = db.scalars(
                select(RbacPolicyRule.role).where(
                    RbacPolicyRule.policy_key == policy_key,
                    RbacPolicyRule.enabled.is_(True),
                )
            ).all()
            for role in rows:
                try:
                    db_roles.add(UserRole(role))
                except ValueError:
                    continue
        except SQLAlchemyError:
            db_roles = set()

        allowed_roles = db_roles or POLICY_ROLE_MAP.get(policy_key, set())
        if not allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Политика '{policy_key}' не настроена.",
            )

        if actor.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для этой операции.",
            )

        return actor

    return _dependency
