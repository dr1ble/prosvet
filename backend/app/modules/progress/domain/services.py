from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.progress.api.schemas import (
    GlossaryTermOut,
    LessonNoteOut,
    MyCourseProgressOut,
    MyGlossaryOut,
    MyLessonNotesOut,
    MyProgressOut,
    ProgressOverviewRowOut,
    ProgressTimeseriesPointOut,
)
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

    def get_timeseries(
        self,
        period: Literal["all", "7d", "14d", "30d", "90d", "custom"] = "all",
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> list[ProgressTimeseriesPointOut]:
        completed_from, completed_to = self._resolve_time_window(
            period=period,
            date_from=date_from,
            date_to=date_to,
        )
        points = self.repo.get_completed_lessons_timeseries(
            completed_from=completed_from,
            completed_to=completed_to,
        )
        return [
            ProgressTimeseriesPointOut(
                date=point_date,
                completed_lessons_count=completed_count,
            )
            for point_date, completed_count in points
        ]

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
        item = self.repo.upsert_lesson_progress(user_id=user_id, lesson_id=lesson_id, status=status)
        if status == "completed":
            self.repo.unlock_glossary_terms(user_id=user_id, lesson_id=lesson_id)
        return item

    def get_my_progress(self, user_id: UUID) -> MyProgressOut:
        course_ids = self.repo.get_courses_with_progress_for_user(user_id)
        if not course_ids:
            return MyProgressOut(user_id=user_id, courses=[])
        courses_map = self.repo.get_courses_map(course_ids)
        total_map = self.repo.get_course_lessons_count(course_ids)
        completed_map = self.repo.get_completed_lessons_count(
            course_ids=course_ids,
            user_ids={user_id},
        )
        rows: list[MyCourseProgressOut] = []
        for cid in sorted(course_ids):
            course = courses_map.get(cid)
            if course is None:
                continue
            total = total_map.get(cid, 0)
            completed = completed_map.get((cid, user_id), 0)
            rate = float(completed) / float(total) if total > 0 else 0.0
            rows.append(
                MyCourseProgressOut(
                    course_id=cid,
                    course_title=course.title,
                    total_lessons=total,
                    completed_lessons=completed,
                    completion_rate=rate,
                )
            )
        return MyProgressOut(user_id=user_id, courses=rows)

    def get_my_glossary(self, user_id: UUID) -> MyGlossaryOut:
        rows = self.repo.list_user_glossary_terms(user_id=user_id)
        return MyGlossaryOut(
            user_id=user_id,
            terms=[
                GlossaryTermOut(
                    id=row.id,
                    lesson_id=row.lesson_id,
                    course_id=row.course_id,
                    course_title=row.course_title,
                    term=row.term,
                    definition=row.definition,
                    example=row.example,
                    is_bookmarked=row.is_bookmarked,
                    unlocked_at=row.unlocked_at,
                )
                for row in rows
            ],
        )

    def set_my_glossary_bookmark(self, user_id: UUID, term_id: UUID, is_bookmarked: bool):
        item = self.repo.set_glossary_term_bookmark(
            user_id=user_id,
            term_id=term_id,
            is_bookmarked=is_bookmarked,
        )
        if item is None:
            raise ProgressError("Glossary term not unlocked.", status_code=404)
        return item

    def create_my_note(self, user_id: UUID, lesson_id: UUID, content: str):
        normalized = content.strip()
        if not normalized:
            raise ProgressError("Note content is empty.", status_code=422)
        item = self.repo.create_user_note(
            user_id=user_id,
            lesson_id=lesson_id,
            content=normalized,
        )
        if item is None:
            raise ProgressError("Lesson not found.", status_code=404)
        row = self.repo.get_user_note_row(user_id=user_id, note_id=item.id)
        if row is None:
            raise ProgressError("Note not found.", status_code=404)
        return self._to_note_out(row)

    def get_my_notes(self, user_id: UUID) -> MyLessonNotesOut:
        rows = self.repo.list_user_notes(user_id=user_id)
        return MyLessonNotesOut(
            user_id=user_id,
            notes=[self._to_note_out(row) for row in rows],
        )

    def delete_my_note(self, user_id: UUID, note_id: UUID) -> None:
        deleted = self.repo.delete_user_note(user_id=user_id, note_id=note_id)
        if not deleted:
            raise ProgressError("Note not found.", status_code=404)

    def _to_note_out(self, row) -> LessonNoteOut:
        return LessonNoteOut(
            id=row.id,
            lesson_id=row.lesson_id,
            course_id=row.course_id,
            course_title=row.course_title,
            lesson_title=row.lesson_title,
            content=row.content,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
