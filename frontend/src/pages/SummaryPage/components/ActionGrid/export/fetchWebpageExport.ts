import axios from "axios";

import { authInstance } from "../../../../../services/axiosService";
import type { TranslateFn } from "../../../utils/types";

export type WebpageExportResponse = {
  isSuccess: boolean;
  pdf_base64?: string;
  error?: string;
};

// CSRF and token refresh are handled by authInstance's interceptors.
// PDF rendering can outlast the instance's default timeout, so disable it here.
export const fetchWebpageExport = async (
  sourceUrl: string,
  sourceHtml: string,
  t: TranslateFn,
): Promise<WebpageExportResponse> => {
  try {
    const response = await authInstance.post<WebpageExportResponse>(
      "/api/action-item",
      {
        type: "export",
        source_url: sourceUrl,
        source_html: sourceHtml,
        source_type: "webpage",
      },
      { timeout: 0 },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const body = error.response.data as { error?: string } | null;
      return {
        isSuccess: false,
        error:
          body?.error ??
          t("exportErrors.requestFailed", {
            status: error.response.status,
            defaultValue: `Export request failed (${error.response.status}).`,
          }),
      };
    }
    throw error;
  }
};
