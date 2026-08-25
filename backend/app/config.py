"""Application configuration, loaded from ``backend/.env``.

Every secret lives here and only here. The React frontend receives no key of any
kind — it is given a single public value, ``VITE_API_URL``, and everything
sensitive stays behind this API boundary.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

# The Gemini model used for every AI call (Phase 4).
# Overridable via GEMINI_MODEL so a future model retirement is a config change,
# not a code change: the project was previously pinned in code to
# `gemini-2.0-flash`, which Google shut down on 1 June 2026.
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = Field(
        default="",
        description="postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE",
    )
    gemini_api_key: str = Field(default="", description="Server-side only. Never exposed.")
    gemini_model: str = Field(default="")
    cors_origins: str = Field(default="http://localhost:8080,http://127.0.0.1:8080")

    @field_validator("database_url")
    @classmethod
    def _reject_placeholder(cls, value: str) -> str:
        # Fail loudly rather than attempting a connection with the shipped example
        # credentials, which would produce a confusing auth error instead of an
        # obvious "you didn't configure this yet".
        if "CHANGE_ME" in value:
            raise ValueError(
                "DATABASE_URL still contains the placeholder from .env.example. "
                "Set your real local PostgreSQL connection string in backend/.env"
            )
        return value

    @property
    def resolved_gemini_model(self) -> str:
        return self.gemini_model.strip() or DEFAULT_GEMINI_MODEL

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_database_configured(self) -> bool:
        return bool(self.database_url.strip())

    @property
    def is_ai_configured(self) -> bool:
        return bool(self.gemini_api_key.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached so the .env file is parsed once per process."""
    return Settings()
