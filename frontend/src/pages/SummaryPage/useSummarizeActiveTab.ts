import { useCallback, useState } from "react";
import { useHistoryStore, type HistorySummary } from "../../stores/historyStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { GetSummaryPayloadFromStorage, UpdateSummaryStorage } from "../../utils/storage";
import {
  normalizeSummaryActionItems,
  type SummaryActionItem,
} from "../../types/summary";
import { useTranslation } from "react-i18next";
import { useActionItem } from "./useActionItem";
import {
  anonymousThrottleMessage,
  documentToJSONString,
  errorDocument,
  errorResult,
  parseSummaryDocument,
  throttleMessage,
} from "./utils/document";
import { extractTabContent, isYoutube, readErrorBody } from "./utils/sources";
import { isPDF, fetchPdfBytes, PdfFileAccessDeniedError, type PdfPayload } from "./utils/pdf";
import { MOCK_SUMMARY_DOCUMENT, isMockModeEnabled, getMockSourceUrl } from "./utils/mocks";
import { isRestrictedPage, resolveCurrentTab } from "../FrontPage/frontpage.helpers";
import type {
  SourceActionType,
  SourcePayload,
  SourceType,
  SummarizeErrorPayload,
  SummarizeRequestParams,
  SummarizeResult,
  SummaryDocument,
} from "./utils/types";

const serializeSummaryContent = (value: SummaryDocument): string => JSON.stringify(value);

const deserializeSummaryContent = (value: string): SummaryDocument | null => {
  if (!value) return null;
  return parseSummaryDocument(value);
};

const detectSourceType = (url: string | undefined): SourceType => {
  if (isPDF(url)) return "pdf";
  if (isYoutube(url)) return "youtube";
  return "webpage";
};

type PostSummarizeArgs = SummarizeRequestParams & SourcePayload;

export const buildSourceActionRequest = (
  type: SourceActionType,
  source: SourcePayload,
  extras?: { length?: string; format?: string; language?: string },
): { body: BodyInit; headers?: HeadersInit } => {
  const { sourceType, sourceUrl, sourceContent, pdf } = source;
  const { length, format, language } = extras ?? {};

  if (pdf) {
    const formData = new FormData();
    formData.append("pdf", new Blob([pdf.bytes], { type: pdf.mimeType }), pdf.filename);
    formData.append("source_url", sourceUrl ?? "");
    formData.append("source_type", sourceType);
    formData.append("type", type);
    if (length) formData.append("length", length);
    if (format) formData.append("format", format);
    if (language) formData.append("language", language);
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

  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jsonBody),
  };
};

const postSummarize = async ({
  baseUrl,
  sourceType,
  sourceUrl,
  sourceContent,
  pdf,
  length,
  format,
  language,
  isAuthenticated,
  t,
}: PostSummarizeArgs): Promise<SummarizeResult> => {
  const { body, headers } = buildSourceActionRequest(
    "summary",
    { sourceType, sourceUrl, sourceContent, pdf },
    { length, format, language },
  );

  try {
    const response = await fetch(`${baseUrl}/api/action-item`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });

    if (!response.ok) {
      const errorPayload = await readErrorBody<SummarizeErrorPayload>(response);

      if (response.status === 429) {
        const message = isAuthenticated
          ? throttleMessage(errorPayload ?? {}, t)
          : anonymousThrottleMessage(errorPayload ?? {}, t);

        return errorResult(
          t("summaryErrors.rateLimitTitle", { defaultValue: "Rate limit reached" }),
          message,
        );
      }

      const fallbackMessage = errorPayload?.message || "Could not generate a summary right now. Please try again.";
      return errorResult("Request failed", fallbackMessage);
    }

    const result = await response.json() as { content?: unknown; isSuccess?: unknown };
    const hasSummaryData = typeof result?.content === "string" && result.content.trim().length > 0;

    if (!hasSummaryData) {
      return errorResult("Empty response", "The server returned an empty summary.");
    }

    const parsed = parseSummaryDocument(result.content);
    if (!parsed) {
      return errorResult("Malformed response", "The server returned a summary that could not be parsed.");
    }

    // Pass through whatever the server emitted: a successful summary, or an error doc with format: "error".
    // `isSuccess` from the server still gates history-add downstream.
    return {
      json: parsed,
      sourceUrl,
      isSuccess: result?.isSuccess === true,
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return errorResult("Network error", "Could not contact the backend. Please try again.");
  }
};

