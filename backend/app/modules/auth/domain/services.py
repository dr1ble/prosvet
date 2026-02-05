import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.auth.api.schemas import AuthResponse
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.infra.repository import AuthRepository
from app.shared.security.hashing import stable_hash
from app.shared.security.tokens import generate_token


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_phone(phone: str) -> str:
    return "".join(char for char in phone if char.isdigit())


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    def request_otp(self, phone: str) -> str:
        now = _utcnow()
        phone_hash = stable_hash(_normalize_phone(phone), settings.security_pepper)
        latest = self.repo.get_latest_challenge(phone_hash)

        if latest and latest.blocked_until and latest.blocked_until > now:
            raise AuthError("OTP temporarily blocked. Try again later.", status_code=429)

        otp_code = _generate_otp_code()
        challenge = self.repo.create_challenge(
            phone_hash=phone_hash,
            code_hash=stable_hash(otp_code, settings.security_pepper),
            expires_at=now + timedelta(minutes=settings.otp_ttl_minutes),
        )

        # TODO: send otp_code via SMS provider integration.
        self.db.commit()
        return str(challenge.id)

    def verify_otp(self, phone: str, code: str) -> AuthResponse:
        now = _utcnow()
        phone_hash = stable_hash(_normalize_phone(phone), settings.security_pepper)
        latest = self.repo.get_latest_challenge(phone_hash)

        if latest is None:
            raise AuthError("OTP challenge not found.", status_code=401)

        if latest.blocked_until and latest.blocked_until > now:
            raise AuthError("OTP temporarily blocked. Try again later.", status_code=429)

        if latest.expires_at <= now:
            self.repo.mark_challenge_expired(latest)
            self.db.commit()
            raise AuthError("OTP challenge expired.", status_code=401)

        code_hash = stable_hash(code, settings.security_pepper)
        if code_hash != latest.code_hash:
            next_attempt = latest.attempts + 1
            blocked_until = None
            if next_attempt >= settings.otp_max_attempts:
                blocked_until = now + timedelta(minutes=settings.otp_block_minutes)
            self.repo.register_failed_attempt(latest, blocked_until=blocked_until)
            self.db.commit()

            if blocked_until is not None:
                raise AuthError("Too many attempts. OTP flow is temporarily blocked.", status_code=429)
            raise AuthError("Invalid OTP code.", status_code=401)

        self.repo.mark_challenge_verified(latest, now)
        user = self.repo.get_user_by_phone_hash(phone_hash)
        if user is None:
            user = self.repo.create_user(phone_hash=phone_hash)

        access_token = generate_token(24)
        refresh_token = generate_token(32)
        self.repo.create_session(
            user_id=user.id,
            refresh_token_hash=stable_hash(refresh_token, settings.security_pepper),
            expires_at=now + timedelta(days=settings.refresh_session_days),
        )
        self.db.commit()

        return AuthResponse(access_token=access_token, refresh_token=refresh_token)

    def activate_qr(self, token: str) -> AuthResponse:
        now = _utcnow()
        token_hash = stable_hash(token, settings.security_pepper)
        qr_token = self.repo.get_active_qr_token(token_hash, now)

        if qr_token is None:
            raise AuthError("QR token is invalid or expired.", status_code=401)

        self.repo.mark_qr_used(qr_token, now)

        # For now, create a user for one-time QR flow if not pre-bound.
        if qr_token.issued_by_user_id is None:
            user = self.repo.create_user(phone_hash=stable_hash(f"qr:{qr_token.id}", settings.security_pepper))
            user_id = user.id
        else:
            user_id = qr_token.issued_by_user_id

        access_token = generate_token(24)
        refresh_token = generate_token(32)
        self.repo.create_session(
            user_id=user_id,
            refresh_token_hash=stable_hash(refresh_token, settings.security_pepper),
            expires_at=now + timedelta(days=settings.refresh_session_days),
        )
        self.db.commit()

        return AuthResponse(access_token=access_token, refresh_token=refresh_token)
