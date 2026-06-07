import json
import logging
import os
import threading
import time

from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from .base import InvalidJSONResponse, LLMProvider, RetryPolicy

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        primary_model: str,
        fallback_model: str | None = None,
        retry_policy: RetryPolicy | None = None,
    ):
        self._client = genai.Client(api_key=api_key)
        self._primary_model = primary_model
        self._fallback_model = fallback_model if fallback_model and fallback_model != primary_model else None
        self._retry_policy = retry_policy or RetryPolicy()

    def generate(self, prompt: str, *, response_mime_type: str | None = None) -> str:
        try:
            return self._generate_with_retries(self._primary_model, prompt, response_mime_type)
        except Exception as primary_exc:
            if self._fallback_model and self._should_retry(primary_exc):
                logger.warning(
                    "Gemini primary model %s exhausted retries; falling back to %s",
                    self._primary_model, self._fallback_model,
                )
                try:
                    return self._generate_with_retries(
                        self._fallback_model, prompt, response_mime_type,
                    )
                except Exception as fallback_exc:
                    logger.exception("Gemini fallback model also failed.")
                    raise RuntimeError("Gemini summary request failed.") from fallback_exc

            logger.exception("Gemini summary request failed.")
            raise RuntimeError("Gemini summary request failed.") from primary_exc

    def _generate_with_retries(self, model_name: str, prompt: str, response_mime_type: str | None) -> str:
        require_json = response_mime_type == "application/json"

        request_kwargs = {"model": model_name, "contents": prompt}
        if response_mime_type:
            request_kwargs["config"] = genai_types.GenerateContentConfig( # type: ignore
                response_mime_type=response_mime_type,
            )

        last_exc: Exception | None = None
        for attempt in range(1, self._retry_policy.max_attempts + 1):
            try:
                response = self._client.models.generate_content(**request_kwargs)  # type: ignore[arg-type]
                text = getattr(response, "text", None)
                if not text:
                    raise RuntimeError("Gemini returned an empty response.")
                if require_json:
                    try:
                        json.loads(text)
                    except json.JSONDecodeError as parse_exc:
                        logger.warning(
                            "Gemini %s returned invalid JSON on attempt %d.", model_name, attempt,
                        )
                        raise InvalidJSONResponse(
                            "Gemini returned invalid JSON."
                        ) from parse_exc
                return text
            except Exception as exc:
                last_exc = exc
                if not self._should_retry(exc) or attempt == self._retry_policy.max_attempts:
                    raise
                delay = self._retry_policy.base_delay_seconds * (2 ** (attempt - 1))
                logger.warning(
                    "Gemini %s returned %s; retry %d/%d after %.1fs",
                    model_name, getattr(exc, "code", "error"),
                    attempt, self._retry_policy.max_attempts - 1, delay,
                )
                time.sleep(delay)
        raise last_exc  # type: ignore[misc]

    def _should_retry(self, exc: Exception) -> bool:
        if isinstance(exc, InvalidJSONResponse):
            return True
        return (
            isinstance(exc, genai_errors.APIError)
            and getattr(exc, "code", None) in self._retry_policy.retryable_status_codes
        )


_provider_lock = threading.Lock()
_default_provider: GeminiProvider | None = None
_default_provider_api_key: str | None = None


def _read_env_config() -> tuple[str | None, str | None, str | None, list[str]]:
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_API_MODEL")
    fallback_model = os.getenv("GEMINI_API_FALLBACK_MODEL", "").strip() or None
    missing = []
    if not api_key:
        missing.append("GEMINI_API_KEY")
    if not model_name:
        missing.append("GEMINI_API_MODEL")
    return api_key, model_name, fallback_model, missing


def get_default_provider() -> LLMProvider:
    global _default_provider, _default_provider_api_key
    api_key, model_name, fallback_model, missing = _read_env_config()
    if missing:
        raise RuntimeError(
            "Gemini is not configured. Missing env var(s): " + ", ".join(missing)
        )
    if _default_provider is not None and _default_provider_api_key == api_key:
        return _default_provider
    with _provider_lock:
        if _default_provider is not None and _default_provider_api_key == api_key:
            return _default_provider
        _default_provider = GeminiProvider(
            api_key=api_key,  # type: ignore[arg-type]
            primary_model=model_name,  # type: ignore[arg-type]
            fallback_model=fallback_model,
        )
        _default_provider_api_key = api_key
    return _default_provider


def reset_default_provider() -> None:
    global _default_provider, _default_provider_api_key
    with _provider_lock:
        _default_provider = None
        _default_provider_api_key = None


def log_startup_config() -> None:
    _, model_name, _, missing = _read_env_config()
    if missing:
        logger.error(
            "Gemini is not fully configured. Missing env var(s): %s. "
            "Add them to backend/.env before calling summarize.",
            ", ".join(missing)
        )
    else:
        logger.info("Gemini config loaded. Using model: %s", model_name)
