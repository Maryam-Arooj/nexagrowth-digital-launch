"""Phase 2 foundation tests: config, app boot, CORS, health, scoring endpoint.

These run without PostgreSQL. /api/health is expected to report the database as
configured-but-not-connected in that situation, which is exactly the signal the
developer needs while setting up.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import DEFAULT_GEMINI_MODEL, Settings, get_settings
from app.main import app

client = TestClient(app)


def test_app_boots_and_health_responds():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["api"] == "up"
    assert body["status"] in {"ok", "degraded"}


def test_health_reports_database_status_with_a_useful_detail():
    """Works whether or not PostgreSQL is running — the detail must always explain."""
    body = client.get("/api/health").json()
    settings = get_settings()
    assert body["database"]["configured"] is settings.is_database_configured
    assert isinstance(body["database"]["connected"], bool)
    assert isinstance(body["database"]["detail"], str) and body["database"]["detail"]


def test_health_never_leaks_the_gemini_key_or_the_dsn():
    raw = client.get("/api/health").text
    settings = get_settings()
    assert "testpw" not in raw
    # Guard the empty-DSN case: `"" in anything` is always True, which would make
    # this assertion vacuously pass rather than actually checking anything.
    if settings.database_url:
        assert settings.database_url not in raw
    if settings.gemini_api_key:
        assert settings.gemini_api_key not in raw
    # Only a boolean about the AI key, never the value.
    assert isinstance(client.get("/api/health").json()["ai"]["configured"], bool)


def test_default_gemini_model_is_a_free_tier_model():
    assert get_settings().resolved_gemini_model == DEFAULT_GEMINI_MODEL
    assert DEFAULT_GEMINI_MODEL == "gemini-3.6-flash"


def test_placeholder_dsn_is_rejected_loudly():
    import pytest

    with pytest.raises(Exception):
        Settings(database_url="postgresql+psycopg://postgres:CHANGE_ME@localhost:5432/nexagrowth")


def test_cors_allows_the_vite_dev_server():
    response = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:8080", "Access-Control-Request-Method": "GET"},
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:8080"


def test_cors_rejects_an_unknown_origin():
    response = client.options(
        "/api/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert response.headers.get("access-control-allow-origin") != "https://evil.example"


def test_score_preview_endpoint_matches_the_engine():
    business = {
        "companyName": "Acme",
        "industry": "B2B SaaS",
        "audience": "SMB founders",
        "budget": "$8,000",
        "goal": "scale revenue fast",
        "currentChannels": "Google Ads, SEO, LinkedIn",
    }
    body = client.post("/api/score-preview", json=business).json()
    assert body["leadScore"]["score"] == 93
    assert body["leadScore"]["tier"] == "Priority"
    assert body["confidence"]["score"] == 100
