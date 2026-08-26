"""AI endpoints — port of the three Supabase marketing edge functions.

    functions/v1/marketing-report      -> POST /api/marketing-report
    functions/v1/marketing-action      -> POST /api/marketing-action
    functions/v1/marketing-strategist  -> POST /api/marketing-strategist

The wire formats are reproduced exactly, so the React components need only a new base
URL in Phase 5 — no change to how they parse a response:

* **marketing-report** streams newline-delimited JSON: one ``{"type":"stage",...}``
  event per stage transition, then ``{"type":"final","report":...}`` or
  ``{"type":"error",...}``. ``PipelineStatus.tsx`` already consumes exactly this.
* **marketing-strategist** streams the AI SDK *UI message stream* — Server-Sent
  Events carrying ``text-start`` / ``text-delta`` / ``text-end`` frames plus the
  ``x-vercel-ai-ui-message-stream: v1`` header. This is what ``useChat`` expects; a
  plain text stream would render nothing. The frame sequence below was verified
  against the real ``ChatView`` component in a browser before being written here.
"""

from __future__ import annotations

import json
import time
import uuid
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse

from app.services import pipeline_stages as stages
from app.services.ai_gateway import (
    ACTION_TIMEOUT_SECONDS,
    AiError,
    AiQuotaError,
    AiRateLimitError,
    ConfigError,
    ValidationError,
    generate_text,
    log,
    log_error,
    stream_text,
)

router = APIRouter(prefix="/api", tags=["ai"])

STAGE_IDS = [
    "business-analyst",
    "lead-scorer",
    "competitor-analyst",
    "marketing-strategist",
    "content-generator",
    "campaign-assistant",
]

# Fixed registry — the action id must be one of these, so an arbitrary prompt can
# never be injected through the `action` field.
ACTION_PROMPTS: dict[str, str] = {
    "google-ads": "Generate 5 high-converting Google Ads (Responsive Search Ads) with headlines (max 30 chars each), descriptions (max 90 chars), and target keywords. Use markdown.",
    "facebook-ads": "Generate 5 Facebook/Meta Ads with primary text, headline, description, CTA, and audience targeting recommendations. Use markdown.",
    "instagram-captions": "Generate 10 engaging Instagram captions with hooks, value, CTAs, and 10-15 relevant hashtags each. Use markdown.",
    "seo-keywords": "Generate a deep SEO keyword strategy: 15 primary, 20 secondary, 30 long-tail keywords with search intent. Format as markdown tables.",
    "content-calendar": "Generate a complete 30-day content calendar with daily posts across Instagram, Facebook, LinkedIn, blog, and email. Format as a markdown table grouped by week.",
    "email-campaign": "Generate a full 5-email marketing nurture sequence with subject lines, preview text, body copy, and CTAs. Use markdown.",
}

ACTION_SYSTEM = (
    "You are NexaGrowth AI — a senior marketing strategist producing client-ready "
    "deliverables. Be specific, concrete, and grounded in the business context provided."
)

STRATEGIST_SYSTEM = """You are NexaGrowth AI — a senior digital marketing strategist with 15+ years of experience advising B2B SaaS, D2C, and e-commerce brands. You speak like a sharp, friendly consultant, not a chatbot.

## Your Approach
1. **Ask before assuming.** When key context is missing (business model, audience, budget, goals, current channels), ask 1–3 focused questions before generating strategy. Never ask more than 3 questions at once.
2. **Be decisive.** Once you have enough context, give specific, actionable recommendations — not generic advice.
3. **Think in numbers.** Use real benchmarks (CTR, CPC, CPA, ROAS, conversion rates) and ranges that fit the user's stage and budget.

## When generating a strategy, structure your response with markdown headings:
- **🎯 Strategic Summary** — 2–3 sentences positioning the recommendation
- **📊 Channel Mix & Budget Allocation** — table or bullets with %, dollar amounts, and rationale
- **🚀 30-Day Action Plan** — week-by-week breakdown
- **💡 Content & Campaign Ideas** — 5–8 specific, named ideas (not generic)
- **📈 KPI Targets** — realistic numeric targets for leads, traffic, conversions, ROAS
- **⚡ Quick Wins** — 3 things to ship in the first 7 days

## Voice
- Confident and warm, never salesy
- Use markdown formatting: bold, bullets, tables, headings
- Keep paragraphs short (2–3 lines max)
- Use emojis sparingly as section markers only
- Always close with one suggested next question or next step

## Boundaries
- If asked about non-marketing topics, gently redirect: "I'm built for marketing strategy — let's focus on growing your business."
- Never invent client case studies. If you cite benchmarks, frame them as "industry averages."""


