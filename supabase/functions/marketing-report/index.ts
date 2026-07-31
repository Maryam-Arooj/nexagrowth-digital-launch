import { generateText } from "npm:ai";
import { z } from "npm:zod";
import {
  createLovableAiGatewayProvider,
  corsHeaders,
  getLovableApiKey,
  ConfigError,
  ValidationError,
  log,
  logError,
  withTimeout,
} from "../_shared/ai-gateway.ts";

const FN_NAME = "marketing-report";
const AI_TIMEOUT_MS = 55_000;

const ReportSchema = z.object({
  companyName: z.string(),
  executiveSummary: z.string(),
  businessAnalysis: z.object({
    model: z.string(),
    audience: z.string(),
    strengths: z.string(),
    currentPosition: z.string(),
  }),
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
  marketingStrategy: z.array(z.object({
    channel: z.string(),
    why: z.string(),
    priority: z.string(),
  })),
  budgetAllocation: z.array(z.object({
    channel: z.string(),
    percent: z.number(),
    amount: z.number(),
    expectedRoi: z.string(),
  })),
  actionPlan: z.object({
    week1: z.array(z.string()),
    week2: z.array(z.string()),
    week3: z.array(z.string()),
    week4: z.array(z.string()),
  }),
  ninetyDayStrategy: z.object({
    month1: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
    month2: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
    month3: z.object({ theme: z.string(), keyActions: z.array(z.string()) }),
  }),
  seo: z.object({
    primaryKeywords: z.array(z.string()),
    secondaryKeywords: z.array(z.string()),
    longTailKeywords: z.array(z.string()),
    metaTitle: z.string(),
    metaDescription: z.string(),
    blogIdeas: z.array(z.string()),
    internalLinking: z.array(z.string()),
  }),
  contentIdeas: z.object({
    instagramPosts: z.array(z.string()),
    reels: z.array(z.string()),
    stories: z.array(z.string()),
    facebookPosts: z.array(z.string()),
    linkedinPosts: z.array(z.string()),
    emailCampaigns: z.array(z.string()),
  }),
  kpis: z.object({
    expectedLeads: z.string(),
    conversionRate: z.string(),
    roas: z.string(),
    ctr: z.string(),
    trafficGrowth: z.string(),
    monthlySales: z.string(),
  }),
  riskAnalysis: z.array(z.object({
    risk: z.string(),
    mitigation: z.string(),
  })),
  confidence: z.object({
    score: z.number(),
    reasoning: z.string(),
  }),
  finalRecommendations: z.array(z.string()),
});

const SYSTEM = `You are NexaGrowth AI — a senior digital marketing strategist. Generate a comprehensive, specific, data-grounded marketing strategy report for the EXACT business described in the prompt — every field must reflect this specific business's industry, audience, budget, and goal, never a generic or reused example. Use realistic industry benchmarks. Be decisive and concrete — never generic. All numeric fields use plain numbers (no % or $ symbols). Budget percentages must sum to 100. Confidence score is 0-100.`;

function extractJson(raw: string): string {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
  return text;
}

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

