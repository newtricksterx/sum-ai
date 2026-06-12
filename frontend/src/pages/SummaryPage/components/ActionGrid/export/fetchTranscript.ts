import axios from "axios";

import { authInstance } from "../../../../../services/axiosService";
import type { TranslateFn } from "../../../utils/types";
import type { TranscriptResponse } from "./types";

// CSRF and token refresh are handled by authInstance's interceptors.
// Transcript extraction can outlast the instance's default timeout, so disable it here.
export const fetchTranscript = async (
  sourceUrl: string,
  t: TranslateFn,
): Promise<TranscriptResponse> => {
  try {
    const response = await authInstance.post<TranscriptResponse>(
      "/api/action-item",
      {
        type: "export",
        source_url: sourceUrl,
        source_type: "youtube",
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
