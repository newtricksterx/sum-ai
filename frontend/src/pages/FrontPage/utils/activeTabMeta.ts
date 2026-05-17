export type ActiveTabMeta = {
  title: string;
  domain: string;
  readTime: string;
};

export const FALLBACK_TAB_META: ActiveTabMeta = {
  title: "Create action items from the current tab",
  domain: "Uses the current browser tab",
  readTime: "Read time unavailable",
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
