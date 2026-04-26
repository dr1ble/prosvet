from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.modules.groups.api.schemas import (
    GroupAssignmentCreateIn,
    GroupAssignmentOut,
    GroupAssignmentUpdateIn,
    GroupCreateIn,
    GroupMemberOut,
    GroupMembersUpdateIn,
    GroupOut,
    GroupQrCodeOut,
    GroupQrResolveOut,
    GroupUpdateIn,
    GroupUserOptionOut,
)
from app.modules.groups.domain.errors import GroupsError
from app.modules.groups.infra.models import GroupCourseAssignment, LearningGroup
from app.shared.auth.deps import get_current_actor, require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import GroupsServiceDep

router = APIRouter()

_GROUPS_ERROR_RU: dict[str, str] = {
    "Group with this name already exists.": "Группа с таким названием уже существует.",
    "Group not found.": "Группа не найдена.",
    "Some users were not found or are not active.": "Некоторые пользователи не найдены или неактивны.",
    "Some target users were not found or are not active.": "Некоторые назначенные пользователи не найдены или неактивны.",
    "Assignment is allowed only for active groups.": "Назначение доступно только для активных групп.",
    "Course not found.": "Курс не найден.",
    "Archived course cannot be assigned.": "Архивный курс нельзя назначить группе.",
    "Assignment not found.": "Назначение не найдено.",
    "QR is available only for active groups.": "QR-код доступен только для активных групп.",
    "QR token is invalid or expired.": "QR-код недействителен или истёк.",
    "Group is unavailable.": "Группа недоступна.",
    "No active assignment is available for this group.": "Для этой группы нет доступного активного назначения.",
    "More than one assignment is available. Open a specific assignment manually.": "Для группы доступно несколько назначений. Откройте нужное назначение вручную.",
}


def _localize_groups_error(detail: str) -> str:
    return _GROUPS_ERROR_RU.get(detail, detail)


def _to_group_out(group: LearningGroup) -> GroupOut:
    return GroupOut(
        id=group.id,
        name=group.name,
        description=group.description,
        status=group.status,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def _to_assignment_out(service, assignment: GroupCourseAssignment) -> GroupAssignmentOut:
    course = service.repo.get_course_by_id(assignment.course_id)
    target_user_ids = service.repo.list_assignment_target_user_ids(assignment.id)
    return GroupAssignmentOut(
        id=assignment.id,
        group_id=assignment.group_id,
        course_id=assignment.course_id,
        course_title=course.title if course else "Unknown course",
        created_by_user_id=assignment.created_by_user_id,
        start_policy=assignment.start_policy,
        starts_at=assignment.starts_at,
        ends_at=assignment.ends_at,
        status=assignment.status,
        target_user_ids=target_user_ids,
        target_users_count=len(target_user_ids),
        created_at=assignment.created_at,
        updated_at=assignment.updated_at,
    )


@router.get("", response_model=list[GroupOut])
def list_groups(
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.view")),
) -> list[GroupOut]:
    groups = service.list_groups()
    return [_to_group_out(group) for group in groups]


@router.post("", response_model=GroupOut)
def create_group(
    payload: GroupCreateIn,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupOut:
    try:
        group = service.create_group(payload)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_group_out(group)


@router.patch("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: UUID,
    payload: GroupUpdateIn,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupOut:
    try:
        group = service.update_group(group_id=group_id, payload=payload)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_group_out(group)


@router.post("/{group_id}/archive", response_model=GroupOut)
def archive_group(
    group_id: UUID,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupOut:
    try:
        group = service.archive_group(group_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_group_out(group)


@router.post("/{group_id}/restore", response_model=GroupOut)
def restore_group(
    group_id: UUID,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupOut:
    try:
        group = service.restore_group(group_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_group_out(group)


@router.get("/{group_id}/members", response_model=list[GroupMemberOut])
def list_group_members(
    group_id: UUID,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.view")),
) -> list[GroupMemberOut]:
    try:
        return service.list_group_members(group_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc


@router.get("/users", response_model=list[GroupUserOptionOut])
def list_users_for_membership(
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.view")),
) -> list[GroupUserOptionOut]:
    return service.list_users_for_membership()


@router.put("/{group_id}/members", response_model=list[GroupMemberOut])
def replace_group_members(
    group_id: UUID,
    payload: GroupMembersUpdateIn,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> list[GroupMemberOut]:
    try:
        return service.replace_group_members(group_id=group_id, payload=payload)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc


@router.get("/{group_id}/assignments", response_model=list[GroupAssignmentOut])
def list_group_assignments(
    group_id: UUID,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.view")),
) -> list[GroupAssignmentOut]:
    try:
        assignments = service.list_group_assignments(group_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return [_to_assignment_out(service, item) for item in assignments]


@router.post("/{group_id}/assignments", response_model=GroupAssignmentOut)
def create_group_assignment(
    group_id: UUID,
    payload: GroupAssignmentCreateIn,
    service: GroupsServiceDep,
    actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupAssignmentOut:
    try:
        assignment = service.create_group_assignment(
            group_id=group_id,
            actor_user_id=actor.user_id,
            payload=payload,
        )
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_assignment_out(service, assignment)


@router.patch("/{group_id}/assignments/{assignment_id}", response_model=GroupAssignmentOut)
def update_group_assignment(
    group_id: UUID,
    assignment_id: UUID,
    payload: GroupAssignmentUpdateIn,
    service: GroupsServiceDep,
    _actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupAssignmentOut:
    try:
        assignment = service.update_group_assignment(
            group_id=group_id,
            assignment_id=assignment_id,
            payload=payload,
        )
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc
    return _to_assignment_out(service, assignment)


@router.post("/{group_id}/qr", response_model=GroupQrCodeOut)
def create_group_qr(
    group_id: UUID,
    service: GroupsServiceDep,
    actor: CurrentActor = Depends(require_policy("groups.manage")),
) -> GroupQrCodeOut:
    try:
        result = service.create_group_qr_link(group_id=group_id, actor_user_id=actor.user_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc

    return GroupQrCodeOut(
        group_id=result.group_id,
        group_name=result.group_name,
        deep_link_url=result.deep_link_url,
        expires_at=result.expires_at,
    )


@router.get("/qr/{token}", response_model=GroupQrResolveOut)
def resolve_group_qr(
    token: str,
    service: GroupsServiceDep,
    actor: CurrentActor = Depends(get_current_actor),
) -> GroupQrResolveOut:
    try:
        result = service.resolve_group_qr_link(token=token, actor_user_id=actor.user_id)
    except GroupsError as exc:
        raise HTTPException(status_code=exc.status_code, detail=_localize_groups_error(exc.detail)) from exc

    return GroupQrResolveOut(
        group_id=result.group_id,
        group_name=result.group_name,
        course_slug=result.course_slug,
    )
