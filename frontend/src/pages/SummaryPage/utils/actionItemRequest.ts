import type { ActionId } from "../../../types/summary";
import { coerceActionItemDocument } from "../../../types/summary";
import type { Format, Language, Length, QuizDifficulty } from "../../../utils/types";
import type { SummaryDocument } from "./types";
import type {
  ActionItemPostResult,
  ActionItemRequestErrorPayload,
  ActionItemRequestResult,
  ActionItemResponse,
  PostActionItemArgs,
  RequestActionItemArgs,
  SourcePayload,
} from "./types";
import {
  MOCK_FLASHCARDS_DOCUMENT,
  MOCK_QUIZ_DOCUMENT,
  MOCK_SUMMARY_ACTION_ITEM_DOCUMENT,
  isMockActionItemModeEnabled,
} from "./mocks";
import { readErrorBody } from "./sources";
import {
  anonymousThrottleMessage,
  errorDocument,
  throttleMessage,
} from "./document";

const DEBUG_ERROR_MESSAGE = false

const MOCK_BY_ACTION_ID: Record<ActionId, SummaryDocument> = {
  flashcards: MOCK_FLASHCARDS_DOCUMENT,
  quiz: MOCK_QUIZ_DOCUMENT,
  summary: MOCK_SUMMARY_ACTION_ITEM_DOCUMENT,
};

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
): { body: BodyInit; headers?: HeadersInit } => {
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
    // Browser sets multipart Content-Type with boundary automatically.
    return { body: formData };
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

  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jsonBody),
  };
};

const postActionItem = async <TErrorPayload,>({
  baseUrl,
  type,
  sourcePayload,
  extras,
}: PostActionItemArgs): Promise<ActionItemPostResult<TErrorPayload>> => {
  const { body, headers } = buildSourceActionRequest(type, sourcePayload, extras);
  const response = await fetch(`${baseUrl}/api/action-item`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorPayload: await readErrorBody<TErrorPayload>(response),
    };
  }

  return {
    ok: true,
    result: (await response.json()) as ActionItemResponse,
  };
};

export const requestActionItem = async ({
  baseUrl,
  language,
  type,
  sourcePayload,
  format,
  length,
  quizDifficulty,
  isAuthenticated = false,
  t,
}: RequestActionItemArgs): Promise<ActionItemRequestResult> => {
  if (isMockActionItemModeEnabled()) {
    if (DEBUG_ERROR_MESSAGE){
      return {
        document: null,
        sourceUrl: sourcePayload.sourceUrl,
        isSuccess: false,
      }
    }

    return {
      document: MOCK_BY_ACTION_ID[type],
      sourceUrl: sourcePayload.sourceUrl,
      isSuccess: true,
    };
  }

  try {
    const response = await postActionItem<ActionItemRequestErrorPayload>({
      baseUrl,
      type,
      sourcePayload,
      extras: { language, format, length, quizDifficulty },
    });

    if (!response.ok) {
      if (response.status === 429 && t) {
        const message = isAuthenticated
          ? throttleMessage(response.errorPayload ?? {}, t)
          : anonymousThrottleMessage(response.errorPayload ?? {}, t);

        return actionItemErrorResult(
          t("summaryErrors.rateLimitTitle", { defaultValue: "Rate limit reached" }),
          message,
          sourcePayload.sourceUrl,
        );
      }

      const fallbackMessage =
        response.errorPayload?.message || response.errorPayload?.error || "Could not generate action item.";
      console.error("Action Item Error:", fallbackMessage);
      return actionItemErrorResult("Request failed", fallbackMessage, sourcePayload.sourceUrl);
    }

    const result = response.result;
    if (result.isSuccess !== true) {
      return actionItemErrorResult(
        "Request failed",
        "Could not generate action item",
        sourcePayload.sourceUrl,
      );
    }

    const document = coerceActionItemDocument(result.content);
    if (!document) {
      return actionItemErrorResult(
        "Malformed response",
        "The server returned a response that could not be parsed.",
        sourcePayload.sourceUrl,
      );
    }

    return {
      document,
      sourceUrl: sourcePayload.sourceUrl,
      isSuccess: true,
    };
  } catch (error) {
    console.error("Fetch Action Item Error:", error);
    return actionItemErrorResult(
      "Network error",
      "Could not contact the backend. Please try again.",
      sourcePayload.sourceUrl,
    );
  }
};