function coerceNumericFields(value: unknown): unknown {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["percent", "amount", "score"]) {
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

function coerceKpiStrings(value: unknown): unknown {
  const root = value as Record<string, unknown> | null;
  const kpis = root && typeof root === "object" ? (root.kpis as Record<string, unknown> | undefined) : undefined;
  if (kpis && typeof kpis === "object") {
    for (const [k, v] of Object.entries(kpis)) {
      if (typeof v === "number") kpis[k] = String(v);
    }
  }
  return value;
}

function validateBusiness(body: unknown): { companyName: string; industry: string; [k: string]: unknown } {
  if (!body || typeof body !== "object") throw new ValidationError("business object is required");
  const business = body as Record<string, unknown>;
  const companyName = typeof business.companyName === "string" ? business.companyName.trim() : "";
  const industry = typeof business.industry === "string" ? business.industry.trim() : "";
  if (!companyName) throw new ValidationError("business.companyName is required");
  if (!industry) throw new ValidationError("business.industry is required");
  return { ...business, companyName, industry } as { companyName: string; industry: string; [k: string]: unknown };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError("Request body must be valid JSON");
    }

    const business = validateBusiness((payload as Record<string, unknown>)?.business);
    log(FN_NAME, "request_received", { companyName: business.companyName, industry: business.industry });

    const key = getLovableApiKey(FN_NAME);
    const gateway = createLovableAiGatewayProvider(key);

    const PROMPT = `Generate a complete marketing strategy report for this business:\n\n${JSON.stringify(business, null, 2)}\n\nReturn a JSON object with EXACTLY these keys: companyName(string), executiveSummary(string), businessAnalysis{model,audience,strengths,currentPosition}, swot{strengths[],weaknesses[],opportunities[],threats[]}, competitorAnalysis{topCompetitors[{name,note}],competitiveAdvantages[],marketGaps[],differentiationStrategy}, marketingStrategy[{channel,why,priority}], budgetAllocation[{channel,percent(number),amount(number),expectedRoi(string)}] (percent sums to 100), actionPlan{week1[],week2[],week3[],week4[]} (detailed week-by-week tasks for the first 30 days), ninetyDayStrategy{month1{theme,keyActions[]},month2{theme,keyActions[]},month3{theme,keyActions[]}} (a 90-day / 3-month marketing roadmap, each month with a strategic theme and 3-6 key actions), seo{primaryKeywords[],secondaryKeywords[],longTailKeywords[],metaTitle,metaDescription,blogIdeas[],internalLinking[]}, contentIdeas{instagramPosts[],reels[],stories[],facebookPosts[],linkedinPosts[],emailCampaigns[]}, kpis{expectedLeads,conversionRate,roas,ctr,trafficGrowth,monthlySales} (ALL SIX kpis values must be strings, e.g. "120-150 leads/mo", "3.5%", "4.2x"), riskAnalysis[{risk,mitigation}], confidence{score(number 0-100),reasoning}, finalRecommendations[] (3-6 concrete next actions this business should take).\n\nCRITICAL: output must be a single valid JSON object. Escape every double quote inside string values. Do not use raw newlines inside strings.`;

    let lastFailure = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      log(FN_NAME, "ai_call_start", { model: "google/gemini-3-flash-preview", attempt });
      let text: string;
      try {
        text = await withTimeout(
          generateText({
            model: gateway("google/gemini-3-flash-preview"),
            maxOutputTokens: 16000,
            system: SYSTEM + "\n\nReturn ONLY valid minified JSON matching the requested schema. No markdown fences, no commentary.",
            prompt: attempt === 1 ? PROMPT : `${PROMPT}\n\nYour previous attempt failed with: ${lastFailure}. Return strictly valid JSON this time.`,
            providerOptions: { lovable: { response_format: { type: "json_object" } } },
          }).then((r) => r.text),
          AI_TIMEOUT_MS,
          "AI generation"
        );
      } catch (err) {
        logError(FN_NAME, "ai_call_failed", err, { attempt, elapsedMs: Date.now() - startedAt });
        const msg = err instanceof Error ? err.message : "AI request failed";
        if (/429|rate.?limit/i.test(msg)) return json({ error: "429: AI rate limit reached. Please try again shortly." }, 429);
        if (/402|payment|credits?/i.test(msg)) return json({ error: "402: AI credits exhausted." }, 402);
        return json({ error: `AI request failed: ${msg}` }, 502);
      }
      log(FN_NAME, "ai_call_success", { attempt, elapsedMs: Date.now() - startedAt, responseLength: text.length });

      let parsed: unknown;
      try {
        parsed = parseModelJson(text);
      } catch (err) {
        lastFailure = "the response was not valid JSON";
        logError(FN_NAME, "json_parse_failed", err, { attempt, rawPreview: text.slice(0, 500) });
        continue;
      }

      parsed = coerceNumericFields(parsed);
      parsed = coerceKpiStrings(parsed);

      const result = ReportSchema.safeParse(parsed);
      if (!result.success) {
        lastFailure = "the JSON did not match the required schema";
        logError(FN_NAME, "schema_validation_failed", new Error("schema mismatch"), {
          attempt,
          issues: JSON.stringify(result.error.issues).slice(0, 1000),
        });
        continue;
      }

      log(FN_NAME, "request_success", { attempt, elapsedMs: Date.now() - startedAt, companyName: result.data.companyName });
      return json({ report: result.data });
    }

    return json({ error: `The AI response could not be validated (${lastFailure}). Please retry.` }, 502);
  } catch (err) {
    if (err instanceof ValidationError) {
      logError(FN_NAME, "validation_error", err);
      return json({ error: err.message }, 400);
    }
    if (err instanceof ConfigError) {
      logError(FN_NAME, "config_error", err);
      return json({ error: err.message }, 500);
    }
    logError(FN_NAME, "unhandled_error", err, { elapsedMs: Date.now() - startedAt });
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
