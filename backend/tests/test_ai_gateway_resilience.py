"""Retry, backoff, timeout and stop-reason handling in the shared AI gateway.

Every AI-powered stage goes through generate_text(), so what is pinned here applies
identically to Competitor Analyst, Marketing Strategist, Content Generator and
Campaign Assistant. The two deterministic stages make no model call at all.
"""

from __future__ import annotations

import pytest

from app.services import ai_gateway
from app.services.ai_gateway import (
    MAX_ATTEMPTS,
    AiEmptyResponseError,
    AiQuotaError,
    AiRateLimitError,
    AiRetryExhaustedError,
    AiTimeoutError,
    AiTruncatedError,
    generate_text,
    _backoff_seconds,
    _is_transient,
)


@pytest.fixture(autouse=True)
def _no_real_sleeping(monkeypatch):
    """Backoff is asserted on, not waited out."""
    slept: list[float] = []
    monkeypatch.setattr(ai_gateway.time, "sleep", lambda s: slept.append(s))
    return slept


def _call(label: str = "Marketing Strategist"):
    return generate_text(system="s", prompt="p", label=label)


# ---------------------------------------------------------- transient triage

@pytest.mark.parametrize(
    "message",
    ["504 DEADLINE_EXCEEDED. Deadline expired before operation could complete.",
     "503 UNAVAILABLE", "500 INTERNAL", "502 Bad Gateway",
     "429 RESOURCE_EXHAUSTED", "connection reset by peer", "request timed out"],
)
def test_transient_failures_are_recognised(message: str) -> None:
    assert _is_transient(RuntimeError(message)), message


@pytest.mark.parametrize(
    "exc",
    [ValueError("400 INVALID_ARGUMENT"),
     RuntimeError("404 NOT_FOUND: model is no longer available"),
     AiTruncatedError("cut off")],
)
def test_permanent_failures_are_not_retried(exc: BaseException) -> None:
    assert not _is_transient(exc)


def test_backoff_is_exponential_and_capped() -> None:
    delays = [_backoff_seconds(i) for i in range(1, 8)]
    assert delays[0] < delays[1] < delays[2]              # exponential
    assert all(d <= ai_gateway.BACKOFF_MAX_SECONDS for d in delays)   # bounded


# ------------------------------------------------------------- retry outcomes

def test_retry_succeeds_after_a_temporary_failure(_no_real_sleeping) -> None:
    calls = {"n": 0}

    def flaky(*, model, system, prompt, timeout, response_schema=None):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("504 DEADLINE_EXCEEDED")
        return '{"ok": true}'

    previous = ai_gateway.set_backends(text=flaky)
    try:
        assert _call() == '{"ok": true}'
    finally:
        ai_gateway.set_backends(*previous)
    assert calls["n"] == 2                    # one retry, then success
    assert len(_no_real_sleeping) == 1        # exactly one backoff


def test_retry_is_bounded_and_then_reports_exhaustion(_no_real_sleeping) -> None:
    calls = {"n": 0}

    def always_503(*, model, system, prompt, timeout, response_schema=None):
        calls["n"] += 1
        raise RuntimeError("503 UNAVAILABLE")

    previous = ai_gateway.set_backends(text=always_503)
    try:
        with pytest.raises(AiRetryExhaustedError) as excinfo:
            _call()
    finally:
        ai_gateway.set_backends(*previous)
    assert calls["n"] == MAX_ATTEMPTS                    # never infinite
    assert len(_no_real_sleeping) == MAX_ATTEMPTS - 1
    assert "Marketing Strategist" in str(excinfo.value)


