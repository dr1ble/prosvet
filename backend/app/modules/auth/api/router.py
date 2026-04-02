from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.modules.auth.api.schemas import (
    AuthMeOut,
    AuthMeUpdateIn,
    AuthResponse,
    LoginIn,
    LogoutOut,
    QrActivateIn,
    RefreshTokenIn,
)
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.permissions import permissions_for_role
from app.modules.users.models import User
from app.shared.auth.deps import get_current_user
from app.shared.db.deps import get_db
from app.shared.di.services import AuthServiceDep
from app.shared.security.audit import log_login_attempt
from app.shared.security.rate_limit import limiter

router = APIRouter()


def get_client_ip(request: Request) -> str | None:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(payload: LoginIn, request: Request, service: AuthServiceDep) -> AuthResponse:
    ip = get_client_ip(request)
    try:
        response = service.login(login=payload.login, password=payload.password)
        log_login_attempt(login=payload.login, success=True, user_id=str(response.user_id), ip_address=ip)
        return response
    except AuthError as exc:
        log_login_attempt(login=payload.login, success=False, ip_address=ip)
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except ProgrammingError as exc:
        log_login_attempt(login=payload.login, success=False, ip_address=ip)
        raise HTTPException(
            status_code=503,
            detail=(
                "Database schema is not initialized. "
                "Run ./run (or cd backend && python3 -m alembic upgrade head)."
            ),
        ) from exc



@router.post("/qr/activate", response_model=AuthResponse)
@limiter.limit("10/minute")
def activate_qr(request: Request, payload: QrActivateIn, service: AuthServiceDep) -> AuthResponse:
    try:
        return service.activate_qr(payload.token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("20/minute")
def refresh_session(request: Request, payload: RefreshTokenIn, service: AuthServiceDep) -> AuthResponse:
    try:
        return service.refresh_session(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/me", response_model=AuthMeOut)
def auth_me(current_user: User = Depends(get_current_user)) -> AuthMeOut:
    return AuthMeOut(
        user_id=current_user.id,
        role=current_user.role.value,
        status=current_user.status.value,
        display_name=current_user.display_name,
        permissions=permissions_for_role(current_user.role),
    )


@router.patch("/me", response_model=AuthMeOut)
def update_auth_me(
    payload: AuthMeUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    display_name = payload.display_name.strip() if payload.display_name else None
    current_user.display_name = display_name or None
    db.add(current_user)
    db.flush()
    return AuthMeOut(
        user_id=current_user.id,
        role=current_user.role.value,
        status=current_user.status.value,
        display_name=current_user.display_name,
        permissions=permissions_for_role(current_user.role),
    )


@router.post("/logout", response_model=LogoutOut)
def logout(payload: RefreshTokenIn, service: AuthServiceDep) -> LogoutOut:
    try:
        service.logout(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return LogoutOut()
