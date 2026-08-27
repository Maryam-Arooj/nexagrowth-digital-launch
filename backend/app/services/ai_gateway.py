"""Gemini access for every AI endpoint.

Port of ``supabase/functions/_shared/ai-gateway.ts``, minus the Lovable AI Gateway.
That path is gone entirely: Lovable is billed against workspace credits, and this
migration's whole point is a free, local, vendor-free backend. There is exactly one
provider now — Google's own API, called directly.

`GEMINI_API_KEY` is read from ``backend/.env`` and never leaves this process. The
browser talks to FastAPI; FastAPI talks to Gemini.

Every model call goes through :func:`generate_text` or :func:`stream_text`, so the
timeout and error-mapping rules exist in exactly one place. Both indirect through
the module-level ``_TEXT_BACKEND`` / ``_STREAM_BACKEND`` hooks, which lets the test
suite exercise the full pipeline deterministically without a network call or an API
key -- see ``tests/test_marketing_api.py``.
"""

from __future__ import annotations

import json
import time
import logging
import re
from collections.abc import Iterator
from typing import Any, Protocol

from app.config import get_settings

logger = logging.getLogger("nexagrowth.ai")

# Per-ATTEMPT budget, not per stage — a stage may make up to MAX_ATTEMPTS of these.
#
# 35s was inherited from the edge functions and is far too short for
# gemini-3.6-flash: it is a reasoning model, its thinking tokens are generated
# before any output appears, and the Marketing Strategist stage asks for the largest
# structured payload in the pipeline (marketingStrategy, budgetAllocation, a
# four-week actionPlan, a three-month ninetyDayStrategy, kpis, recommendedPlan).
# That combination is what produced 504 DEADLINE_EXCEEDED.
STAGE_TIMEOUT_SECONDS = 75.0
ACTION_TIMEOUT_SECONDS = 75.0

# Set explicitly so a long structured response is never silently truncated. Well
# inside the model's ceiling, and several times what the largest stage needs.
MAX_OUTPUT_TOKENS = 16384

# Bounded retry for transient provider failures. 3 attempts total, never infinite.
MAX_ATTEMPTS = 3
BACKOFF_BASE_SECONDS = 2.0
BACKOFF_MAX_SECONDS = 10.0


class ConfigError(Exception):
    """Setup problem (missing key). Always maps to HTTP 500."""


class ValidationError(Exception):
    """Bad client input. Always maps to HTTP 400."""


class AiRateLimitError(Exception):
    """Provider rate limit. Maps to HTTP 429."""


class AiQuotaError(Exception):
    """Provider quota/credits exhausted. Maps to HTTP 402."""


class AiError(Exception):
    """Any other provider failure. Maps to HTTP 502."""


class AiTimeoutError(AiError):
    """The provider did not answer within the per-attempt deadline."""


class AiRetryExhaustedError(AiError):
    """A transient failure that did not clear within MAX_ATTEMPTS."""


class AiTruncatedError(AiError):
    """Generation stopped on MAX_TOKENS — the body is incomplete, not malformed.

    Deliberately NOT retryable: the same prompt against the same ceiling truncates
    again. It means MAX_OUTPUT_TOKENS needs raising, so say that instead of burning
    the retry budget.
    """


class AiEmptyResponseError(AiError):
    """The provider returned no text at all (usually a safety or recitation stop)."""


# Transient conditions worth retrying. DEADLINE_EXCEEDED (504) is the one that broke
# Competitor Analyst live; the rest are the usual provider blips.
_TRANSIENT_RE = re.compile(
    r"\b(429|500|502|503|504)\b"
    r"|DEADLINE_EXCEEDED|UNAVAILABLE|RESOURCE_EXHAUSTED|INTERNAL"
    r"|timed?\s*out|timeout|connection\s+(reset|aborted|error)|temporarily",
    re.I,
)


def _is_transient(exc: BaseException) -> bool:
    """Retry only what a retry can actually fix."""
    # Our own terminal conditions: re-running the same prompt changes nothing.
    if isinstance(exc, (AiTruncatedError, ConfigError, ValidationError)):
        return False
    if isinstance(exc, (TimeoutError, ConnectionError)):
        return True
    return bool(_TRANSIENT_RE.search(str(exc)))


