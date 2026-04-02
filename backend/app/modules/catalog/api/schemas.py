import base64
from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CourseCreateIn(_BaseSchema):
    slug: str = Field(min_length=3, max_length=100, pattern=r"^[A-Za-z0-9][A-Za-z0-9_\-\s]{2,99}$")
    title: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    status: Literal["draft", "active", "archived"] = "draft"

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("slug must not be empty")
        return normalized


class CourseUpdateIn(_BaseSchema):
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    status: Literal["draft", "active", "archived"] | None = None


class CourseListQuery(_BaseSchema):
    include_drafts: bool = False
    include_archived: bool = False


class ReleaseListQuery(_BaseSchema):
    status: Literal["draft", "published"] | None = None
    version_query: str | None = Field(default=None, max_length=32)
    limit: int = Field(default=50, ge=1, le=200)

    @field_validator("version_query")
    @classmethod
    def normalize_version_query(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ReleaseScreenIn(_BaseSchema):
    screen_key: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9][a-z0-9_.-]{2,119}$")
    title: str = Field(min_length=2, max_length=255)
    order_index: int = Field(ge=1, le=10_000)
    payload: dict[str, Any]


class CourseReleaseCreateIn(_BaseSchema):
    version: str = Field(min_length=5, max_length=32, pattern=r"^\d+\.\d+\.\d+$")
    changelog: str | None = Field(default=None, max_length=10_000)
    status: Literal["draft", "published"] = "draft"
    screens: list[ReleaseScreenIn] = Field(min_length=1, max_length=300)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    description: str | None
    cover_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class CourseReleaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    version: str
    changelog: str | None
    status: str
    published_at: datetime | None
    created_at: datetime
    screen_count: int


class ReleaseScreenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    release_id: UUID
    screen_key: str
    title: str
    order_index: int
    payload: dict[str, Any]
    checksum: str
    created_at: datetime


class CourseBundleOut(_BaseSchema):
    course: CourseOut
    release: CourseReleaseOut
    screens: list[ReleaseScreenOut]


class CourseLessonCreateIn(_BaseSchema):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)


class CourseLessonUpdateIn(_BaseSchema):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    status: Literal["draft", "active", "archived"]


class CourseLessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    title: str
    description: str | None
    order_index: int
    status: str
    created_at: datetime
    updated_at: datetime


class CourseLessonReorderIn(_BaseSchema):
    order_index: int = Field(ge=1, le=10_000)


class LessonTaskCreateIn(_BaseSchema):
    task_type: Literal[
        "theory_text",
        "theory_video",
        "quiz",
        "simulation",
        "cheat_sheet",
    ]
    title: str = Field(min_length=2, max_length=255)
    required: bool = True
    payload: dict[str, Any]


class LessonTaskUpdateIn(_BaseSchema):
    title: str = Field(min_length=2, max_length=255)
    required: bool = True
    payload: dict[str, Any]


class LessonTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lesson_id: UUID
    task_type: str
    title: str
    order_index: int
    required: bool
    payload: dict[str, Any]
    checksum: str
    created_at: datetime


class LessonTaskReorderIn(_BaseSchema):
    order_index: int = Field(ge=1, le=10_000)


class BulkTaskUpdateIn(_BaseSchema):
    id: UUID | None = None
    task_type: Literal["theory_text", "theory_video", "quiz", "simulation", "cheat_sheet"]
    title: str = Field(min_length=2, max_length=255)
    order_index: int = Field(ge=0, le=10_000)
    required: bool = True
    payload: dict[str, Any]


class BulkLessonUpdateIn(_BaseSchema):
    id: UUID | None = None
    title: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    order_index: int = Field(ge=0, le=10_000)
    tasks: list[BulkTaskUpdateIn] = Field(default_factory=list)


class BulkCourseStructureIn(_BaseSchema):
    lessons: list[BulkLessonUpdateIn] = Field(min_length=0, max_length=500)


class BulkCourseStructureOut(_BaseSchema):
    course_id: UUID
    course_title: str
    course_description: str | None = None
    status: str
    lessons: list[dict[str, Any]]


class CoursePublishIn(_BaseSchema):
    version: str = Field(min_length=5, max_length=32, pattern=r"^\d+\.\d+\.\d+$")
    changelog: str | None = Field(default=None, max_length=10_000)


class CourseRollbackIn(_BaseSchema):
    release_id: UUID
    version: str = Field(min_length=5, max_length=32, pattern=r"^\d+\.\d+\.\d+$")
    changelog: str | None = Field(default=None, max_length=10_000)


class CourseCoverUploadIn(_BaseSchema):
    filename: str = Field(min_length=3, max_length=255)
    content_base64: str = Field(min_length=8)

    @field_validator("content_base64")
    @classmethod
    def validate_base64(cls, value: str) -> str:
        normalized = value.strip()
        if normalized.startswith("data:"):
            _, _, normalized = normalized.partition(",")
        try:
            base64.b64decode(normalized, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("content_base64 must be valid base64") from exc
        return normalized


class CourseVersionCreateIn(_BaseSchema):
    version: str = Field(min_length=5, max_length=32, pattern=r"^\d+\.\d+\.\d+$")
    changelog: str | None = Field(default=None, max_length=10_000)


class CourseVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    course_id: UUID
    version: str
    changelog: str | None
    status: str
    snapshot_json: dict[str, Any]
    published_at: datetime | None
    created_at: datetime


class CourseVersionDiffOut(BaseModel):
    version_a_id: UUID
    version_b_id: UUID
    added_lessons: list[dict[str, Any]]
    removed_lessons: list[dict[str, Any]]
    modified_lessons: list[dict[str, Any]]
    added_tasks: list[dict[str, Any]]
    removed_tasks: list[dict[str, Any]]
    modified_tasks: list[dict[str, Any]]
