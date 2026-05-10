from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class HelpRequestCreateIn(BaseModel):
    request_type: str = Field(..., min_length=1, max_length=32)
    message: str = Field(..., min_length=1, max_length=2000)
    course_id: UUID | None = None
    lesson_id: UUID | None = None
    screen_key: str | None = Field(default=None, max_length=120)
    screen_title: str | None = Field(default=None, max_length=255)


class HelpRequestUpdateIn(BaseModel):
    status: str = Field(..., min_length=1, max_length=24)
    staff_comment: str | None = Field(default=None, max_length=2000)


class HelpRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requester_id: UUID
    requester_name: str | None = None
    assigned_to_id: UUID | None = None
    assigned_to_name: str | None = None
    course_id: UUID | None = None
    course_title: str | None = None
    lesson_id: UUID | None = None
    lesson_title: str | None = None
    screen_key: str | None = None
    screen_title: str | None = None
    request_type: str
    status: str
    message: str
    staff_comment: str | None = None
    is_staff_reply_unread: bool = False
    created_at: datetime
    updated_at: datetime


class HelpRequestsOut(BaseModel):
    requests: list[HelpRequestOut]


class MyHelpRequestsOut(BaseModel):
    requests: list[HelpRequestOut]
    has_unread_staff_replies: bool
