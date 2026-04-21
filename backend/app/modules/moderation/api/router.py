from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import CourseRelease
from app.modules.moderation.domain.errors import ModerationError
from app.modules.moderation.domain.services import ModerationService
from app.modules.moderation.infra.models import ReleaseReview, ReleaseStatusHistory
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.db.deps import get_db

from .schemas import (
    ApproveReleaseIn,
    ModerationHistoryOut,
    ModerationReviewOut,
    PendingReleaseOut,
    RejectReleaseIn,
    SubmitForReviewIn,
)

router = APIRouter()


def _to_review_out(review: ReleaseReview) -> ModerationReviewOut:
    return ModerationReviewOut(
        id=review.id,
        release_id=review.release_id,
        reviewer_user_id=review.reviewer_user_id,
        decision=review.decision,
        comment=review.comment,
        decided_at=review.decided_at,
        created_at=review.created_at,
    )


def _to_pending_release_out(release: CourseRelease) -> PendingReleaseOut:
    return PendingReleaseOut(
        release_id=release.id,
        course_id=release.course_id,
        version=release.version,
        status=release.status,
        submitted_at=release.created_at,
    )


def _to_history_out(entry: ReleaseStatusHistory) -> ModerationHistoryOut:
    return ModerationHistoryOut(
        id=entry.id,
        release_id=entry.release_id,
        from_status=entry.from_status,
        to_status=entry.to_status,
        actor_user_id=entry.actor_user_id,
        reason=entry.reason,
        changed_at=entry.changed_at,
    )


def _create_moderation_service(db: Session = Depends(get_db)) -> ModerationService:
    return ModerationService(db)


@router.post("/releases/{release_id}/submit", response_model=ModerationReviewOut)
def submit_release_for_review(
    release_id: UUID,
    payload: SubmitForReviewIn,
    service: ModerationService = Depends(_create_moderation_service),
    actor: CurrentActor = Depends(require_policy("catalog.release.submit_review")),
) -> ModerationReviewOut:
    try:
        review = service.submit_for_review(
            release_id=release_id,
            actor_id=actor.user_id,
            comment=payload.comment,
        )
    except ModerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_review_out(review)


@router.post("/releases/{release_id}/approve", response_model=ModerationReviewOut)
def approve_release(
    release_id: UUID,
    payload: ApproveReleaseIn,
    service: ModerationService = Depends(_create_moderation_service),
    actor: CurrentActor = Depends(require_policy("catalog.release.approve")),
) -> ModerationReviewOut:
    try:
        review = service.approve_release(
            release_id=release_id,
            actor_id=actor.user_id,
            comment=payload.comment,
        )
    except ModerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_review_out(review)


@router.post("/releases/{release_id}/reject", response_model=ModerationReviewOut)
def reject_release(
    release_id: UUID,
    payload: RejectReleaseIn,
    service: ModerationService = Depends(_create_moderation_service),
    actor: CurrentActor = Depends(require_policy("catalog.release.approve")),
) -> ModerationReviewOut:
    try:
        review = service.reject_release(
            release_id=release_id,
            actor_id=actor.user_id,
            comment=payload.comment,
        )
    except ModerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_review_out(review)


@router.post("/releases/{release_id}/resubmit", response_model=ModerationReviewOut)
def resubmit_release(
    release_id: UUID,
    payload: SubmitForReviewIn,
    service: ModerationService = Depends(_create_moderation_service),
    actor: CurrentActor = Depends(require_policy("catalog.release.submit_review")),
) -> ModerationReviewOut:
    try:
        review = service.resubmit_release(
            release_id=release_id,
            actor_id=actor.user_id,
            comment=payload.comment,
        )
    except ModerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return _to_review_out(review)


@router.get("/releases/pending", response_model=list[PendingReleaseOut])
def list_pending_releases(
    service: ModerationService = Depends(_create_moderation_service),
    _actor: CurrentActor = Depends(require_policy("moderation.review")),
) -> list[PendingReleaseOut]:
    releases = service.list_pending_releases()
    return [_to_pending_release_out(release) for release in releases]


@router.get("/releases/{release_id}/history", response_model=list[ModerationHistoryOut])
def get_release_history(
    release_id: UUID,
    service: ModerationService = Depends(_create_moderation_service),
    _actor: CurrentActor = Depends(require_policy("moderation.review")),
) -> list[ModerationHistoryOut]:
    try:
        history = service.get_release_history(release_id=release_id)
    except ModerationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [_to_history_out(entry) for entry in history]
