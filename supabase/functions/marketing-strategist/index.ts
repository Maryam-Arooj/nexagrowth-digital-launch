import { convertToModelMessages, streamText, type UIMessage } from "npm:ai";
import { createLovableAiGatewayProvider, corsHeaders } from "../_shared/ai-gateway.ts";

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

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages }: { messages: UIMessage[] } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gateway = createLovableAiGatewayProvider(key);
    const result = streamText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("marketing-strategist error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
