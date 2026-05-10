import pytest

from app.modules.diagnostics.domain.errors import DiagnosticsError
from app.modules.diagnostics.domain.services import DiagnosticsService
from app.modules.users.models import User, UserRole, UserStatus


def _create_user(db_session, login: str = "diagnostics-user") -> User:
    user = User(
        login=login,
        password_hash="hash",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
    )
    db_session.add(user)
    db_session.flush()
    return user


def test_start_attempt_creates_default_question_bank(db_session) -> None:
    user = _create_user(db_session)
    service = DiagnosticsService(db_session)

    attempt = service.start_attempt(user_id=user.id)
    bank, questions = service.get_active_bank()

    assert attempt.bank_id == bank.id
    assert len(questions) > 0


def test_complete_attempt_requires_all_questions_answered(db_session) -> None:
    user = _create_user(db_session)
    service = DiagnosticsService(db_session)
    attempt = service.start_attempt(user_id=user.id)

    with pytest.raises(DiagnosticsError, match="Diagnostic attempt has unanswered questions"):
        service.complete_attempt(user_id=user.id, attempt_id=attempt.id)


def test_course_completion_promotes_deficit_only_to_practice(db_session) -> None:
    user = _create_user(db_session)
    service = DiagnosticsService(db_session)
    course = service.catalog_repo.create_course(
        slug="security-practice",
        title="Практика безопасности",
        description="Практический курс",
        status="active",
        author_id=None,
    )
    attempt = service.start_attempt(user_id=user.id)
    service.repo.replace_competency_scores(
        attempt_id=attempt.id,
        scores=[
            {
                "competency_key": "security",
                "competency_title": "Кибербезопасность",
                "score": 0.25,
                "threshold": 0.8,
                "status": "deficit",
            }
        ],
    )
    service.repo.complete_attempt(attempt, overall_score=0.25)
    service.repo.replace_trajectory_items(
        user_id=user.id,
        attempt_id=attempt.id,
        items=[
            {
                "course_id": course.id,
                "competency_key": "security",
                "reason": "Закрыть дефицит",
                "priority": 1,
            }
        ],
    )

    service.apply_course_completion(user_id=user.id, course_id=course.id)

    score = service.repo.list_competency_scores(attempt.id)[0]
    trajectory = service.repo.list_trajectory_items(user.id)[0]
    assert score.status == "needs_practice"
    assert score.score == 0.5
    assert trajectory.status == "completed"


def test_complete_attempt_seeds_demo_courses_with_competency_links(db_session) -> None:
    user = _create_user(db_session)
    service = DiagnosticsService(db_session)
    attempt = service.start_attempt(user_id=user.id)
    _, questions = service.get_active_bank()
    for question in questions:
        wrong_option = next(
            option["key"]
            for option in question.options_json
            if option["key"] != question.correct_option_key
        )
        service.submit_answer(
            user_id=user.id,
            attempt_id=attempt.id,
            question_id=question.id,
            selected_option_key=wrong_option,
        )

    service.complete_attempt(user_id=user.id, attempt_id=attempt.id)

    trajectory = service.get_my_trajectory(user.id)
    assert {item.item.competency_key for item in trajectory} == {
        "gosuslugi",
        "banking",
        "messengers",
        "security",
    }
    assert all(item.course is not None for item in trajectory)
