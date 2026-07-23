import { generateText } from "npm:ai";
import { createLovableAiGatewayProvider, corsHeaders } from "../_shared/ai-gateway.ts";

const SYSTEM = `You are NexaGrowth's AI Lead Qualification engine. Given a business intake, output a strict JSON object scoring the lead for a digital marketing agency engagement. Be decisive, realistic, and specific to the business. No markdown, no commentary — ONLY minified JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("AI not configured");
    const { business } = await req.json();
    if (!business) throw new Error("business required");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      prompt: `Qualify this lead:\n${JSON.stringify(business, null, 2)}\n\nReturn ONLY minified JSON with EXACTLY these keys:
{
 "leadScore": number 0-100,  // weighted: industry fit (20), goal clarity (15), budget (30), audience specificity (15), current channel maturity (20)
 "leadStatus": "Hot" | "Warm" | "Cold",  // Hot >=75, Warm 50-74, Cold <50
 "businessPotential": string (1-2 sentences on revenue/growth potential),
 "recommendedPlan": "Starter" | "Growth" | "Enterprise",  // Starter <$2k budget, Growth $2k-$6k, Enterprise >$6k or complex/multi-channel
 "planReasoning": string (2-3 sentences explaining WHY this plan fits their budget, goals, and stage),
 "topPriorities": [string, string, string],  // 3 concrete marketing priorities specific to this business
 "nextAction": string (ONE clear next step, e.g. "Book a free strategy audit via #contact" or "Buy the Growth plan at #pricing"),
 "scoreBreakdown": { "industryFit": number, "goalClarity": number, "budget": number, "audience": number, "channelMaturity": number }
}`,
    });

    let jsonText = text.trim();
    const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) jsonText = fence[1].trim();
    const first = jsonText.indexOf("{"), last = jsonText.lastIndexOf("}");
    if (first >= 0 && last > first) jsonText = jsonText.slice(first, last + 1);

    const parsed = JSON.parse(jsonText);
    // Clamp
    parsed.leadScore = Math.max(0, Math.min(100, Math.round(Number(parsed.leadScore) || 0)));
    if (!["Hot", "Warm", "Cold"].includes(parsed.leadStatus)) {
      parsed.leadStatus = parsed.leadScore >= 75 ? "Hot" : parsed.leadScore >= 50 ? "Warm" : "Cold";
    }

    return new Response(JSON.stringify({ qualification: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("lead-qualification:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
