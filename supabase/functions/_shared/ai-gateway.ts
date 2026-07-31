import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";

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
};

/**
 * Reads and validates the AI gateway API key from the environment.
 * Centralized so every function surfaces the exact same, actionable error
 * and log line when the LOVABLE_API_KEY secret is missing.
 */
export function getLovableApiKey(fnName: string): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !key.trim()) {
    console.error(`[${fnName}] Missing LOVABLE_API_KEY secret in this project's edge function environment.`);
    throw new ConfigError("AI service is not configured on the server (missing LOVABLE_API_KEY). Contact the site admin.");
  }
  return key;
}

/** Thrown for setup/config problems — always maps to HTTP 500 with a stable message. */
export class ConfigError extends Error {}

/** Thrown for bad client input — always maps to HTTP 400. */
export class ValidationError extends Error {}

/** Structured logger so edge function logs are greppable in the Supabase dashboard. */
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
