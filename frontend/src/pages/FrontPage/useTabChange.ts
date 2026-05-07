import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../../i18n";
import {
  type ActiveTabMeta,
  FALLBACK_TAB_META,
  getDomainFromUrl,
  getTabWordCount,
  isRestrictedPage,
  resolveCurrentTab,
} from "./frontpage.helpers";

export const useTabChange = () => {
  const { t, i18n } = useTranslation();
  const [activeTabMeta, setActiveTabMeta] = useState<ActiveTabMeta>(FALLBACK_TAB_META);
  const wordsPerMinute = 225;

  const getReadTimeUnavailable = () => t("frontpage.readTimeUnavailable");
  const getEstimatingLabel = () => t("frontpage.estimating");
  const formatReadTimeLabel = (wordCount: number) => {
    if (wordCount <= 0) {
      return getReadTimeUnavailable();
    }

    const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    return `${minutes} ${t("frontpage.minRead")}`;
  };

  useEffect(() => {
    let isMounted = true;
    let latestMetaRequestId = 0;

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
          readTime: getReadTimeUnavailable(),
        });
        return;
      }

      const nextMeta: ActiveTabMeta = {
        title: tab.title?.trim() || FALLBACK_TAB_META.title,
        domain: getDomainFromUrl(tab.url),
        readTime: isRestrictedPage(tab.url) ? getReadTimeUnavailable() : getEstimatingLabel(),
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
            readTime: getReadTimeUnavailable(),
          }));
        }
      }
    };

    const refreshActiveTabMeta = () => {
      void loadActiveTabMeta();
    };

    const handleTabActivated = () => {
      refreshActiveTabMeta();
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
      chrome.tabs?.onActivated?.addListener(handleTabActivated);
      chrome.tabs?.onUpdated?.addListener(handleTabUpdated);
      chrome.windows?.onFocusChanged?.addListener(handleWindowFocusChanged);
    }

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshActiveTabMeta);
      if (typeof chrome !== "undefined") {
        chrome.tabs?.onActivated?.removeListener(handleTabActivated);
        chrome.tabs?.onUpdated?.removeListener(handleTabUpdated);
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocusChanged);
      }
    };
  }, [i18n.language, t]);

  return activeTabMeta;
};
