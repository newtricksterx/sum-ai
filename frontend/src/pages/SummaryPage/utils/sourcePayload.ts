import type { SourcePayload, SourcePayloadResolution, SourceType } from "./types";
import { extractTabContent, isYoutube } from "./sources";
import { errorDocument } from "./document";
import { isPDF, fetchPdfBytes, PdfFileAccessDeniedError, type PdfPayload } from "./pdf";

export const detectSourceType = (url: string | undefined): SourceType => {
  if (isPDF(url)) return "pdf";
  if (isYoutube(url)) return "youtube";
  return "webpage";
};

export const buildMockSourcePayload = async (): Promise<SourcePayload> => {
  const { MOCK_SUMMARY_DOCUMENT, getMockSourceUrl } = await import("./mocks");
  const mockSourceUrl = await getMockSourceUrl();
  return {
    sourceType: "webpage",
    sourceUrl: mockSourceUrl,
    sourceContent: MOCK_SUMMARY_DOCUMENT,
  };
};

export const sourcePayloadResolution = (
  payload: SourcePayload,
): SourcePayloadResolution => ({
  payload,
  errorDocument: null,
  sourceUrl: payload.sourceUrl,
});

export const sourcePayloadError = (
  title: string,
  message: string,
  sourceUrl?: string,
): SourcePayloadResolution => ({
  payload: null,
  errorDocument: errorDocument(title, message),
  sourceUrl,
});

// Builds a SourcePayload from an already-resolved, non-restricted tab: detects the source
// type, then scrapes webpage text or fetches PDF bytes.
export const buildSourcePayloadFromTab = async (
  tab: chrome.tabs.Tab,
): Promise<SourcePayloadResolution> => {
  const sourceType = detectSourceType(tab.url);

  // YouTube content is fetched server-side as a transcript, so we skip the DOM scrape.
  let sourceContent = "";
  let pdf: PdfPayload | undefined;

  if (sourceType === "webpage") {
    let tabContent: { text: string } = { text: "" };
    try {
      tabContent = await extractTabContent(tab.id as number);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Script Injection Error:", error);
      return sourcePayloadError(
        "Cannot read this page",
        "This page blocks extension script access. Try another site tab and try again.",
        tab.url,
      );
    }

    if (!tabContent.text) {
      return sourcePayloadError("No readable content", "Could not extract readable text from this page.", tab.url);
    }
    sourceContent = tabContent.text;
  } else if (sourceType === "pdf") {
    try {
      pdf = await fetchPdfBytes(tab);
    } catch (error) {
      if (import.meta.env.DEV) console.error("PDF Fetch Error:", error);
      if (error instanceof PdfFileAccessDeniedError) {
        return sourcePayloadError(
          "Local PDF access blocked",
          "Open chrome://extensions, find ReadToRecall, and enable \"Allow access to file URLs\", then try again.",
          tab.url,
        );
      }
      return sourcePayloadError(
        "Could not read PDF",
        "Could not fetch this PDF. Try opening it in a fresh tab and reloading.",
        tab.url,
      );
    }
  }

  return sourcePayloadResolution({ sourceType, sourceUrl: tab.url, sourceContent, pdf });
};
