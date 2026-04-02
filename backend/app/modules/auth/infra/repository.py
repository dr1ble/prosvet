from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.modules.auth.infra.models import (
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

    def get_user_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalar(stmt)

    def create_user(
        self,
        role: UserRole = UserRole.USER,
        login: str | None = None,
        password_hash: str | None = None,
    ) -> User:
        user = User(
            role=role,
            status=UserStatus.ACTIVE,
            login=login,
            password_hash=password_hash,
        )
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
