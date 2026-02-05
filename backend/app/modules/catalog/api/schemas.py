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
