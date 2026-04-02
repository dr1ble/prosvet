from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class _BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GroupCreateIn(_BaseSchema):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    status: str = Field(default="active", pattern=r"^(active|archived)$")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized


class GroupUpdateIn(_BaseSchema):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    status: str | None = Field(default=None, pattern=r"^(active|archived)$")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("name must not be empty")
        return normalized


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class GroupMemberOut(_BaseSchema):
    user_id: UUID
    login: str | None
    display_name: str | None
    role: str
    status: str
    joined_at: datetime


class GroupUserOptionOut(_BaseSchema):
    user_id: UUID
    login: str | None
    display_name: str | None
    role: str
    status: str


class GroupMembersUpdateIn(_BaseSchema):
    user_ids: list[UUID] = Field(default_factory=list, max_length=10_000)


class GroupAssignmentCreateIn(_BaseSchema):
    course_id: UUID
    target_user_ids: list[UUID] = Field(default_factory=list, max_length=10_000)
    start_policy: str = Field(default="immediate", pattern=r"^(immediate|scheduled)$")
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str = Field(
        default="active",
        pattern=r"^(draft|scheduled|active|completed|cancelled)$",
    )

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_policy == "scheduled" and self.starts_at is None:
            raise ValueError("starts_at is required for scheduled start_policy")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class GroupAssignmentUpdateIn(_BaseSchema):
    target_user_ids: list[UUID] | None = Field(default=None, max_length=10_000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str | None = Field(default=None, pattern=r"^(draft|scheduled|active|completed|cancelled)$")

    @model_validator(mode="after")
    def validate_dates(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be greater than starts_at")
        return self


class GroupAssignmentOut(_BaseSchema):
    id: UUID
    group_id: UUID
    course_id: UUID
    course_title: str
    created_by_user_id: UUID
    start_policy: str
    starts_at: datetime | None
    ends_at: datetime | None
    status: str
    target_user_ids: list[UUID] = Field(default_factory=list)
    target_users_count: int = 0
    created_at: datetime
    updated_at: datetime
