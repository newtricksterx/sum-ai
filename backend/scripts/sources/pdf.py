import logging

import fitz  # PyMuPDF

from .base import ExtractionResult, SourceExtractor

logger = logging.getLogger(__name__)

MAX_PAGES = 200


class PdfExtractor(SourceExtractor):
    source_type = "pdf"

    def extract(self, request) -> ExtractionResult:
        pdf_file = request.FILES.get("pdf")
        if pdf_file is None:
            return ExtractionResult(is_success=False, error="Error: Invalid request.")

        try:
            data = pdf_file.read()
            with fitz.open(stream=data, filetype="pdf") as document:
                pages = [page.get_text() for page in document.pages(stop=MAX_PAGES)]
            return ExtractionResult(is_success=True, content="\n\n".join(pages).strip())
        except Exception:
            logger.exception("PDF extraction failed.")
            return ExtractionResult(
                is_success=False,
                error="Could not read this PDF. It may be corrupted or password-protected.",
            )
