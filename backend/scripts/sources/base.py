from abc import ABC, abstractmethod
from dataclasses import dataclass
from urllib.parse import urlsplit


@dataclass(frozen=True)
class ExtractionResult:
    is_success: bool
    content: str = ""
    error: str | None = None


class SourceExtractor(ABC):
    source_type: str = ""

    @abstractmethod
    def extract(self, request) -> ExtractionResult:
        ...


class SourceExtractorRegistry:
    def __init__(self):
        self._extractors: dict[str, SourceExtractor] = {}

    def register(self, extractor: SourceExtractor) -> None:
        if not extractor.source_type:
            raise ValueError(f"{type(extractor).__name__} is missing source_type.")
        self._extractors[extractor.source_type] = extractor

    def extract(self, request) -> ExtractionResult:
        source_type = request.data.get("source_type")
        source_url = request.data.get("source_url")
        if not source_url:
            return ExtractionResult(is_success=False, error="Error: Invalid request.")

        extractor = self._extractors.get(source_type)
        if extractor is None:
            return ExtractionResult(is_success=False, error="Error: Invalid request.")

        return extractor.extract(request)
