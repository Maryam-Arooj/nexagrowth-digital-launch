/**
 * The 6 named stages of the marketing-report pipeline (FYP Phase 1: visible multi-stage
 * automation). Stages 1 and 2 are deterministic (no AI, no network call) and reuse the
 * existing classification/scoring engine as-is. Stages 3-6 each make exactly one Gemini
 * call via the shared `generateStageJson` helper, which centralizes the JSON-repair +
 * zod-validation logic so it isn't duplicated four times.
 *
 * `marketing-report/index.ts` orchestrates these in sequence and streams stage-status
 * events to the client — this file only knows how to run one stage at a time.
 */
import { generateText } from "npm:ai";
import { z } from "npm:zod";
import { withTimeout, type AiModelHandle } from "./ai-gateway.ts";
import {
  classifyBusiness,
  computeLeadScoreAndConfidence,
  type BusinessInput,
  type ChannelGuardrails,
} from "./leadScoring.ts";

const FN_NAME = "marketing-report";
export const AI_STAGE_TIMEOUT_MS = 35_000;

// Real plans from the site's Pricing section — the AI is asked to pick one of
// these (not invent a plan) so the report's recommendation is always grounded
// in something the business can actually buy.
export const PLAN_CATALOG = [
  { name: "Starter", monthlyPrice: 1499, fit: "startups building initial digital presence, budgets under ~$2k/mo" },
  { name: "Growth", monthlyPrice: 3499, fit: "scaling businesses ready to run paid ads across multiple channels, budgets ~$2k-$6k/mo" },
  { name: "Enterprise", monthlyPrice: 6999, fit: "market leaders needing full-funnel, multi-channel management, budgets $6k+/mo" },
];

const BASE_SYSTEM = `You are NexaGrowth AI — a senior digital marketing strategist. Generate specific, decisive, data-grounded output for the exact business described in the prompt (never reuse a previous example — every field must reflect THIS business's industry, audience, budget, and goal). Use realistic industry benchmarks. Never generic filler.

If the input genuinely does not give you enough information to fill a field with something real and useful, write the literal string "Insufficient data" for that field instead of inventing plausible-sounding details. Never fabricate specific numbers, client names, or facts not implied by the input — clearly-labeled estimates and reasonable industry-benchmark ranges are fine, invented specifics are not.`;

/** Strips markdown fences / stray prose and repairs common near-miss JSON issues an LLM can produce. */
function extractJson(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  return text;
}

/** Removes trailing commas before `}` or `]`, a very common small mistake in LLM-generated JSON. */
function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

function parseModelJson(raw: string): unknown {
  const cleaned = extractJson(raw);
  try {
    return JSON.parse(cleaned);
  } catch {
    return JSON.parse(stripTrailingCommas(cleaned));
  }
}

/** Coerces obviously-numeric strings (e.g. "85", "20") into numbers so a near-miss response
 * doesn't get rejected by the schema over a formatting technicality. */
function coerceNumericFields(value: unknown): unknown {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["percent", "amount", "score", "monthlyPrice"]) {
      if (typeof obj[key] === "string" && /^-?\d+(\.\d+)?$/.test(obj[key] as string)) {
        obj[key] = Number(obj[key]);
      }
    }
    for (const v of Object.values(obj)) coerceNumericFields(v);
  } else if (Array.isArray(value)) {
    value.forEach(coerceNumericFields);
  }
  return value;
}

/** Maps a raw AI SDK error to the same distinct rate-limit / credits messages the
 * frontend already knows how to render specially (kept identical to the pre-pipeline
 * single-call behavior). */
function friendlyAiError(err: unknown, label: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|rate.?limit/i.test(msg)) return new Error("429: AI rate limit reached. Please try again shortly.");
  if (/402|payment|credits?/i.test(msg)) return new Error("402: AI credits exhausted.");
  return new Error(`${label}: ${msg}`);
}

/** Runs one AI-backed stage: calls the model, repairs/parses the JSON, validates it
 * against the stage's schema. Every AI stage in this pipeline goes through here so the
 * repair/validation logic exists exactly once. */
