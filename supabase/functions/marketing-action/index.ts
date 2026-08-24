import { generateText } from "npm:ai";
import {
  corsHeaders,
  getAiModel,
  ConfigError,
  ValidationError,
  log,
  logError,
  withTimeout,
} from "../_shared/ai-gateway.ts";

const FN_NAME = "marketing-action";
const AI_TIMEOUT_MS = 45_000;

const ACTION_PROMPTS: Record<string, string> = {
  "google-ads": "Generate 5 high-converting Google Ads (Responsive Search Ads) with headlines (max 30 chars each), descriptions (max 90 chars), and target keywords. Use markdown.",
  "facebook-ads": "Generate 5 Facebook/Meta Ads with primary text, headline, description, CTA, and audience targeting recommendations. Use markdown.",
  "instagram-captions": "Generate 10 engaging Instagram captions with hooks, value, CTAs, and 10-15 relevant hashtags each. Use markdown.",
  "seo-keywords": "Generate a deep SEO keyword strategy: 15 primary, 20 secondary, 30 long-tail keywords with search intent. Format as markdown tables.",
  "content-calendar": "Generate a complete 30-day content calendar with daily posts across Instagram, Facebook, LinkedIn, blog, and email. Format as a markdown table grouped by week.",
  "email-campaign": "Generate a full 5-email marketing nurture sequence with subject lines, preview text, body copy, and CTAs. Use markdown.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    if (req.method !== "POST") throw new ValidationError("Only POST is supported");

    let payload: Record<string, unknown>;
    try {
      payload = (await req.json()) ?? {};
    } catch {
      throw new ValidationError("Request body must be valid JSON");
    }

    const action = typeof payload.action === "string" ? payload.action : "";
    const instruction = ACTION_PROMPTS[action];
    if (!instruction) throw new ValidationError(`Unknown action "${action}"`);

    const business = payload.business ?? {};
    const report = payload.report as { executiveSummary?: string } | undefined;

    log(FN_NAME, "request_received", { action, companyName: (business as Record<string, unknown>)?.companyName });

    const { model, provider } = getAiModel(FN_NAME);
    log(FN_NAME, "ai_call_start", { action, provider });

    let text: string;
    try {
      text = await withTimeout(
        generateText({
          model,
          system: "You are NexaGrowth AI — a senior marketing strategist producing client-ready deliverables. Be specific, concrete, and grounded in the business context provided.",
          prompt: `Business context:\n${JSON.stringify(business, null, 2)}\n\nStrategy context (summary):\n${report?.executiveSummary ?? ""}\n\nTask: ${instruction}`,
        }).then((r) => r.text),
        AI_TIMEOUT_MS,
        "AI generation"
      );
    } catch (err) {
      logError(FN_NAME, "ai_call_failed", err, { action, elapsedMs: Date.now() - startedAt });
      const msg = err instanceof Error ? err.message : "AI request failed";
      if (/429|rate.?limit/i.test(msg)) return json({ error: "429: AI rate limit reached. Please try again shortly." }, 429);
      if (/402|payment|credits?/i.test(msg)) return json({ error: "402: AI credits exhausted." }, 402);
      return json({ error: `AI request failed: ${msg}` }, 502);
    }

    log(FN_NAME, "request_success", { action, elapsedMs: Date.now() - startedAt, responseLength: text.length });
    return json({ text });
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
