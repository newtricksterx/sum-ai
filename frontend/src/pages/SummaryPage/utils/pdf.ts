export type PdfPayload = {
  bytes: Uint8Array<ArrayBuffer>;
  filename: string;
  mimeType: "application/pdf";
};

const derivePdfFilename = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop();
    if (last && last.toLowerCase().endsWith(".pdf")) {
      return decodeURIComponent(last);
    }
  } catch {
    // ignore — fall through to default
  }
  return "document.pdf";
};

const base64ToUint8Array = (base64: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const fetchPdfPayload = async (url: string, filename: string): Promise<PdfPayload> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not read PDF (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), filename, mimeType: "application/pdf" };
};

// Sentinel error so the caller can show a "toggle file:// access" hint.
export class PdfFileAccessDeniedError extends Error {
  constructor() {
    super("file:// PDFs require enabling 'Allow access to file URLs' for the extension.");
    this.name = "PdfFileAccessDeniedError";
  }
}

export const fetchPdfBytes = async (tab: chrome.tabs.Tab): Promise<PdfPayload> => {
  const url = tab.url;
  if (!url) {
    throw new Error("Active tab has no URL.");
  }
  const filename = derivePdfFilename(url);

  if (url.startsWith("file://")) {
    try {
      return await fetchPdfPayload(url, filename);
    } catch {
      throw new PdfFileAccessDeniedError();
    }
  }

  try {
    return await fetchPdfPayload(url, filename);
  } catch (error) {
    console.warn("Extension-context PDF fetch failed; falling back to page-context fetch.", error);
  }

  // For http(s), fetch from the page's own context so we don't need <all_urls> host permission.
  if (typeof tab.id !== "number") {
    throw new Error("Active tab has no id.");
  }
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async () => {
      try {
        const response = await fetch(window.location.href);
        if (!response.ok) {
          return { ok: false as const, status: response.status };
        }
        const blob = await response.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        return { ok: true as const, dataUrl };
      } catch {
        return { ok: false as const, status: 0 };
      }
    },
  });

  const payload = injection?.result;
  if (!payload || !payload.ok) {
    const status = payload?.status ?? 0;
    throw new Error(status ? `PDF fetch failed (${status}).` : "PDF fetch failed.");
  }

  const commaIndex = payload.dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("PDF fetch returned an unexpected payload.");
  }
  const bytes = base64ToUint8Array(payload.dataUrl.slice(commaIndex + 1));
  return { bytes, filename, mimeType: "application/pdf" };
};

export const isPDF = (url: string | undefined): boolean => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes(".pdf?") ||
    lowerUrl.includes(".pdf#")
  );
};
