import { generateText } from "npm:ai";
import { createLovableAiGatewayProvider, corsHeaders } from "../_shared/ai-gateway.ts";

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
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI not configured");
    const { action, business, report } = await req.json();
    const instruction = ACTION_PROMPTS[action];
    if (!instruction) throw new Error("Unknown action");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: "You are NexaGrowth AI — a senior marketing strategist producing client-ready deliverables. Be specific, concrete, and grounded in the business context provided.",
      prompt: `Business context:\n${JSON.stringify(business, null, 2)}\n\nStrategy context (summary):\n${report?.executiveSummary ?? ""}\n\nTask: ${instruction}`,
    });

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("marketing-action:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
