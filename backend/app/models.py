"""SQLAlchemy ORM models.

Phase 2 defines only the declarative ``Base`` (re-exported from ``app.db``) so that
Alembic has a metadata target. The five tables — leads, marketing_reports,
generated_content, orders, order_items — are added in Phase 3, mirroring the
schema the Supabase migrations defined.
"""

from __future__ import annotations

from app.db import Base

__all__ = ["Base"]
