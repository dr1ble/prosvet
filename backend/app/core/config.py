from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_", extra="ignore")

    app_name: str = "Digital Education Platform API"
    app_version: str = "0.1.0"
    environment: str = "development"

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"

    security_pepper: str = "dev-pepper-do-not-use-in-prod"
    access_token_secret: str = "dev-secret-do-not-use-in-prod"
    access_token_ttl_minutes: int = 30

    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    otp_block_minutes: int = 15

    qr_ttl_hours: int = 24

    refresh_session_days: int = 30

    admin_phone_numbers: str = ""
    admin_login: str = ""
    admin_password: str = ""

    simulation_media_dir: str = "storage/simulation_media"
    simulation_media_max_mb: int = 8

    debug_return_otp_code: bool = False
    debug_mode: bool = False

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        valid = {"development", "staging", "production"}
        if v not in valid:
            raise ValueError(f"environment must be one of: {valid}")
        return v

    @field_validator("access_token_secret")
    @classmethod
    def validate_access_token_secret(cls, v: str, info) -> str:
        if info.data.get("environment") == "production" and "dev-" in v.lower():
            raise ValueError("access_token_secret must be set for production")
        return v

    @field_validator("security_pepper")
    @classmethod
    def validate_security_pepper(cls, v: str, info) -> str:
        if info.data.get("environment") == "production" and "dev-" in v.lower():
            raise ValueError("security_pepper must be set for production")
        return v


settings = Settings()
