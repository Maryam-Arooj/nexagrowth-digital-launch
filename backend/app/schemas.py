"""Pydantic request/response models for the data API.

Field names deliberately match what the React frontend already sends to Supabase
(`name`, `company_name`, `business_data`, `customer_name`, ...). Keeping the wire
contract identical means Phase 5 is a change of URL and transport, not a rewrite of
every form.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer

# --------------------------------------------------------------------------- leads


class LeadCreate(BaseModel):
    """`Contact.tsx` sends all four; `CTASection.tsx` omits `website`."""

    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    website: str | None = Field(default=None, max_length=500)
    goals: str = Field(min_length=1, max_length=5000)


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    name: str
    email: str
    website: str | None
    goals: str


# ---------------------------------------------------------------- marketing reports


class MarketingReportCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=300)
    business_data: dict[str, Any]
    report_data: dict[str, Any]


class MarketingReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    company_name: str


# --------------------------------------------------------------- generated content


class GeneratedContentCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=300)
    action_type: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class GeneratedContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    company_name: str
    action_type: str
    label: str


# -------------------------------------------------------------------------- orders


class OrderItemCreate(BaseModel):
    plan_name: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(ge=0, decimal_places=2, max_digits=10)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan_name: str
    price: Decimal

    @field_serializer("price")
    def _price_as_number(self, value: Decimal) -> float:
        # PostgREST returned numeric as a JSON number, and Checkout.tsx treats it as
        # one. Serialising as float keeps the contract identical for the frontend.
        return float(value)


class OrderCreate(BaseModel):
    """Creates the order *and* its line items in one request.

    Supabase needed two round trips — insert the order, read back its id, then
    insert the items. That second step was also broken: `Checkout.tsx` chains
    `.insert().select().single()` on a table whose only policy was `FOR INSERT`,
    and PostgREST needs SELECT permission to return the inserted row. Folding the
    items into one endpoint removes the round trip and the bug together.
    """

    customer_name: str = Field(min_length=1, max_length=200)
    customer_email: EmailStr
    company: str | None = Field(default=None, max_length=200)
    payment_method: str = Field(min_length=1, max_length=50)
    total_amount: Decimal = Field(ge=0, decimal_places=2, max_digits=10)
    status: str = Field(default="pending", max_length=50)
    items: list[OrderItemCreate] = Field(default_factory=list)


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    customer_name: str
    customer_email: str
    company: str | None
    payment_method: str
    total_amount: Decimal
    status: str
    items: list[OrderItemOut] = Field(default_factory=list)

    @field_serializer("total_amount")
    def _total_as_number(self, value: Decimal) -> float:
        return float(value)
