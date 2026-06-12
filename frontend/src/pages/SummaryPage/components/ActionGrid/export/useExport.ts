import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isExportLoading, setIsExportLoading] = useState(false);
  const exportInFlightRef = useRef(false);

  const handleExport = useCallback(async (): Promise<ExportResult> => {
    if (exportInFlightRef.current) {
      return {
        success: false,
        errorMessage: t("exportErrors.inProgress", { defaultValue: "An export is already in progress." }),
      };
    }

    exportInFlightRef.current = true;
    setIsExportLoading(true);

    try {
      const tab = await resolveCurrentTab();
      if (!tab?.id) {
        return {
          success: false,
          errorMessage: t("summaryErrors.noActiveTabMessage", {
            defaultValue: "Could not find an active browser tab.",
          }),
        };
      }

      const url = tab.url;
      if (!url) {
        return {
          success: false,
          errorMessage: t("exportErrors.noUrl", { defaultValue: "No URL available for export." }),
        };
      }

      const sourceType = detectSourceType(url);

      switch (sourceType) {
        case "webpage": {
          const sourceHtml = await capturePageHtml(tab.id);
          await exportWebpage(url, sourceHtml, tab.title ?? "", t);
          break;
        }
        case "pdf":
          await exportPdf(tab);
          break;
        case "youtube":
          await exportYoutube(url, t);
          break;
      }

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : t("exportErrors.failed", { defaultValue: "Export failed." });
      return { success: false, errorMessage: message };
    } finally {
      exportInFlightRef.current = false;
      setIsExportLoading(false);
    }
  }, [t]);

  return { handleExport, isExportLoading };
};
