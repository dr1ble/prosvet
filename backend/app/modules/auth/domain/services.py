import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.auth.api.schemas import AuthResponse
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.infra.repository import AuthRepository
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.security.hashing import stable_hash
from app.shared.security.passwords import hash_password, verify_password
from app.shared.security.tokens import generate_token, issue_access_token


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_phone(phone: str) -> str:
    return "".join(char for char in phone if char.isdigit())


def _normalize_login(login: str) -> str:
    return login.strip().lower()


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


def _parse_admin_phones(raw: str) -> set[str]:
    phones: set[str] = set()
    for chunk in raw.split(","):
        normalized = _normalize_phone(chunk)
        if normalized:
            phones.add(normalized)
    return phones


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    def request_otp(self, phone: str) -> tuple[str, str | None]:
        now = _utcnow()
        normalized_phone = _normalize_phone(phone)
        phone_hash = stable_hash(normalized_phone, settings.security_pepper)
        latest = self.repo.get_latest_challenge(phone_hash)

        if latest and latest.blocked_until and latest.blocked_until > now:
            raise AuthError("OTP temporarily blocked. Try again later.", status_code=429)

        otp_code = _generate_otp_code()
        challenge = self.repo.create_challenge(
            phone_hash=phone_hash,
            code_hash=stable_hash(otp_code, settings.security_pepper),
            expires_at=now + timedelta(minutes=settings.otp_ttl_minutes),
        )

        # SMS provider integration will deliver otp_code to user phone.
        self.db.commit()
        dev_code = otp_code if settings.debug_return_otp_code else None
        return str(challenge.id), dev_code

    def login(self, login: str, password: str) -> AuthResponse:
        now = _utcnow()
        normalized_login = _normalize_login(login)
        if len(normalized_login) < 3:
            raise AuthError("Invalid credentials.", status_code=401)
        if len(password) < 8:
            raise AuthError("Invalid credentials.", status_code=401)

        user = self.repo.get_user_by_login(normalized_login)
        if user is None:
            user = self._bootstrap_admin_if_needed(normalized_login, password)
            if user is None:
                raise AuthError("Invalid credentials.", status_code=401)
        else:
            if user.status != UserStatus.ACTIVE:
                raise AuthError("Invalid credentials.", status_code=401)
            if not user.password_hash or not verify_password(password, user.password_hash):
                raise AuthError("Invalid credentials.", status_code=401)

        auth_response = self._issue_session_tokens(user_id=user.id, role=user.role.value, now=now)
        self.db.commit()
        return auth_response

    def verify_otp(self, phone: str, code: str) -> AuthResponse:
        now = _utcnow()
        normalized_phone = _normalize_phone(phone)
        phone_hash = stable_hash(normalized_phone, settings.security_pepper)
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
        promoted_role = self._resolve_role_for_phone(normalized_phone)
        if user is None:
            user = self.repo.create_user(phone_hash=phone_hash, role=promoted_role)
        elif user.role == UserRole.USER and promoted_role != UserRole.USER:
            user.role = promoted_role

        auth_response = self._issue_session_tokens(user_id=user.id, role=user.role.value, now=now)
        self.db.commit()
        return auth_response

    def activate_qr(self, token: str) -> AuthResponse:
        now = _utcnow()
        token_hash = stable_hash(token, settings.security_pepper)
        qr_token = self.repo.get_active_qr_token(token_hash, now)

        if qr_token is None:
            raise AuthError("QR token is invalid or expired.", status_code=401)

        self.repo.mark_qr_used(qr_token, now)

        # For now, create a user for one-time QR flow if not pre-bound.
        if qr_token.issued_by_user_id is None:
            created_user = self.repo.create_user(phone_hash=stable_hash(f"qr:{qr_token.id}", settings.security_pepper))
            user_id = created_user.id
            role = created_user.role.value
        else:
            user = self.repo.get_user_by_id(qr_token.issued_by_user_id)
            if user is None or user.status != UserStatus.ACTIVE:
                raise AuthError("User is unavailable for QR activation.", status_code=401)
            user_id = user.id
            role = user.role.value

        auth_response = self._issue_session_tokens(user_id=user_id, role=role, now=now)
        self.db.commit()
        return auth_response

    def refresh_session(self, refresh_token: str) -> AuthResponse:
        now = _utcnow()
        refresh_token_hash = stable_hash(refresh_token, settings.security_pepper)
        current_session = self.repo.get_active_session_by_refresh_hash(refresh_token_hash=refresh_token_hash, now=now)
        if current_session is None:
            raise AuthError("Refresh token is invalid or expired.", status_code=401)

        user = self.repo.get_user_by_id(current_session.user_id)
        if user is None or user.status != UserStatus.ACTIVE:
            raise AuthError("User is inactive or not found.", status_code=401)

        self.repo.revoke_session(current_session, now)
        auth_response = self._issue_session_tokens(
            user_id=current_session.user_id,
            role=user.role.value,
            now=now,
            device_id_hash=current_session.device_id_hash,
        )
        self.db.commit()
        return auth_response

    def logout(self, refresh_token: str) -> None:
        now = _utcnow()
        refresh_token_hash = stable_hash(refresh_token, settings.security_pepper)
        session = self.repo.get_active_session_by_refresh_hash(refresh_token_hash=refresh_token_hash, now=now)
        if session is not None:
            self.repo.revoke_session(session, now)
        self.db.commit()

    def _issue_session_tokens(
        self,
        user_id: UUID,
        role: str,
        now: datetime,
        device_id_hash: str | None = None,
    ) -> AuthResponse:
        access_token = issue_access_token(
            user_id=user_id,
            role=role,
            secret=settings.access_token_secret,
            ttl_minutes=settings.access_token_ttl_minutes,
            now=now,
        )
        refresh_token = generate_token(32)
        self.repo.create_session(
            user_id=user_id,
            refresh_token_hash=stable_hash(refresh_token, settings.security_pepper),
            expires_at=now + timedelta(days=settings.refresh_session_days),
            device_id_hash=device_id_hash,
        )
        return AuthResponse(access_token=access_token, refresh_token=refresh_token, user_id=user_id)

    @staticmethod
    def _resolve_role_for_phone(normalized_phone: str) -> UserRole:
        admin_phones = _parse_admin_phones(settings.admin_phone_numbers)
        if normalized_phone in admin_phones:
            return UserRole.ADMINISTRATOR
        return UserRole.USER

    def _bootstrap_admin_if_needed(self, login: str, password: str) -> User | None:
        admin_login = _normalize_login(settings.admin_login)
        if not admin_login:
            return None

        admin_password = settings.admin_password
        if login != admin_login or not admin_password or password != admin_password:
            return None

        synthetic_phone_hash = stable_hash(f"login:{admin_login}", settings.security_pepper)
        return self.repo.create_user(
            phone_hash=synthetic_phone_hash,
            role=UserRole.ADMINISTRATOR,
            login=admin_login,
            password_hash=hash_password(admin_password),
        )
