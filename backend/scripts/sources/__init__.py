from .base import ExtractionResult, SourceExtractor, SourceExtractorRegistry
from .pdf import PdfExtractor
from .webpage import WebpageExtractor
from .youtube import YouTubeExtractor

default_registry = SourceExtractorRegistry()
default_registry.register(WebpageExtractor())
default_registry.register(YouTubeExtractor())
default_registry.register(PdfExtractor())

__all__ = [
    "ExtractionResult",
    "SourceExtractor",
    "SourceExtractorRegistry",
    "default_registry",
]
