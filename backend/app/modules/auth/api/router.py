from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.modules.auth.api.schemas import (
    AuthMeOut,
    AuthResponse,
    LoginIn,
    LogoutOut,
    OtpRequestIn,
    OtpRequestOut,
    OtpVerifyIn,
    QrActivateIn,
    RefreshTokenIn,
)
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.permissions import permissions_for_role
from app.modules.auth.domain.services import AuthService
from app.modules.users.models import User
from app.shared.auth.deps import get_current_user
from app.shared.db.deps import get_db
from app.shared.security.audit import log_login_attempt

router = APIRouter()


def get_client_ip(request: Request) -> str | None:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/otp/request", response_model=OtpRequestOut)
def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)) -> OtpRequestOut:
    service = AuthService(db)
    try:
        challenge_id, dev_code = service.request_otp(payload.phone)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return OtpRequestOut(challenge_id=challenge_id, status="otp_sent", dev_code=dev_code)


@router.post("/otp/verify", response_model=AuthResponse)
def verify_otp(payload: OtpVerifyIn, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    try:
        return service.verify_otp(payload.phone, payload.code)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    ip = get_client_ip(request)
    try:
        response = service.login(login=payload.login, password=payload.password)
        log_login_attempt(login=payload.login, success=True, user_id=str(response.user_id), ip_address=ip)
        return response
    except AuthError as exc:
        log_login_attempt(login=payload.login, success=False, ip_address=ip)
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/qr/activate", response_model=AuthResponse)
def activate_qr(payload: QrActivateIn, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    try:
        return service.activate_qr(payload.token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/refresh", response_model=AuthResponse)
def refresh_session(payload: RefreshTokenIn, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
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


@router.post("/logout", response_model=LogoutOut)
def logout(payload: RefreshTokenIn, db: Session = Depends(get_db)) -> LogoutOut:
    service = AuthService(db)
    try:
        service.logout(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return LogoutOut()
