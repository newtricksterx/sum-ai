// TYPES:

export type ActiveTabMeta = {
  title: string;
  domain: string;
  readTime: string;
};

// NON-EXPORT CONST:

export const FALLBACK_TAB_META: ActiveTabMeta = {
  title: "Summarize the page you are viewing",
  domain: "Uses the current browser tab",
  readTime: "Read time unavailable",
};

export const WORDS_PER_MINUTE = 225;

export const QUICK_STEPS = [
  {
    text: 'We read the content from your current browser tab.',
  },
  {
    text: 'The summary format will depend on your preferences saved in Settings.',
  },
  {
    text: 'Click the "Summarize this tab" button to start summarizing the current tab.',
  },
];

const SETTING_LABELS: Record<string, string> = {
  english: 'English',
  french: 'French',
  spanish: 'Spanish',
  mandarin: 'Mandarin',
  hindi: 'Hindi',
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  paragraph: 'Paragraph',
  'bullet-point': 'Bullet Points',
  'tl-dr': 'TL;DR',
  'key-takeaways': 'Key Takeaways',
  'action-items': 'Action Items',
  'q-and-a': 'Q&A',
  'pros-cons': 'Pros & Cons',
};

// EXPORT CONST:

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

export const getDomainFromUrl = (url?: string) => {
  if (!url) {
    return FALLBACK_TAB_META.domain;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return FALLBACK_TAB_META.domain;
  }
};

export const getSettingLabel = (value: string) => {
  if (SETTING_LABELS[value]) {
    return SETTING_LABELS[value];
  }

  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatReadTime = (wordCount: number) => {
  if (wordCount <= 0) {
    return FALLBACK_TAB_META.readTime;
  }

  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
  return `${minutes} min read`;
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
