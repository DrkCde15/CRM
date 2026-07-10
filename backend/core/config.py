from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Convexo"
    database_url: str = "sqlite:///./crm.db"
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    gateway_url: str = "http://localhost:3001"
    whatsapp_webhook_url: str = "http://localhost:8000/webhook"
    frontend_url: str = "http://localhost:5173"

    email_google_script_url: Annotated[str, Field(validation_alias="EMAIL_GOOGLE_SCRIPT_URL")] = ""
    email_google_script_secret: Annotated[
        str, Field(validation_alias="EMAIL_GOOGLE_SCRIPT_SECRET")
    ] = ""
    email_from_name: Annotated[str, Field(validation_alias="EMAIL_FROM_NAME")] = ""

    taky_api_url: str = ""
    taky_email: str = ""
    taky_password: str = ""
    taky_default_project_id: int | None = None
    taky_default_user_id: int | None = None


settings = Settings()
