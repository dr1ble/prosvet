from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_", extra="ignore")

    app_name: str = "Digital Education Platform API"
    app_version: str = "0.1.0"
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"
    security_pepper: str = "dev-pepper-change-in-prod"
    access_token_secret: str = "dev-access-token-secret-change-in-prod"
    access_token_ttl_minutes: int = 30
    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    otp_block_minutes: int = 15
    qr_ttl_hours: int = 24
    refresh_session_days: int = 30
    admin_phone_numbers: str = ""
    debug_return_otp_code: bool = False


settings = Settings()
