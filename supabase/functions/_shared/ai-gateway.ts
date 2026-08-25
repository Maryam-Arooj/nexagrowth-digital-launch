import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { createGoogleGenerativeAI } from "npm:@ai-sdk/google";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type AiProvider = "lovable" | "gemini-direct";

/** A resolved model instance ready to hand to generateText/streamText, plus which provider was used. */
export interface AiModelHandle {
  provider: AiProvider;
  model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>> | ReturnType<ReturnType<typeof createOpenAICompatible>>;
}

/**
 * The Gemini model used for every direct-Gemini call.
 *
 * Overridable with the `GEMINI_MODEL` secret so a future model retirement is a
 * config change, not a code change — this project was previously pinned to
 * `gemini-2.0-flash`, which Google shut down on 1 June 2026, silently breaking
 * every AI stage in the pipeline.
 *
 * Default: `gemini-2.5-flash` — a current, stable, free-tier model.
 * Free-tier limits at time of writing: 10 RPM / 250k TPM / 250 RPD.
 * One report costs 4 AI calls, so ~62 reports/day.
 *
 * If you need more daily headroom, set GEMINI_MODEL=gemini-2.5-flash-lite
 * (15 RPM / 1,000 RPD -> ~250 reports/day) at slightly lower output quality.
 *
 * Do NOT switch to Gemini 3.5 Flash: it is not a free-tier model.
 */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Picks an AI provider for this call.
 *
 * **Gemini is always preferred.** `GEMINI_API_KEY` is Google's own API, called
 * directly, and is free (no credit card): https://aistudio.google.com/apikey
 *
 * The Lovable AI Gateway is billed against Lovable workspace credits, and Lovable
 * Cloud *auto-provisions* `LOVABLE_API_KEY` — so treating its mere presence as a
 * fallback would silently spend money. It is therefore used only when explicitly
 * opted into with `ALLOW_LOVABLE_AI=true`. Without that flag, a missing Gemini key
 * is a hard configuration error, never a quiet downgrade to a paid service.
 */
export function getAiModel(fnName: string): AiModelHandle {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey && geminiKey.trim()) {
    const modelId = Deno.env.get("GEMINI_MODEL")?.trim() || DEFAULT_GEMINI_MODEL;
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return { provider: "gemini-direct", model: google(modelId) };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const lovableAllowed = (Deno.env.get("ALLOW_LOVABLE_AI") ?? "").trim().toLowerCase() === "true";

  if (lovableKey && lovableKey.trim() && lovableAllowed) {
    console.warn(
      `[${fnName}] Using the Lovable AI Gateway (ALLOW_LOVABLE_AI=true). This is billed against Lovable credits, not the free Gemini tier.`
    );
    const gateway = createLovableAiGatewayProvider(lovableKey);
    return { provider: "lovable", model: gateway("google/gemini-3-flash-preview") };
  }

  if (lovableKey && lovableKey.trim() && !lovableAllowed) {
    console.error(
      `[${fnName}] GEMINI_API_KEY is not set. LOVABLE_API_KEY is present but the Lovable gateway is ` +
        `billed against Lovable credits, so it is NOT used automatically. Set GEMINI_API_KEY (free, no ` +
        `credit card: https://aistudio.google.com/apikey), or set ALLOW_LOVABLE_AI=true to deliberately ` +
        `opt into paid Lovable usage.`
    );
    throw new ConfigError(
      "AI service is not configured on the server: GEMINI_API_KEY is missing. Contact the site admin."
    );
  }

  console.error(
    `[${fnName}] No AI key configured. Set GEMINI_API_KEY (free key, no credit card: ` +
      `https://aistudio.google.com/apikey) as a Supabase Edge Function secret ` +
      `(\`supabase secrets set GEMINI_API_KEY=...\`), or in supabase/functions/.env for local dev.`
  );
  throw new ConfigError(
    "AI service is not configured on the server (missing GEMINI_API_KEY). Contact the site admin."
  );
}

/** Thrown for setup/config problems — always maps to HTTP 500 with a stable message. */
export class ConfigError extends Error {}

/** Thrown for bad client input — always maps to HTTP 400. */
export class ValidationError extends Error {}

/** Simple structured logger so edge function logs are greppable in the Supabase dashboard. */
export function log(fnName: string, event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: fnName, event, ...data, ts: new Date().toISOString() }));
}

export function logError(fnName: string, event: string, err: unknown, data?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(JSON.stringify({ fn: fnName, event, error: message, stack, ...data, ts: new Date().toISOString() }));
}

/** Wraps a promise with a timeout so a hung AI call fails fast with a clear message instead of stalling the client. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
