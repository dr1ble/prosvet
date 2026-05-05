from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProgressOverviewRowOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assignment_id: UUID
    assignment_status: str
    group_id: UUID
    group_name: str
    course_id: UUID
    course_title: str
    user_id: UUID
    user_login: str | None
    user_display_name: str | None
    total_lessons: int
    completed_lessons: int
    completion_rate: float = Field(ge=0.0, le=1.0)


class LessonProgressUpsertIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    lesson_id: UUID
    status: str = Field(pattern=r"^(in_progress|completed)$")


class LessonProgressOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    user_id: UUID
    lesson_id: UUID
    status: str


class MyCourseProgressOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_id: UUID
    course_title: str
    total_lessons: int
    completed_lessons: int
    completion_rate: float = Field(ge=0.0, le=1.0)


class MyProgressOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    courses: list[MyCourseProgressOut]


class GlossaryTermOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    lesson_id: UUID
    course_id: UUID
    course_title: str
    term: str
    definition: str
    example: str | None = None
    is_bookmarked: bool = False
    unlocked_at: datetime


class MyGlossaryOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    terms: list[GlossaryTermOut]


class LessonNoteCreateIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: UUID
    content: str = Field(min_length=1, max_length=4000)


class LessonNoteOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    lesson_id: UUID
    course_id: UUID
    course_title: str
    lesson_title: str
    content: str
    created_at: datetime
    updated_at: datetime


class MyLessonNotesOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    notes: list[LessonNoteOut]
