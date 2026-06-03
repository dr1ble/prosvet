import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.modules.auth.api.schemas import AuthResponse, PasswordRecoveryRequestOut
from app.modules.auth.domain.errors import AuthError
from app.modules.auth.infra.repository import AuthRepository
from app.modules.users.models import User, UserRole, UserStatus
from app.shared.email import EmailDeliveryError, EmailSender
from app.shared.security.hashing import stable_hash
from app.shared.security.passwords import hash_password, verify_password
from app.shared.security.tokens import generate_token, issue_access_token

LOGIN_PASSWORD_MIN_LENGTH = 6
QR_LOGIN_NUMBER_BOUND = 1_000_000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_login(login: str) -> str:
    return login.strip().lower()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_valid_email(email: str) -> bool:
    local, separator, domain = email.partition("@")
    return bool(local and separator and "." in domain and not email.startswith("@"))


@dataclass(frozen=True)
class PersonalQrIssueResult:
    user_id: UUID
    deep_link_url: str
    expires_at: datetime


@dataclass(frozen=True)
class QrIssueResult:
    deep_link_url: str
    expires_at: datetime


class AuthService:
    def __init__(self, db: Session, email_sender: EmailSender | None = None) -> None:
        self.db = db
        self.repo = AuthRepository(db)
        self.email_sender = email_sender or EmailSender()

    def login(self, login: str, password: str) -> AuthResponse:
        now = _utcnow()
        normalized_login = _normalize_login(login)
        if len(normalized_login) < 3:
            raise AuthError("Invalid credentials.", status_code=401)
        if len(password) < LOGIN_PASSWORD_MIN_LENGTH:
            raise AuthError("Invalid credentials.", status_code=401)

        user = self.repo.get_user_by_login(normalized_login)
        if user is None:
            user = self._bootstrap_admin_if_needed(normalized_login, password)
            if user is None:
                user = self._bootstrap_demo_user_if_needed(normalized_login, password)
            if user is None:
                raise AuthError("Invalid credentials.", status_code=401)
        else:
            if user.status != UserStatus.ACTIVE:
                raise AuthError("Invalid credentials.", status_code=401)
            if not user.password_hash or not verify_password(password, user.password_hash):
                raise AuthError("Invalid credentials.", status_code=401)

        auth_response = self._issue_session_tokens(user_id=user.id, role=user.role.value, now=now)
        return auth_response

    def register(self, full_name: str, login: str, password: str) -> AuthResponse:
        now = _utcnow()
        normalized_login = _normalize_login(login)
        normalized_full_name = full_name.strip()

        if len(normalized_full_name) < 2:
            raise AuthError("Invalid registration data.", status_code=400)
        if len(normalized_login) < 3:
            raise AuthError("Invalid registration data.", status_code=400)
        if len(password) < LOGIN_PASSWORD_MIN_LENGTH:
            raise AuthError("Invalid registration data.", status_code=400)

        existing_user = self.repo.get_user_by_login(normalized_login)
        if existing_user is not None:
            raise AuthError("Login is already taken.", status_code=409)

        created_user = self.repo.create_user(
            role=UserRole.USER,
            login=normalized_login,
            password_hash=hash_password(password),
            display_name=normalized_full_name,
        )

        return self._issue_session_tokens(
            user_id=created_user.id,
            role=created_user.role.value,
            now=now,
        )

    def request_password_recovery(self, login_or_email: str) -> PasswordRecoveryRequestOut:
        now = _utcnow()
        normalized_value = _normalize_email(login_or_email)
        if len(normalized_value) < 3:
            raise AuthError("Invalid recovery data.", status_code=400)

        user = self.repo.get_user_by_login_or_email(normalized_value)
        if user is None or user.status != UserStatus.ACTIVE or not user.email:
            raise AuthError("Recovery user not found or email missing.", status_code=404)

        reset_token = f"{secrets.randbelow(1_000_000):06d}"
        self.repo.create_password_reset_token(
            user_id=user.id,
            token_hash=stable_hash(reset_token, settings.security_pepper),
            expires_at=now + timedelta(minutes=30),
        )
        if user.email:
            try:
                self.email_sender.send_password_reset(user.email, reset_token)
            except EmailDeliveryError as exc:
                raise AuthError("Could not send recovery email.", status_code=503) from exc
        debug_token = reset_token if settings.environment == "development" else None
        return PasswordRecoveryRequestOut(debug_reset_token=debug_token)

    def confirm_password_recovery(self, reset_token: str, new_password: str) -> None:
        now = _utcnow()
        if len(new_password) < LOGIN_PASSWORD_MIN_LENGTH:
            raise AuthError("Invalid recovery data.", status_code=400)

        token_hash = stable_hash(reset_token, settings.security_pepper)
        token = self.repo.get_active_password_reset_token(token_hash=token_hash, now=now)
        if token is None:
            raise AuthError("Reset token is invalid or expired.", status_code=400)

        user = self.repo.get_user_by_id(token.user_id)
        if user is None or user.status != UserStatus.ACTIVE:
            raise AuthError("User is inactive or not found.", status_code=400)

        self.repo.update_password_hash(user, hash_password(new_password))
        self.repo.mark_password_reset_token_used(token, now)

    def bind_email(self, user: User, email: str) -> User:
        normalized_email = _normalize_email(email)
        if not _is_valid_email(normalized_email):
            raise AuthError("Invalid email.", status_code=400)

        existing_user = self.repo.get_user_by_login_or_email(normalized_email)
        if existing_user is not None and existing_user.id != user.id:
            raise AuthError("Email is already taken.", status_code=409)

        return self.repo.bind_email(user=user, email=normalized_email)

    def change_password(self, user: User, current_password: str, new_password: str) -> User:
        if len(current_password) < LOGIN_PASSWORD_MIN_LENGTH or len(new_password) < LOGIN_PASSWORD_MIN_LENGTH:
            raise AuthError("Invalid password change data.", status_code=400)
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise AuthError("Current password is incorrect.", status_code=400)
        if verify_password(new_password, user.password_hash):
            raise AuthError("New password must be different.", status_code=400)
        return self.repo.update_password_hash(user, hash_password(new_password))

    def update_account_settings(
        self,
        user: User,
        *,
        learning_reminders_enabled: bool | None = None,
        security_alerts_enabled: bool | None = None,
        profile_visible: bool | None = None,
    ) -> User:
        return self.repo.update_account_settings(
            user,
            learning_reminders_enabled=learning_reminders_enabled,
            security_alerts_enabled=security_alerts_enabled,
            profile_visible=profile_visible,
        )

    def issue_personal_qr(
        self,
        target_user_id: UUID,
        actor_user_id: UUID,
    ) -> PersonalQrIssueResult:
        del actor_user_id
        target_user = self.repo.get_user_by_id(target_user_id)
        if target_user is None or target_user.status != UserStatus.ACTIVE:
            raise AuthError("QR target user is unavailable.", status_code=404)
        if target_user.role != UserRole.USER:
            raise AuthError("Personal QR can be issued only for learners.", status_code=422)

        token = generate_token(24)
        now = _utcnow()
        expires_at = now + timedelta(minutes=max(1, settings.qr_ttl_minutes))
        self.repo.create_qr_token(
            issued_by_user_id=target_user.id,
            token_hash=stable_hash(token, settings.security_pepper),
            expires_at=expires_at,
        )
        return PersonalQrIssueResult(
            user_id=target_user.id,
            deep_link_url=f"digitaledu://auth/qr/{token}",
            expires_at=expires_at,
        )

    def issue_onboarding_qr(self, actor_user_id: UUID) -> QrIssueResult:
        del actor_user_id
        token = generate_token(24)
        now = _utcnow()
        expires_at = now + timedelta(minutes=max(1, settings.qr_ttl_minutes))
        self.repo.create_qr_token(
            issued_by_user_id=None,
            token_hash=stable_hash(token, settings.security_pepper),
            expires_at=expires_at,
        )
        return QrIssueResult(
            deep_link_url=f"digitaledu://auth/qr/{token}",
            expires_at=expires_at,
        )

    def activate_qr(self, token: str) -> AuthResponse:
        now = _utcnow()
        token_hash = stable_hash(token, settings.security_pepper)
        qr_token = self.repo.get_active_qr_token(token_hash, now)

        if qr_token is None:
            raise AuthError("QR token is invalid or expired.", status_code=401)

        self.repo.mark_qr_used(qr_token, now)

        initial_login: str | None = None
        initial_password: str | None = None

        if qr_token.issued_by_user_id is None:
            initial_login = self._generate_qr_login()
            initial_password = self._generate_six_digit_pin()
            created_user = self.repo.create_user(
                login=initial_login,
                password_hash=hash_password(initial_password),
                display_name=f"Пользователь {initial_login.removeprefix('user')}",
            )
            user_id = created_user.id
            role = created_user.role.value
        else:
            user = self.repo.get_user_by_id(qr_token.issued_by_user_id)
            if user is None or user.status != UserStatus.ACTIVE:
                raise AuthError("User is unavailable for QR activation.", status_code=401)
            user_id = user.id
            role = user.role.value

        auth_response = self._issue_session_tokens(user_id=user_id, role=role, now=now)
        auth_response.initial_login = initial_login
        auth_response.initial_password = initial_password
        return auth_response

    def _generate_qr_login(self) -> str:
        for _ in range(10):
            suffix = f"{secrets.randbelow(QR_LOGIN_NUMBER_BOUND):06d}"
            login = f"user{suffix}"
            if self.repo.get_user_by_login(login) is None:
                return login
        raise AuthError("Could not generate QR login.", status_code=500)

    def _generate_six_digit_pin(self) -> str:
        return f"{secrets.randbelow(QR_LOGIN_NUMBER_BOUND):06d}"

    def refresh_session(self, refresh_token: str) -> AuthResponse:
        now = _utcnow()
        refresh_token_hash = stable_hash(refresh_token, settings.security_pepper)
        current_session = self.repo.get_active_session_by_refresh_hash(
            refresh_token_hash=refresh_token_hash, now=now
        )
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
        session = self.repo.get_active_session_by_refresh_hash(
            refresh_token_hash=refresh_token_hash, now=now
        )
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

    def _bootstrap_demo_user_if_needed(self, login: str, password: str) -> User | None:
        environment = str(getattr(settings, "environment", "development") or "development").lower()
        if environment != "development":
            return None

        demo_users: dict[str, tuple[UserRole, str, str]] = {
            "methodologist": (UserRole.METHODOLOGIST, "method12345", "Методист"),
            "methodist": (UserRole.METHODOLOGIST, "method12345", "Методист"),
            "moderator": (UserRole.MODERATOR, "moder12345", "Модератор"),
            "user": (UserRole.USER, "user12345", "Пользователь"),
        }

        demo_user = demo_users.get(login)
        if demo_user is None:
            return None

        role, expected_password, display_name = demo_user
        if password != expected_password:
            return None

        return self.repo.create_user(
            role=role,
            login=login,
            password_hash=hash_password(expected_password),
            display_name=display_name,
        )
