from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.modules.diagnostics.api.schemas import (
    DiagnosticAnswerIn,
    DiagnosticAnswerOut,
    DiagnosticAttemptOut,
    DiagnosticBankOut,
    DiagnosticCompetencyScoreOut,
    DiagnosticOptionOut,
    DiagnosticQuestionOut,
    DiagnosticResultOut,
    LearningTrajectoryItemOut,
    MyLearningTrajectoryOut,
)
from app.modules.diagnostics.domain.errors import DiagnosticsError
from app.modules.diagnostics.domain.services import DiagnosticResultDetails
from app.modules.diagnostics.infra.models import (
    DiagnosticAnswer,
    DiagnosticAttempt,
    DiagnosticQuestion,
)
from app.shared.auth.deps import require_policy
from app.shared.auth.schemas import CurrentActor
from app.shared.di.services import DiagnosticsServiceDep

router = APIRouter()

_DIAGNOSTICS_ERROR_RU: dict[str, str] = {
    "Diagnostic attempt not found.": "Диагностика не найдена.",
    "Diagnostic question not found.": "Вопрос диагностики не найден.",
    "Diagnostic answer option not found.": "Вариант ответа не найден.",
    "Diagnostic attempt is already completed.": "Диагностика уже завершена.",
    "Diagnostic attempt has unanswered questions.": "Ответьте на все вопросы диагностики.",
}


def _localize_diagnostics_error(detail: str) -> str:
    return _DIAGNOSTICS_ERROR_RU.get(detail, detail)


@router.get("/active", response_model=DiagnosticBankOut)
def get_active_diagnostic(
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> DiagnosticBankOut:
    bank, questions = service.get_active_bank()
    return DiagnosticBankOut(
        id=bank.id,
        code=bank.code,
        title=bank.title,
        version=bank.version,
        questions=[_question_out(question) for question in questions],
    )


@router.post("/attempts", response_model=DiagnosticAttemptOut)
def start_diagnostic_attempt(
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> DiagnosticAttemptOut:
    return _attempt_out(service.start_attempt(user_id=_actor.user_id))


@router.post("/attempts/{attempt_id}/answers", response_model=DiagnosticAnswerOut)
def submit_diagnostic_answer(
    attempt_id: UUID,
    payload: DiagnosticAnswerIn,
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> DiagnosticAnswerOut:
    try:
        answer = service.submit_answer(
            user_id=_actor.user_id,
            attempt_id=attempt_id,
            question_id=payload.question_id,
            selected_option_key=payload.selected_option_key,
        )
    except DiagnosticsError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=_localize_diagnostics_error(exc.detail),
        ) from exc
    return _answer_out(answer)


@router.post("/attempts/{attempt_id}/complete", response_model=DiagnosticResultOut)
def complete_diagnostic_attempt(
    attempt_id: UUID,
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.upsert.self")),
) -> DiagnosticResultOut:
    try:
        result = service.complete_attempt(user_id=_actor.user_id, attempt_id=attempt_id)
    except DiagnosticsError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=_localize_diagnostics_error(exc.detail),
        ) from exc
    return _result_out(result)


@router.get("/me/latest", response_model=DiagnosticResultOut | None)
def get_my_latest_diagnostic_result(
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> DiagnosticResultOut | None:
    result = service.get_latest_result(user_id=_actor.user_id)
    return _result_out(result) if result is not None else None


@router.get("/me/trajectory", response_model=MyLearningTrajectoryOut)
def get_my_learning_trajectory(
    service: DiagnosticsServiceDep,
    _actor: CurrentActor = Depends(require_policy("progress.view.self")),
) -> MyLearningTrajectoryOut:
    return MyLearningTrajectoryOut(
        user_id=_actor.user_id,
        items=[
            LearningTrajectoryItemOut(
                id=entry.item.id,
                course_id=entry.item.course_id,
                course_slug=entry.course.slug if entry.course is not None else None,
                course_title=entry.course.title if entry.course is not None else None,
                competency_key=entry.item.competency_key,
                reason=entry.item.reason,
                priority=entry.item.priority,
                status=entry.item.status,
            )
            for entry in service.get_my_trajectory(user_id=_actor.user_id)
        ],
    )


def _question_out(question: DiagnosticQuestion) -> DiagnosticQuestionOut:
    return DiagnosticQuestionOut(
        id=question.id,
        competency_key=question.competency_key,
        competency_title=question.competency_title,
        prompt=question.prompt,
        options=[
            DiagnosticOptionOut(key=str(option.get("key")), text=str(option.get("text")))
            for option in question.options_json
        ],
        weight=question.weight,
        order_index=question.order_index,
    )


def _attempt_out(attempt: DiagnosticAttempt) -> DiagnosticAttemptOut:
    return DiagnosticAttemptOut(
        id=attempt.id,
        user_id=attempt.user_id,
        bank_id=attempt.bank_id,
        status=attempt.status,
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        overall_score=attempt.overall_score,
    )


def _answer_out(answer: DiagnosticAnswer) -> DiagnosticAnswerOut:
    return DiagnosticAnswerOut(
        id=answer.id,
        attempt_id=answer.attempt_id,
        question_id=answer.question_id,
        selected_option_key=answer.selected_option_key,
        answered_at=answer.answered_at,
    )


def _result_out(result: DiagnosticResultDetails) -> DiagnosticResultOut:
    return DiagnosticResultOut(
        attempt=_attempt_out(result.attempt),
        scores=[
            DiagnosticCompetencyScoreOut(
                id=score.id,
                competency_key=score.competency_key,
                competency_title=score.competency_title,
                score=score.score,
                threshold=score.threshold,
                status=score.status,
            )
            for score in result.scores
        ],
    )
