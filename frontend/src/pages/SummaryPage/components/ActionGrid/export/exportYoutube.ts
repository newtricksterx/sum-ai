import { fetchTranscript } from "./fetchTranscript";
import { buildTranscriptPdf } from "./pdfBuilder";
import { triggerDownload } from "./triggerDownload";

export const exportYoutube = async (
  baseUrl: string,
  sourceUrl: string,
  isAuthenticated: boolean,
): Promise<void> => {
  const result = await fetchTranscript(baseUrl, sourceUrl, isAuthenticated);

  if (!result.isSuccess || !result.paragraphs) {
    throw new Error(result.error ?? "Could not fetch transcript for this video.");
  }

  const blob = buildTranscriptPdf("YouTube Transcript", result.paragraphs);
  triggerDownload(blob, "transcript.pdf");
};
