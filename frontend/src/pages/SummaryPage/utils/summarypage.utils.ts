import { Format, Language, Length } from "../../../utils/types";
import { isRestrictedPage, resolveCurrentTab } from "../../FrontPage/frontpage.helpers";
import { buildErrorSummaryHtml } from ".././summaryMessages";

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type SummarizeRequestParams = {
  baseUrl: string;
  length: Length;
  format: Format;
  language: Language;
  isAuthenticated: boolean;
  t: TranslateFn;
};

export type SummarizeResult = {
  html: string;
  sourceUrl?: string;
  isSuccess: boolean;
};

export type SummarizeErrorPayload = {
  message?: string;
  summaries_limit?: number;
  limit_period?: string;
  retry_after_seconds?: number;
};

export const MOCK_SUMMARY_HTML = `
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

export const MOCK_SOURCE_URL_PREFIX = "mock://dev-summary";

export const isMockModeEnabled = () =>
  import.meta.env.DEV ||
  import.meta.env.VITE_DEV === "true" ||
  import.meta.env.VITE_USE_MOCK_SUMMARY === "true";

export const getMockSourceUrl = async () => {
  const tab = await resolveCurrentTab();
  if (tab?.url && !isRestrictedPage(tab.url)) {
    return tab.url;
  }
  return `${MOCK_SOURCE_URL_PREFIX}/${Date.now()}`;
};

type TabContentPayload = {
  text: string;
};

export const emptyTabContent = (): TabContentPayload => ({ text: "" });

export const extractTabContent = async (tabId: number): Promise<TabContentPayload> => {
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const rootElement = (document.querySelector("article, main") || document.body) as HTMLElement;
      const normalizeText = (value: string) => value.replace(/\s\s+/g, " ").trim();
      const text = normalizeText(rootElement?.innerText || document.body.innerText || "").slice(0, 10000);
      return { text };
    },
  });

  const payload = injectionResults?.[0]?.result as { text?: unknown } | undefined;
  if (!payload || typeof payload.text !== "string") {
    return emptyTabContent();
  }

  return { text: payload.text };
};

export const getErrorPayload = async (response: Response): Promise<SummarizeErrorPayload | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const returnError = (title: string, message: string): SummarizeResult => ({
  html: buildErrorSummaryHtml(title, message),
  isSuccess: false,
});