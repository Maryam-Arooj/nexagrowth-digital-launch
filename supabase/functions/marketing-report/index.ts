import { generateText } from "npm:ai";
import { z } from "npm:zod";
import { createLovableAiGatewayProvider, corsHeaders } from "../_shared/ai-gateway.ts";

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

const SYSTEM = `You are NexaGrowth AI — a senior digital marketing strategist. Generate a comprehensive, specific, data-grounded marketing strategy report. Use realistic industry benchmarks. Be decisive and concrete — never generic. All numeric fields use plain numbers (no % or $ symbols). Budget percentages must sum to 100. Confidence score is 0-100.`;

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
      system: SYSTEM + "\n\nReturn ONLY valid minified JSON matching the requested schema. No markdown fences, no commentary.",
      prompt: `Generate a complete marketing strategy report for this business:\n\n${JSON.stringify(business, null, 2)}\n\nReturn a JSON object with EXACTLY these keys: companyName(string), executiveSummary(string), businessAnalysis{model,audience,strengths,currentPosition}, swot{strengths[],weaknesses[],opportunities[],threats[]}, competitorAnalysis{topCompetitors[{name,note}],competitiveAdvantages[],marketGaps[],differentiationStrategy}, marketingStrategy[{channel,why,priority}], budgetAllocation[{channel,percent(number),amount(number),expectedRoi(string)}] (percent sums to 100), actionPlan{week1[],week2[],week3[],week4[]}, seo{primaryKeywords[],secondaryKeywords[],longTailKeywords[],metaTitle,metaDescription,blogIdeas[],internalLinking[]}, contentIdeas{instagramPosts[],reels[],stories[],facebookPosts[],linkedinPosts[],emailCampaigns[]}, kpis{expectedLeads,conversionRate,roas,ctr,trafficGrowth,monthlySales}, riskAnalysis[{risk,mitigation}], confidence{score(number 0-100),reasoning}, finalRecommendations[].`,
    });

    // Extract JSON from possible markdown fences
    let jsonText = text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) jsonText = jsonText.slice(firstBrace, lastBrace + 1);

    let parsed: unknown;
    try { parsed = JSON.parse(jsonText); }
    catch { throw new Error("AI returned invalid JSON"); }

    const result = ReportSchema.safeParse(parsed);
    if (!result.success) {
      console.error("schema error:", JSON.stringify(result.error.issues).slice(0, 1000));
      // Return parsed object anyway — UI is defensive
      return new Response(JSON.stringify({ report: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ report: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("marketing-report:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
