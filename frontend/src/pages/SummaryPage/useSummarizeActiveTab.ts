import { useCallback, useState } from "react";
import { buildAnonymousThrottleMessage, buildThrottleMessage } from "./summaryMessages";
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
  SummarizeRequestParams,
  SummarizeResult,
  MOCK_SUMMARY_HTML,
  isMockModeEnabled,
  getMockSourceUrl,
  emptyTabContent,
  extractTabContent,
  getErrorPayload,
  returnError,
} from "./utils/summarypage.utils";
import { isRestrictedPage, resolveCurrentTab } from "../FrontPage/frontpage.helpers";

const requestActiveTabSummary = async ({
  baseUrl,
  length,
  format,
  language,
  isAuthenticated,
  t,
}: SummarizeRequestParams): Promise<SummarizeResult> => {
  if (isMockModeEnabled()) {
    return {
      html: MOCK_SUMMARY_HTML,
      sourceUrl: await getMockSourceUrl(),
      isSuccess: true,
    };
  }

  const tab = await resolveCurrentTab();
  if (!tab?.id) {
    return returnError("No active tab", "Could not find an active browser tab to summarize.");
  }

  if (isRestrictedPage(tab.url)) {
    return returnError(
      "Page not supported",
      "Chrome internal pages (like chrome://settings) cannot be summarized. Open a normal website tab and try again.",
    );
  }

  let tabContent = emptyTabContent();
  try {
    tabContent = await extractTabContent(tab.id);
  } catch (error) {
    console.error("Script Injection Error:", error);
    return returnError(
      "Cannot summarize this page",
      "This page blocks extension script access. Try another site tab and try again.",
    );
  }

  if (!tabContent.text) {
    return returnError("No readable content", "Could not extract readable text from this page.");
  }

  try {
    const response = await fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: tabContent.text,
        source_url: tab.url ?? null,
        length,
        format,
        language,
      }),
    });

    if (!response.ok) {
      const errorPayload = await getErrorPayload(response);

      if (response.status === 429) {
        const throttleMessage = isAuthenticated
          ? buildThrottleMessage(errorPayload ?? {}, t)
          : buildAnonymousThrottleMessage(errorPayload ?? {}, t);

        return returnError(
          t("summaryErrors.rateLimitTitle", { defaultValue: "Rate limit reached" }),
          throttleMessage,
        );
      }

      const fallbackMessage = errorPayload?.message || "Could not generate a summary right now. Please try again.";
      return returnError("Request failed", fallbackMessage);
    }

    const result = await response.json() as { data?: unknown; isSuccess?: unknown };
    const hasSummaryData = typeof result?.data === "string" && result.data.trim().length > 0;
    if (!hasSummaryData || result?.isSuccess !== true) {
      return returnError("Empty response", "The server returned an empty summary.");
    }

    return {
      html: result.data as string,
      sourceUrl: tab.url,
      isSuccess: true,
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return returnError("Network error", "Could not contact the backend. Please try again.");
  }
};

export const useSummarizeActiveTab = () => {
  const { t } = useTranslation();
  const [summarizedContent, setSummarizedContent] = useState<string | null>(() => GetSummaryPayloadFromStorage().html);
  const [currentSourceUrl, setCurrentSourceUrl] = useState<string | null>(() => GetSummaryPayloadFromStorage().sourceUrl);
  const [initialActionItems] = useState<SummaryActionItem[]>(() => GetSummaryPayloadFromStorage().actionItems);
  const [isSummarySuccess, setIsSummarySuccess] = useState<boolean>(() => GetSummaryPayloadFromStorage().isSuccess);
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const userProfile = useAuthProfileStore((state) => state.profile);
  const addSummaryToHistory = useHistoryStore((state) => state.addSummary);
  const updateSummaryActionItems = useHistoryStore((state) => state.updateSummaryActionItems);

  const persistSummaryPayload = useCallback(
    (html: string, sourceUrl: string | null, nextActionItems: SummaryActionItem[], isSuccess: boolean) => {
      UpdateSummaryStorage(html, sourceUrl, nextActionItems, isSuccess);
      if (sourceUrl) {
        updateSummaryActionItems(sourceUrl, nextActionItems);
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
    summarizedContent,
    initialActionItems,
    onActionItemsChange: (nextActionItems) => {
      if (summarizedContent !== null) {
        persistSummaryPayload(summarizedContent, currentSourceUrl, nextActionItems, isSummarySuccess);
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

      const result = await requestActiveTabSummary({
        baseUrl: import.meta.env.VITE_BASE_URL,
        length,
        format,
        language,
        isAuthenticated: Boolean(userProfile),
        t,
      });

      const nextSourceUrl = result.sourceUrl ?? null;
      setSummarizedContent(result.html);
      setCurrentSourceUrl(nextSourceUrl);
      setIsSummarySuccess(result.isSuccess);
      UpdateSummaryStorage(result.html, nextSourceUrl, [], result.isSuccess);

      if (result.isSuccess && result.sourceUrl) {
        addSummaryToHistory({
          url: result.sourceUrl,
          content: result.html,
          actionItems: [],
          isSuccess: true,
        });
      }

      return result;
    },
    [addSummaryToHistory, format, language, length, resetActionItemRequestState, setActionItems, t, userProfile],
  );

  const setSummaryFromHistory = useCallback((historyItem: HistorySummary) => {
    resetActionItemRequestState();
    const historyActionItems = normalizeSummaryActionItems(historyItem.actionItems);
    const historyIsSuccess = historyItem.isSuccess !== false;
    setSummarizedContent(historyItem.content);
    setCurrentSourceUrl(historyItem.url);
    setActionItems(historyActionItems);
    setIsSummarySuccess(historyIsSuccess);
    UpdateSummaryStorage(historyItem.content, historyItem.url, historyActionItems, historyIsSuccess);
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
  };
};
