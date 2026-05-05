from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.modules.catalog.infra.models import Course, CourseLesson
from app.modules.support.infra.models import CourseHelpRequest, HelpRequestStatus
from app.modules.users.models import User


class SupportRepository:
    def __init__(self, db: Session):
        self.db = db

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
    ) -> CourseHelpRequest:
        item = CourseHelpRequest(
            requester_id=requester_id,
            request_type=request_type,
            message=message,
            course_id=course_id,
            lesson_id=lesson_id,
            screen_key=screen_key,
            screen_title=screen_title,
            status=HelpRequestStatus.NEW.value,
        )
        self.db.add(item)
        self.db.flush()
        return item

    def list_help_requests(
        self,
        *,
        status: str | None = None,
        request_type: str | None = None,
        course_id: UUID | None = None,
    ) -> list[CourseHelpRequest]:
        stmt: Select[tuple[CourseHelpRequest]] = select(CourseHelpRequest).order_by(
            CourseHelpRequest.created_at.desc()
        )
        if status:
            stmt = stmt.where(CourseHelpRequest.status == status)
        if request_type:
            stmt = stmt.where(CourseHelpRequest.request_type == request_type)
        if course_id:
            stmt = stmt.where(CourseHelpRequest.course_id == course_id)
        return list(self.db.scalars(stmt).all())

    def get_help_request(self, request_id: UUID) -> CourseHelpRequest | None:
        return self.db.get(CourseHelpRequest, request_id)

    def update_help_request(
        self,
        item: CourseHelpRequest,
        *,
        status: str,
        staff_comment: str | None,
        assigned_to_id: UUID,
    ) -> CourseHelpRequest:
        item.status = status
        item.staff_comment = staff_comment
        item.assigned_to_id = assigned_to_id
        self.db.flush()
        return item

    def get_course_titles(self, course_ids: set[UUID]) -> dict[UUID, str]:
        if not course_ids:
            return {}
        rows = self.db.execute(select(Course.id, Course.title).where(Course.id.in_(course_ids))).all()
        return {row[0]: row[1] for row in rows}

    def get_lesson_titles(self, lesson_ids: set[UUID]) -> dict[UUID, str]:
        if not lesson_ids:
            return {}
        rows = self.db.execute(
            select(CourseLesson.id, CourseLesson.title).where(CourseLesson.id.in_(lesson_ids))
        ).all()
        return {row[0]: row[1] for row in rows}

    def get_user_names(self, user_ids: set[UUID]) -> dict[UUID, str]:
        if not user_ids:
            return {}
        rows = self.db.execute(select(User.id, User.login, User.display_name).where(User.id.in_(user_ids))).all()
        return {row[0]: row[2] or row[1] or str(row[0]) for row in rows}
