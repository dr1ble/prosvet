import enum
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DiagnosticAttemptStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class DiagnosticCompetencyStatus(str, enum.Enum):
    STRONG = "strong"
    NEEDS_PRACTICE = "needs_practice"
    DEFICIT = "deficit"


class LearningTrajectoryStatus(str, enum.Enum):
    RECOMMENDED = "recommended"
    STARTED = "started"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class DiagnosticQuestionBank(Base):
    __tablename__ = "diagnostic_question_banks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class DiagnosticQuestion(Base):
    __tablename__ = "diagnostic_questions"
    __table_args__ = (
        UniqueConstraint("bank_id", "order_index", name="uq_diagnostic_question_bank_order"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bank_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_question_banks.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    competency_key: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    competency_title: Mapped[str] = mapped_column(String(160), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    correct_option_key: Mapped[str] = mapped_column(String(80), nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)


class DiagnosticAttempt(Base):
    __tablename__ = "diagnostic_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    bank_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_question_banks.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(24),
        default=DiagnosticAttemptStatus.IN_PROGRESS.value,
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    overall_score: Mapped[float | None] = mapped_column(Float, nullable=True)


class DiagnosticAnswer(Base):
    __tablename__ = "diagnostic_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_diagnostic_answer_attempt_question"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_attempts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_questions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    selected_option_key: Mapped[str] = mapped_column(String(80), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class DiagnosticCompetencyScore(Base):
    __tablename__ = "diagnostic_competency_scores"
    __table_args__ = (
        UniqueConstraint("attempt_id", "competency_key", name="uq_diagnostic_score_attempt_competency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_attempts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    competency_key: Mapped[str] = mapped_column(String(80), nullable=False)
    competency_title: Mapped[str] = mapped_column(String(160), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)


class LearningTrajectoryItem(Base):
    __tablename__ = "learning_trajectory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("diagnostic_attempts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    competency_key: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(24),
        default=LearningTrajectoryStatus.RECOMMENDED.value,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
