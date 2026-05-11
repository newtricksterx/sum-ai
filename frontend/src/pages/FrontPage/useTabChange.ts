import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import {
  type ActiveTabMeta,
  FALLBACK_TAB_META,
  WORDS_PER_MINUTE,
  getDomainFromUrl,
  getTabWordCount,
  isRestrictedPage,
  resolveCurrentTab,
} from "./frontpage.helpers";

export const useTabChange = () => {
  const { t } = useTranslation();
  const [activeTabMeta, setActiveTabMeta] = useState<ActiveTabMeta>(FALLBACK_TAB_META);

  useEffect(() => {
    let isMounted = true;
    let latestMetaRequestId = 0;

    const readTimeUnavailable = t("frontpage.readTimeUnavailable");
    const estimatingLabel = t("frontpage.estimating");
    const formatReadTimeLabel = (wordCount: number) => {
      if (wordCount <= 0) return readTimeUnavailable;
      const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
      return `${minutes} ${t("frontpage.minRead")}`;
    };

    const loadActiveTabMeta = async () => {
      const requestId = latestMetaRequestId + 1;
      latestMetaRequestId = requestId;
      const tab = await resolveCurrentTab();
      if (!isMounted || requestId !== latestMetaRequestId) {
        return;
      }

      if (!tab) {
        setActiveTabMeta({
          ...FALLBACK_TAB_META,
          readTime: readTimeUnavailable,
        });
        return;
      }

      const nextMeta: ActiveTabMeta = {
        title: tab.title?.trim() || FALLBACK_TAB_META.title,
        domain: getDomainFromUrl(tab.url),
        readTime: isRestrictedPage(tab.url) ? readTimeUnavailable : estimatingLabel,
      };

      setActiveTabMeta(nextMeta);

      if (!tab.id || isRestrictedPage(tab.url)) {
        return;
      }

      try {
        const wordCount = await getTabWordCount(tab.id);
        if (isMounted && requestId === latestMetaRequestId) {
          setActiveTabMeta((currentMeta) => ({
            ...currentMeta,
            readTime: formatReadTimeLabel(wordCount),
          }));
        }
      } catch {
        if (isMounted && requestId === latestMetaRequestId) {
          setActiveTabMeta((currentMeta) => ({
            ...currentMeta,
            readTime: readTimeUnavailable,
          }));
        }
      }
    };

    const refreshActiveTabMeta = () => {
      void loadActiveTabMeta();
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (
        tab.active &&
        (changeInfo.title || changeInfo.url || changeInfo.status === "complete")
      ) {
        refreshActiveTabMeta();
      }
    };

    const handleWindowFocusChanged = (windowId: number) => {
      const noFocusedWindowId = chrome.windows?.WINDOW_ID_NONE ?? -1;
      if (windowId !== noFocusedWindowId) {
        refreshActiveTabMeta();
      }
    };

    void loadActiveTabMeta();
    window.addEventListener("focus", refreshActiveTabMeta);
    if (typeof chrome !== "undefined") {
      chrome.tabs?.onActivated?.addListener(refreshActiveTabMeta);
      chrome.tabs?.onUpdated?.addListener(handleTabUpdated);
      chrome.windows?.onFocusChanged?.addListener(handleWindowFocusChanged);
    }

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshActiveTabMeta);
      if (typeof chrome !== "undefined") {
        chrome.tabs?.onActivated?.removeListener(refreshActiveTabMeta);
        chrome.tabs?.onUpdated?.removeListener(handleTabUpdated);
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocusChanged);
      }
    };
  }, [t]);

  return activeTabMeta;
};
