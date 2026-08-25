"""Data endpoints replacing the frontend's direct Supabase table writes.

One route per write the React app currently performs:

    supabase.from("leads").insert(...)              -> POST /api/leads
    supabase.from("marketing_reports").insert(...)  -> POST /api/reports
    supabase.from("generated_content").insert(...)  -> POST /api/generated-content
    supabase.from("orders").insert(...) + items     -> POST /api/orders

**These are write-only by design.** There is no route that lists reports, leads or
orders. The old schema granted anonymous SELECT on `marketing_reports` and
`generated_content`, which meant any visitor could read every other visitor's
submitted business data. Not building the read route is the simplest possible fix,
and adding one later should require an authentication decision first.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db

router = APIRouter(prefix="/api", tags=["data"])


@router.post("/leads", response_model=schemas.LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db)) -> models.Lead:
    """Contact form and newsletter signup."""
    lead = models.Lead(
        name=payload.name,
        email=str(payload.email),
        website=payload.website,
        goals=payload.goals,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.post(
    "/reports",
    response_model=schemas.MarketingReportOut,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    payload: schemas.MarketingReportCreate, db: Session = Depends(get_db)
) -> models.MarketingReport:
    """Persist a generated strategy report and the intake behind it.

    The response deliberately echoes only id/created_at/company_name — the caller
    already holds the full report, and there is no reason to send it back.
    """
    report = models.MarketingReport(
        company_name=payload.company_name,
        business_data=payload.business_data,
        report_data=payload.report_data,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.post(
    "/generated-content",
    response_model=schemas.GeneratedContentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_generated_content(
    payload: schemas.GeneratedContentCreate, db: Session = Depends(get_db)
) -> models.GeneratedContent:
    """Save one "Next Action" deliverable."""
    item = models.GeneratedContent(
        company_name=payload.company_name,
        action_type=payload.action_type,
        label=payload.label,
        content=payload.content,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/orders", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)) -> models.Order:
    """Create an order and all of its line items in a single transaction.

    Either everything is written or nothing is — the old two-request flow could
    leave an order with no items if the second call failed.
    """
    order = models.Order(
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email),
        company=payload.company,
        payment_method=payload.payment_method,
        total_amount=payload.total_amount,
        status=payload.status,
        items=[
            models.OrderItem(plan_name=item.plan_name, price=item.price)
            for item in payload.items
        ],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order
