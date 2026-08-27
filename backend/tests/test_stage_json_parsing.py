"""JSON extraction and stage-schema validation.

These cover the two failure modes that broke the AI Employee pipeline against
gemini-3.6-flash, and they pin the behaviour so neither can return silently:

  * a reasoning model wrapping its JSON in fences, a preamble, or trailing prose —
    sometimes with braces in that prose, which the old first-{/last-} slice ate;
  * "use plain numbers" producing numbers in fields the schema types as `str`.

Structured output (response_schema) now makes malformed bodies unlikely in the first
place, but this repair path is the fallback, so it still has to work.
"""

from __future__ import annotations

import json

import pytest

from app.services.pipeline_stages import (
    CampaignStageResult,
    ContentStageResult,
    StrategyStageResult,
    coerce_numeric_fields,
    extract_json,
    generate_stage_json,
    parse_model_json,
)
from app.services import ai_gateway
from app.services.ai_gateway import AiError

# A minimal but complete Marketing Strategist payload. Numeric where the prompt says
# "plain numbers" and the schema says str — exactly what the live model returns.
STRATEGY = {
    "marketingStrategy": [{"channel": "SEO", "why": "Compounding inbound", "priority": "High"}],
    "budgetAllocation": [
        {"channel": "SEO", "percent": 60, "amount": 4500, "expectedRoi": 3.5},
        {"channel": "Email", "percent": 40, "amount": 3000, "expectedRoi": "2.8x"},
    ],
    "actionPlan": {"week1": ["a"], "week2": ["b"], "week3": ["c"], "week4": ["d"]},
    "ninetyDayStrategy": {
        "month1": {"theme": "Foundation", "keyActions": ["a"]},
        "month2": {"theme": "Scale", "keyActions": ["b"]},
        "month3": {"theme": "Optimise", "keyActions": ["c"]},
    },
    "kpis": {
        "expectedLeads": 150, "conversionRate": 3.2, "roas": 4.2,
        "ctr": 2.1, "trafficGrowth": 35, "monthlySales": 42000,
    },
    "recommendedPlan": {"name": "Growth", "monthlyPrice": "2999", "reasoning": "Fits budget"},
}
BODY = json.dumps(STRATEGY)


# ------------------------------------------------------------------ extraction

@pytest.mark.parametrize(
    "label,raw",
    [
        ("bare json", BODY),
        ("json fence", f"```json\n{BODY}\n```"),
        ("plain fence", f"```\n{BODY}\n```"),
        ("leading whitespace", f"\n\n   {BODY}   \n"),
        ("preamble", f"Here is the strategy you asked for:\n\n{BODY}"),
        ("trailing prose", f"{BODY}\n\nLet me know if you want changes."),
        ("both sides", f"Sure!\n```json\n{BODY}\n```\nHope that helps."),
        # Braces in the prose: the old first-{/last-} slice cut through these.
        ("brace in preamble", f"I will return {{channel, why, priority}} objects:\n{BODY}"),
        ("brace in trailer", f"{BODY}\nNote: the {{percent}} values sum to 100."),
        ("thinking block", f"<thinking>Split {{60/40}} looks right.</thinking>\n{BODY}"),
        ("trailing comma", BODY.replace('"priority": "High"}', '"priority": "High",}')),
    ],
)
def test_extraction_recovers_the_payload(label: str, raw: str) -> None:
    parsed = parse_model_json(raw)
    assert isinstance(parsed, dict), label
    assert parsed["kpis"]["expectedLeads"] in (150, "150"), label


def test_extract_json_prefers_the_real_payload_over_a_decoy_brace_pair() -> None:
    raw = f"Format is {{channel, why}} — result:\n{BODY}"
    assert json.loads(extract_json(raw))["marketingStrategy"][0]["channel"] == "SEO"


# ------------------------------------------------------------------ validation

def test_numeric_values_are_accepted_where_the_schema_says_string() -> None:
    result = StrategyStageResult.model_validate(coerce_numeric_fields(parse_model_json(BODY)))
    # Coerced to str for the frontend contract...
    assert result.kpis.expectedLeads == "150"
    assert result.kpis.roas == "4.2"
    assert all(isinstance(v, str) for v in result.kpis.model_dump().values())
    # ...while genuinely numeric fields stay numeric.
    assert result.budgetAllocation[0].percent == 60.0
    assert result.recommendedPlan.monthlyPrice == 2999.0


def test_content_and_campaign_schemas_accept_a_normal_payload() -> None:
    content = {
        "seo": {
            "primaryKeywords": ["a"], "secondaryKeywords": ["b"], "longTailKeywords": ["c"],
            "metaTitle": "T", "metaDescription": "D", "blogIdeas": ["i"], "internalLinking": ["/x"],
        },
        "contentIdeas": {
            "instagramPosts": ["p"], "reels": ["r"], "stories": ["s"],
            "facebookPosts": ["f"], "linkedinPosts": ["l"], "emailCampaigns": ["e"],
        },
    }
    campaign = {
        "executiveSummary": "S.",
        "riskAnalysis": [{"risk": "r", "mitigation": "m"}],
        "finalRecommendations": ["do x"],
    }
    assert ContentStageResult.model_validate(parse_model_json(json.dumps(content)))
    assert CampaignStageResult.model_validate(parse_model_json(json.dumps(campaign)))


# ------------------------------------------------- failures must stay failures

@pytest.mark.parametrize(
    "label,raw",
    [
        ("prose only", "I could not produce a strategy for this business."),
        ("empty", ""),
        ("truncated", BODY[: int(len(BODY) * 0.7)]),
        ("not an object", "[1, 2, 3]"),
    ],
)
def test_unrecoverable_output_raises_a_useful_error(label: str, raw: str) -> None:
    def stub(*, model, system, prompt, timeout, response_schema=None):
        return raw

    previous = ai_gateway.set_backends(text=stub)
    try:
        with pytest.raises(AiError) as excinfo:
            generate_stage_json(
                system="s", prompt="p", schema=StrategyStageResult, label="Marketing Strategist"
            )
    finally:
        ai_gateway.set_backends(*previous)
    message = str(excinfo.value)
    assert "Marketing Strategist" in message, label
    assert "invalid JSON" in message or "expected format" in message, label


def test_a_wrong_shape_is_rejected_rather_than_silently_accepted() -> None:
    """Validation must not be weakened: a plausible but wrong payload still fails."""
    wrong = dict(STRATEGY)
    wrong["kpis"] = {"expectedLeads": 150}          # five required KPI fields missing

    def stub(*, model, system, prompt, timeout, response_schema=None):
        return json.dumps(wrong)

    previous = ai_gateway.set_backends(text=stub)
    try:
        with pytest.raises(AiError, match="expected format"):
            generate_stage_json(
                system="s", prompt="p", schema=StrategyStageResult, label="Marketing Strategist"
            )
    finally:
        ai_gateway.set_backends(*previous)


def test_the_schema_is_passed_to_the_provider_for_structured_output() -> None:
    """Every AI stage must ask for structured output, not just hope for clean text."""
    seen: dict[str, object] = {}

    def stub(*, model, system, prompt, timeout, response_schema=None):
        seen["schema"] = response_schema
        return BODY

    previous = ai_gateway.set_backends(text=stub)
    try:
        generate_stage_json(
            system="s", prompt="p", schema=StrategyStageResult, label="Marketing Strategist"
        )
    finally:
        ai_gateway.set_backends(*previous)
    assert seen["schema"] is StrategyStageResult
