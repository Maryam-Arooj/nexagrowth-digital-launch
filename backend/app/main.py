"""NexaGrowth backend — FastAPI application entry point.

Architecture:

    React/Vite (localhost:8080)
        -> FastAPI (localhost:8000)   <- every secret lives here
        -> SQLAlchemy
        -> local PostgreSQL
    AI: FastAPI -> Gemini API (direct, free tier)

No Supabase, no Stripe, no paid service anywhere in the chain.

Phase 2 provided the foundation. Phase 3 adds the five tables and the data API that
replaces the frontend's direct Supabase table writes. AI endpoints arrive in Phase 4.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import check_database_connection
from app.routers import data as data_router
from app.services.lead_scoring import compute_lead_score_and_confidence

settings = get_settings()

app = FastAPI(
    title="NexaGrowth API",
    version="0.3.0",
    description="Local FastAPI backend for NexaGrowth Digital. Replaces Supabase.",
)

# The Vite dev server runs on 8080 (see vite.config.ts) and is a different origin
# from this API, so CORS is required for every browser call.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(data_router.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, object]:
    """Liveness + dependency status.

    Deliberately reports only whether the Gemini key is *present* — never the key,
    never its length, never a prefix.
    """
    db_ok, db_detail = check_database_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "api": "up",
        "database": {"configured": settings.is_database_configured, "connected": db_ok, "detail": db_detail},
        "ai": {"configured": settings.is_ai_configured, "model": settings.resolved_gemini_model},
    }


@app.post("/api/score-preview", tags=["scoring"])
def score_preview(business: dict) -> dict:
    """Run the deterministic scoring engine on a business payload.

    No AI, no database, no network — pure rule-based arithmetic, identical to the
    engine the original Supabase edge function used. Exposed now so the port can be
    exercised end-to-end before the full pipeline lands in Phase 4.
    """
    return compute_lead_score_and_confidence(business)
