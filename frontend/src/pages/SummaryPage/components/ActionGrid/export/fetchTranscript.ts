import { getCsrfToken } from "../../../../../services/axiosService";
import type { TranscriptResponse } from "./types";

export const fetchTranscript = async (
  baseUrl: string,
  sourceUrl: string,
  isAuthenticated: boolean,
): Promise<TranscriptResponse> => {
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
      source_type: "youtube",
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      isSuccess: false,
      error: (body as { error?: string })?.error ?? `Export request failed (${response.status}).`,
    };
  }

  return (await response.json()) as TranscriptResponse;
};
