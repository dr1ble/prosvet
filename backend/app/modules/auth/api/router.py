from fastapi import APIRouter
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.api.schemas import AuthResponse, OtpRequestIn, OtpRequestOut, OtpVerifyIn, QrActivateIn
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.domain.services import AuthService
from app.shared.db.deps import get_db

router = APIRouter()


@router.post("/otp/request", response_model=OtpRequestOut)
def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)) -> OtpRequestOut:
    service = AuthService(db)
    try:
        challenge_id = service.request_otp(payload.phone)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return OtpRequestOut(challenge_id=challenge_id, status="otp_sent")


@router.post("/otp/verify", response_model=AuthResponse)
def verify_otp(payload: OtpVerifyIn, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    try:
        return service.verify_otp(payload.phone, payload.code)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("/qr/activate", response_model=AuthResponse)
def activate_qr(payload: QrActivateIn, db: Session = Depends(get_db)) -> AuthResponse:
    service = AuthService(db)
    try:
        return service.activate_qr(payload.token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
