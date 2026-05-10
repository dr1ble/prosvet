from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.support.api.schemas import (
    HelpRequestCreateIn,
    HelpRequestOut,
    HelpRequestsOut,
    HelpRequestUpdateIn,
    MyHelpRequestsOut,
)
from app.modules.support.domain.errors import SupportError
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import SupportServiceDep

router = APIRouter()

_SUPPORT_ERROR_RU: dict[str, str] = {
    "Help request message is empty.": "Опишите, какая помощь нужна по курсу.",
    "Help request not found.": "Заявка не найдена.",
    "Unsupported help request type.": "Неподдерживаемый тип заявки.",
    "Unsupported help request status.": "Неподдерживаемый статус заявки.",
}


def _localize_support_error(detail: str) -> str:
    return _SUPPORT_ERROR_RU.get(detail, detail)


@router.post("/help-requests", response_model=HelpRequestOut)
def create_help_request(
    payload: HelpRequestCreateIn,
    service: SupportServiceDep,
    actor: CurrentActor = Depends(require_policy("support.request.create")),
) -> HelpRequestOut:
    try:
        return service.create_help_request(
            requester_id=actor.user_id,
            request_type=payload.request_type,
            message=payload.message,
            course_id=payload.course_id,
            lesson_id=payload.lesson_id,
            screen_key=payload.screen_key,
            screen_title=payload.screen_title,
        )
    except SupportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_support_error(exc.detail)) from exc


@router.get("/help-requests", response_model=HelpRequestsOut)
def list_help_requests(
    service: SupportServiceDep,
    status: str | None = Query(default=None),
    request_type: str | None = Query(default=None),
    course_id: UUID | None = Query(default=None),
    _actor: CurrentActor = Depends(require_policy("support.request.view")),
) -> HelpRequestsOut:
    try:
        requests = service.list_help_requests(
            status=status,
            request_type=request_type,
            course_id=course_id,
        )
    except SupportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_support_error(exc.detail)) from exc
    return HelpRequestsOut(requests=requests)


@router.get("/help-requests/me", response_model=MyHelpRequestsOut)
def list_my_help_requests(
    service: SupportServiceDep,
    actor: CurrentActor = Depends(require_policy("support.request.create")),
) -> MyHelpRequestsOut:
    requests, has_unread = service.list_my_help_requests(requester_id=actor.user_id)
    return MyHelpRequestsOut(requests=requests, has_unread_staff_replies=has_unread)


@router.post("/help-requests/me/mark-replies-read")
def mark_my_help_replies_read(
    service: SupportServiceDep,
    actor: CurrentActor = Depends(require_policy("support.request.create")),
) -> dict[str, bool]:
    service.mark_my_help_replies_read(requester_id=actor.user_id)
    return {"ok": True}


@router.patch("/help-requests/{request_id}", response_model=HelpRequestOut)
def update_help_request(
    request_id: UUID,
    payload: HelpRequestUpdateIn,
    service: SupportServiceDep,
    actor: CurrentActor = Depends(require_policy("support.request.manage")),
) -> HelpRequestOut:
    try:
        return service.update_help_request(
            request_id=request_id,
            status=payload.status,
            staff_comment=payload.staff_comment,
            actor_id=actor.user_id,
        )
    except SupportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_support_error(exc.detail)) from exc