export async function generateStageJson<T>(opts: {
  model: AiModelHandle["model"];
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  label: string;
}): Promise<T> {
  let text: string;
  try {
    text = await withTimeout(
      generateText({
        model: opts.model,
        system: opts.system + "\n\nReturn ONLY valid minified JSON matching the requested schema. No markdown fences, no commentary.",
        prompt: opts.prompt,
      }).then((r) => r.text),
      AI_STAGE_TIMEOUT_MS,
      opts.label
    );
  } catch (err) {
    throw friendlyAiError(err, opts.label);
  }

  let parsed: unknown;
  try {
    parsed = parseModelJson(text);
  } catch {
    throw new Error(`${opts.label}: AI returned invalid JSON. Please try again.`);
  }
  parsed = coerceNumericFields(parsed);

  const result = opts.schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${opts.label}: AI response did not match the expected format. Please retry.`);
  }
  return result.data;
}

// ============================================================
// Stage 1 — Business Analyst (deterministic, no AI call)
// ============================================================

export interface BusinessAnalystResult {
  businessAnalysis: { model: string; audience: string; strengths: string; currentPosition: string };
  classification: ChannelGuardrails;
}

export function runBusinessAnalystStage(business: BusinessInput): BusinessAnalystResult {
  const classification = classifyBusiness(business.industry);
  const audience = business.audience?.trim() || "Not specified";
  const goal = business.goal?.trim() || "Not specified";
  const channels = business.currentChannels?.trim();

  return {
    businessAnalysis: {
      model: classification.categoryLabel,
      audience,
      strengths: channels
        ? `Currently active in: ${channels}`
        : "No current marketing channels reported — greenfield opportunity, no legacy channel bias to work around.",
      currentPosition: `Stated 90-day goal: ${goal}. Classified as ${classification.categoryLabel}${classification.matched ? "" : " (approximate classification — industry text didn't map cleanly to a known category)"}.`,
    },
    classification,
  };
}

// ============================================================
// Stage 2 — Lead Scorer (deterministic, reuses leadScoring.ts as-is)
// ============================================================

export function runLeadScorerStage(business: BusinessInput) {
  return computeLeadScoreAndConfidence(business);
}

// ============================================================
// Stage 3 — Competitor Analyst (AI)
// ============================================================

const CompetitorStageSchema = z.object({
  swot: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
  }),
  competitorAnalysis: z.object({
    topCompetitors: z.array(z.object({ name: z.string(), note: z.string() })),
    competitiveAdvantages: z.array(z.string()),
    marketGaps: z.array(z.string()),
    differentiationStrategy: z.string(),
  }),
});
export type CompetitorStageResult = z.infer<typeof CompetitorStageSchema>;

const COMPETITOR_SYSTEM = `${BASE_SYSTEM}

You have no web search or live competitor data access — this project has no web-search integration. Do NOT invent specific real company names, funding numbers, or claimed facts about actual named competitors. Instead, describe the likely competitive landscape using realistic archetypes/patterns for this industry (e.g. "Established category leader", "Low-cost local challenger", "Niche premium player") in the "name" field, and keep every "note" clearly framed as strategic inference, not verified fact about a real company.`;

export async function runCompetitorAnalystStage(
  model: AiModelHandle["model"],
  business: BusinessInput,
  businessAnalyst: BusinessAnalystResult
): Promise<CompetitorStageResult> {
  const prompt = `Business:\n${JSON.stringify(business, null, 2)}\n\nBusiness analysis so far:\n${JSON.stringify(businessAnalyst.businessAnalysis, null, 2)}\n\nCategory: ${businessAnalyst.classification.categoryLabel}\n\nReturn a JSON object with EXACTLY these keys: swot{strengths[],weaknesses[],opportunities[],threats[]}, competitorAnalysis{topCompetitors[{name,note}] (3-4 realistic competitor archetypes, not invented real companies),competitiveAdvantages[],marketGaps[],differentiationStrategy(string)}.`;

  return generateStageJson({
    model,
    system: COMPETITOR_SYSTEM,
    prompt,
    schema: CompetitorStageSchema,
    label: "Competitor Analyst",
  });
}

// ============================================================
// Stage 4 — Marketing Strategist (AI)
// ============================================================

const StrategyStageSchema = z.object({
  marketingStrategy: z.array(z.object({ channel: z.string(), why: z.string(), priority: z.string() })),
  budgetAllocation: z.array(z.object({ channel: z.string(), percent: z.number(), amount: z.number(), expectedRoi: z.string() })),
  actionPlan: z.object({
    week1: z.array(z.string()), week2: z.array(z.string()), week3: z.array(z.string()), week4: z.array(z.string()),
  }),
  ninetyDayStrategy: z.object({
    month1: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
    month2: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
    month3: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
  }),
  kpis: z.object({
    expectedLeads: z.string(), conversionRate: z.string(), roas: z.string(),
    ctr: z.string(), trafficGrowth: z.string(), monthlySales: z.string(),
  }),
  recommendedPlan: z.object({ name: z.string(), monthlyPrice: z.number(), reasoning: z.string() }),
});
export type StrategyStageResult = z.infer<typeof StrategyStageSchema>;

const STRATEGY_SYSTEM = `${BASE_SYSTEM}

Only recommend marketing channels that are genuinely relevant to this business's category — never recommend channels from an unrelated business model (e.g. do not suggest local Google Business Profile / in-store visibility tactics to a pure SaaS company, and do not suggest LinkedIn B2B lead-gen tactics to a local coffee shop). All numeric fields use plain numbers (no % or $ symbols). Budget percentages must sum to 100. The recommended plan must exactly match one plan's name and price from the provided catalog.`;

export async function runMarketingStrategistStage(
  model: AiModelHandle["model"],
  business: BusinessInput,
  businessAnalyst: BusinessAnalystResult,
  competitor: CompetitorStageResult
): Promise<StrategyStageResult> {
  const prompt = `Business:\n${JSON.stringify(business, null, 2)}\n\nBusiness analysis:\n${JSON.stringify(businessAnalyst.businessAnalysis, null, 2)}\n\nCompetitive context:\n${JSON.stringify({ marketGaps: competitor.competitorAnalysis.marketGaps, differentiationStrategy: competitor.competitorAnalysis.differentiationStrategy }, null, 2)}\n\nThis business has been classified as: ${businessAnalyst.classification.categoryLabel}${businessAnalyst.classification.matched ? "" : " (best-effort classification — treat as approximate)"}. Only recommend channels from this relevant set unless there is a clear, explicitly justified reason to add another one: ${businessAnalyst.classification.allowedChannels.join(", ")}.\n\nAvailable service plans (recommend exactly one, by name, and justify the fit):\n${JSON.stringify(PLAN_CATALOG, null, 2)}\n\nReturn a JSON object with EXACTLY these keys: marketingStrategy[{channel,why,priority}], budgetAllocation[{channel,percent(number),amount(number),expectedRoi(string)}] (percent sums to 100), actionPlan{week1[],week2[],week3[],week4[]} (detailed week-by-week tasks for the first 30 days), ninetyDayStrategy{month1{theme,keyActions[]},month2{theme,keyActions[]},month3{theme,keyActions[]}}, kpis{expectedLeads,conversionRate,roas,ctr,trafficGrowth,monthlySales}, recommendedPlan{name(must exactly match one plan name from the catalog above),monthlyPrice(number, must match that plan's price),reasoning}.`;

  return generateStageJson({
    model,
    system: STRATEGY_SYSTEM,
    prompt,
    schema: StrategyStageSchema,
    label: "Marketing Strategist",
  });
}

// ============================================================
// Stage 5 — Content Generator (AI)
// ============================================================

const ContentStageSchema = z.object({
  seo: z.object({
    primaryKeywords: z.array(z.string()), secondaryKeywords: z.array(z.string()), longTailKeywords: z.array(z.string()),
    metaTitle: z.string(), metaDescription: z.string(), blogIdeas: z.array(z.string()), internalLinking: z.array(z.string()),
  }),
  contentIdeas: z.object({
    instagramPosts: z.array(z.string()), reels: z.array(z.string()), stories: z.array(z.string()),
    facebookPosts: z.array(z.string()), linkedinPosts: z.array(z.string()), emailCampaigns: z.array(z.string()),
  }),
});
export type ContentStageResult = z.infer<typeof ContentStageSchema>;

const CONTENT_SYSTEM = `${BASE_SYSTEM}

Produce strategic SEO and content-planning inputs — high-level ideas and direction, not finished ad copy (finished deliverables are generated separately, on demand, by dedicated content-generation actions elsewhere in this product). Keep every suggestion concrete and tied to this business's category and audience, not generic marketing advice.`;

export async function runContentGeneratorStage(
  model: AiModelHandle["model"],
  business: BusinessInput,
  businessAnalyst: BusinessAnalystResult,
  strategy: StrategyStageResult
): Promise<ContentStageResult> {
  const prompt = `Business:\n${JSON.stringify(business, null, 2)}\n\nBusiness analysis:\n${JSON.stringify(businessAnalyst.businessAnalysis, null, 2)}\n\nRecommended channels:\n${JSON.stringify(strategy.marketingStrategy.map((m) => m.channel), null, 2)}\n\nReturn a JSON object with EXACTLY these keys: seo{primaryKeywords[],secondaryKeywords[],longTailKeywords[],metaTitle,metaDescription,blogIdeas[],internalLinking[]}, contentIdeas{instagramPosts[],reels[],stories[],facebookPosts[],linkedinPosts[],emailCampaigns[]}.`;

  return generateStageJson({
    model,
    system: CONTENT_SYSTEM,
    prompt,
    schema: ContentStageSchema,
    label: "Content Generator",
  });
}

// ============================================================
// Stage 6 — Campaign Assistant (AI)
// ============================================================

const CampaignStageSchema = z.object({
  executiveSummary: z.string(),
  riskAnalysis: z.array(z.object({ risk: z.string(), mitigation: z.string() })),
  finalRecommendations: z.array(z.string()),
});
export type CampaignStageResult = z.infer<typeof CampaignStageSchema>;

const CAMPAIGN_SYSTEM = `${BASE_SYSTEM}

Synthesize the prior analysis stages into a final executive summary, risk analysis, and concrete next actions. Do not introduce new facts that aren't supported by the earlier stages' outputs — you are synthesizing and prioritizing what's already been established, not re-analyzing from scratch.`;

export async function runCampaignAssistantStage(
  model: AiModelHandle["model"],
  business: BusinessInput,
  businessAnalyst: BusinessAnalystResult,
  leadScore: ReturnType<typeof computeLeadScoreAndConfidence>["leadScore"],
  competitor: CompetitorStageResult,
  strategy: StrategyStageResult,
  content: ContentStageResult
): Promise<CampaignStageResult> {
  const prompt = `Business:\n${JSON.stringify(business, null, 2)}\n\nAll prior stage outputs:\n${JSON.stringify(
    {
      businessAnalysis: businessAnalyst.businessAnalysis,
      leadScoreTier: leadScore.tier,
      leadScoreSummary: leadScore.reasoning,
      swot: competitor.swot,
      competitiveAdvantages: competitor.competitorAnalysis.competitiveAdvantages,
      marketingStrategy: strategy.marketingStrategy,
      recommendedPlan: strategy.recommendedPlan,
      seoPrimaryKeywords: content.seo.primaryKeywords,
    },
    null,
    2
  )}\n\nReturn a JSON object with EXACTLY these keys: executiveSummary(string, 3-5 sentences summarizing the overall strategy and opportunity for THIS business), riskAnalysis[{risk,mitigation}] (2-4 realistic risks), finalRecommendations[] (3-6 concrete, prioritized next actions this business should take).`;

  return generateStageJson({
    model,
    system: CAMPAIGN_SYSTEM,
    prompt,
    schema: CampaignStageSchema,
    label: "Campaign Assistant",
  });
}