def _error_response(exc: Exception) -> JSONResponse:
    """Map a typed AI error onto the status codes the frontend already handles."""
    if isinstance(exc, ValidationError):
        return JSONResponse({"error": str(exc)}, status_code=400)
    if isinstance(exc, ConfigError):
        return JSONResponse({"error": str(exc)}, status_code=500)
    if isinstance(exc, AiRateLimitError):
        return JSONResponse({"error": str(exc)}, status_code=429)
    if isinstance(exc, AiQuotaError):
        return JSONResponse({"error": str(exc)}, status_code=402)
    if isinstance(exc, AiError):
        return JSONResponse({"error": f"AI request failed: {exc}"}, status_code=502)
    return JSONResponse({"error": str(exc) or "Unknown error"}, status_code=500)


def _validate_business(payload: Any) -> dict[str, Any]:
    """Same two required fields the edge function enforced."""
    business = payload.get("business") if isinstance(payload, dict) else None
    if not isinstance(business, dict):
        raise ValidationError("business object is required")
    company_name = business.get("companyName")
    industry = business.get("industry")
    company_name = company_name.strip() if isinstance(company_name, str) else ""
    industry = industry.strip() if isinstance(industry, str) else ""
    if not company_name:
        raise ValidationError("business.companyName is required")
    if not industry:
        raise ValidationError("business.industry is required")
    return {**business, "companyName": company_name, "industry": industry}


# ==========================================================================
# POST /api/marketing-report  — NDJSON stream of the 6-stage pipeline
# ==========================================================================


