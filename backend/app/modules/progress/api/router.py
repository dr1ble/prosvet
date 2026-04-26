from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.progress.api.schemas import (
    LessonProgressOut,
    LessonProgressUpsertIn,
    MyProgressOut,
    ProgressOverviewRowOut,
)
from app.modules.progress.domain.errors import ProgressError
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import ProgressServiceDep

router = APIRouter()

_PROGRESS_ERROR_RU: dict[str, str] = {
    "date_from and date_to are required when period=custom.": "Для произвольного периода укажите даты начала и окончания.",
    "date_from must be less than or equal to date_to.": "Дата начала должна быть не позже даты окончания.",
    "Unsupported progress status.": "Неподдерживаемый статус прогресса.",
}


def _localize_progress_error(detail: str) -> str:
    return _PROGRESS_ERROR_RU.get(detail, detail)


@router.get("/me", response_model=MyProgressOut)
def get_my_progress(
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> MyProgressOut:
    return service.get_my_progress(user_id=_actor.user_id)


@router.post("/lesson/self", response_model=LessonProgressOut)
def upsert_own_lesson_progress(
    service: ProgressServiceDep,
    lesson_id: UUID,
    status: str = Query(pattern=r"^(in_progress|completed)$"),
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> LessonProgressOut:
    try:
        item = service.upsert_lesson_progress(
            user_id=_actor.user_id,
            lesson_id=lesson_id,
            status=status,
        )
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc
    return LessonProgressOut(
        id=item.id,
        user_id=item.user_id,
        lesson_id=item.lesson_id,
        status=item.status,
    )


@router.get("/overview", response_model=list[ProgressOverviewRowOut])
def get_progress_overview(
    service: ProgressServiceDep,
    group_id: UUID | None = Query(default=None),
    course_id: UUID | None = Query(default=None),
    user_id: UUID | None = Query(default=None),
    period: Literal["all", "7d", "14d", "30d", "90d", "custom"] = Query(default="all"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    _actor: CurrentActor = Depends(require_policy("progress.view")),
) -> list[ProgressOverviewRowOut]:
    try:
        return service.get_overview(
            group_id=group_id,
            course_id=course_id,
            user_id=user_id,
            period=period,
            date_from=date_from,
            date_to=date_to,
        )
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc


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
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc
    return LessonProgressOut(
        id=item.id,
        user_id=item.user_id,
        lesson_id=item.lesson_id,
        status=item.status,
    )
