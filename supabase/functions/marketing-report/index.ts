import {
  corsHeaders,
  getAiModel,
  ConfigError,
  ValidationError,
  log,
  logError,
} from "../_shared/ai-gateway.ts";
import {
  runBusinessAnalystStage,
  runLeadScorerStage,
  runCompetitorAnalystStage,
  runMarketingStrategistStage,
  runContentGeneratorStage,
  runCampaignAssistantStage,
} from "../_shared/pipelineStages.ts";
import type { BusinessInput } from "../_shared/leadScoring.ts";

const FN_NAME = "marketing-report";

// The 6 visible pipeline stages, in execution order. Stage ids are shared with the
// frontend (MarketingStrategist.tsx's PIPELINE_STAGE_DEFS) — keep them in sync.
const STAGE_IDS = [
  "business-analyst",
  "lead-scorer",
  "competitor-analyst",
  "marketing-strategist",
  "content-generator",
  "campaign-assistant",
] as const;
type StageId = (typeof STAGE_IDS)[number];

type StageEvent =
  | { type: "stage"; stage: StageId; status: "running" }
  | { type: "stage"; stage: StageId; status: "done"; durationMs: number }
  | { type: "stage"; stage: StageId; status: "failed"; durationMs: number; error: string }
  | { type: "final"; report: Record<string, unknown> }
  | { type: "error"; error: string };

function validateBusiness(body: unknown): BusinessInput {
  if (!body || typeof body !== "object") throw new ValidationError("business object is required");
  const business = body as Record<string, unknown>;
  const companyName = typeof business.companyName === "string" ? business.companyName.trim() : "";
  const industry = typeof business.industry === "string" ? business.industry.trim() : "";
  if (!companyName) throw new ValidationError("business.companyName is required");
  if (!industry) throw new ValidationError("business.industry is required");
  return { ...business, companyName, industry } as BusinessInput;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Only POST is supported" }, 400);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  let business: BusinessInput;
  try {
    business = validateBusiness((payload as Record<string, unknown>)?.business);
  } catch (err) {
    if (err instanceof ValidationError) {
      logError(FN_NAME, "validation_error", err);
      return json({ error: err.message }, 400);
    }
    throw err;
  }

  // Resolve the AI provider up front — a missing/misconfigured key is a config
  // problem, not a pipeline-stage failure, so it still returns a plain synchronous
  // error response (same behavior as before this pipeline existed) rather than
  // opening a stream just to fail immediately.
  let aiHandle: ReturnType<typeof getAiModel>;
  try {
    aiHandle = getAiModel(FN_NAME);
  } catch (err) {
    if (err instanceof ConfigError) {
      logError(FN_NAME, "config_error", err);
      return json({ error: err.message }, 500);
    }
    throw err;
  }

  log(FN_NAME, "request_received", { companyName: business.companyName, industry: business.industry, provider: aiHandle.provider });

  const encoder = new TextEncoder();
  const requestStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StageEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      const pipelineLog: { stage: string; status: string; durationMs: number; error?: string }[] = [];

      async function runStage<T>(stage: StageId, fn: () => Promise<T> | T): Promise<T> {
        log(FN_NAME, "stage_start", { stage });
        send({ type: "stage", stage, status: "running" });
        const startedAt = Date.now();
        try {
          const result = await fn();
          const durationMs = Date.now() - startedAt;
          pipelineLog.push({ stage, status: "done", durationMs });
          log(FN_NAME, "stage_done", { stage, durationMs });
          send({ type: "stage", stage, status: "done", durationMs });
          return result;
        } catch (err) {
          const durationMs = Date.now() - startedAt;
          const message = err instanceof Error ? err.message : String(err);
          pipelineLog.push({ stage, status: "failed", durationMs, error: message });
          logError(FN_NAME, "stage_failed", err, { stage, durationMs });
          send({ type: "stage", stage, status: "failed", durationMs, error: message });
          throw err;
        }
      }

      try {
        const businessAnalyst = await runStage("business-analyst", () => runBusinessAnalystStage(business));
        const leadScorer = await runStage("lead-scorer", () => runLeadScorerStage(business));
        const competitor = await runStage("competitor-analyst", () =>
          runCompetitorAnalystStage(aiHandle.model, business, businessAnalyst)
        );
        const strategy = await runStage("marketing-strategist", () =>
          runMarketingStrategistStage(aiHandle.model, business, businessAnalyst, competitor)
        );
        const content = await runStage("content-generator", () =>
          runContentGeneratorStage(aiHandle.model, business, businessAnalyst, strategy)
        );
        const campaign = await runStage("campaign-assistant", () =>
          runCampaignAssistantStage(
            aiHandle.model,
            business,
            businessAnalyst,
            leadScorer.leadScore,
            competitor,
            strategy,
            content
          )
        );

        const report: Record<string, unknown> = {
          companyName: business.companyName,
          executiveSummary: campaign.executiveSummary,
          businessAnalysis: businessAnalyst.businessAnalysis,
          swot: competitor.swot,
          competitorAnalysis: competitor.competitorAnalysis,
          marketingStrategy: strategy.marketingStrategy,
          budgetAllocation: strategy.budgetAllocation,
          actionPlan: strategy.actionPlan,
          ninetyDayStrategy: strategy.ninetyDayStrategy,
          seo: content.seo,
          contentIdeas: content.contentIdeas,
          kpis: strategy.kpis,
          leadScore: leadScorer.leadScore,
          recommendedPlan: strategy.recommendedPlan,
          riskAnalysis: campaign.riskAnalysis,
          confidence: leadScorer.confidence,
          finalRecommendations: campaign.finalRecommendations,
          pipeline: pipelineLog,
        };

        log(FN_NAME, "request_success", {
          elapsedMs: Date.now() - requestStartedAt,
          companyName: business.companyName,
          leadScore: leadScorer.leadScore.score,
          confidence: leadScorer.confidence.score,
        });
        send({ type: "final", report });
      } catch (err) {
        // A stage already logged and sent its own "failed" event above — this final
        // "error" event just tells the client the pipeline is done (no more stages
        // will run) and gives one consolidated message to show.
        const message = err instanceof Error ? err.message : "Pipeline failed";
        logError(FN_NAME, "pipeline_failed", err, { elapsedMs: Date.now() - requestStartedAt });
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" },
  });
});
