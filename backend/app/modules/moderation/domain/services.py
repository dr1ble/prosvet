from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import CourseRelease
from app.modules.moderation.infra.models import ReleaseReview, ReleaseStatusHistory
from app.modules.moderation.infra.repository import ModerationRepository

from .errors import ModerationError


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ModerationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ModerationRepository(db)

    def submit_for_review(
        self,
        release_id: UUID,
        actor_id: UUID,
        comment: str | None = None,
    ) -> ReleaseReview:
        return self._transition_release(
            release_id=release_id,
            actor_id=actor_id,
            expected_status="draft",
            new_status="pending_review",
            decision="submitted_for_review",
            comment=comment,
        )

    def approve_release(
        self,
        release_id: UUID,
        actor_id: UUID,
        comment: str | None = None,
    ) -> ReleaseReview:
        release = self.repo.get_release_by_id(release_id)
        if release is None:
            raise ModerationError("Release not found.", status_code=404)

        from_status = release.status
        if from_status != "pending_review":
            raise ModerationError(
                f"Invalid status transition: expected 'pending_review', got '{from_status}'.",
                status_code=409,
            )

        decided_at = _utcnow()
        self.repo.update_release_status(release, new_status="published", published_at=decided_at)
        review = self.repo.create_review(
            release_id=release.id,
            reviewer_user_id=actor_id,
            decision="approved",
            comment=comment,
            decided_at=decided_at,
        )
        self.repo.create_history_entry(
            release_id=release.id,
            from_status=from_status,
            to_status="published",
            actor_user_id=actor_id,
            reason=comment,
        )
        return review

    def reject_release(
        self,
        release_id: UUID,
        actor_id: UUID,
        comment: str,
    ) -> ReleaseReview:
        normalized_comment = comment.strip()
        if len(normalized_comment) < 10:
            raise ModerationError("Rejection comment must be at least 10 characters.", status_code=422)
        return self._transition_release(
            release_id=release_id,
            actor_id=actor_id,
            expected_status="pending_review",
            new_status="rejected",
            decision="rejected",
            comment=normalized_comment,
        )

    def resubmit_release(
        self,
        release_id: UUID,
        actor_id: UUID,
        comment: str | None = None,
    ) -> ReleaseReview:
        return self._transition_release(
            release_id=release_id,
            actor_id=actor_id,
            expected_status="rejected",
            new_status="pending_review",
            decision="resubmitted_for_review",
            comment=comment,
        )

    def list_pending_releases(self) -> list[CourseRelease]:
        return self.repo.list_pending_reviews()

    def get_release_history(self, release_id: UUID) -> list[ReleaseStatusHistory]:
        release = self.repo.get_release_by_id(release_id)
        if release is None:
            raise ModerationError("Release not found.", status_code=404)
        return self.repo.list_history_for_release(release_id)

    def _transition_release(
        self,
        release_id: UUID,
        actor_id: UUID,
        expected_status: str,
        new_status: str,
        decision: str,
        comment: str | None,
    ) -> ReleaseReview:
        release = self.repo.get_release_by_id(release_id)
        if release is None:
            raise ModerationError("Release not found.", status_code=404)

        from_status = release.status
        if from_status != expected_status:
            raise ModerationError(
                f"Invalid status transition: expected '{expected_status}', got '{from_status}'.",
                status_code=409,
            )

        decided_at = _utcnow()
        self.repo.update_release_status(release, new_status=new_status)
        review = self.repo.create_review(
            release_id=release.id,
            reviewer_user_id=actor_id,
            decision=decision,
            comment=comment,
            decided_at=decided_at,
        )
        self.repo.create_history_entry(
            release_id=release.id,
            from_status=from_status,
            to_status=new_status,
            actor_user_id=actor_id,
            reason=comment,
        )
        return review
