"""Phase 3 integration tests — real PostgreSQL, real HTTP, no mocks.

Requires a reachable database. If DATABASE_URL points nowhere the whole module is
skipped, so `pytest` still passes for someone who has only cloned the repo.

Each test cleans up after itself so the suite is re-runnable against a dev database
without accumulating rows.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal, check_database_connection, engine
from app.main import app

db_ok, _ = check_database_connection()
pytestmark = pytest.mark.skipif(not db_ok, reason="PostgreSQL not reachable")

client = TestClient(app)


@pytest.fixture()
def cleanup():
    created: dict[str, list[str]] = {}

    def track(table: str, row_id: str) -> None:
        created.setdefault(table, []).append(row_id)

    yield track

    with engine.begin() as conn:
        for table, ids in created.items():
            for row_id in ids:
                conn.execute(text(f"DELETE FROM {table} WHERE id = :id"), {"id": row_id})


# ------------------------------------------------------------------ leads


def test_create_lead_from_contact_form(cleanup):
    body = client.post(
        "/api/leads",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "website": "https://example.com",
            "goals": "Generate 100 qualified leads",
        },
    )
    assert body.status_code == 201
    data = body.json()
    cleanup("leads", data["id"])
    uuid.UUID(data["id"])  # server-generated, valid UUID
    assert data["name"] == "Ada Lovelace"
    assert data["website"] == "https://example.com"
    assert data["created_at"]


def test_create_lead_from_newsletter_without_website(cleanup):
    """CTASection.tsx omits `website` entirely — it must remain optional."""
    body = client.post(
        "/api/leads",
        json={
            "name": "grace",
            "email": "grace@example.com",
            "goals": "Newsletter / Marketing updates subscription",
        },
    )
    assert body.status_code == 201
    data = body.json()
    cleanup("leads", data["id"])
    assert data["website"] is None


def test_lead_rejects_invalid_email():
    assert client.post(
        "/api/leads", json={"name": "x", "email": "not-an-email", "goals": "g"}
    ).status_code == 422


def test_lead_rejects_missing_required_field():
    assert client.post("/api/leads", json={"name": "x", "email": "a@b.co"}).status_code == 422


# -------------------------------------------------------- marketing reports


def test_create_report_persists_jsonb(cleanup):
    business = {"companyName": "TestCo", "industry": "B2B SaaS", "budget": "$4,000"}
    report = {"executiveSummary": "Summary", "swot": {"strengths": ["Brand"]}, "leadScore": {"score": 72}}
    response = client.post(
        "/api/reports",
        json={"company_name": "TestCo", "business_data": business, "report_data": report},
    )
    assert response.status_code == 201
    data = response.json()
    cleanup("marketing_reports", data["id"])
    assert data["company_name"] == "TestCo"

    # Verify the JSONB round-trips structurally, not as a string.
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT business_data, report_data FROM marketing_reports WHERE id = :id"),
            {"id": data["id"]},
        ).one()
    assert row.business_data == business
    assert row.report_data["swot"]["strengths"] == ["Brand"]


def test_report_response_does_not_echo_the_full_report(cleanup):
    """The caller already holds it; sending it back is pure waste."""
    response = client.post(
        "/api/reports",
        json={"company_name": "TestCo", "business_data": {}, "report_data": {"big": "x" * 500}},
    )
    data = response.json()
    cleanup("marketing_reports", data["id"])
    assert "report_data" not in data


# -------------------------------------------------------- generated content


def test_create_generated_content(cleanup):
    response = client.post(
        "/api/generated-content",
        json={
            "company_name": "TestCo",
            "action_type": "google-ads",
            "label": "Google Ads Copy",
            "content": "HEADLINE: Grow faster",
        },
    )
    assert response.status_code == 201
    data = response.json()
    cleanup("generated_content", data["id"])
    assert data["action_type"] == "google-ads"


# ----------------------------------------------------------------- orders


def test_create_order_with_items_in_one_request(cleanup):
    """The Supabase flow needed two round trips and the second was broken."""
    response = client.post(
        "/api/orders",
        json={
            "customer_name": "Ada Lovelace",
            "customer_email": "ada@example.com",
            "company": "Analytical Engines",
            "payment_method": "bank_transfer",
            "total_amount": 3499.00,
            "items": [
                {"plan_name": "Growth Plan", "price": 3499.00},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    cleanup("orders", data["id"])

    assert data["status"] == "pending"
    assert data["total_amount"] == 3499.0
    assert isinstance(data["total_amount"], float)  # a JSON number, as PostgREST returned
    assert len(data["items"]) == 1
    assert data["items"][0]["plan_name"] == "Growth Plan"
    assert data["items"][0]["price"] == 3499.0
    uuid.UUID(data["id"])


def test_order_returns_its_id_the_bug_supabase_had(cleanup):
    """`.insert().select().single()` failed under RLS with INSERT-only policy."""
    data = client.post(
        "/api/orders",
        json={
            "customer_name": "X",
            "customer_email": "x@example.com",
            "payment_method": "card",
            "total_amount": 1499.00,
            "items": [{"plan_name": "Starter Plan", "price": 1499.00}],
        },
    ).json()
    cleanup("orders", data["id"])
    assert data["id"]


def test_order_without_items_is_allowed(cleanup):
    data = client.post(
        "/api/orders",
        json={
            "customer_name": "X",
            "customer_email": "x@example.com",
            "payment_method": "wallet",
            "total_amount": 0,
        },
    ).json()
    cleanup("orders", data["id"])
    assert data["items"] == []


def test_deleting_an_order_cascades_to_its_items():
    data = client.post(
        "/api/orders",
        json={
            "customer_name": "Cascade",
            "customer_email": "c@example.com",
            "payment_method": "card",
            "total_amount": 10,
            "items": [{"plan_name": "A", "price": 5}, {"plan_name": "B", "price": 5}],
        },
    ).json()
    order_id = data["id"]
    with engine.begin() as conn:
        before = conn.execute(
            text("SELECT count(*) FROM order_items WHERE order_id = :id"), {"id": order_id}
        ).scalar_one()
        assert before == 2
        conn.execute(text("DELETE FROM orders WHERE id = :id"), {"id": order_id})
        after = conn.execute(
            text("SELECT count(*) FROM order_items WHERE order_id = :id"), {"id": order_id}
        ).scalar_one()
    assert after == 0


def test_order_is_atomic_items_never_orphan_a_failed_order():
    """A rejected payload must leave nothing behind."""
    with engine.begin() as conn:
        before = conn.execute(text("SELECT count(*) FROM orders")).scalar_one()
    assert client.post(
        "/api/orders",
        json={
            "customer_name": "X",
            "customer_email": "not-an-email",
            "payment_method": "card",
            "total_amount": 10,
            "items": [{"plan_name": "A", "price": 5}],
        },
    ).status_code == 422
    with engine.begin() as conn:
        after = conn.execute(text("SELECT count(*) FROM orders")).scalar_one()
    assert before == after


def test_negative_price_is_rejected():
    assert client.post(
        "/api/orders",
        json={
            "customer_name": "X",
            "customer_email": "x@example.com",
            "payment_method": "card",
            "total_amount": -1,
            "items": [],
        },
    ).status_code == 422


# ------------------------------------------------------ security posture


def test_there_is_no_route_that_lists_other_peoples_data():
    """The old schema allowed anonymous SELECT on reports and generated content."""
    paths = app.openapi()["paths"]
    for path in ("/api/reports", "/api/generated-content", "/api/leads", "/api/orders"):
        assert "get" not in paths.get(path, {}), f"unexpected read route on {path}"


def test_health_reports_database_connected():
    body = client.get("/api/health").json()
    assert body["database"]["connected"] is True
    assert body["status"] == "ok"
