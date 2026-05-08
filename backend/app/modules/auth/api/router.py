from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.auth.api.schemas import (
    AccountSettingsIn,
    AuthMeOut,
    AuthMeUpdateIn,
    AuthResponse,
    EmailBindIn,
    LoginIn,
    LogoutOut,
    PasswordChangeIn,
    PasswordRecoveryConfirmIn,
    PasswordRecoveryRequestIn,
    PasswordRecoveryRequestOut,
    PersonalQrIssueIn,
    PersonalQrIssueOut,
    QrActivateIn,
    QrIssueOut,
    RefreshTokenIn,
    RegisterIn,
    StatusOut,
)
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.permissions import ROLE_PERMISSION_TEMPLATES
from app.modules.users.models import User, UserRole
from app.shared.auth.deps import get_current_user, require_policy
from app.shared.auth.policy_models import RbacPolicyRule
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db
from app.shared.di.services import AuthServiceDep
from app.shared.security.audit import log_login_attempt
from app.shared.security.rate_limit import limiter

router = APIRouter()
AVATAR_MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024

_AUTH_ERROR_RU: dict[str, str] = {
    "Invalid credentials.": "Неверный логин или пароль.",
    "Invalid registration data.": "Некорректные данные регистрации.",
    "Login is already taken.": "Логин уже занят.",
    "Invalid recovery data.": "Некорректные данные восстановления.",
    "Recovery user not found or email missing.": "Пользователь с привязанной почтой не найден.",
    "Reset token is invalid or expired.": "Код восстановления недействителен или истёк.",
    "Could not send recovery email.": "Не удалось отправить письмо восстановления. Попробуйте позже.",
    "Invalid email.": "Некорректный адрес электронной почты.",
    "Email is already taken.": "Эта почта уже привязана к другому аккаунту.",
    "Invalid password change data.": "Некорректные данные для смены пароля.",
    "Current password is incorrect.": "Текущий пароль указан неверно.",
    "New password must be different.": "Новый пароль должен отличаться от текущего.",
    "QR target user is unavailable.": "Пользователь для QR-входа недоступен.",
    "Personal QR can be issued only for learners.": "Персональный QR можно выдать только обучающемуся.",
    "QR token is invalid or expired.": "QR-токен недействителен или истёк.",
    "User is unavailable for QR activation.": "Пользователь недоступен для активации.",
    "Refresh token is invalid or expired.": "Токен обновления недействителен или истёк.",
    "User is inactive or not found.": "Пользователь неактивен или не найден.",
}


def _localize_auth_error(detail: str) -> str:
    return _AUTH_ERROR_RU.get(detail, detail)


def _profile_avatars_dir() -> Path:
    return Path(settings.simulation_media_dir).resolve().parent / "profile_avatars"


def _avatar_url(user: User, request: Request | None) -> str | None:
    if not getattr(user, "avatar_file_path", None):
        return None
    path = f"/api/v1/auth/users/{user.id}/avatar"
    if request is None:
        return path
    return str(request.url_for("auth_user_avatar", user_id=str(user.id)))


def _avatar_file_path(user: User) -> Path | None:
    filename = getattr(user, "avatar_file_path", None)
    if not filename:
        return None
    path = (_profile_avatars_dir() / filename).resolve()
    if _profile_avatars_dir().resolve() not in path.parents:
        return None
    return path if path.is_file() else None


def _delete_existing_avatar(user: User) -> None:
    existing = _avatar_file_path(user)
    if existing is not None:
        existing.unlink(missing_ok=True)


def _to_auth_me_out(user: User, db: Session, request: Request | None = None) -> AuthMeOut:
    return AuthMeOut(
        user_id=user.id,
        role=user.role.value,
        status=user.status.value,
        display_name=user.display_name,
        email=user.email,
        avatar_key=user.avatar_key,
        avatar_url=_avatar_url(user, request),
        learning_reminders_enabled=user.learning_reminders_enabled,
        security_alerts_enabled=user.security_alerts_enabled,
        profile_visible=user.profile_visible,
        permissions=_compute_permissions_from_db(user.role, db),
    )


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


