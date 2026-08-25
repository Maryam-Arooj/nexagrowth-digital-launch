"""SQLAlchemy engine, session factory and the FastAPI session dependency.

Connects to a local PostgreSQL instance via psycopg 3. The browser never talks to
PostgreSQL directly — that is the whole point of this layer, and it is why the
Supabase Row Level Security policies are dropped rather than ported: the API
boundary now does the job RLS was doing.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base. Table models are defined in ``app.models`` (Phase 3)."""


_settings = get_settings()

# `future=True` is the default on SQLAlchemy 2.x; pool_pre_ping avoids handing out
# connections that a local PostgreSQL restart has already closed, which is a common
# annoyance during development.
engine = (
    create_engine(
        _settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )
    if _settings.is_database_configured
    else None
)

SessionLocal = (
    sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)
    if engine is not None
    else None
)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a session that is always closed."""
    if SessionLocal is None:
        raise RuntimeError(
            "DATABASE_URL is not configured. Set it in backend/.env — see .env.example."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> tuple[bool, str]:
    """Cheap liveness probe used by /api/health.

    Returns ``(ok, detail)``. The detail never contains credentials — a failed
    connection string would otherwise leak the password into logs and HTTP
    responses, so only the exception type and message are surfaced, with anything
    resembling the DSN stripped.
    """
    if engine is None:
        return False, "DATABASE_URL is not configured"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, "connected"
    except Exception as exc:  # noqa: BLE001 - surfaced as a health status, not raised
        message = str(exc)
        dsn = _settings.database_url
        if dsn and dsn in message:
            message = message.replace(dsn, "<DATABASE_URL redacted>")
        # psycopg embeds the connection string in some errors; strip anything with
        # credentials in it as a second line of defence.
        safe = " ".join(
            part for part in message.split() if "://" not in part and "password" not in part.lower()
        )
        return False, f"{type(exc).__name__}: {safe[:300]}"
