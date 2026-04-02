from uuid import UUID

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    login: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=256)


class QrActivateIn(BaseModel):
    token: str = Field(min_length=8)


class RefreshTokenIn(BaseModel):
    refresh_token: str = Field(min_length=16)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: UUID | None = None


class AuthMeOut(BaseModel):
    user_id: UUID
    role: str
    status: str
    display_name: str | None = None
    permissions: list[str] = Field(default_factory=list)


class AuthMeUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=255)


class LogoutOut(BaseModel):
    status: str = "logged_out"
