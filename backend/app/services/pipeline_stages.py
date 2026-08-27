"""The six pipeline stages — port of ``supabase/functions/_shared/pipelineStages.ts``.

Stages 1 and 2 are deterministic and make no model call. Stages 3–6 each make exactly
one Gemini call through :func:`generate_stage_json`, which centralises the
JSON-repair-then-validate logic so it exists once rather than four times.

Prompts and system messages are reproduced verbatim from the TypeScript. They are the
part most likely to be "improved" by accident and hardest to notice when it drifts, so
they were copied rather than rewritten. Zod schemas become Pydantic models; the
validation contract is identical.
"""

from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict, ValidationError as PydanticValidationError

from app.services.ai_gateway import (
    STAGE_TIMEOUT_SECONDS,
    AiError,
    generate_text,
    log_error,
)
from app.services.lead_scoring import (
    ChannelGuardrails,
    classify_business,
    compute_lead_score_and_confidence,
)

# The three real plans from the site's Pricing section. The AI must pick one of
# these rather than invent a plan, so the recommendation is always something the
# visitor can actually buy. Keep in sync with src/components/Pricing.tsx.
PLAN_CATALOG = [
    {
        "name": "Starter",
        "monthlyPrice": 1499,
        "fit": "startups building initial digital presence, budgets under ~$2k/mo",
    },
    {
        "name": "Growth",
        "monthlyPrice": 3499,
        "fit": "scaling businesses ready to run paid ads across multiple channels, budgets ~$2k-$6k/mo",
    },
    {
        "name": "Enterprise",
        "monthlyPrice": 6999,
        "fit": "market leaders needing full-funnel, multi-channel management, budgets $6k+/mo",
    },
]

BASE_SYSTEM = (
    "You are NexaGrowth AI — a senior digital marketing strategist. Generate specific, "
    "decisive, data-grounded output for the exact business described in the prompt (never "
    "reuse a previous example — every field must reflect THIS business's industry, audience, "
    "budget, and goal). Use realistic industry benchmarks. Never generic filler.\n\n"
    "If the input genuinely does not give you enough information to fill a field with "
    'something real and useful, write the literal string "Insufficient data" for that field '
    "instead of inventing plausible-sounding details. Never fabricate specific numbers, client "
    "names, or facts not implied by the input — clearly-labeled estimates and reasonable "
    "industry-benchmark ranges are fine, invented specifics are not."
)

_JSON_ONLY = (
    "\n\nReturn ONLY valid minified JSON matching the requested schema. "
    "No markdown fences, no commentary."
)


# --------------------------------------------------------------------------
# JSON repair — same three-step chain as the TypeScript
# --------------------------------------------------------------------------

