from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.support.domain.errors import SupportError
from app.modules.support.infra.models import CourseHelpRequest, HelpRequestStatus, HelpRequestType
from app.modules.support.infra.repository import SupportRepository


@dataclass(frozen=True)
class HelpRequestDto:
    id: UUID
    requester_id: UUID
    requester_name: str | None
    assigned_to_id: UUID | None
    assigned_to_name: str | None
    course_id: UUID | None
    course_title: str | None
    lesson_id: UUID | None
    lesson_title: str | None
    screen_key: str | None
    screen_title: str | None
    request_type: str
    status: str
    message: str
    staff_comment: str | None
    is_staff_reply_unread: bool
    created_at: datetime
    updated_at: datetime


class SupportService:
    def __init__(self, db: Session):
        self.repo = SupportRepository(db)

    def create_help_request(
        self,
        *,
        requester_id: UUID,
        request_type: str,
        message: str,
        course_id: UUID | None = None,
        lesson_id: UUID | None = None,
        screen_key: str | None = None,
        screen_title: str | None = None,
    ) -> HelpRequestDto:
        normalized_type = self._normalize_request_type(request_type)
        normalized_message = self._normalize_required_text(message, "Help request message is empty.")
        item = self.repo.create_help_request(
            requester_id=requester_id,
            request_type=normalized_type,
            message=normalized_message,
            course_id=course_id,
            lesson_id=lesson_id,
            screen_key=self._normalize_optional_text(screen_key, 120),
            screen_title=self._normalize_optional_text(screen_title, 255),
        )
        return self._to_dto(item)

    def list_help_requests(
        self,
        *,
        status: str | None = None,
        request_type: str | None = None,
        course_id: UUID | None = None,
    ) -> list[HelpRequestDto]:
        normalized_status = self._normalize_status(status) if status else None
        normalized_type = self._normalize_request_type(request_type) if request_type else None
        items = self.repo.list_help_requests(
            status=normalized_status,
            request_type=normalized_type,
            course_id=course_id,
        )
        return self._to_dtos(items)

    def update_help_request(
        self,
        *,
        request_id: UUID,
        status: str,
        staff_comment: str | None,
        actor_id: UUID,
    ) -> HelpRequestDto:
        item = self.repo.get_help_request(request_id)
        if item is None:
            raise SupportError("Help request not found.", status_code=404)
        item = self.repo.update_help_request(
            item,
            status=self._normalize_status(status),
            staff_comment=self._normalize_optional_text(staff_comment, 2000),
            assigned_to_id=actor_id,
        )
        return self._to_dto(item)

    def list_my_help_requests(self, *, requester_id: UUID) -> tuple[list[HelpRequestDto], bool]:
        items = self.repo.list_help_requests_for_requester(requester_id)
        requests = self._to_dtos(items)
        has_unread = any(item.is_staff_reply_unread for item in requests)
        return requests, has_unread

    def mark_my_help_replies_read(self, *, requester_id: UUID) -> None:
        self.repo.mark_staff_replies_viewed(requester_id)

    def _to_dtos(self, items: list[CourseHelpRequest]) -> list[HelpRequestDto]:
        course_titles = self.repo.get_course_titles({item.course_id for item in items if item.course_id})
        lesson_titles = self.repo.get_lesson_titles({item.lesson_id for item in items if item.lesson_id})
        user_ids = {item.requester_id for item in items}
        user_ids.update(item.assigned_to_id for item in items if item.assigned_to_id)
        user_names = self.repo.get_user_names(user_ids)
        return [self._to_dto(item, course_titles, lesson_titles, user_names) for item in items]

    def _to_dto(
        self,
        item: CourseHelpRequest,
        course_titles: dict[UUID, str] | None = None,
        lesson_titles: dict[UUID, str] | None = None,
        user_names: dict[UUID, str] | None = None,
    ) -> HelpRequestDto:
        course_titles = course_titles or self.repo.get_course_titles({item.course_id} if item.course_id else set())
        lesson_titles = lesson_titles or self.repo.get_lesson_titles({item.lesson_id} if item.lesson_id else set())
        user_ids = {item.requester_id}
        if item.assigned_to_id:
            user_ids.add(item.assigned_to_id)
        user_names = user_names or self.repo.get_user_names(user_ids)
        return HelpRequestDto(
            id=item.id,
            requester_id=item.requester_id,
            requester_name=user_names.get(item.requester_id),
            assigned_to_id=item.assigned_to_id,
            assigned_to_name=user_names.get(item.assigned_to_id) if item.assigned_to_id else None,
            course_id=item.course_id,
            course_title=course_titles.get(item.course_id) if item.course_id else None,
            lesson_id=item.lesson_id,
            lesson_title=lesson_titles.get(item.lesson_id) if item.lesson_id else None,
            screen_key=item.screen_key,
            screen_title=item.screen_title,
            request_type=item.request_type,
            status=item.status,
            message=item.message,
            staff_comment=item.staff_comment,
            is_staff_reply_unread=self._is_staff_reply_unread(item),
            created_at=item.created_at,
            updated_at=item.updated_at,
        )

    @staticmethod
    def _is_staff_reply_unread(item: CourseHelpRequest) -> bool:
        if not item.staff_comment:
            return False
        if item.student_viewed_staff_reply_at is None:
            return True
        return item.student_viewed_staff_reply_at < item.updated_at

    @staticmethod
    def _normalize_request_type(value: str) -> str:
        normalized = value.strip()
        allowed = {item.value for item in HelpRequestType}
        if normalized not in allowed:
            raise SupportError("Unsupported help request type.", status_code=422)
        return normalized

    @staticmethod
    def _normalize_status(value: str | None) -> str:
        normalized = (value or "").strip()
        allowed = {item.value for item in HelpRequestStatus}
        if normalized not in allowed:
            raise SupportError("Unsupported help request status.", status_code=422)
        return normalized

    @staticmethod
    def _normalize_required_text(value: str, error_detail: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise SupportError(error_detail, status_code=422)
        return normalized[:2000]

    @staticmethod
    def _normalize_optional_text(value: str | None, max_length: int) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized[:max_length] or None
