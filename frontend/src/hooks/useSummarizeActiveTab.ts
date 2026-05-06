import { useCallback, useState } from "react";
import { buildErrorSummaryHtml, buildThrottleMessage } from "../services/summaryMessages";
import { useHistoryStore, type HistorySummary } from "../stores/historyStore";
import { useSettingsStore } from "../stores/settingsStore";
import { GetSummaryFromStorage, UpdateSummaryStorage } from "../utils/storage";
import { Format, Language, Length } from "../utils/types";

type SummarizeRequestParams = {
  baseUrl: string;
  length: Length;
  regenerate: boolean;
  format: Format;
  language: Language;
};

export type SummarizeResult = {
  html: string;
  sourceUrl?: string;
  isError: boolean;
};

type SummarizeErrorPayload = {
  message?: string;
  summaries_limit?: number;
  limit_period?: string;
  retry_after_seconds?: number;
};

const MOCK_SUMMARY_HTML = `
  <h1>Development Mock Summary</h1>
  <p>This is a <strong>simulated response</strong> to help you style your UI without calling Gemini.</p>
  <ul>
    <li><strong>Cost:</strong> $0.00 (Local)</li>
    <li><strong>Speed:</strong> Instant</li>
    <li><strong>Format:</strong> Matches your production HTML</li>
  </ul>
  <p>Check out <a href="https://google.com" target="_blank" rel="noopener">this test link</a> to see if your link styles work.</p>
`;

const MOCK_SOURCE_URL_PREFIX = "mock://dev-summary";

const isRestrictedPage = (url?: string) => {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.startsWith("chrome-extension://")
  );
};

const isMockModeEnabled = () =>
  import.meta.env.DEV ||
  import.meta.env.VITE_DEV === "true" ||
  import.meta.env.VITE_USE_MOCK_SUMMARY === "true";

const queryTabsSafe = async (
  queryInfo: chrome.tabs.QueryInfo,
): Promise<chrome.tabs.Tab[]> => {
  try {
    return await chrome.tabs.query(queryInfo);
  } catch {
    return [];
  }
};

const resolveTargetTab = async (): Promise<chrome.tabs.Tab | null> => {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return null;
  }

  const normalWindowQueries: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true, windowType: "normal" },
    { active: true, lastFocusedWindow: true, windowType: "normal" },
    { active: true, windowType: "normal" },
  ];

  for (const queryInfo of normalWindowQueries) {
    const tabs = await queryTabsSafe(queryInfo);
    const supportedTab = tabs.find((tab) => tab.id && !isRestrictedPage(tab.url));
    if (supportedTab) {
      return supportedTab;
    }
  }

  const [currentTab] = await queryTabsSafe({ active: true, currentWindow: true });
  return currentTab ?? null;
};

const getActiveTabUrlIfAvailable = async () => {
  const tab = await resolveTargetTab();
  return tab?.url ?? null;
};

const getMockSourceUrl = async () => {
  const tabUrl = await getActiveTabUrlIfAvailable();
  if (tabUrl && !isRestrictedPage(tabUrl)) {
    return tabUrl;
  }

  return `${MOCK_SOURCE_URL_PREFIX}/${Date.now()}`;
};

type TabContentPayload = {
  text: string;
};

const emptyTabContent = (): TabContentPayload => ({ text: "" });

const extractTabContent = async (tabId: number): Promise<TabContentPayload> => {
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const rootElement = (document.querySelector("article, main") || document.body) as HTMLElement;
      const normalizeText = (value: string) => value.replace(/\s\s+/g, " ").trim();

      const text = normalizeText(rootElement?.innerText || document.body.innerText || "").slice(0, 10000);

      return {
        text,
      };
    },
  });

  const payload = injectionResults?.[0]?.result as { text?: unknown } | undefined;
  if (!payload || typeof payload.text !== "string") {
    return emptyTabContent();
  }

  return { text: payload.text };
};

const getErrorPayload = async (response: Response): Promise<SummarizeErrorPayload | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestActiveTabSummary = async ({
  baseUrl,
  length,
  regenerate,
  format,
  language,
}: SummarizeRequestParams): Promise<SummarizeResult> => {
  if (isMockModeEnabled()) {
    return {
      html: MOCK_SUMMARY_HTML,
      sourceUrl: await getMockSourceUrl(),
      isError: false,
    };
  }

  const tab = await resolveTargetTab();
  if (!tab?.id) {
    return {
      html: buildErrorSummaryHtml("No active tab", "Could not find an active browser tab to summarize."),
      isError: true,
    };
  }

  if (isRestrictedPage(tab.url)) {
    return {
      html: buildErrorSummaryHtml(
        "Page not supported",
        "Chrome internal pages (like chrome://settings) cannot be summarized. Open a normal website tab and try again.",
      ),
      isError: true,
    };
  }

  let tabContent = emptyTabContent();
  try {
    tabContent = await extractTabContent(tab.id);
  } catch (error) {
    console.log("Script Injection Error:", error);
    return {
      html: buildErrorSummaryHtml(
        "Cannot summarize this page",
        "This page blocks extension script access. Try another site tab and try again.",
      ),
      isError: true,
    };
  }

  if (!tabContent.text) {
    return {
      html: buildErrorSummaryHtml("No readable content", "Could not extract readable text from this page."),
      isError: true,
    };
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
        regenerate,
        format,
        language,
      }),
    });

    if (!response.ok) {
      const errorPayload = await getErrorPayload(response);

      if (response.status === 429) {
        return {
          html: buildErrorSummaryHtml("Rate limit reached", buildThrottleMessage(errorPayload ?? {})),
          isError: true,
        };
      }

      const fallbackMessage = errorPayload?.message || "Could not generate a summary right now. Please try again.";
      return {
        html: buildErrorSummaryHtml("Request failed", fallbackMessage),
        isError: true,
      };
    }

    const result = await response.json();
    if (!result?.data) {
      return {
        html: buildErrorSummaryHtml("Empty response", "The server returned an empty summary."),
        isError: true,
      };
    }

    return {
      html: result.data,
      sourceUrl: tab.url,
      isError: false,
    };
  } catch (error) {
    console.log("Fetch Error:", error);
    return {
      html: buildErrorSummaryHtml("Network error", "Could not contact the backend. Please try again."),
      isError: true,
    };
  }
};

export const useSummarizeActiveTab = () => {
  const [summarizedContent, setSummarizedContent] = useState<string | null>(GetSummaryFromStorage());
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const addSummaryToHistory = useHistoryStore((state) => state.addSummary);

  const summarize = useCallback(
    async (regenerate: boolean) => {
      setSummarizedContent(null);

      const result = await requestActiveTabSummary({
        baseUrl: import.meta.env.VITE_BASE_URL,
        length,
        regenerate,
        format,
        language,
      });

      setSummarizedContent(result.html);
      UpdateSummaryStorage(result.html);

      if (!result.isError && result.sourceUrl) {
        addSummaryToHistory({
          url: result.sourceUrl,
          content: result.html,
        });
      }

      return result;
    },
    [addSummaryToHistory, format, language, length],
  );

  const setSummaryFromHistory = useCallback((historyItem: HistorySummary) => {
    setSummarizedContent(historyItem.content);
    UpdateSummaryStorage(historyItem.content);
  }, []);

  return {
    summarizedContent,
    summarize,
    setSummaryFromHistory,
  };
};
