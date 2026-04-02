from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.progress.api.schemas import (
    LessonProgressOut,
    LessonProgressUpsertIn,
    ProgressOverviewRowOut,
)
from app.modules.progress.domain.errors import ProgressError
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import ProgressServiceDep

router = APIRouter()


@router.get("/overview", response_model=list[ProgressOverviewRowOut])
def get_progress_overview(
    service: ProgressServiceDep,
    group_id: UUID | None = Query(default=None),
    course_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    _actor: CurrentActor = Depends(require_policy("progress.view")),
) -> list[ProgressOverviewRowOut]:
    return service.get_overview(group_id=group_id, course_id=course_id, user_id=user_id)


@router.post("/lesson", response_model=LessonProgressOut)
def upsert_lesson_progress(
    payload: LessonProgressUpsertIn,
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view")),
) -> LessonProgressOut:
    try:
        item = service.upsert_lesson_progress(
            user_id=payload.user_id,
            lesson_id=payload.lesson_id,
            status=payload.status,
        )
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return LessonProgressOut(
        id=item.id,
        user_id=item.user_id,
        lesson_id=item.lesson_id,
        status=item.status,
    )
