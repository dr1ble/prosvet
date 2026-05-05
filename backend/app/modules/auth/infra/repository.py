from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.modules.auth.infra.models import (
    PasswordResetToken,
    QrLoginToken,
    QrTokenStatus,
    UserSession,
)
from app.modules.users.models import User, UserRole, UserStatus


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_active_qr_token(self, token_hash: str, now: datetime) -> QrLoginToken | None:
        stmt = select(QrLoginToken).where(
            QrLoginToken.token_hash == token_hash,
            QrLoginToken.used_at.is_(None),
            QrLoginToken.status == QrTokenStatus.ACTIVE.value,
            QrLoginToken.expires_at > now,
        )
        return self.db.scalar(stmt)

    def mark_qr_used(self, qr_token: QrLoginToken, now: datetime) -> None:
        qr_token.used_at = now
        qr_token.status = QrTokenStatus.USED.value

    def get_user_by_login(self, login: str) -> User | None:
        stmt = select(User).where(User.login == login)
        return self.db.scalar(stmt)

    def get_user_by_login_or_email(self, value: str) -> User | None:
        stmt = select(User).where(or_(User.login == value, User.email == value))
        return self.db.scalar(stmt)

    def get_user_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalar(stmt)

    def create_user(
        self,
        role: UserRole = UserRole.USER,
        login: str | None = None,
        password_hash: str | None = None,
        display_name: str | None = None,
    ) -> User:
        user = User(
            role=role,
            status=UserStatus.ACTIVE,
            login=login,
            password_hash=password_hash,
            display_name=display_name,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def bind_email(self, user: User, email: str) -> User:
        user.email = email
        self.db.add(user)
        self.db.flush()
        return user

    def create_password_reset_token(
        self,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
    ) -> PasswordResetToken:
        token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        self.db.flush()
        return token

    def get_active_password_reset_token(
        self,
        token_hash: str,
        now: datetime,
    ) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        return self.db.scalar(stmt)

    def mark_password_reset_token_used(
        self,
        token: PasswordResetToken,
        now: datetime,
    ) -> None:
        token.used_at = now

    def update_password_hash(self, user: User, password_hash: str) -> User:
        user.password_hash = password_hash
        self.db.add(user)
        self.db.flush()
        return user

    def update_account_settings(
        self,
        user: User,
        *,
        learning_reminders_enabled: bool | None = None,
        security_alerts_enabled: bool | None = None,
        profile_visible: bool | None = None,
    ) -> User:
        if learning_reminders_enabled is not None:
            user.learning_reminders_enabled = learning_reminders_enabled
        if security_alerts_enabled is not None:
            user.security_alerts_enabled = security_alerts_enabled
        if profile_visible is not None:
            user.profile_visible = profile_visible
        self.db.add(user)
        self.db.flush()
        return user

    def create_session(
        self,
        user_id: UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        device_id_hash: str | None = None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            device_id_hash=device_id_hash,
            expires_at=expires_at,
        )
        self.db.add(session)
        self.db.flush()
        return session

    def get_active_session_by_refresh_hash(
        self, refresh_token_hash: str, now: datetime
    ) -> UserSession | None:
        stmt = (
            select(UserSession)
            .where(
                UserSession.refresh_token_hash == refresh_token_hash,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
            .order_by(desc(UserSession.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def revoke_session(self, session: UserSession, now: datetime) -> None:
        session.revoked_at = now
