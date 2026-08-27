"""Regression tests for the ``created_at`` timezone bug fixed by Alembic 0002.

The original default, ``timezone('utc'::text, now())``, returns a *naive* timestamp
holding the UTC wall clock. Assigning a naive value to a ``timestamptz`` column makes
PostgreSQL read it as **local** time, applying the server's offset a second time, so
the stored instant is wrong by exactly that offset.

The reason this survived 94 passing tests is that the drift is *minus* the server's
UTC offset — which is zero on a UTC server. Supabase's Postgres runs UTC and so does
the test container, so nothing ever saw it. These tests therefore force a non-UTC
timezone for the duration of one transaction; without that, they would pass against
the broken default and prove nothing.

Nothing is committed: each behavioural check runs inside a transaction that is always
rolled back, so the suite stays re-runnable against a dev database and leaves no rows.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.db import check_database_connection, engine

db_ok, _ = check_database_connection()
pytestmark = pytest.mark.skipif(not db_ok, reason="PostgreSQL not reachable")

# UTC+5, and no DST to complicate the arithmetic. Any non-zero offset would do; the
# point is only that it must not be UTC, or the bug hides.
PROBE_TIMEZONE = "Asia/Karachi"

# One minimal, valid row per table — every column that is NOT NULL and has no
# default, and nothing else.
MINIMAL_ROWS: dict[str, dict[str, object]] = {
    "leads": {
        "name": "Timezone Probe",
        "email": "probe@example.com",
        "goals": "verify created_at",
    },
    "marketing_reports": {
        "company_name": "Timezone Probe",
        "business_data": '{"probe": true}',
        "report_data": '{"probe": true}',
    },
    "generated_content": {
        "company_name": "Timezone Probe",
        "action_type": "probe",
        "label": "probe",
        "content": "probe",
    },
    "orders": {
        "customer_name": "Timezone Probe",
        "customer_email": "probe@example.com",
        "payment_method": "probe",
        "total_amount": "0.00",
    },
    "order_items": {
        "plan_name": "probe",
        "price": "0.00",
    },
}

TIMESTAMPED_TABLES = tuple(MINIMAL_ROWS)


@pytest.mark.parametrize("table", TIMESTAMPED_TABLES)
def test_created_at_default_does_not_convert_now_to_a_naive_timestamp(table: str) -> None:
    """The stored default expression must not wrap ``now()`` in a timezone cast.

    A structural check, so it covers all five tables cheaply and names the problem
    directly if someone reintroduces the Supabase idiom in a later migration.
    """
    with engine.connect() as conn:
        default = conn.execute(
            text(
                "SELECT column_default FROM information_schema.columns "
                "WHERE table_name = :table AND column_name = 'created_at'"
            ),
            {"table": table},
        ).scalar_one()

    assert default is not None, f"{table}.created_at lost its default"
    assert "timezone(" not in default.replace(" ", ""), (
        f"{table}.created_at defaults to {default!r}. Wrapping now() in timezone() "
        f"yields a naive timestamp, which a timestamptz column then re-offsets. "
        f"Use now(). See migration 0002_fix_created_at_default."
    )


@pytest.mark.parametrize("table", TIMESTAMPED_TABLES)
def test_created_at_records_the_real_instant_on_a_non_utc_server(table: str) -> None:
    """Insert under a non-UTC session timezone; ``created_at`` must not drift.

    Against the old default this fails by five hours — the offset of PROBE_TIMEZONE.
    """
    columns = MINIMAL_ROWS[table]
    column_list = ", ".join(columns)
    value_list = ", ".join(f":{name}" for name in columns)
    statement = text(
        f"INSERT INTO {table} ({column_list}) VALUES ({value_list}) "
        f"RETURNING created_at, now() AS transaction_start"
    )

    connection = engine.connect()
    transaction = connection.begin()
    try:
        # SET LOCAL is scoped to this transaction, so the rollback below also undoes
        # it and no connection goes back to the pool with a stray timezone on it.
        connection.execute(text(f"SET LOCAL TIME ZONE '{PROBE_TIMEZONE}'"))
        created_at, transaction_start = connection.execute(statement, columns).one()
        python_utc_now = datetime.now(timezone.utc)
    finally:
        transaction.rollback()
        connection.close()

    assert created_at.tzinfo is not None, (
        f"{table}.created_at came back naive; the column should be timestamptz"
    )

    # Both timestamps are evaluated inside the same transaction, so any gap beyond a
    # second is the offset being applied twice, not slow test machinery.
    drift = abs(created_at - transaction_start)
    assert drift < timedelta(seconds=1), (
        f"{table}.created_at is off by {drift} under TimeZone={PROBE_TIMEZONE}. "
        f"That is the server's UTC offset leaking into the stored value."
    )

    # And confirm it is genuinely UTC-correct rather than merely self-consistent.
    assert abs(created_at - python_utc_now) < timedelta(minutes=1), (
        f"{table}.created_at ({created_at}) disagrees with the wall clock "
        f"({python_utc_now}) by more than a minute."
    )
