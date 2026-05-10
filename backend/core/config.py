# backend/core/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve o .env relativo ao próprio arquivo config.py,
# garantindo que funcione independente do working directory do Uvicorn.
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Chaves de Integração LLM (Sprint 6)
    GEMINI_API_KEY: str | None = None
    GROQ_API_KEY: str | None = None

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        # Ignora variáveis extras no .env sem lançar ValidationError
        extra="ignore",
    )


settings = Settings()
