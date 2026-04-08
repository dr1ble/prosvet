from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.progress.api.schemas import ProgressOverviewRowOut
from app.modules.progress.domain.errors import ProgressError
from app.modules.progress.infra.repository import ProgressRepository


class ProgressService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ProgressRepository(db)

    def get_overview(
        self,
        group_id: UUID | None,
        course_id: UUID | None,
        user_id: UUID | None,
        period: Literal["all", "7d", "14d", "30d", "90d", "custom"] = "all",
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[ProgressOverviewRowOut]:
        completed_from, completed_to = self._resolve_time_window(
            period=period,
            date_from=date_from,
            date_to=date_to,
        )

        assignments = self.repo.list_assignments(group_id=group_id, course_id=course_id)
        assignment_targets = self.repo.get_assignment_targets(assignments)

        course_ids = {item.assignment.course_id for item in assignment_targets}
        group_ids = {item.assignment.group_id for item in assignment_targets}
        user_ids = (
            set().union(*(item.user_ids for item in assignment_targets))
            if assignment_targets
            else set()
        )

        if user_id is not None:
            user_ids = {user_id}

        groups_map = self.repo.get_groups_map(group_ids)
        courses_map = self.repo.get_courses_map(course_ids)
        users_map = self.repo.get_users_map(user_ids)

        total_lessons_map = self.repo.get_course_lessons_count(course_ids)
        completed_map = self.repo.get_completed_lessons_count(
            course_ids=course_ids,
            user_ids=user_ids,
            completed_from=completed_from,
            completed_to=completed_to,
        )

        rows: list[ProgressOverviewRowOut] = []
        for item in assignment_targets:
            assignment = item.assignment
            course = courses_map.get(assignment.course_id)
            group = groups_map.get(assignment.group_id)
            if course is None or group is None:
                continue

            targets = set(item.user_ids)
            if user_id is not None:
                targets = {uid for uid in targets if uid == user_id}
            if not targets:
                continue

            total_lessons = total_lessons_map.get(course.id, 0)
            for target_user_id in sorted(targets):
                user = users_map.get(target_user_id)
                if user is None:
                    continue
                completed_lessons = completed_map.get((course.id, target_user_id), 0)
                completion_rate = (
                    float(completed_lessons) / float(total_lessons) if total_lessons > 0 else 0.0
                )
                rows.append(
                    ProgressOverviewRowOut(
                        assignment_id=assignment.id,
                        assignment_status=assignment.status,
                        group_id=group.id,
                        group_name=group.name,
                        course_id=course.id,
                        course_title=course.title,
                        user_id=user.id,
                        user_login=user.login,
                        user_display_name=user.display_name,
                        total_lessons=total_lessons,
                        completed_lessons=completed_lessons,
                        completion_rate=completion_rate,
                    )
                )

        rows.sort(
            key=lambda row: (
                row.group_name.lower(),
                row.course_title.lower(),
                row.user_display_name or "",
            )
        )
        return rows

    def _resolve_time_window(
        self,
        *,
        period: Literal["all", "7d", "14d", "30d", "90d", "custom"],
        date_from: datetime | None,
        date_to: datetime | None,
    ) -> tuple[datetime | None, datetime | None]:
        if period == "all":
            return None, None

        now = datetime.now(timezone.utc)
        rolling_days: dict[str, int] = {
            "7d": 7,
            "14d": 14,
            "30d": 30,
            "90d": 90,
        }
        if period in rolling_days:
            return now - timedelta(days=rolling_days[period]), now

        if date_from is None or date_to is None:
            raise ProgressError(
                "date_from and date_to are required when period=custom.",
                status_code=422,
            )
        if date_from > date_to:
            raise ProgressError("date_from must be less than or equal to date_to.", status_code=422)
        return date_from, date_to

    def upsert_lesson_progress(self, user_id: UUID, lesson_id: UUID, status: str):
        if status not in {"in_progress", "completed"}:
            raise ProgressError("Unsupported progress status.", status_code=422)
        return self.repo.upsert_lesson_progress(user_id=user_id, lesson_id=lesson_id, status=status)