@router.post("/marketing-report")
async def marketing_report(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"error": "Request body must be valid JSON"}, status_code=400)

    try:
        business = _validate_business(payload)
    except ValidationError as exc:
        log_error("validation_error", exc)
        return _error_response(exc)

    # A missing key is a configuration problem, not a stage failure — so it returns a
    # plain JSON error rather than opening a stream just to immediately fail inside it.
    try:
        from app.services.ai_gateway import get_model_id

        model_id = get_model_id()
    except ConfigError as exc:
        log_error("config_error", exc)
        return _error_response(exc)

    log("request_received", fn="marketing-report", companyName=business["companyName"], model=model_id)

    def event_stream() -> Iterator[bytes]:
        started = time.monotonic()
        pipeline_log: list[dict[str, Any]] = []

        def send(event: dict[str, Any]) -> bytes:
            return (json.dumps(event) + "\n").encode("utf-8")

        def run_stage(stage_id: str, fn):
            """Emit running -> done|failed around one stage, timing it."""
            yield send({"type": "stage", "stage": stage_id, "status": "running"})
            stage_started = time.monotonic()
            try:
                result = fn()
            except Exception as exc:
                duration = int((time.monotonic() - stage_started) * 1000)
                pipeline_log.append(
                    {"stage": stage_id, "status": "failed", "durationMs": duration, "error": str(exc)}
                )
                log_error("stage_failed", exc, stage=stage_id, durationMs=duration)
                yield send(
                    {
                        "type": "stage",
                        "stage": stage_id,
                        "status": "failed",
                        "durationMs": duration,
                        "error": str(exc),
                    }
                )
                raise
            duration = int((time.monotonic() - stage_started) * 1000)
            pipeline_log.append({"stage": stage_id, "status": "done", "durationMs": duration})
            log("stage_done", stage=stage_id, durationMs=duration)
            yield send({"type": "stage", "stage": stage_id, "status": "done", "durationMs": duration})
            # `yield from` propagates a generator's return value to the caller, so
            # each stage streams its events *and* hands back its result.
            return result

        try:
            analyst = yield from run_stage(
                "business-analyst", lambda: stages.run_business_analyst_stage(business)
            )
            scores = yield from run_stage(
                "lead-scorer", lambda: stages.run_lead_scorer_stage(business)
            )
            competitor = yield from run_stage(
                "competitor-analyst",
                lambda: stages.run_competitor_analyst_stage(business, analyst),
            )
            strategy = yield from run_stage(
                "marketing-strategist",
                lambda: stages.run_marketing_strategist_stage(business, analyst, competitor),
            )
            content = yield from run_stage(
                "content-generator",
                lambda: stages.run_content_generator_stage(business, analyst, strategy),
            )
            campaign = yield from run_stage(
                "campaign-assistant",
                lambda: stages.run_campaign_assistant_stage(
                    business, analyst, scores["leadScore"], competitor, strategy, content
                ),
            )

            report = {
                "companyName": business["companyName"],
                "executiveSummary": campaign.executiveSummary,
                "businessAnalysis": analyst.businessAnalysis.model_dump(),
                "swot": competitor.swot.model_dump(),
                "competitorAnalysis": competitor.competitorAnalysis.model_dump(),
                "marketingStrategy": [c.model_dump() for c in strategy.marketingStrategy],
                "budgetAllocation": [b.model_dump() for b in strategy.budgetAllocation],
                "actionPlan": strategy.actionPlan.model_dump(),
                "ninetyDayStrategy": strategy.ninetyDayStrategy.model_dump(),
                "seo": content.seo.model_dump(),
                "contentIdeas": content.contentIdeas.model_dump(),
                "kpis": strategy.kpis.model_dump(),
                "leadScore": scores["leadScore"],
                "recommendedPlan": strategy.recommendedPlan.model_dump(),
                "riskAnalysis": [r.model_dump() for r in campaign.riskAnalysis],
                "confidence": scores["confidence"],
                "finalRecommendations": campaign.finalRecommendations,
                "pipeline": pipeline_log,
            }
            log(
                "request_success",
                fn="marketing-report",
                elapsedMs=int((time.monotonic() - started) * 1000),
                leadScore=scores["leadScore"]["score"],
            )
            yield send({"type": "final", "report": report})
        except Exception as exc:
            # The stage already emitted its own "failed" event; this final "error"
            # tells the client the pipeline is over and gives one message to show.
            log_error("pipeline_failed", exc, elapsedMs=int((time.monotonic() - started) * 1000))
            yield send({"type": "error", "error": str(exc) or "Pipeline failed"})

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ==========================================================================
# POST /api/marketing-action  — one deliverable, plain JSON
# ==========================================================================


