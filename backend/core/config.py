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

    api_groq: Annotated[str, Field(validation_alias="API_GROQ")] = ""
    groq_base_url: Annotated[str, Field(validation_alias="GROQ_BASE_URL")] = (
        "https://api.groq.com/openai/v1"
    )
    groq_primary_model: Annotated[str, Field(validation_alias="GROQ_PRIMARY_MODEL")] = (
        "groq/compound-mini"
    )
    groq_vision_model: Annotated[str, Field(validation_alias="GROQ_VISION_MODEL")] = (
        "meta-llama/llama-4-scout-17b-16e-instruct"
    )
    groq_fallback_models: Annotated[
        str, Field(validation_alias="GROQ_FALLBACK_MODELS")
    ] = ""
    groq_max_retries: Annotated[int, Field(validation_alias="GROQ_MAX_RETRIES")] = 3
    groq_temperature: Annotated[float, Field(validation_alias="GROQ_TEMPERATURE")] = 0.8

    # ── Provedores de IA (selecione com LLM_PROVIDER) ──
    # groq | openai | anthropic | gemini | ollama
    llm_provider: str = "groq"

    # OpenAI (compatível OpenAI)
    api_openai: Annotated[str, Field(validation_alias="API_OPENAI")] = ""
    openai_base_url: Annotated[str, Field(validation_alias="OPENAI_BASE_URL")] = (
        "https://api.openai.com/v1"
    )
    openai_model: Annotated[str, Field(validation_alias="OPENAI_MODEL")] = "gpt-4o-mini"
    openai_vision_model: Annotated[
        str, Field(validation_alias="OPENAI_VISION_MODEL")
    ] = "gpt-4o-mini"

    # Anthropic (Claude)
    api_anthropic: Annotated[str, Field(validation_alias="API_ANTHROPIC")] = ""
    anthropic_base_url: Annotated[
        str, Field(validation_alias="ANTHROPIC_BASE_URL")
    ] = "https://api.anthropic.com/v1"
    anthropic_model: Annotated[
        str, Field(validation_alias="ANTHROPIC_MODEL")
    ] = "claude-3-5-haiku-latest"

    # Google Gemini
    api_gemini: Annotated[str, Field(validation_alias="API_GEMINI")] = ""
    gemini_model: Annotated[str, Field(validation_alias="GEMINI_MODEL")] = (
        "gemini-1.5-flash"
    )

    # Ollama (local, compatível OpenAI)
    api_ollama: Annotated[str, Field(validation_alias="API_OLLAMA")] = ""
    ollama_base_url: Annotated[
        str, Field(validation_alias="OLLAMA_BASE_URL")
    ] = "http://localhost:11434/v1"
    ollama_model: Annotated[str, Field(validation_alias="OLLAMA_MODEL")] = "llama3"

    whatsapp_bot_name: str = "Assistente"

    upload_dir: str = "uploads"
    max_upload_mb: int = 15
    email_poll_seconds: int = 60

    def validate(self) -> list[str]:
        issues: list[str] = []
        if not self.secret_key or self.secret_key == "change-me-in-production":
            issues.append("SECRET_KEY não definido ou padrão — gere uma chave forte em .env.")
        if not self.database_url:
            issues.append("DATABASE_URL não definido.")
        if not self.allowed_origins:
            issues.append("ALLOWED_ORIGINS vazio — defina as origens do frontend/widget.")
        provider = (self.llm_provider or "groq").lower()
        if provider == "groq" and not self.api_groq:
            issues.append("LLM_PROVIDER=groq sem API_GROQ: respostas de IA indisponíveis.")
        return issues


settings = Settings()
