import { useCallback, useRef, useState } from "react";
import { useAuthProfileStore } from "../../../../../stores/authProfileStore";
import { resolveCurrentTab } from "../../../../FrontPage/utils/chromeTabs";
import { detectSourceType } from "../../../utils/sourcePayload";
import { capturePageHtml } from "./capturePageHtml";
import { exportWebpage } from "./exportWebpage";
import { exportPdf } from "./exportPdf";
import { exportYoutube } from "./exportYoutube";

export type ExportResult =
  | { success: true }
  | { success: false; errorMessage: string };

export const useExport = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL as string;
  const userProfile = useAuthProfileStore((state) => state.profile);
  const [isExportLoading, setIsExportLoading] = useState(false);
  const exportInFlightRef = useRef(false);

  const handleExport = useCallback(async (): Promise<ExportResult> => {
    if (exportInFlightRef.current) {
      return { success: false, errorMessage: "An export is already in progress." };
    }

    exportInFlightRef.current = true;
    setIsExportLoading(true);

    try {
      const tab = await resolveCurrentTab();
      if (!tab?.id) {
        return { success: false, errorMessage: "Could not find an active browser tab." };
      }

      const url = tab.url;
      if (!url) {
        return { success: false, errorMessage: "No URL available for export." };
      }

      const sourceType = detectSourceType(url);
      const isAuthenticated = Boolean(userProfile);

      switch (sourceType) {
        case "webpage": {
          const sourceHtml = await capturePageHtml(tab.id);
          await exportWebpage(url, sourceHtml, tab.title ?? "", baseUrl, isAuthenticated);
          break;
        }
        case "pdf":
          await exportPdf(tab);
          break;
        case "youtube":
          await exportYoutube(baseUrl, url, isAuthenticated);
          break;
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      return { success: false, errorMessage: message };
    } finally {
      exportInFlightRef.current = false;
      setIsExportLoading(false);
    }
  }, [baseUrl, userProfile]);

  return { handleExport, isExportLoading };
};
