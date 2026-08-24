import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
import { corsHeaders, getAiModel, ConfigError, log, logError } from "../_shared/ai-gateway.ts";

const FN_NAME = "marketing-strategist";

const SYSTEM_PROMPT = `You are NexaGrowth AI — a senior digital marketing strategist with 15+ years of experience advising B2B SaaS, D2C, and e-commerce brands. You speak like a sharp, friendly consultant, not a chatbot.

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
- Never invent client case studies. If you cite benchmarks, frame them as "industry averages."`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  try {
    const { model, provider } = getAiModel(FN_NAME);

    let body: { messages: UIMessage[]; business?: any; reportSummary?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body must be valid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { messages, business, reportSummary } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (business) {
      dynamicSystemPrompt += `\n\n## Current Client Context\nCompany Name: ${business.companyName}\nIndustry: ${business.industry}\nAudience: ${business.audience || "Unknown"}\nBudget: ${business.budget || "Unknown"}\nGoal: ${business.goal || "Unknown"}\nChannels: ${business.currentChannels || "None specified"}`;
    }
    if (reportSummary) {
      dynamicSystemPrompt += `\n\n## Strategy Executive Summary\n${reportSummary}`;
    }

    log(FN_NAME, "request_received", { companyName: business?.companyName, messageCount: messages.length, provider });

    const result = streamText({
      model,
      system: dynamicSystemPrompt,
      messages: await convertToModelMessages(messages),
      onFinish: () => log(FN_NAME, "stream_finished", { elapsedMs: Date.now() - startedAt }),
      onError: (err) => logError(FN_NAME, "stream_error", err instanceof Error ? err : new Error(String(err))),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err) {
    if (err instanceof ConfigError) {
      logError(FN_NAME, "config_error", err);
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    logError(FN_NAME, "unhandled_error", err, { elapsedMs: Date.now() - startedAt });
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