_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```")
_TRAILING_COMMA_RE = re.compile(r",(\s*[}\]])")
_NUMERIC_RE = re.compile(r"^-?\d+(\.\d+)?$")
_COERCE_KEYS = ("percent", "amount", "score", "monthlyPrice")


def strip_trailing_commas(text: str) -> str:
    """Remove trailing commas before } or ] — a very common LLM slip."""
    return _TRAILING_COMMA_RE.sub(r"\1", text)


def _balanced_objects(text: str) -> list[str]:
    """Every top-level ``{...}`` block in ``text``, brace-matched.

    String literals are tracked so a brace inside a JSON value cannot unbalance the
    scan, and escapes are honoured so ``"\\"`` does not swallow the closing quote.
    """
    blocks: list[str] = []
    depth = start = 0
    in_string = escaped = False
    for i, ch in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}" and depth:
            depth -= 1
            if depth == 0:
                blocks.append(text[start : i + 1])
    return blocks


def extract_json(raw: str) -> str:
    """Strip markdown fences and stray prose around the JSON body.

    This used to slice from the first ``{`` to the last ``}``. That breaks on the
    output reasoning models actually produce, where a brace can appear in the prose
    on either side of the payload:

        I will return {channel, why, priority} objects. Here is the result: {...}
        {...}  Note: the {percent} values sum to 100.

    Both sliced in prose and failed to parse. Instead, scan out every brace-matched
    top-level block and take the largest one that is genuinely parseable JSON — the
    real payload is always far larger than a decoy brace pair in a sentence.
    """
    text = raw.strip()
    fence = _FENCE_RE.search(text)
    if fence:
        text = fence.group(1).strip()

    candidates = _balanced_objects(text)
    for block in sorted(candidates, key=len, reverse=True):
        for attempt in (block, strip_trailing_commas(block)):
            try:
                if isinstance(json.loads(attempt), dict):
                    return block
            except json.JSONDecodeError:
                continue

    # Nothing parsed — fall back to the original slice so the caller still raises a
    # JSONDecodeError carrying the model's actual text (e.g. a truncated response).
    first, last = text.find("{"), text.rfind("}")
    if first >= 0 and last > first:
        text = text[first : last + 1]
    return text


def parse_model_json(raw: str) -> Any:
    cleaned = extract_json(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return json.loads(strip_trailing_commas(cleaned))


def coerce_numeric_fields(value: Any) -> Any:
    """Turn obviously-numeric strings ("85", "20") into numbers.

    Stops a near-miss response being rejected over a formatting technicality.
    """
    if isinstance(value, dict):
        for key in _COERCE_KEYS:
            candidate = value.get(key)
            if isinstance(candidate, str) and _NUMERIC_RE.match(candidate):
                value[key] = float(candidate) if "." in candidate else int(candidate)
        for nested in value.values():
            coerce_numeric_fields(nested)
    elif isinstance(value, list):
        for item in value:
            coerce_numeric_fields(item)
    return value


T = TypeVar("T", bound=BaseModel)


def generate_stage_json(*, system: str, prompt: str, schema: type[T], label: str) -> T:
    """Run one AI-backed stage: call the model, repair/parse, validate."""
    # `response_schema` puts Gemini into structured-output mode, so the body arrives
    # as bare JSON matching this schema. The repair-and-parse path below still runs:
    # it is the fallback for a provider that ignores the constraint, and it is what
    # the test suite's stub backends exercise.
    text = generate_text(
        system=system + _JSON_ONLY,
        prompt=prompt,
        label=label,
        timeout=STAGE_TIMEOUT_SECONDS,
        response_schema=schema,
    )
    try:
        parsed = parse_model_json(text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise AiError(f"{label}: AI returned invalid JSON. Please try again.") from exc

    parsed = coerce_numeric_fields(parsed)
    try:
        return schema.model_validate(parsed)
    except PydanticValidationError as exc:
        # The user-facing message stays deliberately vague, but throwing the detail
        # away made this class of failure undiagnosable from the logs. Record which
        # fields actually failed and what the model sent for them.
        log_error(
            "stage_schema_mismatch",
            exc,
            stage=label,
            errors=[
                {"field": ".".join(str(p) for p in e["loc"]), "type": e["type"], "got": repr(e.get("input"))[:120]}
                for e in exc.errors()[:8]
            ],
        )
        raise AiError(
            f"{label}: AI response did not match the expected format. Please retry."
        ) from exc


# ==========================================================================
# Stage 1 — Business Analyst (deterministic, no AI call)
# ==========================================================================


class StageModel(BaseModel):
    """Base for every stage schema.

    ``coerce_numbers_to_str`` is here because the stage prompts and the schemas
    disagreed about type. The prompts tell the model "All numeric fields use plain
    numbers (no % or $ symbols)", while several of the fields it says that about are
    typed ``str`` — every key of ``Kpis`` (expectedLeads, conversionRate, roas, ctr,
    trafficGrowth, monthlySales) and ``BudgetLine.expectedRoi``. Pydantic v2 does not
    coerce number -> str by default, so an entirely reasonable response like
    ``{"roas": 4.2, "expectedLeads": 150}`` was rejected and surfaced as
    "AI response did not match the expected format".

    Coercing keeps every value a ``str`` after validation, so the report structure the
    frontend consumes is byte-for-byte the same contract as before.
    """

    model_config = ConfigDict(coerce_numbers_to_str=True)


class BusinessAnalysis(StageModel):
    model: str
    audience: str
    strengths: str
    currentPosition: str


class BusinessAnalystResult(StageModel):
    businessAnalysis: BusinessAnalysis
    classification: dict[str, Any]


def _text(business: dict[str, Any], key: str) -> str:
    value = business.get(key)
    return value if isinstance(value, str) else ""


def run_business_analyst_stage(business: dict[str, Any]) -> BusinessAnalystResult:
    classification: ChannelGuardrails = classify_business(_text(business, "industry"))
    audience = _text(business, "audience").strip() or "Not specified"
    goal = _text(business, "goal").strip() or "Not specified"
    channels = _text(business, "currentChannels").strip()

    approximate = (
        ""
        if classification["matched"]
        else " (approximate classification — industry text didn't map cleanly to a known category)"
    )
    return BusinessAnalystResult(
        businessAnalysis=BusinessAnalysis(
            model=classification["categoryLabel"],
            audience=audience,
            strengths=(
                f"Currently active in: {channels}"
                if channels
                else "No current marketing channels reported — greenfield opportunity, "
                "no legacy channel bias to work around."
            ),
            currentPosition=(
                f"Stated 90-day goal: {goal}. "
                f"Classified as {classification['categoryLabel']}{approximate}."
            ),
        ),
        classification=dict(classification),
    )


# ==========================================================================
# Stage 2 — Lead Scorer (deterministic, reuses lead_scoring.py as-is)
# ==========================================================================


def run_lead_scorer_stage(business: dict[str, Any]) -> dict[str, Any]:
    return compute_lead_score_and_confidence(business)


# ==========================================================================
# Stage 3 — Competitor Analyst (AI)
# ==========================================================================


class Swot(StageModel):
    strengths: list[str]
    weaknesses: list[str]
    opportunities: list[str]
    threats: list[str]


class Competitor(StageModel):
    name: str
    note: str


class CompetitorAnalysis(StageModel):
    topCompetitors: list[Competitor]
    competitiveAdvantages: list[str]
    marketGaps: list[str]
    differentiationStrategy: str


class CompetitorStageResult(StageModel):
    swot: Swot
    competitorAnalysis: CompetitorAnalysis


COMPETITOR_SYSTEM = (
    BASE_SYSTEM
    + "\n\nYou have no web search or live competitor data access — this project has no "
    "web-search integration. Do NOT invent specific real company names, funding numbers, or "
    "claimed facts about actual named competitors. Instead, describe the likely competitive "
    'landscape using realistic archetypes/patterns for this industry (e.g. "Established '
    'category leader", "Low-cost local challenger", "Niche premium player") in the "name" '
    'field, and keep every "note" clearly framed as strategic inference, not verified fact '
    "about a real company."
)


def run_competitor_analyst_stage(
    business: dict[str, Any], analyst: BusinessAnalystResult
) -> CompetitorStageResult:
    prompt = (
        f"Business:\n{json.dumps(business, indent=2)}\n\n"
        f"Business analysis so far:\n{json.dumps(analyst.businessAnalysis.model_dump(), indent=2)}\n\n"
        f"Category: {analyst.classification['categoryLabel']}\n\n"
        "Return a JSON object with EXACTLY these keys: "
        "swot{strengths[],weaknesses[],opportunities[],threats[]}, "
        "competitorAnalysis{topCompetitors[{name,note}] (3-4 realistic competitor archetypes, "
        "not invented real companies),competitiveAdvantages[],marketGaps[],"
        "differentiationStrategy(string)}."
    )
    return generate_stage_json(
        system=COMPETITOR_SYSTEM,
        prompt=prompt,
        schema=CompetitorStageResult,
        label="Competitor Analyst",
    )


# ==========================================================================
# Stage 4 — Marketing Strategist (AI)
# ==========================================================================


class StrategyChannel(StageModel):
    channel: str
    why: str
    priority: str


class BudgetLine(StageModel):
    channel: str
    percent: float
    amount: float
    expectedRoi: str


class ActionPlan(StageModel):
    week1: list[str]
    week2: list[str]
    week3: list[str]
    week4: list[str]


class MonthPlan(StageModel):
    theme: str
    keyActions: list[str]


class NinetyDayStrategy(StageModel):
    month1: MonthPlan
    month2: MonthPlan
    month3: MonthPlan


class Kpis(StageModel):
    expectedLeads: str
    conversionRate: str
    roas: str
    ctr: str
    trafficGrowth: str
    monthlySales: str


class RecommendedPlan(StageModel):
    name: str
    monthlyPrice: float
    reasoning: str


class StrategyStageResult(StageModel):
    marketingStrategy: list[StrategyChannel]
    budgetAllocation: list[BudgetLine]
    actionPlan: ActionPlan
    ninetyDayStrategy: NinetyDayStrategy
    kpis: Kpis
    recommendedPlan: RecommendedPlan


STRATEGY_SYSTEM = (
    BASE_SYSTEM
    + "\n\nOnly recommend marketing channels that are genuinely relevant to this business's "
    "category — never recommend channels from an unrelated business model (e.g. do not suggest "
    "local Google Business Profile / in-store visibility tactics to a pure SaaS company, and do "
    "not suggest LinkedIn B2B lead-gen tactics to a local coffee shop). All numeric fields use "
    "plain numbers (no % or $ symbols). Budget percentages must sum to 100. The recommended plan "
    "must exactly match one plan's name and price from the provided catalog."
)


def run_marketing_strategist_stage(
    business: dict[str, Any],
    analyst: BusinessAnalystResult,
    competitor: CompetitorStageResult,
) -> StrategyStageResult:
    approximate = (
        "" if analyst.classification["matched"] else " (best-effort classification — treat as approximate)"
    )
    competitive_context = {
        "marketGaps": competitor.competitorAnalysis.marketGaps,
        "differentiationStrategy": competitor.competitorAnalysis.differentiationStrategy,
    }
    prompt = (
        f"Business:\n{json.dumps(business, indent=2)}\n\n"
        f"Business analysis:\n{json.dumps(analyst.businessAnalysis.model_dump(), indent=2)}\n\n"
        f"Competitive context:\n{json.dumps(competitive_context, indent=2)}\n\n"
        f"This business has been classified as: {analyst.classification['categoryLabel']}{approximate}. "
        "Only recommend channels from this relevant set unless there is a clear, explicitly "
        f"justified reason to add another one: {', '.join(analyst.classification['allowedChannels'])}.\n\n"
        "Available service plans (recommend exactly one, by name, and justify the fit):\n"
        f"{json.dumps(PLAN_CATALOG, indent=2)}\n\n"
        "Return a JSON object with EXACTLY these keys: marketingStrategy[{channel,why,priority}], "
        "budgetAllocation[{channel,percent(number),amount(number),expectedRoi(string)}] "
        "(percent sums to 100), actionPlan{week1[],week2[],week3[],week4[]} (detailed week-by-week "
        "tasks for the first 30 days), ninetyDayStrategy{month1{theme,keyActions[]},"
        "month2{theme,keyActions[]},month3{theme,keyActions[]}}, kpis{expectedLeads,conversionRate,"
        "roas,ctr,trafficGrowth,monthlySales}, recommendedPlan{name(must exactly match one plan name "
        "from the catalog above),monthlyPrice(number, must match that plan's price),reasoning}."
    )
    return generate_stage_json(
        system=STRATEGY_SYSTEM,
        prompt=prompt,
        schema=StrategyStageResult,
        label="Marketing Strategist",
    )


# ==========================================================================
# Stage 5 — Content Generator (AI)
# ==========================================================================


class Seo(StageModel):
    primaryKeywords: list[str]
    secondaryKeywords: list[str]
    longTailKeywords: list[str]
    metaTitle: str
    metaDescription: str
    blogIdeas: list[str]
    internalLinking: list[str]


class ContentIdeas(StageModel):
    instagramPosts: list[str]
    reels: list[str]
    stories: list[str]
    facebookPosts: list[str]
    linkedinPosts: list[str]
    emailCampaigns: list[str]


class ContentStageResult(StageModel):
    seo: Seo
    contentIdeas: ContentIdeas


CONTENT_SYSTEM = (
    BASE_SYSTEM
    + "\n\nProduce strategic SEO and content-planning inputs — high-level ideas and direction, "
    "not finished ad copy (finished deliverables are generated separately, on demand, by "
    "dedicated content-generation actions elsewhere in this product). Keep every suggestion "
    "concrete and tied to this business's category and audience, not generic marketing advice."
)


def run_content_generator_stage(
    business: dict[str, Any],
    analyst: BusinessAnalystResult,
    strategy: StrategyStageResult,
) -> ContentStageResult:
    channels = [item.channel for item in strategy.marketingStrategy]
    prompt = (
        f"Business:\n{json.dumps(business, indent=2)}\n\n"
        f"Business analysis:\n{json.dumps(analyst.businessAnalysis.model_dump(), indent=2)}\n\n"
        f"Recommended channels:\n{json.dumps(channels, indent=2)}\n\n"
        "Return a JSON object with EXACTLY these keys: seo{primaryKeywords[],secondaryKeywords[],"
        "longTailKeywords[],metaTitle,metaDescription,blogIdeas[],internalLinking[]}, "
        "contentIdeas{instagramPosts[],reels[],stories[],facebookPosts[],linkedinPosts[],"
        "emailCampaigns[]}."
    )
    return generate_stage_json(
        system=CONTENT_SYSTEM,
        prompt=prompt,
        schema=ContentStageResult,
        label="Content Generator",
    )


# ==========================================================================
# Stage 6 — Campaign Assistant (AI)
# ==========================================================================


class Risk(StageModel):
    risk: str
    mitigation: str


class CampaignStageResult(StageModel):
    executiveSummary: str
    riskAnalysis: list[Risk]
    finalRecommendations: list[str]


CAMPAIGN_SYSTEM = (
    BASE_SYSTEM
    + "\n\nSynthesize the prior analysis stages into a final executive summary, risk analysis, "
    "and concrete next actions. Do not introduce new facts that aren't supported by the earlier "
    "stages' outputs — you are synthesizing and prioritizing what's already been established, "
    "not re-analyzing from scratch."
)


def run_campaign_assistant_stage(
    business: dict[str, Any],
    analyst: BusinessAnalystResult,
    lead_score: dict[str, Any],
    competitor: CompetitorStageResult,
    strategy: StrategyStageResult,
    content: ContentStageResult,
) -> CampaignStageResult:
    prior = {
        "businessAnalysis": analyst.businessAnalysis.model_dump(),
        "leadScoreTier": lead_score["tier"],
        "leadScoreSummary": lead_score["reasoning"],
        "swot": competitor.swot.model_dump(),
        "competitiveAdvantages": competitor.competitorAnalysis.competitiveAdvantages,
        "marketingStrategy": [item.model_dump() for item in strategy.marketingStrategy],
        "recommendedPlan": strategy.recommendedPlan.model_dump(),
        "seoPrimaryKeywords": content.seo.primaryKeywords,
    }
    prompt = (
        f"Business:\n{json.dumps(business, indent=2)}\n\n"
        f"All prior stage outputs:\n{json.dumps(prior, indent=2)}\n\n"
        "Return a JSON object with EXACTLY these keys: executiveSummary(string, 3-5 sentences "
        "summarizing the overall strategy and opportunity for THIS business), "
        "riskAnalysis[{risk,mitigation}] (2-4 realistic risks), finalRecommendations[] "
        "(3-6 concrete, prioritized next actions this business should take)."
    )
    return generate_stage_json(
        system=CAMPAIGN_SYSTEM,
        prompt=prompt,
        schema=CampaignStageResult,
        label="Campaign Assistant",
    )
