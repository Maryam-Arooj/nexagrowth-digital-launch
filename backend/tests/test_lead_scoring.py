"""Parity tests for the TypeScript -> Python port of the lead-scoring engine.

The fixture file was produced by *executing the original TypeScript*
(`supabase/functions/_shared/leadScoring.ts`) over a set of businesses chosen to
exercise every branch: each budget band, every industry category plus the
unmatched fallback, growth / maintenance / neutral goals, 0..N channel matches,
urgent and non-urgent phrasing, and fully-empty input.

These tests need no database and no network.

If one fails, the Python port has diverged from the engine the rest of the
project is built on. Fix the port -- do not edit the fixture.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.services.lead_scoring import (
    classify_business,
    compute_confidence,
    compute_lead_score,
    compute_lead_score_and_confidence,
)

GOLDEN = json.loads((Path(__file__).parent / "golden_lead_scoring.json").read_text("utf-8"))
IDS = [case["input"]["companyName"] for case in GOLDEN]


@pytest.mark.parametrize("case", GOLDEN, ids=IDS)
def test_classify_business_matches_typescript(case):
    assert classify_business(case["input"]["industry"]) == case["classify"]


@pytest.mark.parametrize("case", GOLDEN, ids=IDS)
def test_lead_score_matches_typescript(case):
    actual = compute_lead_score(case["input"])
    expected = case["leadScore"]
    # Compare the headline numbers first so a failure names the real difference.
    assert actual["score"] == expected["score"]
    assert actual["tier"] == expected["tier"]
    assert actual["breakdown"] == expected["breakdown"]
    assert actual["reasoning"] == expected["reasoning"]
    assert actual == expected


@pytest.mark.parametrize("case", GOLDEN, ids=IDS)
def test_confidence_matches_typescript(case):
    assert compute_confidence(case["input"]) == case["confidence"]


@pytest.mark.parametrize("case", GOLDEN, ids=IDS)
def test_combined_helper_matches_typescript(case):
    combined = compute_lead_score_and_confidence(case["input"])
    assert combined["leadScore"] == case["leadScore"]
    assert combined["confidence"] == case["confidence"]


def test_scoring_is_deterministic():
    business = GOLDEN[0]["input"]
    assert compute_lead_score(business) == compute_lead_score(business)


def test_missing_and_none_fields_do_not_raise():
    for business in ({}, {"companyName": "X"}, {"industry": None, "budget": None}):
        result = compute_lead_score(business)
        assert 0 <= result["score"] <= 100
        assert result["tier"] in {"Cold", "Warm", "Hot", "Priority"}


def test_score_never_exceeds_component_maximums():
    for case in GOLDEN:
        result = compute_lead_score(case["input"])
        assert sum(f["max"] for f in result["breakdown"]) == 100
        for factor in result["breakdown"]:
            assert 0 <= factor["points"] <= factor["max"]


def test_confidence_always_carries_the_analytics_caveat():
    for case in GOLDEN:
        checklist = compute_confidence(case["input"])["checklist"]
        caveats = [item for item in checklist if item.get("caveat")]
        assert len(caveats) == 1
        assert caveats[0]["met"] is False
