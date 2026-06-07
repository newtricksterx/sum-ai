import { useEffect, useRef } from "react";
import { resolveCurrentTab } from "../pages/FrontPage/utils/chromeTabs";

export type TabListenerCallback = (tab: chrome.tabs.Tab | null) => void;

export interface UseTabListenerOptions {
  onTabUpdatedFilter?: (changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => boolean;
}

const defaultTabUpdatedFilter = (
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab,
) => tab.active && (changeInfo.url || changeInfo.status === "complete");

export const useTabListener = (
  callback: TabListenerCallback,
  options?: UseTabListenerOptions,
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const filterRef = useRef(options?.onTabUpdatedFilter ?? defaultTabUpdatedFilter);
  filterRef.current = options?.onTabUpdatedFilter ?? defaultTabUpdatedFilter;

  useEffect(() => {
    let isMounted = true;

    const refresh = async () => {
      const tab = await resolveCurrentTab();
      if (isMounted) {
        callbackRef.current(tab);
      }
    };

    const handleTabUpdated = (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab,
    ) => {
      if (filterRef.current(changeInfo, tab)) {
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
};
