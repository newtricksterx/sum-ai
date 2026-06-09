import { fetchPdfBytes } from "../../../utils/pdf";
import { triggerDownload } from "./triggerDownload";

export const exportPdf = async (tab: chrome.tabs.Tab): Promise<void> => {
  const payload = await fetchPdfBytes(tab);
  const blob = new Blob([payload.bytes], { type: payload.mimeType });
  triggerDownload(blob, payload.filename);
};