@router.post("/marketing-action")
async def marketing_action(request: Request):
    started = time.monotonic()
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"error": "Request body must be valid JSON"}, status_code=400)

    if not isinstance(payload, dict):
        return JSONResponse({"error": "Request body must be a JSON object"}, status_code=400)

    action = payload.get("action") if isinstance(payload.get("action"), str) else ""
    instruction = ACTION_PROMPTS.get(action)
    if not instruction:
        return _error_response(ValidationError(f'Unknown action "{action}"'))

    business = payload.get("business") or {}
    report = payload.get("report") or {}
    summary = report.get("executiveSummary", "") if isinstance(report, dict) else ""

    log("request_received", fn="marketing-action", action=action)

    try:
        text = generate_text(
            system=ACTION_SYSTEM,
            prompt=(
                f"Business context:\n{json.dumps(business, indent=2)}\n\n"
                f"Strategy context (summary):\n{summary}\n\n"
                f"Task: {instruction}"
            ),
            label="AI generation",
            timeout=ACTION_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        log_error("ai_call_failed", exc, action=action)
        return _error_response(exc)

    log(
        "request_success",
        fn="marketing-action",
        action=action,
        elapsedMs=int((time.monotonic() - started) * 1000),
        responseLength=len(text),
    )
    # The frontend reads `data.text` — keep that key exactly.
    return JSONResponse({"text": text})


# ==========================================================================
# POST /api/marketing-strategist  — SSE UI message stream for useChat
# ==========================================================================


def _ui_event(payload: dict[str, Any]) -> bytes:
    return f"data: {json.dumps(payload)}\n\n".encode("utf-8")


def _extract_message_text(message: Any) -> str:
    """Read one UIMessage's text.

    `useChat` sends messages as an ordered array of typed `parts`; older payloads
    used a flat `content` string. Both are accepted so the endpoint does not depend
    on which shape the client happens to send.
    """
    if not isinstance(message, dict):
        return ""
    parts = message.get("parts")
    if isinstance(parts, list):
        return "".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and part.get("type") == "text"
        )
    content = message.get("content")
    return content if isinstance(content, str) else ""


@router.post("/marketing-strategist")
async def marketing_strategist(request: Request):
    try:
        payload = await request.json()
    except Exception:
        return JSONResponse({"error": "Request body must be valid JSON"}, status_code=400)

    messages = payload.get("messages") if isinstance(payload, dict) else None
    if not isinstance(messages, list) or not messages:
        return JSONResponse({"error": "messages array required"}, status_code=400)

    business = payload.get("business") or {}
    report_summary = payload.get("reportSummary") or ""

    system = STRATEGIST_SYSTEM
    if business:
        system += (
            "\n\n## Current Client Context\n"
            f"Company Name: {business.get('companyName')}\n"
            f"Industry: {business.get('industry')}\n"
            f"Audience: {business.get('audience') or 'Unknown'}\n"
            f"Budget: {business.get('budget') or 'Unknown'}\n"
            f"Goal: {business.get('goal') or 'Unknown'}\n"
            f"Channels: {business.get('currentChannels') or 'None specified'}"
        )
    if report_summary:
        system += f"\n\n## Strategy Executive Summary\n{report_summary}"

    # Flatten the conversation into a single prompt. `convertToModelMessages` did this
    # on the TypeScript side; Gemini takes the transcript directly.
    transcript_parts = []
    for message in messages:
        role = message.get("role", "user") if isinstance(message, dict) else "user"
        text = _extract_message_text(message)
        if text:
            transcript_parts.append(f"{'User' if role == 'user' else 'Assistant'}: {text}")
    transcript = "\n\n".join(transcript_parts)

    try:
        from app.services.ai_gateway import get_model_id

        get_model_id()
    except ConfigError as exc:
        log_error("config_error", exc)
        return _error_response(exc)

    log("request_received", fn="marketing-strategist", messageCount=len(messages))

    def sse_stream() -> Iterator[bytes]:
        message_id = f"msg-{uuid.uuid4().hex[:12]}"
        yield _ui_event({"type": "start"})
        yield _ui_event({"type": "start-step"})
        yield _ui_event({"type": "text-start", "id": message_id})
        try:
            for delta in stream_text(
                system=system, prompt=transcript, label="Marketing Strategist chat"
            ):
                yield _ui_event({"type": "text-delta", "id": message_id, "delta": delta})
        except Exception as exc:
            log_error("stream_error", exc)
            # The stream is already open, so the failure is reported as an error frame
            # rather than an HTTP status the client can no longer see.
            yield _ui_event({"type": "error", "errorText": str(exc)})
        yield _ui_event({"type": "text-end", "id": message_id})
        yield _ui_event({"type": "finish-step"})
        yield _ui_event({"type": "finish"})
        yield b"data: [DONE]\n\n"

    return StreamingResponse(
        sse_stream(),
        media_type="text/event-stream",
        headers={
            # useChat requires this header to treat the body as a UI message stream.
            "x-vercel-ai-ui-message-stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
