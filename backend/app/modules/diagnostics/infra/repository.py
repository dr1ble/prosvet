from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.modules.diagnostics.infra.models import (
    DiagnosticAnswer,
    DiagnosticAttempt,
    DiagnosticAttemptStatus,
    DiagnosticCompetencyScore,
    DiagnosticQuestion,
    DiagnosticQuestionBank,
    LearningTrajectoryItem,
    LearningTrajectoryStatus,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DiagnosticsRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_question_bank(self, *, code: str, title: str, version: int) -> DiagnosticQuestionBank:
        bank = DiagnosticQuestionBank(code=code, title=title, version=version, is_active=True)
        self.db.add(bank)
        self.db.flush()
        return bank

    def create_question(
        self,
        *,
        bank_id: UUID,
        competency_key: str,
        competency_title: str,
        prompt: str,
        options: list[dict[str, Any]],
        correct_option_key: str,
        weight: int,
        order_index: int,
    ) -> DiagnosticQuestion:
        question = DiagnosticQuestion(
            bank_id=bank_id,
            competency_key=competency_key,
            competency_title=competency_title,
            prompt=prompt,
            options_json=options,
            correct_option_key=correct_option_key,
            weight=weight,
            order_index=order_index,
        )
        self.db.add(question)
        self.db.flush()
        return question

    def get_active_question_bank(self) -> DiagnosticQuestionBank | None:
        stmt = (
            select(DiagnosticQuestionBank)
            .where(DiagnosticQuestionBank.is_active.is_(True))
            .order_by(desc(DiagnosticQuestionBank.version), desc(DiagnosticQuestionBank.created_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_question_bank_by_code(self, code: str) -> DiagnosticQuestionBank | None:
        return self.db.scalar(select(DiagnosticQuestionBank).where(DiagnosticQuestionBank.code == code))

    def list_questions(self, bank_id: UUID) -> list[DiagnosticQuestion]:
        stmt = (
            select(DiagnosticQuestion)
            .where(DiagnosticQuestion.bank_id == bank_id)
            .order_by(DiagnosticQuestion.order_index.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_question(self, question_id: UUID) -> DiagnosticQuestion | None:
        return self.db.scalar(select(DiagnosticQuestion).where(DiagnosticQuestion.id == question_id))

    def create_attempt(self, *, user_id: UUID, bank_id: UUID) -> DiagnosticAttempt:
        attempt = DiagnosticAttempt(
            user_id=user_id,
            bank_id=bank_id,
            status=DiagnosticAttemptStatus.IN_PROGRESS.value,
        )
        self.db.add(attempt)
        self.db.flush()
        return attempt

    def get_attempt(self, attempt_id: UUID) -> DiagnosticAttempt | None:
        return self.db.scalar(select(DiagnosticAttempt).where(DiagnosticAttempt.id == attempt_id))

    def upsert_answer(
        self,
        attempt_id: UUID,
        question_id: UUID,
        selected_option_key: str,
        *,
        is_correct: bool,
        score: float,
    ) -> DiagnosticAnswer:
        stmt = select(DiagnosticAnswer).where(
            DiagnosticAnswer.attempt_id == attempt_id,
            DiagnosticAnswer.question_id == question_id,
        )
        answer = self.db.scalar(stmt)
        if answer is None:
            answer = DiagnosticAnswer(
                attempt_id=attempt_id,
                question_id=question_id,
                selected_option_key=selected_option_key,
                is_correct=is_correct,
                score=score,
            )
            self.db.add(answer)
        else:
            answer.selected_option_key = selected_option_key
            answer.is_correct = is_correct
            answer.score = score
            answer.answered_at = _utcnow()
        self.db.flush()
        return answer

    def list_answers(self, attempt_id: UUID) -> list[DiagnosticAnswer]:
        stmt = select(DiagnosticAnswer).where(DiagnosticAnswer.attempt_id == attempt_id)
        return list(self.db.scalars(stmt).all())

    def complete_attempt(self, attempt: DiagnosticAttempt, overall_score: float) -> DiagnosticAttempt:
        attempt.status = DiagnosticAttemptStatus.COMPLETED.value
        attempt.completed_at = _utcnow()
        attempt.overall_score = overall_score
        self.db.flush()
        return attempt

    def replace_competency_scores(
        self,
        *,
        attempt_id: UUID,
        scores: list[dict[str, Any]],
    ) -> list[DiagnosticCompetencyScore]:
        self.db.execute(
            delete(DiagnosticCompetencyScore).where(DiagnosticCompetencyScore.attempt_id == attempt_id)
        )
        rows = [DiagnosticCompetencyScore(attempt_id=attempt_id, **score) for score in scores]
        self.db.add_all(rows)
        self.db.flush()
        return rows

    def get_latest_completed_attempt(self, user_id: UUID) -> DiagnosticAttempt | None:
        stmt = (
            select(DiagnosticAttempt)
            .where(
                DiagnosticAttempt.user_id == user_id,
                DiagnosticAttempt.status == DiagnosticAttemptStatus.COMPLETED.value,
            )
            .order_by(desc(DiagnosticAttempt.completed_at), desc(DiagnosticAttempt.started_at))
            .limit(1)
        )
        return self.db.scalar(stmt)

    def list_competency_scores(self, attempt_id: UUID) -> list[DiagnosticCompetencyScore]:
        stmt = (
            select(DiagnosticCompetencyScore)
            .where(DiagnosticCompetencyScore.attempt_id == attempt_id)
            .order_by(DiagnosticCompetencyScore.status.asc(), DiagnosticCompetencyScore.competency_title.asc())
        )
        return list(self.db.scalars(stmt).all())

    def replace_trajectory_items(
        self,
        *,
        user_id: UUID,
        attempt_id: UUID,
        items: list[dict[str, Any]],
    ) -> list[LearningTrajectoryItem]:
        self.db.execute(delete(LearningTrajectoryItem).where(LearningTrajectoryItem.user_id == user_id))
        rows = [
            LearningTrajectoryItem(
                user_id=user_id,
                attempt_id=attempt_id,
                status=LearningTrajectoryStatus.RECOMMENDED.value,
                **item,
            )
            for item in items
        ]
        self.db.add_all(rows)
        self.db.flush()
        return rows

    def list_trajectory_items(self, user_id: UUID) -> list[LearningTrajectoryItem]:
        stmt = (
            select(LearningTrajectoryItem)
            .where(LearningTrajectoryItem.user_id == user_id)
            .order_by(LearningTrajectoryItem.priority.asc(), LearningTrajectoryItem.created_at.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_trajectory_item_for_course(
        self,
        *,
        user_id: UUID,
        course_id: UUID,
    ) -> LearningTrajectoryItem | None:
        stmt = (
            select(LearningTrajectoryItem)
            .where(
                LearningTrajectoryItem.user_id == user_id,
                LearningTrajectoryItem.course_id == course_id,
            )
            .order_by(LearningTrajectoryItem.priority.asc())
            .limit(1)
        )
        return self.db.scalar(stmt)

    def get_competency_score(
        self,
        *,
        attempt_id: UUID,
        competency_key: str,
    ) -> DiagnosticCompetencyScore | None:
        stmt = select(DiagnosticCompetencyScore).where(
            DiagnosticCompetencyScore.attempt_id == attempt_id,
            DiagnosticCompetencyScore.competency_key == competency_key,
        )
        return self.db.scalar(stmt)

    def update_competency_score(
        self,
        score: DiagnosticCompetencyScore,
        *,
        value: float,
        status: str,
    ) -> DiagnosticCompetencyScore:
        score.score = value
        score.status = status
        self.db.flush()
        return score

    def update_trajectory_item_status(
        self,
        item: LearningTrajectoryItem,
        *,
        status: str,
    ) -> LearningTrajectoryItem:
        item.status = status
        self.db.flush()
        return item
