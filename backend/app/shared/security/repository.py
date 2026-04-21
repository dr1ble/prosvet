from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.security.models import AdminAuditLog


class AdminAuditLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def append(
        self,
        *,
        actor_user_id: UUID,
        action_key: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> AdminAuditLog:
        item = AdminAuditLog(
            actor_user_id=actor_user_id,
            action_key=action_key,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
        self.db.add(item)
        self.db.flush()
        return item

    def list_recent(self, *, limit: int = 100) -> list[AdminAuditLog]:
        bounded_limit = max(1, min(limit, 500))
        stmt = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(bounded_limit)
        return list(self.db.scalars(stmt).all())
