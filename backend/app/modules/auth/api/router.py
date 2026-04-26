from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.modules.auth.api.schemas import (
    AuthMeOut,
    AuthMeUpdateIn,
    AuthResponse,
    EmailBindIn,
    LoginIn,
    LogoutOut,
    PasswordRecoveryConfirmIn,
    PasswordRecoveryRequestIn,
    PasswordRecoveryRequestOut,
    QrActivateIn,
    RefreshTokenIn,
    RegisterIn,
    StatusOut,
)
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.permissions import ROLE_PERMISSION_TEMPLATES
from app.modules.users.models import User, UserRole
from app.shared.auth.deps import get_current_user
from app.shared.auth.policy_models import RbacPolicyRule
from app.shared.db.deps import get_db
from app.shared.di.services import AuthServiceDep
from app.shared.security.audit import log_login_attempt
from app.shared.security.rate_limit import limiter

router = APIRouter()

_AUTH_ERROR_RU: dict[str, str] = {
    "Invalid credentials.": "Неверный логин или пароль.",
    "Invalid registration data.": "Некорректные данные регистрации.",
    "Login is already taken.": "Логин уже занят.",
    "Invalid recovery data.": "Некорректные данные восстановления.",
    "Reset token is invalid or expired.": "Код восстановления недействителен или истёк.",
    "Could not send recovery email.": "Не удалось отправить письмо восстановления. Попробуйте позже.",
    "Invalid email.": "Некорректный адрес электронной почты.",
    "Email is already taken.": "Эта почта уже привязана к другому аккаунту.",
    "QR token is invalid or expired.": "QR-токен недействителен или истёк.",
    "User is unavailable for QR activation.": "Пользователь недоступен для активации.",
    "Refresh token is invalid or expired.": "Токен обновления недействителен или истёк.",
    "User is inactive or not found.": "Пользователь неактивен или не найден.",
}


def _localize_auth_error(detail: str) -> str:
    return _AUTH_ERROR_RU.get(detail, detail)


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
        log_login_attempt(
            login=payload.login, success=True, user_id=str(response.user_id), ip_address=ip
        )
        return response
    except AuthError as exc:
        log_login_attempt(login=payload.login, success=False, ip_address=ip)
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    except ProgrammingError as exc:
        log_login_attempt(login=payload.login, success=False, ip_address=ip)
        raise HTTPException(
            status_code=503,
            detail=(
                "Схема базы данных не инициализирована. "
                "Запустите ./run (или cd backend && python3 -m alembic upgrade head)."
            ),
        ) from exc


@router.post("/register", response_model=AuthResponse)
@limiter.limit("10/minute")
def register(payload: RegisterIn, request: Request, service: AuthServiceDep) -> AuthResponse:
    try:
        return service.register(
            full_name=payload.full_name,
            login=payload.login,
            password=payload.password,
        )
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc


@router.post("/password-recovery/request", response_model=PasswordRecoveryRequestOut)
@limiter.limit("5/minute")
def request_password_recovery(
    payload: PasswordRecoveryRequestIn,
    request: Request,
    service: AuthServiceDep,
) -> PasswordRecoveryRequestOut:
    try:
        return service.request_password_recovery(payload.login_or_email)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc


@router.post("/password-recovery/confirm", response_model=StatusOut)
@limiter.limit("10/minute")
def confirm_password_recovery(
    payload: PasswordRecoveryConfirmIn,
    request: Request,
    service: AuthServiceDep,
) -> StatusOut:
    try:
        service.confirm_password_recovery(payload.reset_token, payload.new_password)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return StatusOut(status="password_reset")


@router.post("/qr/activate", response_model=AuthResponse)
@limiter.limit("10/minute")
def activate_qr(request: Request, payload: QrActivateIn, service: AuthServiceDep) -> AuthResponse:
    try:
        return service.activate_qr(payload.token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc


@router.post("/refresh", response_model=AuthResponse)
@limiter.limit("20/minute")
def refresh_session(
    request: Request, payload: RefreshTokenIn, service: AuthServiceDep
) -> AuthResponse:
    try:
        return service.refresh_session(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc


def _compute_permissions_from_db(role: UserRole, db: Session) -> list[str]:
    try:
        rows = db.scalars(
            select(RbacPolicyRule.policy_key).where(
                RbacPolicyRule.role == role.value,
                RbacPolicyRule.enabled.is_(True),
            )
        ).all()
        if rows:
            return sorted(set(rows))
    except SQLAlchemyError:
        pass
    return list(ROLE_PERMISSION_TEMPLATES.get(role, []))


@router.get("/me", response_model=AuthMeOut)
def auth_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    return AuthMeOut(
        user_id=current_user.id,
        role=current_user.role.value,
        status=current_user.status.value,
        display_name=current_user.display_name,
        email=current_user.email,
        permissions=_compute_permissions_from_db(current_user.role, db),
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
        email=current_user.email,
        permissions=_compute_permissions_from_db(current_user.role, db),
    )


@router.patch("/me/email", response_model=AuthMeOut)
def bind_auth_me_email(
    payload: EmailBindIn,
    service: AuthServiceDep,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    try:
        updated_user = service.bind_email(current_user, payload.email)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return AuthMeOut(
        user_id=updated_user.id,
        role=updated_user.role.value,
        status=updated_user.status.value,
        display_name=updated_user.display_name,
        email=updated_user.email,
        permissions=_compute_permissions_from_db(updated_user.role, db),
    )


@router.post("/logout", response_model=LogoutOut)
def logout(payload: RefreshTokenIn, service: AuthServiceDep) -> LogoutOut:
    try:
        service.logout(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return LogoutOut()
