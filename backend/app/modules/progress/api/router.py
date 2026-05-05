from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.progress.api.schemas import (
    LessonNoteCreateIn,
    LessonNoteOut,
    LessonProgressOut,
    LessonProgressUpsertIn,
    MyGlossaryOut,
    MyLessonNotesOut,
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
    "Glossary term not unlocked.": "Термин еще не открыт в вашем словаре.",
    "Lesson not found.": "Урок не найден.",
    "Note content is empty.": "Заметка не должна быть пустой.",
    "Note not found.": "Заметка не найдена.",
}


def _localize_progress_error(detail: str) -> str:
    return _PROGRESS_ERROR_RU.get(detail, detail)


@router.get("/me", response_model=MyProgressOut)
def get_my_progress(
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> MyProgressOut:
    return service.get_my_progress(user_id=_actor.user_id)


@router.get("/glossary/self", response_model=MyGlossaryOut)
def get_my_glossary(
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> MyGlossaryOut:
    return service.get_my_glossary(user_id=_actor.user_id)


@router.patch("/glossary/self/{term_id}/bookmark", status_code=204)
def set_my_glossary_bookmark(
    term_id: UUID,
    is_bookmarked: bool,
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> None:
    try:
        service.set_my_glossary_bookmark(
            user_id=_actor.user_id,
            term_id=term_id,
            is_bookmarked=is_bookmarked,
        )
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc


@router.get("/notes/self", response_model=MyLessonNotesOut)
def get_my_notes(
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> MyLessonNotesOut:
    return service.get_my_notes(user_id=_actor.user_id)


@router.post("/notes/self", response_model=LessonNoteOut)
def create_my_note(
    payload: LessonNoteCreateIn,
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> LessonNoteOut:
    try:
        return service.create_my_note(
            user_id=_actor.user_id,
            lesson_id=payload.lesson_id,
            content=payload.content,
        )
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc


@router.delete("/notes/self/{note_id}", status_code=204)
def delete_my_note(
    note_id: UUID,
    service: ProgressServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> None:
    try:
        service.delete_my_note(user_id=_actor.user_id, note_id=note_id)
    except ProgressError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_progress_error(exc.detail)) from exc


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
