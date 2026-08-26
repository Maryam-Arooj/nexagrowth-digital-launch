/**
 * Client for the local FastAPI backend.
 *
 * Replaces the Supabase JS client. The browser now talks to one origin
 * (`VITE_API_URL`, default `http://localhost:8000`) and every secret — the Gemini
 * key, the PostgreSQL credentials — stays behind that API boundary. Nothing
 * sensitive is bundled into the frontend.
 *
 * Streaming endpoints (`/api/marketing-report`, `/api/marketing-strategist`) are
 * deliberately NOT wrapped here: the report reads the raw NDJSON body itself and
 * the chat is driven by `DefaultChatTransport`. Both only need `apiUrl()`.
 */

/** Base URL of the FastAPI backend, without a trailing slash. */
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

/** Builds an absolute URL for an API path. `apiUrl("/api/leads")`. */
export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * An error from the API, carrying the HTTP status so callers can branch on it.
 *
 * `isNetworkError` distinguishes "the browser could not reach the server at all"
 * (backend not running — by far the most common case in local development) from
 * "the server answered with an error", which need very different messages.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly isNetworkError: boolean;

  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Normalises the two error shapes FastAPI can return into one string.
 *
 * Application errors use `{"error": "..."}`, but Pydantic request-validation
 * failures return 422 with `{"detail": [{loc, msg, ...}]}`. Without this, a
 * validation failure would surface as "[object Object]".
 */
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    if (typeof record.error === "string" && record.error) return record.error;

    const detail = record.detail;
    if (typeof detail === "string" && detail) return detail;

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) =>
          item && typeof item === "object" && typeof (item as Record<string, unknown>).msg === "string"
            ? ((item as Record<string, unknown>).msg as string)
            : null,
        )
        .filter((m): m is string => Boolean(m));
      if (messages.length > 0) return messages.join(", ");
    }
  }
  return `Request failed (status ${status})`;
}

/** POST JSON, returning the parsed response. Throws `ApiError` on any failure. */
export async function apiPost<T = unknown>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // A bare TypeError from fetch means the request never reached a server.
    throw new ApiError(
      `Could not reach the API at ${API_URL}. Is the backend running? ` +
        `Start it with: uvicorn app.main:app --reload --port 8000`,
      0,
      true,
    );
  }

  const raw = await response.text();
  let body: unknown = null;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      // A non-JSON body (proxy error page, HTML) must not collapse into a
      // useless message — surface the status instead of a parse failure.
      if (!response.ok) {
        throw new ApiError(`Server returned an unexpected response (status ${response.status}).`, response.status);
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, response.status), response.status);
  }
  return body as T;
}
