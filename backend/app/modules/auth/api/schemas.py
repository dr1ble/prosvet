from uuid import UUID

from pydantic import BaseModel, Field


class OtpRequestIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)


class OtpVerifyIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    code: str = Field(min_length=4, max_length=8)


class LoginIn(BaseModel):
    login: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=256)


class QrActivateIn(BaseModel):
    token: str = Field(min_length=8)


class RefreshTokenIn(BaseModel):
    refresh_token: str = Field(min_length=16)


class OtpRequestOut(BaseModel):
    challenge_id: str
    status: str
    dev_code: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthMeOut(BaseModel):
    user_id: UUID
    role: str
    status: str
    display_name: str | None = None
    permissions: list[str] = Field(default_factory=list)


class LogoutOut(BaseModel):
    status: str = "logged_out"
