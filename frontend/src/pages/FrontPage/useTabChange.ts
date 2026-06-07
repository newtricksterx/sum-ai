import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { type ActiveTabMeta, FALLBACK_TAB_META, getDomainFromUrl } from "./utils/activeTabMeta";
import { getTabWordCount, isRestrictedPage } from "./utils/chromeTabs";
import { useTabListener } from "../../hooks/useTabListener";

const WORDS_PER_MINUTE = 225;

const tabUpdatedFilter = (
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
): boolean => tab.active && Boolean(changeInfo.title || changeInfo.url || changeInfo.status === "complete");

export const useTabChange = () => {
  const { t } = useTranslation();
  const [activeTabMeta, setActiveTabMeta] = useState<ActiveTabMeta>(FALLBACK_TAB_META);
  const latestRequestIdRef = useRef(0);

  const onTabChange = useCallback(async (tab: chrome.tabs.Tab | null) => {
    const readTimeUnavailable = t("frontpage.readTimeUnavailable");

    const requestId = ++latestRequestIdRef.current;

    if (!tab) {
      setActiveTabMeta({ ...FALLBACK_TAB_META, readTime: readTimeUnavailable });
      return;
    }

    const nextMeta: ActiveTabMeta = {
      title: tab.title?.trim() || FALLBACK_TAB_META.title,
      domain: getDomainFromUrl(tab.url),
      readTime: isRestrictedPage(tab.url) ? readTimeUnavailable : t("frontpage.estimating"),
    };
    setActiveTabMeta(nextMeta);

    if (!tab.id || isRestrictedPage(tab.url)) return;

    try {
      const wordCount = await getTabWordCount(tab.id);
      if (requestId === latestRequestIdRef.current) {
        const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
        const readTime = wordCount <= 0
          ? readTimeUnavailable
          : `${minutes} ${t("frontpage.minRead")}`;
        setActiveTabMeta((current) => ({ ...current, readTime }));
      }
    } catch {
      if (requestId === latestRequestIdRef.current) {
        setActiveTabMeta((current) => ({ ...current, readTime: readTimeUnavailable }));
      }
    }
  }, [t]);

  useTabListener(onTabChange, { onTabUpdatedFilter: tabUpdatedFilter });

  return activeTabMeta;
};
