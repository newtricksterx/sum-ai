import type { TranslateFn } from "../../../utils/types";
import { fetchTranscript } from "./fetchTranscript";
import { buildTranscriptPdf } from "./pdfBuilder";
import { triggerDownload } from "./triggerDownload";

export const exportYoutube = async (
  sourceUrl: string,
  t: TranslateFn,
): Promise<void> => {
  const result = await fetchTranscript(sourceUrl, t);

  if (!result.isSuccess || !result.paragraphs) {
    throw new Error(
      result.error ??
        t("exportErrors.transcriptFailed", { defaultValue: "Could not fetch transcript for this video." }),
    );
  }

  const blob = await buildTranscriptPdf("YouTube Transcript", result.paragraphs);
  triggerDownload(blob, "transcript.pdf");
};
