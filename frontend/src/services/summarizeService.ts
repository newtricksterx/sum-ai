import { Format, Language, Length } from "../utils/types";
import { buildErrorSummaryHtml, buildThrottleMessage } from "./summaryMessages";

type SummarizeServiceParams = {
  baseUrl: string;
  length: Length;
  regenerate: boolean;
  format: Format;
  language: Language;
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

const extractTabText = async (tabId: number) => {
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const article = document.querySelector("article") || document.querySelector("main");
      const text = article ? article.innerText : document.body.innerText;
      return text.replace(/\s\s+/g, " ").trim().slice(0, 10000);
    },
  });

  return injectionResults?.[0]?.result ?? "";
};

const getErrorPayload = async (response: Response): Promise<SummarizeErrorPayload | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const summarizeActiveTab = async ({
  baseUrl,
  length,
  regenerate,
  format,
  language,
}: SummarizeServiceParams): Promise<string> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return buildErrorSummaryHtml("No active tab", "Could not find an active browser tab to summarize.");
  }

  if (isRestrictedPage(tab.url)) {
    return buildErrorSummaryHtml(
      "Page not supported",
      "Chrome internal pages (like chrome://settings) cannot be summarized. Open a normal website tab and try again."
    );
  }

  if (import.meta.env.VITE_DEV === "true") {
    return MOCK_SUMMARY_HTML;
  }

  let pageText = "";
  try {
    pageText = await extractTabText(tab.id);
  } catch (error) {
    console.log("Script Injection Error:", error);
    return buildErrorSummaryHtml(
      "Cannot summarize this page",
      "This page blocks extension script access. Try another site tab and try again."
    );
  }

  if (!pageText) {
    return buildErrorSummaryHtml("No readable content", "Could not extract readable text from this page.");
  }

  try {
    const response = await fetch(`${baseUrl}/api/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: pageText,
        length,
        regenerate,
        format,
        language,
      }),
    });

    if (!response.ok) {
      const errorPayload = await getErrorPayload(response);

      if (response.status === 429) {
        return buildErrorSummaryHtml("Rate limit reached", buildThrottleMessage(errorPayload ?? {}));
      }

      const fallbackMessage = errorPayload?.message || "Could not generate a summary right now. Please try again.";
      return buildErrorSummaryHtml("Request failed", fallbackMessage);
    }

    const result = await response.json();
    if (!result?.data) {
      return buildErrorSummaryHtml("Empty response", "The server returned an empty summary.");
    }

    return result.data;
  } catch (error) {
    console.log("Fetch Error:", error);
    return buildErrorSummaryHtml("Network error", "Could not contact the backend. Please try again.");
  }
};
