from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_", extra="ignore")

    app_name: str = "Digital Education Platform API"
    app_version: str = "0.1.0"
    environment: str = "development"
    cors_origins: str = "*"

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"

    security_pepper: str = "dev-pepper-do-not-use-in-prod"
    access_token_secret: str = "dev-secret-do-not-use-in-prod"
    access_token_ttl_minutes: int = 30

    qr_ttl_minutes: int = 30

    refresh_session_days: int = 30

    admin_login: str = ""
    admin_password: str = ""

    simulation_media_dir: str = "storage/simulation_media"
    simulation_media_max_mb: int = 8

    object_storage_endpoint_url: str = "http://localhost:9000"
    object_storage_bucket: str = "dep-assets"
    object_storage_access_key: str = "minioadmin"
    object_storage_secret_key: str = "minioadmin"
    object_storage_region: str = "us-east-1"
    object_storage_secure: bool = False

    debug_mode: bool = False

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_from_name: str = "Просвет"
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    password_reset_url: str = ""

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

    @field_validator("object_storage_access_key", "object_storage_secret_key")
    @classmethod
    def validate_object_storage_credentials(cls, v: str, info) -> str:
        if info.data.get("environment") == "production" and v == "minioadmin":
            raise ValueError("object storage credentials must be set for production")
        return v

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, v: str, info) -> str:
        if info.data.get("environment") == "production" and v.strip() == "*":
            raise ValueError("cors_origins must be explicit in production")
        return v

    @field_validator("smtp_from_email")
    @classmethod
    def validate_smtp_from_email(cls, v: str, info) -> str:
        if info.data.get("environment") == "production" and info.data.get("smtp_host") and not v:
            raise ValueError("smtp_from_email must be set when SMTP is enabled in production")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if not raw:
            return []
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


settings = Settings()
