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


def _normalize_login(login: str) -> str:
    return login.strip().lower()


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

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
            created_user = self.repo.create_user()
            user_id = created_user.id
            role = created_user.role.value
        else:
            user = self.repo.get_user_by_id(qr_token.issued_by_user_id)
            if user is None or user.status != UserStatus.ACTIVE:
                raise AuthError("User is unavailable for QR activation.", status_code=401)
            user_id = user.id
            role = user.role.value

        auth_response = self._issue_session_tokens(user_id=user_id, role=role, now=now)
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
        return auth_response

    def logout(self, refresh_token: str) -> None:
        now = _utcnow()
        refresh_token_hash = stable_hash(refresh_token, settings.security_pepper)
        session = self.repo.get_active_session_by_refresh_hash(refresh_token_hash=refresh_token_hash, now=now)
        if session is not None:
            self.repo.revoke_session(session, now)

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

    def _bootstrap_admin_if_needed(self, login: str, password: str) -> User | None:
        admin_login = _normalize_login(settings.admin_login)
        if not admin_login:
            return None

        admin_password = settings.admin_password
        if login != admin_login or not admin_password or password != admin_password:
            return None

        return self.repo.create_user(
            role=UserRole.ADMINISTRATOR,
            login=admin_login,
            password_hash=hash_password(admin_password),
        )
