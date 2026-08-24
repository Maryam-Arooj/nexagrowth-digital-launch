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

/**
 * Reads and validates the AI gateway API key from the environment.
 * Centralized so every function surfaces the exact same, actionable error
 * (and the exact same log line) when the secret hasn't been configured for
 * this deployment — this is the #1 cause of "AI not configured" failures
 * when the project is deployed outside of Lovable Cloud, since
 * LOVABLE_API_KEY is normally auto-provisioned there and has to be set
 * manually anywhere else (`supabase secrets set LOVABLE_API_KEY=...`).
 */
export function getLovableApiKey(fnName: string): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !key.trim()) {
    console.error(
      `[${fnName}] Missing LOVABLE_API_KEY secret. Set it with: supabase secrets set LOVABLE_API_KEY=<key> (or add it in Supabase Dashboard → Edge Functions → Secrets).`
    );
    throw new ConfigError(
      "AI service is not configured on the server (missing LOVABLE_API_KEY). Contact the site admin."
    );
  }
  return key;
}

export type AiProvider = "lovable" | "gemini-direct";

/** A resolved model instance ready to hand to generateText/streamText, plus which provider was used. */
export interface AiModelHandle {
  provider: AiProvider;
  model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>> | ReturnType<ReturnType<typeof createOpenAICompatible>>;
}

/**
 * Picks an AI provider for this call — no code changes needed to switch between them,
 * just which secret is set:
 *
 *   1. LOVABLE_API_KEY — Lovable AI Gateway. Auto-provisioned when this project runs
 *      inside Lovable Cloud; billed against the workspace's Lovable credits.
 *   2. GEMINI_API_KEY  — Google's own Gemini API, called directly (no Lovable involved,
 *      no Lovable billing). Get a free key with no credit card at
 *      https://aistudio.google.com/apikey and set it as a Supabase secret
 *      (`supabase secrets set GEMINI_API_KEY=...`) or, for local dev, in
 *      `supabase/functions/.env`.
 *
 * LOVABLE_API_KEY is checked first so a Lovable Cloud deployment behaves exactly as
 * before; GEMINI_API_KEY is the path for running this project anywhere else for free.
 */
export function getAiModel(fnName: string): AiModelHandle {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey && lovableKey.trim()) {
    const gateway = createLovableAiGatewayProvider(lovableKey);
    return { provider: "lovable", model: gateway("google/gemini-3-flash-preview") };
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey && geminiKey.trim()) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    return { provider: "gemini-direct", model: google("gemini-2.0-flash") };
  }

  console.error(
    `[${fnName}] No AI key configured. Set ONE of: LOVABLE_API_KEY (Lovable Cloud) or ` +
      `GEMINI_API_KEY (free key, no credit card: https://aistudio.google.com/apikey) as a ` +
      `Supabase Edge Function secret, or in supabase/functions/.env for local dev.`
  );
  throw new ConfigError(
    "AI service is not configured on the server (missing LOVABLE_API_KEY or GEMINI_API_KEY). Contact the site admin."
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