type ActiveTabSummaryOutcome = {
  result: SummarizeResult;
  payload: SourcePayload | null;
};

const requestActiveTabSummary = async ({
  baseUrl,
  length,
  format,
  language,
  isAuthenticated,
  t,
}: SummarizeRequestParams): Promise<ActiveTabSummaryOutcome> => {
  if (isMockModeEnabled()) {
    const mockSourceUrl = await getMockSourceUrl();
    return {
      result: {
        json: JSON.parse(MOCK_SUMMARY_DOCUMENT),
        sourceUrl: mockSourceUrl,
        isSuccess: true,
      },
      payload: {
        sourceType: "webpage",
        sourceUrl: mockSourceUrl,
        sourceContent: MOCK_SUMMARY_DOCUMENT,
      },
    };
  }

  const tab = await resolveCurrentTab();

  if (!tab?.id) {
    return { result: errorResult("No active tab", "Could not find an active browser tab to summarize."), payload: null };
  }

  if (isRestrictedPage(tab.url)) {
    return {
      result: errorResult(
        "Page not supported",
        "Chrome internal pages (like chrome://settings) cannot be summarized. Open a normal website tab and try again.",
      ),
      payload: null,
    };
  }

  const sourceType = detectSourceType(tab.url);

  // YouTube content is fetched server-side as a transcript, so we skip the DOM scrape.
  let sourceContent = "";
  let pdf: PdfPayload | undefined;

  if (sourceType === "webpage") {
    let tabContent: { text: string } = { text: "" };
    try {
      tabContent = await extractTabContent(tab.id);
    } catch (error) {
      console.error("Script Injection Error:", error);
      return {
        result: errorResult(
          "Cannot summarize this page",
          "This page blocks extension script access. Try another site tab and try again.",
        ),
        payload: null,
      };
    }

    if (!tabContent.text) {
      return { result: errorResult("No readable content", "Could not extract readable text from this page."), payload: null };
    }
    sourceContent = tabContent.text;
  } else if (sourceType === "pdf") {
    try {
      pdf = await fetchPdfBytes(tab);
    } catch (error) {
      console.error("PDF Fetch Error:", error);
      if (error instanceof PdfFileAccessDeniedError) {
        return {
          result: errorResult(
            "Local PDF access blocked",
            "Open chrome://extensions, find Super Simple Summarizer, and enable \"Allow access to file URLs\", then try again.",
          ),
          payload: null,
        };
      }
      return {
        result: errorResult(
          "Could not read PDF",
          "Could not fetch this PDF. Try opening it in a fresh tab and reloading.",
        ),
        payload: null,
      };
    }
  }

  const payload: SourcePayload = { sourceType, sourceUrl: tab.url, sourceContent, pdf };

  const result = await postSummarize({
    baseUrl,
    ...payload,
    length,
    format,
    language,
    isAuthenticated,
    t,
  });

  return { result, payload };
};

