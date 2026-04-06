from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import CourseRelease
from app.modules.moderation.infra.models import ReleaseReview, ReleaseStatusHistory


class ModerationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_release_by_id(self, release_id: UUID) -> CourseRelease | None:
        stmt = select(CourseRelease).where(CourseRelease.id == release_id)
        return self.db.scalar(stmt)

    def update_release_status(
        self, release: CourseRelease, new_status: str, published_at: datetime | None = None
    ) -> CourseRelease:
        release.status = new_status
        if published_at is not None:
            release.published_at = published_at
        self.db.flush()
        return release

    def create_review(
        self,
        release_id: UUID,
        reviewer_user_id: UUID,
        decision: str,
        comment: str | None,
        decided_at,
    ) -> ReleaseReview:
        review = ReleaseReview(
            release_id=release_id,
            reviewer_user_id=reviewer_user_id,
            decision=decision,
            comment=comment,
            decided_at=decided_at,
        )
        self.db.add(review)
        self.db.flush()
        return review

    def create_history_entry(
        self,
        release_id: UUID,
        from_status: str,
        to_status: str,
        actor_user_id: UUID,
        reason: str | None,
    ) -> ReleaseStatusHistory:
        entry = ReleaseStatusHistory(
            release_id=release_id,
            from_status=from_status,
            to_status=to_status,
            actor_user_id=actor_user_id,
            reason=reason,
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_pending_reviews(self) -> list[CourseRelease]:
        stmt = (
            select(CourseRelease)
            .where(CourseRelease.status == "pending_review")
            .order_by(desc(CourseRelease.created_at))
        )
        return list(self.db.scalars(stmt).all())

    def list_history_for_release(self, release_id: UUID) -> list[ReleaseStatusHistory]:
        stmt = (
            select(ReleaseStatusHistory)
            .where(ReleaseStatusHistory.release_id == release_id)
            .order_by(desc(ReleaseStatusHistory.changed_at))
        )
        return list(self.db.scalars(stmt).all())
