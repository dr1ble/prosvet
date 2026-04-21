from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SubmitForReviewIn(_BaseSchema):
    comment: str | None = Field(default=None, max_length=5_000)


class ApproveReleaseIn(_BaseSchema):
    comment: str | None = Field(default=None, max_length=5_000)


class RejectReleaseIn(_BaseSchema):
    comment: str = Field(min_length=10, max_length=5_000)


class ModerationReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    release_id: UUID
    reviewer_user_id: UUID
    decision: str
    comment: str | None
    decided_at: datetime
    created_at: datetime


class ModerationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    release_id: UUID
    from_status: str
    to_status: str
    actor_user_id: UUID
    reason: str | None
    changed_at: datetime


class PendingReleaseOut(BaseModel):
    release_id: UUID
    course_id: UUID
    version: str
    status: str
    submitted_at: datetime
    author_id: UUID | None = None
