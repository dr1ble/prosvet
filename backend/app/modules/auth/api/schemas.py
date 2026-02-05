from pydantic import BaseModel, Field


class OtpRequestIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)


class OtpVerifyIn(BaseModel):
    phone: str = Field(min_length=6, max_length=20)
    code: str = Field(min_length=4, max_length=8)


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


class LogoutOut(BaseModel):
    status: str = "logged_out"