@router.post("/qr/personal", response_model=PersonalQrIssueOut)
@limiter.limit("20/minute")
def issue_personal_qr(
    request: Request,
    payload: PersonalQrIssueIn,
    service: AuthServiceDep,
    actor: CurrentActor = Depends(require_policy("auth.qr.personal.issue")),
) -> PersonalQrIssueOut:
    try:
        result = service.issue_personal_qr(
            target_user_id=payload.user_id,
            actor_user_id=actor.user_id,
        )
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return PersonalQrIssueOut(
        user_id=result.user_id,
        deep_link_url=result.deep_link_url,
        expires_at=result.expires_at,
    )


@router.post("/qr/onboarding", response_model=QrIssueOut)
@limiter.limit("20/minute")
def issue_onboarding_qr(
    request: Request,
    service: AuthServiceDep,
    actor: CurrentActor = Depends(require_policy("auth.qr.onboarding.issue")),
) -> QrIssueOut:
    try:
        result = service.issue_onboarding_qr(actor_user_id=actor.user_id)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return QrIssueOut(
        deep_link_url=result.deep_link_url,
        expires_at=result.expires_at,
    )


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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    return _to_auth_me_out(current_user, db, request)


@router.patch("/me", response_model=AuthMeOut)
def update_auth_me(
    payload: AuthMeUpdateIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    display_name = payload.display_name.strip() if payload.display_name else None
    avatar_key = payload.avatar_key.strip() if payload.avatar_key else None
    current_user.display_name = display_name or None
    current_user.avatar_key = avatar_key or None
    db.add(current_user)
    db.flush()
    return _to_auth_me_out(current_user, db, request)


@router.post("/me/avatar", response_model=AuthMeOut)
async def upload_auth_me_avatar(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in AVATAR_MEDIA_TYPES or file.content_type != AVATAR_MEDIA_TYPES[suffix]:
        raise HTTPException(status_code=422, detail="Неподдерживаемый формат аватарки.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Файл аватарки пустой.")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="Файл аватарки слишком большой.")

    avatars_dir = _profile_avatars_dir()
    avatars_dir.mkdir(parents=True, exist_ok=True)
    _delete_existing_avatar(current_user)

    stored_filename = f"{current_user.id}{suffix}"
    (avatars_dir / stored_filename).write_bytes(content)
    current_user.avatar_file_path = stored_filename
    current_user.avatar_key = None
    db.add(current_user)
    db.flush()
    return _to_auth_me_out(current_user, db, request)


@router.get("/users/{user_id}/avatar", include_in_schema=False, name="auth_user_avatar")
def get_auth_user_avatar(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Аватарка не найдена.")
    avatar_path = _avatar_file_path(user)
    if avatar_path is None:
        raise HTTPException(status_code=404, detail="Аватарка не найдена.")
    media_type = AVATAR_MEDIA_TYPES.get(avatar_path.suffix.lower(), "application/octet-stream")
    return FileResponse(path=avatar_path, media_type=media_type)


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
    return _to_auth_me_out(updated_user, db)


@router.patch("/me/password", response_model=AuthMeOut)
def change_auth_me_password(
    payload: PasswordChangeIn,
    service: AuthServiceDep,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    try:
        updated_user = service.change_password(
            current_user,
            current_password=payload.current_password,
            new_password=payload.new_password,
        )
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return _to_auth_me_out(updated_user, db)


@router.patch("/me/account-settings", response_model=AuthMeOut)
def update_auth_me_account_settings(
    payload: AccountSettingsIn,
    service: AuthServiceDep,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthMeOut:
    updated_user = service.update_account_settings(
        current_user,
        learning_reminders_enabled=payload.learning_reminders_enabled,
        security_alerts_enabled=payload.security_alerts_enabled,
        profile_visible=payload.profile_visible,
    )
    return _to_auth_me_out(updated_user, db)


@router.post("/logout", response_model=LogoutOut)
def logout(payload: RefreshTokenIn, service: AuthServiceDep) -> LogoutOut:
    try:
        service.logout(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_auth_error(exc.detail)) from exc
    return LogoutOut()