def _backoff_seconds(attempt: int) -> float:
    """Exponential backoff with deterministic jitter, capped."""
    delay = BACKOFF_BASE_SECONDS * (2 ** (attempt - 1))
    return min(delay, BACKOFF_MAX_SECONDS)


def log(event: str, **data: Any) -> None:
    """Structured, greppable log line — same shape as the TypeScript logger."""
    logger.info(json.dumps({"event": event, **data}, default=str))


def log_error(event: str, error: BaseException, **data: Any) -> None:
    logger.error(json.dumps({"event": event, "error": str(error), **data}, default=str))


# --------------------------------------------------------------------------
# Provider resolution
# --------------------------------------------------------------------------


def get_model_id() -> str:
    """Resolve the Gemini model, raising a clear ConfigError when unconfigured."""
    settings = get_settings()
    if not settings.is_ai_configured:
        raise ConfigError(
            "AI service is not configured on the server (missing GEMINI_API_KEY). "
            "Get a free key with no credit card at https://aistudio.google.com/apikey "
            "and set it in backend/.env"
        )
    return settings.resolved_gemini_model


def _friendly_ai_error(exc: BaseException, label: str) -> Exception:
    """Map a raw provider error onto the messages the frontend already renders.

    The React app special-cases the "429:" and "402:" prefixes, so they are
    preserved exactly as the edge functions produced them.
    """
    message = str(exc)
    if re.search(r"429|rate.?limit|RESOURCE_EXHAUSTED", message, re.I):
        return AiRateLimitError("429: AI rate limit reached. Please try again shortly.")
    if re.search(r"402|payment|credits?|quota", message, re.I):
        return AiQuotaError("402: AI credits exhausted.")
    return AiError(f"{label}: {message}")


# --------------------------------------------------------------------------
# Backends -- swapped out wholesale by the test suite
# --------------------------------------------------------------------------


class TextBackend(Protocol):
    def __call__(
        self,
        *,
        model: str,
        system: str,
        prompt: str,
        timeout: float,
        response_schema: Any = None,
    ) -> str: ...


class StreamBackend(Protocol):
    def __call__(
        self, *, model: str, system: str, prompt: str, timeout: float
    ) -> Iterator[str]: ...


def _gemini_text(
    *, model: str, system: str, prompt: str, timeout: float, response_schema: Any = None
) -> str:
    """One Gemini call.

    When ``response_schema`` is given, the model is put into structured-output mode
    (``response_mime_type="application/json"`` plus the Pydantic schema). Gemini then
    constrains decoding to that schema, so the body cannot come back wrapped in
    markdown fences, prefixed with a reasoning preamble, or trailed by commentary —
    the three shapes the text-repair path in pipeline_stages.py exists to survive.
    That path is kept as a fallback; this just stops it being load-bearing.
    """
    from google import genai
    from google.genai import types

    config_kwargs: dict[str, Any] = {
        "system_instruction": system,
        "http_options": types.HttpOptions(timeout=int(timeout * 1000)),
        "max_output_tokens": MAX_OUTPUT_TOKENS,
    }
    if response_schema is not None:
        config_kwargs["response_mime_type"] = "application/json"
        config_kwargs["response_schema"] = response_schema

    client = genai.Client(api_key=get_settings().gemini_api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    text = response.text or ""
    if _truncated(response):
        raise AiTruncatedError(
            "model response was cut off before the JSON was complete "
            f"({_stop_reason(response)}). Raise MAX_OUTPUT_TOKENS — currently "
            f"{MAX_OUTPUT_TOKENS}."
        )
    if not text.strip():
        # An empty body is a stop reason, not a real answer. Naming it stops this
        # being misreported as "AI returned invalid JSON" for a call that never
        # produced a payload at all.
        raise AiEmptyResponseError(
            f"model returned an empty response ({_stop_reason(response)})"
        )
    return text


def _stop_reason(response: Any) -> str:
    """Best-effort finish_reason, for error messages only."""
    try:
        reason = response.candidates[0].finish_reason
    except (AttributeError, IndexError, TypeError):
        return "finish_reason unavailable"
    return f"finish_reason={getattr(reason, 'name', reason)}"


def _truncated(response: Any) -> bool:
    """True when generation stopped because it ran out of output tokens."""
    try:
        reason = response.candidates[0].finish_reason
    except (AttributeError, IndexError, TypeError):
        return False
    return str(getattr(reason, "name", reason)).upper() == "MAX_TOKENS"


def _gemini_stream(*, model: str, system: str, prompt: str, timeout: float) -> Iterator[str]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=get_settings().gemini_api_key)
    stream = client.models.generate_content_stream(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            http_options=types.HttpOptions(timeout=int(timeout * 1000)),
        ),
    )
    for chunk in stream:
        text = getattr(chunk, "text", None)
        if text:
            yield text


