import { useCallback, useState } from "react";
import { buildAnonymousThrottleMessage, buildErrorSummaryHtml, buildThrottleMessage } from "./summaryMessages";
import { useHistoryStore, type HistorySummary } from "../../stores/historyStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { GetSummaryFromStorage, UpdateSummaryStorage } from "../../utils/storage";
import { Format, Language, Length } from "../../utils/types";
import { useTranslation } from "react-i18next";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type SummarizeRequestParams = {
  baseUrl: string;
  length: Length;
  regenerate: boolean;
  format: Format;
  language: Language;
  isAuthenticated: boolean;
  t: TranslateFn;
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
  <h1 class="summary-title">Development Mock Summary</h1>
  <p class="summary-meta">
    <time datetime="2026-05-08T00:00:00.000Z">May 8, 2026</time>
    <span class="sep"></span>
    <span>4 min read</span>
  </p>

  <h2>TL;DR</h2>
  <p>
    <strong>Mock mode is active</strong>, so this summary is generated locally to validate all summary UI states.
    Visit <a href="https://example.com">Example</a> for a safe link test and <em>visual emphasis</em>.
  </p>

  <h2>Key Points</h2>
  <ul>
    <li><strong>Typography:</strong> Headings, body text, emphasis, and spacing scale are visible.</li>
    <li><strong>Links:</strong> Hover, visited, and focus styling can be tested safely.</li>
    <li>
      <strong>Nested lists:</strong> This item contains a sub-list.
      <ul>
        <li>Nested bullet one</li>
        <li>Nested bullet two</li>
      </ul>
    </li>
  </ul>

  <h2>Style Coverage</h2>
  <p>This section exists specifically to validate <strong>h2 styling</strong> in development mock mode.</p>

  <h3>Ordered Checklist</h3>
  <ol>
    <li>Generate summary in mock mode.</li>
    <li>Switch light and dark theme.</li>
    <li>Verify responsive behavior on small width.</li>
  </ol>

  <h4>Inline Content Samples</h4>
  <p>
    Use <code>regenerate=true</code> when testing repeated runs.
    This line checks inline <strong>bold</strong>, <em>italic</em>, and link color:
    <a href="https://developer.mozilla.org">MDN</a>.
  </p>

  <blockquote>
    <p>Design should feel calm, readable, and consistent with the rest of the app.</p>
    <cite>Summary.AI Mock Note</cite>
  </blockquote>

  <h3>Code Block</h3>
  <pre><code>const options = {
  format: "bullet-point",
  length: "medium",
  language: "english",
};</code></pre>

  <hr />

  <h3>Table Preview</h3>
  <table>
    <thead>
      <tr>
        <th>Plan</th>
        <th>Daily Limit</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Free</td>
        <td>5 summaries</td>
        <td>Active</td>
      </tr>
      <tr>
        <td>Pro</td>
        <td>Unlimited</td>
        <td>Preview</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-empty">
    <span class="empty-icon">○</span>
    <div class="empty-label">Empty State Preview</div>
    <div class="empty-hint">Use this to validate no-content styling.</div>
  </div>

  <div class="summary-loading">
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-meta"></div>
    <div class="skeleton skeleton-w-full"></div>
    <div class="skeleton skeleton-w-11"></div>
    <div class="skeleton skeleton-w-9"></div>
    <div class="skeleton skeleton-w-7"></div>
    <div class="skeleton skeleton-w-half"></div>
  </div>
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
  isAuthenticated,
  t,
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
        const throttleMessage = isAuthenticated
          ? buildThrottleMessage(errorPayload ?? {}, t)
          : buildAnonymousThrottleMessage(errorPayload ?? {}, t);

        return {
          html: buildErrorSummaryHtml(
            t("summaryErrors.rateLimitTitle", { defaultValue: "Rate limit reached" }),
            throttleMessage,
          ),
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
  const { t } = useTranslation();
  const [summarizedContent, setSummarizedContent] = useState<string | null>(GetSummaryFromStorage());
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const userProfile = useAuthProfileStore((state) => state.profile);
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
        isAuthenticated: Boolean(userProfile),
        t,
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
    [addSummaryToHistory, format, language, length, t, userProfile],
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
