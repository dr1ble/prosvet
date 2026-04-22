from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.modules.progress.domain.errors import ProgressError
from app.modules.progress.domain.services import ProgressService


class _FakeProgressRepo:
    def __init__(self) -> None:
        self.last_completed_from = None
        self.last_completed_to = None
        self.course_ids_for_user = set()
        self.completed_map = {}
        self.total_map = {}
        self.courses_map = {}

    def list_assignments(self, group_id=None, course_id=None):
        return []

    def get_assignment_targets(self, assignments):
        return []

    def get_groups_map(self, group_ids):
        return {}

    def get_users_map(self, user_ids):
        return {}

    def get_course_lessons_count(self, course_ids):
        return self.total_map

    def get_completed_lessons_count(
        self,
        course_ids,
        user_ids,
        completed_from=None,
        completed_to=None,
    ):
        self.last_completed_from = completed_from
        self.last_completed_to = completed_to
        return self.completed_map

    def get_courses_with_progress_for_user(self, user_id):
        return self.course_ids_for_user

    def get_courses_map(self, course_ids):
        return self.courses_map


def _build_service_with_fake_repo() -> tuple[ProgressService, _FakeProgressRepo]:
    service = ProgressService(db=None)  # type: ignore[arg-type]
    fake_repo = _FakeProgressRepo()
    service.repo = fake_repo
    return service, fake_repo


def test_progress_service_applies_7d_window_to_completed_lessons_query() -> None:
    service, fake_repo = _build_service_with_fake_repo()

    rows = service.get_overview(group_id=None, course_id=None, user_id=None, period="7d")

    assert rows == []
    assert fake_repo.last_completed_from is not None
    assert fake_repo.last_completed_to is not None
    assert fake_repo.last_completed_to >= fake_repo.last_completed_from
    window = fake_repo.last_completed_to - fake_repo.last_completed_from
    assert timedelta(days=6, hours=23) <= window <= timedelta(days=7, hours=1)


def test_progress_service_requires_dates_for_custom_period() -> None:
    service, _ = _build_service_with_fake_repo()

    with pytest.raises(ProgressError) as exc_info:
        service.get_overview(group_id=None, course_id=None, user_id=None, period="custom")

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "date_from and date_to are required when period=custom."


def test_progress_service_rejects_invalid_custom_range_order() -> None:
    service, _ = _build_service_with_fake_repo()

    date_from = datetime.now(timezone.utc)
    date_to = date_from - timedelta(days=1)

    with pytest.raises(ProgressError) as exc_info:
        service.get_overview(
            group_id=None,
            course_id=None,
            user_id=None,
            period="custom",
            date_from=date_from,
            date_to=date_to,
        )

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "date_from must be less than or equal to date_to."


def test_progress_service_returns_my_progress_summary() -> None:
    service, fake_repo = _build_service_with_fake_repo()
    user_id = uuid4()
    course_id = uuid4()
    fake_repo.course_ids_for_user = {course_id}
    fake_repo.total_map = {course_id: 8}
    fake_repo.completed_map = {(course_id, user_id): 3}
    fake_repo.courses_map = {course_id: SimpleNamespace(title="Course A")}

    result = service.get_my_progress(user_id=user_id)

    assert result.user_id == user_id
    assert len(result.courses) == 1
    assert result.courses[0].course_id == course_id
    assert result.courses[0].completed_lessons == 3
    assert result.courses[0].total_lessons == 8
