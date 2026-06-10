import { getCsrfToken } from "../../../../../services/axiosService";

export type WebpageExportResponse = {
  isSuccess: boolean;
  pdf_base64?: string;
  error?: string;
};

export const fetchWebpageExport = async (
  baseUrl: string,
  sourceUrl: string,
  sourceHtml: string,
  isAuthenticated: boolean,
): Promise<WebpageExportResponse> => {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  if (isAuthenticated) {
    const token = await getCsrfToken();
    (headers as Record<string, string>)["X-CSRFToken"] = token;
  }

  const response = await fetch(`${baseUrl}/api/action-item`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      type: "export",
      source_url: sourceUrl,
      source_html: sourceHtml,
      source_type: "webpage",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      isSuccess: false,
      error: (body as { error?: string })?.error ?? `Export request failed (${response.status}).`,
    };
  }

  return (await response.json()) as WebpageExportResponse;
};
