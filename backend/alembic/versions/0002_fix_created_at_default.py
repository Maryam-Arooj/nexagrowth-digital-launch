"""Fix the created_at default: timezone('utc', now()) re-applied the server offset.

Every table created in 0001 defaulted ``created_at`` to
``timezone('utc'::text, now())``. That expression returns a *naive* timestamp
carrying the UTC wall clock. Storing a naive value in a ``timestamptz`` column makes
PostgreSQL interpret it as **local** time, so the server's offset gets applied a
second time and the stored instant is wrong by exactly that offset.

Measured on PostgreSQL 16 with a single session-level ``SET TIME ZONE``:

    Asia/Karachi   (UTC+5)  ->  rows landed 5 hours in the past
    America/New_York (UTC-4) ->  rows landed 4 hours in the future

The drift is always *minus* the server's UTC offset, which is why it is exactly zero
on a UTC server — Supabase's Postgres and the CI container both run UTC, so the bug
was invisible for the whole life of the project.

``now()`` is already a ``timestamptz`` — an absolute instant — so it needs no
conversion and no timezone setting can distort it. That is the fix.

Note on the column type: nothing here alters it. 0001 already created these columns
as ``timestamptz``; only the ORM declaration in app/models.py was understating them
as naive, and that is a Python-side annotation with no DDL consequence.

Existing rows are deliberately left alone. Correcting them would mean assuming the
server's offset at write time was the same as it is now, which is not knowable per
row (DST, a moved server, a changed ``TimeZone`` setting). On a dev database the
right move is to drop and re-seed; on a database with rows worth keeping, the offset
has to be established out of band before any backfill.

Revision ID: 0002_fix_created_at_default
Revises: 0001_initial_schema
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_fix_created_at_default"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None

TABLES = ("leads", "marketing_reports", "generated_content", "orders", "order_items")

CORRECT_DEFAULT = sa.text("now()")
BROKEN_DEFAULT = sa.text("timezone('utc'::text, now())")


def _set_default(default: sa.TextClause) -> None:
    for table in TABLES:
        op.alter_column(
            table,
            "created_at",
            existing_type=postgresql.TIMESTAMP(timezone=True),
            existing_nullable=False,
            server_default=default,
        )


def upgrade() -> None:
    _set_default(CORRECT_DEFAULT)


def downgrade() -> None:
    # Restores the broken default verbatim, so the round-trip is honest about what
    # 0001 actually created. Downgrading past this point reinstates the drift.
    _set_default(BROKEN_DEFAULT)
