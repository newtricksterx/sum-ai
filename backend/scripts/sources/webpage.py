from .base import ExtractionResult, SourceExtractor


class WebpageExtractor(SourceExtractor):
    source_type = "webpage"

    def extract(self, request) -> ExtractionResult:
        source_content = request.data.get("source_content")
        if not source_content:
            return ExtractionResult(is_success=False, error="Error: Invalid request.")
        return ExtractionResult(is_success=True, content=source_content)