_TEXT_BACKEND: TextBackend = _gemini_text
_STREAM_BACKEND: StreamBackend = _gemini_stream


def set_backends(
    text: TextBackend | None = None, stream: StreamBackend | None = None
) -> tuple[TextBackend, StreamBackend]:
    """Replace the model backends (tests only). Returns the previous pair."""
    global _TEXT_BACKEND, _STREAM_BACKEND
    previous = (_TEXT_BACKEND, _STREAM_BACKEND)
    if text is not None:
        _TEXT_BACKEND = text
    if stream is not None:
        _STREAM_BACKEND = stream
    return previous


# --------------------------------------------------------------------------
# Public API
# --------------------------------------------------------------------------


def generate_text(
    *,
    system: str,
    prompt: str,
    label: str,
    timeout: float = STAGE_TIMEOUT_SECONDS,
    response_schema: Any = None,
) -> str:
    """One non-streaming model call, with provider errors normalised.

    ``response_schema`` (a Pydantic model) switches the provider into structured
    output. It is optional so the free-text callers — the chat and action endpoints —
    are unaffected.
    """
    model = get_model_id()
    last: BaseException | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return _TEXT_BACKEND(
                model=model,
                system=system,
                prompt=prompt,
                timeout=timeout,
                response_schema=response_schema,
            )
        except (ConfigError, ValidationError):
            raise
        except BaseException as exc:  # noqa: BLE001 - re-raised as a typed AI error
            last = exc
            if not _is_transient(exc):
                raise _friendly_ai_error(exc, label) from exc
            if attempt == MAX_ATTEMPTS:
                break
            delay = _backoff_seconds(attempt)
            log(
                "ai_retry",
                stage=label,
                attempt=attempt,
                maxAttempts=MAX_ATTEMPTS,
                backoffSeconds=delay,
                error=str(exc)[:200],
            )
            time.sleep(delay)

    assert last is not None
    log_error("ai_retry_exhausted", last, stage=label, attempts=MAX_ATTEMPTS)
    if isinstance(last, TimeoutError) or re.search(
        r"DEADLINE_EXCEEDED|timed?\s*out|timeout", str(last), re.I
    ):
        raise AiTimeoutError(
            f"{label}: the model did not respond within {timeout:.0f}s after "
            f"{MAX_ATTEMPTS} attempts."
        ) from last
    # A rate limit that survived the backoff keeps its 429 mapping for the frontend.
    mapped = _friendly_ai_error(last, label)
    if isinstance(mapped, (AiRateLimitError, AiQuotaError)):
        raise mapped from last
    raise AiRetryExhaustedError(
        f"{label}: transient provider failure persisted across {MAX_ATTEMPTS} "
        f"attempts — {last}"
    ) from last


def stream_text(
    *, system: str, prompt: str, label: str, timeout: float = ACTION_TIMEOUT_SECONDS
) -> Iterator[str]:
    """Yield text deltas from the model as they arrive."""
    model = get_model_id()
    try:
        yield from _STREAM_BACKEND(model=model, system=system, prompt=prompt, timeout=timeout)
    except (ConfigError, ValidationError):
        raise
    except BaseException as exc:  # noqa: BLE001
        raise _friendly_ai_error(exc, label) from exc