export const useSummarizeActiveTab = () => {
  const { t } = useTranslation();
  const [summarizedContent, setSummarizedContent] = useState<SummaryDocument | null>(
    () => deserializeSummaryContent(GetSummaryPayloadFromStorage().html),
  );
  const [currentSourceUrl, setCurrentSourceUrl] = useState<string | null>(() => GetSummaryPayloadFromStorage().sourceUrl);
  const [initialActionItems] = useState<SummaryActionItem[]>(() => GetSummaryPayloadFromStorage().actionItems);
  const [isSummarySuccess, setIsSummarySuccess] = useState<boolean>(() => GetSummaryPayloadFromStorage().isSuccess);
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const currency = useSettingsStore((state) => state.currency);
  const userProfile = useAuthProfileStore((state) => state.profile);
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile);
  const addSummaryToHistory = useHistoryStore((state) => state.addSummary);
  const updateSummaryActionItems = useHistoryStore((state) => state.updateSummaryActionItems);

  const [sourcePayload, setSourcePayload] = useState<SourcePayload | null>(null);

  const persistSummaryPayload = useCallback(
    (
      content: SummaryDocument,
      sourceUrl: string | null,
      nextActionItems: SummaryActionItem[],
      isSuccess: boolean,
    ) => {
      UpdateSummaryStorage(serializeSummaryContent(content), sourceUrl, nextActionItems, isSuccess);
      if (sourceUrl) {
        updateSummaryActionItems(sourceUrl, content.format, nextActionItems);
      }
    },
    [updateSummaryActionItems],
  );

  const {
    actionItems,
    setActionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
    resetActionItemRequestState,
  } = useActionItem({
    baseUrl: import.meta.env.VITE_BASE_URL,
    language,
    sourcePayload,
    initialActionItems,
    onActionItemsChange: (nextActionItems) => {
      if (summarizedContent !== null) {
        persistSummaryPayload(summarizedContent, currentSourceUrl, nextActionItems, isSummarySuccess);
      }
    },
    onActionItemSuccess: () => {
      if (userProfile) {
        void hydrateProfile(true, currency);
      }
    },
  });

  const summarize = useCallback(
    async () => {
      resetActionItemRequestState();
      setSummarizedContent(null);
      setCurrentSourceUrl(null);
      setActionItems([]);
      setIsSummarySuccess(false);
      setSourcePayload(null);

      const { result, payload } = await requestActiveTabSummary({
        baseUrl: import.meta.env.VITE_BASE_URL,
        length,
        format,
        language,
        isAuthenticated: Boolean(userProfile),
        t,
      });

      const nextSourceUrl = result.sourceUrl ?? null;
      const serializedContent = serializeSummaryContent(result.json);
      setSummarizedContent(result.json);
      setCurrentSourceUrl(nextSourceUrl);
      setIsSummarySuccess(result.isSuccess);
      UpdateSummaryStorage(serializedContent, nextSourceUrl, [], result.isSuccess);

      if (result.isSuccess) {
        setSourcePayload(payload);
      }

      if (result.isSuccess && result.sourceUrl) {
        addSummaryToHistory({
          url: result.sourceUrl,
          format: result.json.format,
          document_content: result.json,
          json_content: documentToJSONString(result.json),
          actionItems: [],
          isSuccess: true,
        });
      }

      if (result.isSuccess && userProfile) {
        void hydrateProfile(true, currency);
      }

      return result;
    },
    [addSummaryToHistory, currency, format, hydrateProfile, language, length, resetActionItemRequestState, setActionItems, t, userProfile],
  );

  const setSummaryFromHistory = useCallback((historyItem: HistorySummary) => {
    resetActionItemRequestState();
    const historyActionItems = normalizeSummaryActionItems(historyItem.actionItems);
    const historyIsSuccess = historyItem.isSuccess !== false;
    const parsedContent = deserializeSummaryContent(historyItem.json_content)
      ?? errorDocument(
        "Summary unavailable",
        "This summary is from an older version and cannot be displayed. Please re-summarize the page.",
      );
    setSummarizedContent(parsedContent);
    setCurrentSourceUrl(historyItem.url);
    setActionItems(historyActionItems);
    setIsSummarySuccess(historyIsSuccess);
    setSourcePayload(null);
    UpdateSummaryStorage(serializeSummaryContent(parsedContent), historyItem.url, historyActionItems, historyIsSuccess);
  }, [resetActionItemRequestState, setActionItems]);

  return {
    summarizedContent,
    isSummarySuccess,
    actionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
    summarize,
    setSummaryFromHistory,
    canGenerateActionItems: sourcePayload !== null,
  };
};