def test_a_persistent_deadline_is_reported_as_a_timeout(_no_real_sleeping) -> None:
    def always_504(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("504 DEADLINE_EXCEEDED. Deadline expired.")

    previous = ai_gateway.set_backends(text=always_504)
    try:
        with pytest.raises(AiTimeoutError, match="did not respond within"):
            _call("Competitor Analyst")
    finally:
        ai_gateway.set_backends(*previous)


def test_a_permanent_error_fails_immediately_without_retrying(_no_real_sleeping) -> None:
    calls = {"n": 0}

    def bad_request(*, model, system, prompt, timeout, response_schema=None):
        calls["n"] += 1
        raise RuntimeError("400 INVALID_ARGUMENT: schema not supported")

    previous = ai_gateway.set_backends(text=bad_request)
    try:
        with pytest.raises(Exception):
            _call()
    finally:
        ai_gateway.set_backends(*previous)
    assert calls["n"] == 1, "a permanent error must not consume the retry budget"


def test_rate_limit_keeps_its_429_mapping_after_retries(_no_real_sleeping) -> None:
    def always_429(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("429 RESOURCE_EXHAUSTED: rate limit")

    previous = ai_gateway.set_backends(text=always_429)
    try:
        with pytest.raises(AiRateLimitError):
            _call()
    finally:
        ai_gateway.set_backends(*previous)


def test_quota_exhaustion_keeps_its_402_mapping(_no_real_sleeping) -> None:
    def no_credits(*, model, system, prompt, timeout, response_schema=None):
        raise RuntimeError("402 payment required: credits exhausted")

    previous = ai_gateway.set_backends(text=no_credits)
    try:
        with pytest.raises(AiQuotaError):
            _call()
    finally:
        ai_gateway.set_backends(*previous)


# --------------------------------------------------------------- stop reasons

class _Candidate:
    def __init__(self, reason): self.finish_reason = reason


class _Response:
    def __init__(self, text, reason="STOP"):
        self.text = text
        self.candidates = [_Candidate(reason)]


def _patch_genai(monkeypatch, response):
    """Drive the real _gemini_text against a fake SDK client."""
    import sys, types as pytypes

    class _Models:
        def generate_content(self, **kwargs):
            _Models.last_kwargs = kwargs
            return response

    class _Client:
        def __init__(self, **_): self.models = _Models()

    genai_mod = pytypes.ModuleType("google.genai")
    genai_mod.Client = _Client
    types_mod = pytypes.ModuleType("google.genai.types")

    class _Cfg:
        def __init__(self, **kw): self.__dict__.update(kw)

    types_mod.GenerateContentConfig = _Cfg
    types_mod.HttpOptions = _Cfg
    genai_mod.types = types_mod
    google_mod = pytypes.ModuleType("google")
    google_mod.genai = genai_mod
    monkeypatch.setitem(sys.modules, "google", google_mod)
    monkeypatch.setitem(sys.modules, "google.genai", genai_mod)
    monkeypatch.setitem(sys.modules, "google.genai.types", types_mod)
    monkeypatch.setattr(
        ai_gateway, "get_settings", lambda: pytypes.SimpleNamespace(gemini_api_key="k")
    )
    return _Models


def test_truncation_is_named_not_reported_as_invalid_json(monkeypatch) -> None:
    """A MAX_TOKENS stop must not masquerade as a parser problem."""
    _patch_genai(monkeypatch, _Response('{"partial": tr', "MAX_TOKENS"))
    with pytest.raises(AiTruncatedError, match="MAX_OUTPUT_TOKENS"):
        ai_gateway._gemini_text(model="m", system="s", prompt="p", timeout=75.0)


def test_structured_output_and_token_ceiling_reach_the_provider(monkeypatch) -> None:
    """The config the pipeline depends on is actually sent, not just intended."""
    from app.services.pipeline_stages import StrategyStageResult

    models = _patch_genai(monkeypatch, _Response('{"ok": true}', "STOP"))
    ai_gateway._gemini_text(
        model="m", system="s", prompt="p", timeout=75.0,
        response_schema=StrategyStageResult,
    )
    cfg = models.last_kwargs["config"]
    assert cfg.response_mime_type == "application/json"
    assert cfg.response_schema is StrategyStageResult
    assert cfg.max_output_tokens == ai_gateway.MAX_OUTPUT_TOKENS


def test_an_empty_body_is_reported_as_such(monkeypatch) -> None:
    _patch_genai(monkeypatch, _Response("   ", "SAFETY"))
    with pytest.raises(AiEmptyResponseError, match="SAFETY"):
        ai_gateway._gemini_text(model="m", system="s", prompt="p", timeout=75.0)


def test_truncated_helper_detects_max_tokens() -> None:
    assert ai_gateway._truncated(_Response("partial", "MAX_TOKENS")) is True
    assert ai_gateway._truncated(_Response("done", "STOP")) is False


def test_stop_reason_is_surfaced_for_diagnostics() -> None:
    assert "MAX_TOKENS" in ai_gateway._stop_reason(_Response("x", "MAX_TOKENS"))


def test_empty_response_is_its_own_error_type() -> None:
    assert issubclass(AiEmptyResponseError, ai_gateway.AiError)
    assert not _is_transient(AiTruncatedError("x"))


def test_the_configured_output_ceiling_is_generous() -> None:
    """Guards against someone lowering this into the truncation zone again."""
    assert ai_gateway.MAX_OUTPUT_TOKENS >= 8192


def test_stage_timeout_clears_a_reasoning_models_latency() -> None:
    assert ai_gateway.STAGE_TIMEOUT_SECONDS >= 60
