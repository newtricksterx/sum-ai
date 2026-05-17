export const isRestrictedPage = (url?: string) => {
  if (!url) return true;
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:") ||
    url.startsWith("chrome-extension://")
  );
};

export const queryTabsSafe = async (queryInfo: chrome.tabs.QueryInfo) => {
  try {
    return await chrome.tabs.query(queryInfo);
  } catch {
    return [];
  }
};

export const resolveCurrentTab = async () => {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) {
    return null;
  }

  const queries: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true, windowType: "normal" },
    { active: true, lastFocusedWindow: true, windowType: "normal" },
    { active: true, windowType: "normal" },
  ];

  for (const queryInfo of queries) {
    const tabs = await queryTabsSafe(queryInfo);
    const tab = tabs.find((candidate) => candidate.id && !isRestrictedPage(candidate.url));
    if (tab) {
      return tab;
    }
  }

  const [currentTab] = await queryTabsSafe({ active: true, currentWindow: true });
  return currentTab ?? null;
};

export const getTabWordCount = async (tabId: number) => {
  if (typeof chrome === "undefined" || !chrome.scripting?.executeScript) {
    return 0;
  }

  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const rootElement = (document.querySelector("article, main") || document.body) as HTMLElement;
      const text = (rootElement?.innerText || document.body.innerText || "").replace(/\s\s+/g, " ").trim();
      return text.length > 0 ? text.split(/\s+/).filter(Boolean).length : 0;
    },
  });

  const wordCount = injectionResults?.[0]?.result;
  return typeof wordCount === "number" && Number.isFinite(wordCount) ? wordCount : 0;
};
