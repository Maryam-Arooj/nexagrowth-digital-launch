"""Phase 4 tests — the AI endpoints, with the model stubbed.

The Gemini backend is replaced wholesale via `ai_gateway.set_backends`, so the whole
six-stage pipeline, the JSON repair chain, schema validation, the NDJSON protocol and
the SSE UI-message protocol are all exercised deterministically with **no network call
and no API key**. Only the model itself is faked; every other line of production code
runs for real.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services import ai_gateway, pipeline_stages

client = TestClient(app)

BUSINESS = {
    "companyName": "TestCo",
    "industry": "B2B SaaS",
    "audience": "SMB founders",
    "budget": "$4,000",
    "goal": "scale revenue fast",
    "currentChannels": "SEO, Google Ads",
}

COMPETITOR_JSON = {
    "swot": {
        "strengths": ["Strong brand"], "weaknesses": ["Thin content"],
        "opportunities": ["SEO gap"], "threats": ["Incumbents"],
    },
    "competitorAnalysis": {
        "topCompetitors": [{"name": "Established category leader", "note": "Inferred"}],
        "competitiveAdvantages": ["Faster"], "marketGaps": ["Long-tail SEO"],
        "differentiationStrategy": "Own the long tail",
    },
}
STRATEGY_JSON = {
    "marketingStrategy": [{"channel": "SEO", "why": "Compounding", "priority": "High"}],
    "budgetAllocation": [{"channel": "SEO", "percent": 100, "amount": 4000, "expectedRoi": "3x"}],
    "actionPlan": {"week1": ["Audit"], "week2": ["Fix"], "week3": ["Publish"], "week4": ["Measure"]},
    "ninetyDayStrategy": {
        "month1": {"theme": "Foundation", "keyActions": ["Audit"]},
        "month2": {"theme": "Scale", "keyActions": ["Publish"]},
        "month3": {"theme": "Optimise", "keyActions": ["Test"]},
    },
    "kpis": {
        "expectedLeads": "50", "conversionRate": "3%", "roas": "3x",
        "ctr": "2%", "trafficGrowth": "40%", "monthlySales": "$20k",
    },
    "recommendedPlan": {"name": "Growth", "monthlyPrice": 3499, "reasoning": "Budget fit"},
}
CONTENT_JSON = {
    "seo": {
        "primaryKeywords": ["b2b saas seo"], "secondaryKeywords": ["saas content"],
        "longTailKeywords": ["best seo for b2b saas"], "metaTitle": "T", "metaDescription": "D",
        "blogIdeas": ["Idea"], "internalLinking": ["/blog"],
    },
    "contentIdeas": {
        "instagramPosts": ["a"], "reels": ["b"], "stories": ["c"],
        "facebookPosts": ["d"], "linkedinPosts": ["e"], "emailCampaigns": ["f"],
    },
}
CAMPAIGN_JSON = {
    "executiveSummary": "A concise executive summary for TestCo.",
    "riskAnalysis": [{"risk": "Slow SEO", "mitigation": "Pair with ads"}],
    "finalRecommendations": ["Fix technical SEO"],
}


def _stub_text(*, model, system, prompt, timeout, response_schema=None):
    """Route each stage to its canned payload by matching the system prompt."""
    if "competitive landscape" in system:
        return json.dumps(COMPETITOR_JSON)
    if "Budget percentages must sum to 100" in system:
        # Deliberately wrapped in a markdown fence with a trailing comma, so the
        # repair chain is exercised on the real path rather than only in unit tests.
        return "```json\n" + json.dumps(STRATEGY_JSON)[:-1] + ",}\n```"
    if "SEO and content-planning inputs" in system:
        return json.dumps(CONTENT_JSON)
    if "Synthesize the prior analysis" in system:
        return json.dumps(CAMPAIGN_JSON)
    return "Generated deliverable text."


def _stub_stream(*, model, system, prompt, timeout):
    yield "Start with "
    yield "**SEO**."


@pytest.fixture(autouse=True)
def stub_ai(monkeypatch):
    monkeypatch.setattr(get_settings(), "gemini_api_key", "test-key-not-real", raising=False)
    previous = ai_gateway.set_backends(text=_stub_text, stream=_stub_stream)
    yield
    ai_gateway.set_backends(*previous)


def _ndjson(response) -> list[dict]:
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


# ----------------------------------------------------- marketing-report


def test_pipeline_streams_all_six_stages_then_final():
    response = client.post("/api/marketing-report", json={"business": BUSINESS})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-ndjson")
    events = _ndjson(response)

    running = [e["stage"] for e in events if e.get("status") == "running"]
    done = [e["stage"] for e in events if e.get("status") == "done"]
    from app.routers.marketing import STAGE_IDS

    assert running == STAGE_IDS
    assert done == STAGE_IDS
    assert events[-1]["type"] == "final"


def test_every_stage_reports_a_duration():
    events = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))
    for event in events:
        if event.get("status") == "done":
            assert isinstance(event["durationMs"], int)


def test_final_report_has_every_key_the_frontend_renders():
    events = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))
    report = events[-1]["report"]
    for key in (
        "companyName", "executiveSummary", "businessAnalysis", "swot", "competitorAnalysis",
        "marketingStrategy", "budgetAllocation", "actionPlan", "ninetyDayStrategy", "seo",
        "contentIdeas", "kpis", "leadScore", "recommendedPlan", "riskAnalysis", "confidence",
        "finalRecommendations", "pipeline",
    ):
        assert key in report, f"missing {key}"


def test_swot_and_scores_survive_the_pipeline():
    report = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))[-1]["report"]
    assert report["swot"]["strengths"] == ["Strong brand"]
    # Deterministic engine, not the AI. Cross-checked by executing the original
    # TypeScript on this exact business: 20+20+20+17+8 = 85 (Priority).
    assert report["leadScore"]["score"] == 85
    assert report["leadScore"]["tier"] == "Priority"
    assert [f["points"] for f in report["leadScore"]["breakdown"]] == [20, 20, 20, 17, 8]
    assert report["confidence"]["score"] == 100


def test_markdown_fence_and_trailing_comma_are_repaired_in_the_real_path():
    """The strategy stub returns fenced JSON with a trailing comma."""
    report = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))[-1]["report"]
    assert report["recommendedPlan"]["name"] == "Growth"


def test_pipeline_log_is_embedded_in_the_report():
    report = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))[-1]["report"]
    assert len(report["pipeline"]) == 6
    assert all(entry["status"] == "done" for entry in report["pipeline"])


def test_missing_company_name_is_a_400_not_a_stream():
    response = client.post("/api/marketing-report", json={"business": {"industry": "SaaS"}})
    assert response.status_code == 400
    assert "companyName" in response.json()["error"]


def test_missing_industry_is_a_400():
    response = client.post("/api/marketing-report", json={"business": {"companyName": "X"}})
    assert response.status_code == 400


def test_a_failing_stage_emits_failed_then_error_and_keeps_earlier_stages():
    def failing(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("model exploded")

    ai_gateway.set_backends(text=failing)
    events = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))
    # Stages 1-2 are deterministic and must still have succeeded.
    done = [e["stage"] for e in events if e.get("status") == "done"]
    assert done == ["business-analyst", "lead-scorer"]
    assert any(e.get("status") == "failed" and e["stage"] == "competitor-analyst" for e in events)
    assert events[-1]["type"] == "error"


def test_rate_limit_keeps_the_429_prefix_the_frontend_matches_on():
    def limited(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("429 Too Many Requests RESOURCE_EXHAUSTED")

    ai_gateway.set_backends(text=limited)
    events = _ndjson(client.post("/api/marketing-report", json={"business": BUSINESS}))
    assert "429" in events[-1]["error"]


# ----------------------------------------------------- marketing-action


def test_action_returns_the_text_key_the_frontend_reads():
    response = client.post(
        "/api/marketing-action",
        json={"action": "google-ads", "business": BUSINESS, "report": {"executiveSummary": "S"}},
    )
    assert response.status_code == 200
    assert response.json()["text"] == "Generated deliverable text."


@pytest.mark.parametrize("action", list(pipeline_stages.PLAN_CATALOG and [
    "google-ads", "facebook-ads", "instagram-captions",
    "seo-keywords", "content-calendar", "email-campaign",
]))
def test_all_six_actions_are_registered(action):
    response = client.post("/api/marketing-action", json={"action": action, "business": BUSINESS})
    assert response.status_code == 200


def test_unknown_action_is_rejected():
    response = client.post("/api/marketing-action", json={"action": "../etc/passwd"})
    assert response.status_code == 400
    assert "Unknown action" in response.json()["error"]


def test_action_rate_limit_maps_to_429():
    def limited(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("429 rate limit")

    ai_gateway.set_backends(text=limited)
    response = client.post("/api/marketing-action", json={"action": "google-ads", "business": BUSINESS})
    assert response.status_code == 429


# ------------------------------------------------ marketing-strategist


def _sse(response) -> list[dict]:
    out = []
    for line in response.text.splitlines():
        if line.startswith("data: ") and line != "data: [DONE]":
            out.append(json.loads(line[6:]))
    return out


def test_chat_returns_the_ui_message_stream_header_usechat_requires():
    response = client.post(
        "/api/marketing-strategist",
        json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "Hi"}]}]},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["x-vercel-ai-ui-message-stream"] == "v1"


def test_chat_frame_sequence_matches_what_usechat_parses():
    response = client.post(
        "/api/marketing-strategist",
        json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "Where do I start?"}]}]},
    )
    types = [event["type"] for event in _sse(response)]
    assert types[0] == "start"
    assert types[1] == "start-step"
    assert "text-start" in types and "text-end" in types
    assert types[-2:] == ["finish-step", "finish"]
    assert response.text.rstrip().endswith("data: [DONE]")


def test_chat_deltas_carry_the_model_output_and_share_one_id():
    events = _sse(
        client.post(
            "/api/marketing-strategist",
            json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "Hi"}]}]},
        )
    )
    deltas = [e for e in events if e["type"] == "text-delta"]
    assert "".join(d["delta"] for d in deltas) == "Start with **SEO**."
    assert len({d["id"] for d in deltas}) == 1


def test_chat_accepts_the_legacy_content_shape_too():
    response = client.post(
        "/api/marketing-strategist",
        json={"messages": [{"role": "user", "content": "Hi"}]},
    )
    assert response.status_code == 200


def test_chat_requires_a_messages_array():
    assert client.post("/api/marketing-strategist", json={"messages": []}).status_code == 400
    assert client.post("/api/marketing-strategist", json={}).status_code == 400


def test_chat_stream_failure_is_reported_in_band_not_as_a_dead_stream():
    def failing(*, model, system, prompt, timeout):
        raise RuntimeError("model exploded")
        yield  # pragma: no cover

    ai_gateway.set_backends(stream=failing)
    events = _sse(
        client.post(
            "/api/marketing-strategist",
            json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "Hi"}]}]},
        )
    )
    assert any(e["type"] == "error" for e in events)


# --------------------------------------------------------- configuration


def test_missing_api_key_is_a_clean_500_on_every_ai_route(monkeypatch):
    monkeypatch.setattr(get_settings(), "gemini_api_key", "", raising=False)
    for path, body in (
        ("/api/marketing-report", {"business": BUSINESS}),
        ("/api/marketing-action", {"action": "google-ads", "business": BUSINESS}),
        ("/api/marketing-strategist", {"messages": [{"role": "user", "content": "Hi"}]}),
    ):
        response = client.post(path, json=body)
        assert response.status_code == 500, path
        assert "GEMINI_API_KEY" in response.json()["error"]


def test_no_response_ever_contains_the_api_key():
    response = client.post("/api/marketing-report", json={"business": BUSINESS})
    assert "test-key-not-real" not in response.text
