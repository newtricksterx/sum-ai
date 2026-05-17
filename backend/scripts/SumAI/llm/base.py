from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class InvalidJSONResponse(RuntimeError):
    """Raised when an LLM returns a body that does not parse as JSON, despite a JSON mime type being requested."""


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 1.0
    retryable_status_codes: frozenset = field(
        default_factory=lambda: frozenset({429, 500, 503, 504})
    )


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, *, response_mime_type: str | None = None) -> str:
        """Run a single generation request.

        Implementations MUST raise InvalidJSONResponse when response_mime_type is
        "application/json" but the response body is not valid JSON, so callers can
        decide whether to retry on a different model.
        """
        ...
