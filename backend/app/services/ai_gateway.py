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
import logging
import re
from collections.abc import Iterator
from typing import Any, Protocol

from app.config import get_settings

logger = logging.getLogger("nexagrowth.ai")

# Matches the TypeScript AI_STAGE_TIMEOUT_MS / AI_TIMEOUT_MS.
STAGE_TIMEOUT_SECONDS = 35.0
ACTION_TIMEOUT_SECONDS = 45.0


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
    if not text.strip():
        # An empty body is almost always a stop reason, not a real answer. Say which
        # one — "AI returned invalid JSON" sent us hunting the parser for a call that
        # never produced a payload at all.
        raise AiError(f"model returned an empty response ({_stop_reason(response)})")
    if _truncated(response):
        raise AiError(
            "model response was cut off before the JSON was complete "
            f"({_stop_reason(response)}). The stage output is too long for the "
            "current output-token budget."
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
        raise _friendly_ai_error(exc, label) from exc


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
