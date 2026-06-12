import axios from "axios";

import type { ActionId } from "../../../types/summary";
import { coerceActionItemDocument } from "../../../types/summary";
import type { Format, Language, Length, QuizDifficulty } from "../../../utils/types";
import type { SummaryDocument, TranslateFn } from "./types";
import type {
  ActionItemPostResult,
  ActionItemRequestErrorPayload,
  ActionItemRequestResult,
  ActionItemResponse,
  PostActionItemArgs,
  RequestActionItemArgs,
  SourcePayload,
} from "./types";
import { authInstance } from "../../../services/axiosService";
import {
  anonymousThrottleMessage,
  errorDocument,
  throttleMessage,
} from "./document";

// Generation can outlast authInstance's default 30s timeout, so disable it for this endpoint.
const GENERATION_REQUEST_CONFIG = { timeout: 0 };

const fallbackTranslate: TranslateFn = (key, options) =>
  typeof options?.defaultValue === "string" ? options.defaultValue : key;

const actionItemErrorResult = (
  title: string,
  message: string,
  sourceUrl?: string,
): ActionItemRequestResult => ({
  document: errorDocument(title, message),
  sourceUrl,
  isSuccess: false,
});

export const buildSourceActionRequest = (
  type: ActionId,
  source: SourcePayload,
  extras?: { length?: Length; format?: Format; language?: Language; quizDifficulty?: QuizDifficulty },
): FormData | Record<string, unknown> => {
  const { sourceType, sourceUrl, sourceContent, pdf } = source;
  const { length, format, language, quizDifficulty } = extras ?? {};

  if (pdf) {
    const formData = new FormData();
    formData.append("pdf", new Blob([pdf.bytes], { type: pdf.mimeType }), pdf.filename);
    formData.append("source_url", sourceUrl ?? "");
    formData.append("source_type", sourceType);
    formData.append("type", type);
    if (length) formData.append("length", length);
    if (format) formData.append("format", format);
    if (language) formData.append("language", language);
    if (quizDifficulty) formData.append("quiz_difficulty", quizDifficulty);
    // Axios sets multipart Content-Type with boundary automatically.
    return formData;
  }

  const jsonBody: Record<string, unknown> = {
    type,
    source_content: sourceContent,
    source_url: sourceUrl ?? null,
    source_type: sourceType,
  };
  if (length !== undefined) jsonBody.length = length;
  if (format !== undefined) jsonBody.format = format;
  if (language !== undefined) jsonBody.language = language;
  if (quizDifficulty !== undefined) jsonBody.quiz_difficulty = quizDifficulty;

  return jsonBody;
};

// CSRF injection, CSRF-failure retry, and 401 token refresh are all handled by
// authInstance's interceptors — do not reimplement them here.
const postActionItem = async <TErrorPayload,>({
  type,
  sourcePayload,
  extras,
}: PostActionItemArgs): Promise<ActionItemPostResult<TErrorPayload>> => {
  const data = buildSourceActionRequest(type, sourcePayload, extras);

  try {
    const response = await authInstance.post<ActionItemResponse>(
      "/api/action-item",
      data,
      GENERATION_REQUEST_CONFIG,
    );
    return { ok: true, result: response.data };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        ok: false,
        status: error.response.status,
        errorPayload: (error.response.data ?? null) as TErrorPayload | null,
      };
    }
    // Network-level failure — let the caller map it to a user-facing error.
    throw error;
  }
};

export const requestActionItem = async ({
  language,
  type,
  sourcePayload,
  format,
  length,
  quizDifficulty,
  isAuthenticated = false,
  t,
}: RequestActionItemArgs): Promise<ActionItemRequestResult> => {
  const translate = t ?? fallbackTranslate;

  if (import.meta.env.DEV) {
    const mocks = await import("./mocks");
    if (mocks.isMockActionItemModeEnabled()) {
      const mockByActionId: Record<ActionId, SummaryDocument> = {
        flashcards: mocks.MOCK_FLASHCARDS_DOCUMENT,
        quiz: mocks.MOCK_QUIZ_DOCUMENT,
        summary: mocks.MOCK_SUMMARY_ACTION_ITEM_DOCUMENT,
      };
      return {
        document: mockByActionId[type],
        sourceUrl: sourcePayload.sourceUrl,
        isSuccess: true,
      };
    }
  }

  try {
    const response = await postActionItem<ActionItemRequestErrorPayload>({
      type,
      sourcePayload,
      extras: { language, format, length, quizDifficulty },
    });

    if (!response.ok) {
      if (response.status === 429) {
        const message = isAuthenticated
          ? throttleMessage(response.errorPayload ?? {}, translate)
          : anonymousThrottleMessage(response.errorPayload ?? {}, translate);

        return actionItemErrorResult(
          translate("summaryErrors.rateLimitTitle", { defaultValue: "Rate limit reached" }),
          message,
          sourcePayload.sourceUrl,
        );
      }

      const fallbackMessage =
        response.errorPayload?.message ||
        response.errorPayload?.error ||
        translate("summaryErrors.generateFailed", { defaultValue: "Could not generate action item." });
      if (import.meta.env.DEV) console.error("Action Item Error:", fallbackMessage);
      return actionItemErrorResult(
        translate("summaryErrors.requestFailedTitle", { defaultValue: "Request failed" }),
        fallbackMessage,
        sourcePayload.sourceUrl,
      );
    }

    const result = response.result;
    if (result.isSuccess !== true) {
      return actionItemErrorResult(
        translate("summaryErrors.requestFailedTitle", { defaultValue: "Request failed" }),
        translate("summaryErrors.generateFailed", { defaultValue: "Could not generate action item." }),
        sourcePayload.sourceUrl,
      );
    }

    const document = coerceActionItemDocument(result.content);
    if (!document) {
      return actionItemErrorResult(
        translate("summaryErrors.malformedTitle", { defaultValue: "Malformed response" }),
        translate("summaryErrors.malformedMessage", {
          defaultValue: "The server returned a response that could not be parsed.",
        }),
        sourcePayload.sourceUrl,
      );
    }

    return {
      document,
      sourceUrl: sourcePayload.sourceUrl,
      isSuccess: true,
    };
  } catch (error) {
    if (import.meta.env.DEV) console.error("Fetch Action Item Error:", error);
    return actionItemErrorResult(
      translate("summaryErrors.networkErrorTitle", { defaultValue: "Network error" }),
      translate("summaryErrors.networkErrorMessage", {
        defaultValue: "Could not contact the backend. Please try again.",
      }),
      sourcePayload.sourceUrl,
    );
  }
};
