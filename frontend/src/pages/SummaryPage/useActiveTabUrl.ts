import { useEffect, useState } from "react";
import { resolveCurrentTab } from "../FrontPage/frontpage.helpers";

// Tracks the URL of the active browser tab and keeps it in sync with tab/window focus changes.
// Mirrors the listener set used by useTabChange but only surfaces the URL.
export const useActiveTabUrl = (): string | undefined => {
  const [activeTabUrl, setActiveTabUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      const tab = await resolveCurrentTab();
      if (isMounted) {
        setActiveTabUrl(tab?.url);
      }
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (tab.active && (changeInfo.url || changeInfo.status === "complete")) {
        void refresh();
      }
    };

    const handleWindowFocusChanged = (windowId: number) => {
      const noFocusedWindowId = chrome.windows?.WINDOW_ID_NONE ?? -1;
      if (windowId !== noFocusedWindowId) {
        void refresh();
      }
    };

    const handleActivated = () => void refresh();

    void refresh();
    window.addEventListener("focus", handleActivated);
    if (typeof chrome !== "undefined") {
      chrome.tabs?.onActivated?.addListener(handleActivated);
      chrome.tabs?.onUpdated?.addListener(handleTabUpdated);
      chrome.windows?.onFocusChanged?.addListener(handleWindowFocusChanged);
    }

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleActivated);
      if (typeof chrome !== "undefined") {
        chrome.tabs?.onActivated?.removeListener(handleActivated);
        chrome.tabs?.onUpdated?.removeListener(handleTabUpdated);
        chrome.windows?.onFocusChanged?.removeListener(handleWindowFocusChanged);
      }
    };
  }, []);

  return activeTabUrl;
};
