from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.modules.auth.infra.models import (
    OtpChallenge,
    OtpChallengeStatus,
    QrLoginToken,
    QrTokenStatus,
    UserSession,
)
from app.modules.users.models import User, UserRole, UserStatus


class AuthRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_latest_challenge(self, phone_hash: str) -> OtpChallenge | None:
        stmt = (
            select(OtpChallenge)
            .where(OtpChallenge.phone_hash == phone_hash)
            .order_by(desc(OtpChallenge.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def create_challenge(self, phone_hash: str, code_hash: str, expires_at: datetime) -> OtpChallenge:
        challenge = OtpChallenge(
            phone_hash=phone_hash,
            code_hash=code_hash,
            expires_at=expires_at,
            status=OtpChallengeStatus.ACTIVE.value,
        )
        self.db.add(challenge)
        self.db.flush()
        return challenge

    def mark_challenge_verified(self, challenge: OtpChallenge, now: datetime) -> None:
        challenge.verified_at = now
        challenge.status = OtpChallengeStatus.VERIFIED.value

    def mark_challenge_expired(self, challenge: OtpChallenge) -> None:
        challenge.status = OtpChallengeStatus.EXPIRED.value

    def register_failed_attempt(self, challenge: OtpChallenge, blocked_until: datetime | None) -> None:
        challenge.attempts += 1
        if blocked_until is not None:
            challenge.blocked_until = blocked_until
            challenge.status = OtpChallengeStatus.BLOCKED.value

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

    def get_user_by_phone_hash(self, phone_hash: str) -> User | None:
        stmt = select(User).where(User.phone_hash == phone_hash)
        return self.db.scalar(stmt)

    def get_user_by_id(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id)
        return self.db.scalar(stmt)

    def create_user(self, phone_hash: str, role: UserRole = UserRole.USER) -> User:
        user = User(phone_hash=phone_hash, role=role, status=UserStatus.ACTIVE)
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

    def get_active_session_by_refresh_hash(self, refresh_token_hash: str, now: datetime) -> UserSession | None:
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
