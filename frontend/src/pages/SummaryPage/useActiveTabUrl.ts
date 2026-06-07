import { useCallback, useState } from "react";
import { useTabListener } from "../../hooks/useTabListener";

export const useActiveTabUrl = (): string | undefined => {
  const [activeTabUrl, setActiveTabUrl] = useState<string | undefined>(undefined);

  const onTabChange = useCallback((tab: chrome.tabs.Tab | null) => {
    setActiveTabUrl(tab?.url);
  }, []);

  useTabListener(onTabChange);

  return activeTabUrl;
};
