from pydantic import BaseModel, Field


class UserOverviewItemOut(BaseModel):
    user_id: str
    login: str | None = None
    display_name: str | None = None
    role: str
    status: str
    permissions: list[str] = Field(default_factory=list)


class UserRoleSummaryOut(BaseModel):
    role: str
    count: int
    permissions: list[str] = Field(default_factory=list)


class UsersOverviewOut(BaseModel):
    users: list[UserOverviewItemOut] = Field(default_factory=list)
    role_summary: list[UserRoleSummaryOut] = Field(default_factory=list)


class UserCreateIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)
    login: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=255)
    role: str = "user"
    status: str = "active"


class UserUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)
    role: str | None = None
    status: str | None = None
