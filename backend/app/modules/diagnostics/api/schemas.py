from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DiagnosticOptionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    text: str


class DiagnosticQuestionOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    competency_key: str
    competency_title: str
    prompt: str
    options: list[DiagnosticOptionOut]
    weight: int = Field(ge=1)
    order_index: int = Field(ge=1)


class DiagnosticBankOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    code: str
    title: str
    version: int
    questions: list[DiagnosticQuestionOut]


class DiagnosticAttemptOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    user_id: UUID
    bank_id: UUID
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    overall_score: float | None = None


class DiagnosticAnswerIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: UUID
    selected_option_key: str = Field(min_length=1, max_length=80)


class DiagnosticAnswerOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    attempt_id: UUID
    question_id: UUID
    selected_option_key: str
    answered_at: datetime


class DiagnosticCompetencyScoreOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    competency_key: str
    competency_title: str
    score: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)
    status: str


class DiagnosticResultOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attempt: DiagnosticAttemptOut
    scores: list[DiagnosticCompetencyScoreOut]


class LearningTrajectoryItemOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    course_id: UUID | None
    course_slug: str | None = None
    course_title: str | None = None
    competency_key: str
    reason: str
    priority: int
    status: str


class MyLearningTrajectoryOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    items: list[LearningTrajectoryItemOut]
