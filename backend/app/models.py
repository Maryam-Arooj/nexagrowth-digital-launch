"""SQLAlchemy ORM models — a faithful port of the Supabase schema.

Every column mirrors ``supabase/migrations/*.sql`` exactly: same names, same types,
same nullability, same defaults, same foreign key. Nothing was "improved" during the
port, because the frontend already sends these exact field names and any rename
would silently break a form.

What is deliberately **not** ported: the seven Row Level Security policies. RLS
existed only because the browser talked straight to PostgreSQL over PostgREST. With
FastAPI in front, the browser never touches the database — the API boundary does the
job RLS was doing. That also closes the old "anyone can SELECT every visitor's
report" exposure, simply by not offering such a route.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

# `gen_random_uuid()` is built into PostgreSQL 13+. On 12 or older, enable pgcrypto.
_UUID_PK = text("gen_random_uuid()")
# `now()` is already an absolute instant (timestamptz), so PostgreSQL stores exactly
# the moment the row was written, whatever the server's timezone is set to.
#
# The Supabase original said `timezone('utc'::text, now())`. That returns a *naive*
# timestamp holding the UTC wall clock, and assigning a naive value to a timestamptz
# column makes PostgreSQL read it as local time — re-applying the server's offset a
# second time. Measured on PostgreSQL 16: with TimeZone='Asia/Karachi' (UTC+5) every
# row landed 5 hours in the past; with 'America/New_York' (UTC-4), 4 hours in the
# future. Drift is always minus the server's offset, and is zero only on a UTC
# server — which is why the idiom survived Supabase (whose Postgres is UTC) and the
# test container (Etc/UTC) without anyone noticing. See migration 0002.
_NOW = text("now()")


class Lead(Base):
    """Contact-form and newsletter submissions.

    Written by ``Contact.tsx`` (full form) and ``CTASection.tsx`` (newsletter, which
    derives ``name`` from the email prefix and sends a fixed ``goals`` string).
    """

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=_UUID_PK
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_NOW, nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    goals: Mapped[str] = mapped_column(Text, nullable=False)


class MarketingReport(Base):
    """A generated AI strategy report plus the intake it was generated from."""

    __tablename__ = "marketing_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=_UUID_PK
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_NOW, nullable=False
    )
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    business_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    report_data: Mapped[dict] = mapped_column(JSONB, nullable=False)


class GeneratedContent(Base):
    """A saved "Next Action" deliverable (ad copy, captions, SEO keywords, ...)."""

    __tablename__ = "generated_content"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=_UUID_PK
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_NOW, nullable=False
    )
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    action_type: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)


class Order(Base):
    """A checkout submission.

    ``status`` is kept for schema parity, but with Stripe removed there is no payment
    processor to move it past ``'pending'``.
    """

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=_UUID_PK
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_NOW, nullable=False
    )
    customer_name: Mapped[str] = mapped_column(Text, nullable=False)
    customer_email: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str] = mapped_column(Text, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(Text, server_default=text("'pending'"), nullable=False)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    """One plan line on an order. Deleted with its parent order."""

    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=_UUID_PK
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=_NOW, nullable=False
    )
    # `index=True` produces `ix_order_items_order_id` — the exact name migration 0001
    # already created. Declaring it here changes no schema; it stops `alembic revision
    # --autogenerate` from reading the index as unwanted and proposing to drop it.
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    plan_name: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped[Order | None] = relationship(back_populates="items")


__all__ = ["Base", "Lead", "MarketingReport", "GeneratedContent", "Order", "OrderItem"]
