import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ResolveSourcePayloadOptions,
  SourcePayload,
  SourcePayloadResolution,
} from "./utils/types";
import {
  buildMockSourcePayload,
  buildSourcePayloadFromTab,
  sourcePayloadError,
} from "./utils/sourcePayload";
import { isRestrictedPage, resolveCurrentTab } from "../FrontPage/utils/chromeTabs";

export const useSourcePayload = () => {
  const { t } = useTranslation();
  const [sourcePayload, setSourcePayload] = useState<SourcePayload | null>(null);
  const lastSourceErrorRef = useRef<SourcePayloadResolution | null>(null);

  const resolveSourcePayload = useCallback(async (
    options?: ResolveSourcePayloadOptions,
  ): Promise<SourcePayload | null> => {
    lastSourceErrorRef.current = null;

    if (import.meta.env.DEV) {
      const { isAnyActionItemMockEnabled } = await import("./utils/mocks");
      if (isAnyActionItemMockEnabled()) {
        return !options?.forceActiveTab && sourcePayload ? sourcePayload : buildMockSourcePayload();
      }
    }

    // Follow-up actions in an existing session are pinned to the session's
    // original source: reuse the cached payload instead of re-scraping. The
    // active tab may have changed since the session started, and a different
    // page's content must never leak into an existing session. (SummaryPage
    // hides the action grid on a URL mismatch; this is the data-level guard.)
    if (!options?.forceActiveTab && sourcePayload !== null) {
      return sourcePayload;
    }

    const tab = await resolveCurrentTab();
    if (!tab?.id) {
      lastSourceErrorRef.current = sourcePayloadError(
        t("summaryErrors.noActiveTabTitle", { defaultValue: "No active tab" }),
        t("summaryErrors.noActiveTabMessage", { defaultValue: "Could not find an active browser tab." }),
      );
      return null;
    }

    if (isRestrictedPage(tab.url)) {
      lastSourceErrorRef.current = sourcePayloadError(
        t("summaryErrors.restrictedPageTitle", { defaultValue: "Page not supported" }),
        t("summaryErrors.restrictedPageMessage", {
          defaultValue:
            "Chrome internal pages (like chrome://settings) are not supported. Open a normal website tab and try again.",
        }),
        tab.url,
      );
      return null;
    }

    const result = await buildSourcePayloadFromTab(tab, t);
    if (result.payload) {
      return result.payload;
    }

    lastSourceErrorRef.current = result;
    return null;
  }, [sourcePayload, t]);

  return {
    sourcePayload,
    setSourcePayload,
    resolveSourcePayload,
    lastSourceErrorRef,
  };
};
