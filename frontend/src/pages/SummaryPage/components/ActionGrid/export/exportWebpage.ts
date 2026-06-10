import { fetchWebpageExport } from "./fetchWebpageExport";
import { triggerDownload } from "./triggerDownload";

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const exportWebpage = async (
  sourceUrl: string,
  sourceHtml: string,
  title: string,
  baseUrl: string,
  isAuthenticated: boolean,
): Promise<void> => {
  const result = await fetchWebpageExport(baseUrl, sourceUrl, sourceHtml, isAuthenticated);

  if (!result.isSuccess || !result.pdf_base64) {
    throw new Error(result.error ?? "Could not generate PDF from this webpage.");
  }

  const bytes = base64ToUint8Array(result.pdf_base64);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const filename = `${(title || "Webpage Export").slice(0, 60).replace(/[^a-zA-Z0-9 _-]/g, "")}.pdf`;
  triggerDownload(blob, filename);
};
