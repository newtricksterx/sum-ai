import { useCallback, useRef, useState } from "react";
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

    const tab = await resolveCurrentTab();
    if (!tab?.id) {
      if (sourcePayload) return sourcePayload;
      lastSourceErrorRef.current = sourcePayloadError(
        "No active tab",
        "Could not find an active browser tab.",
      );
      return null;
    }

    if (isRestrictedPage(tab.url)) {
      if (sourcePayload) return sourcePayload;
      lastSourceErrorRef.current = sourcePayloadError(
        "Page not supported",
        "Chrome internal pages (like chrome://settings) are not supported. Open a normal website tab and try again.",
        tab.url,
      );
      return null;
    }

    if (!options?.forceActiveTab && sourcePayload !== null && tab.url !== sourcePayload.sourceUrl) {
      return sourcePayload;
    }

    const result = await buildSourcePayloadFromTab(tab);
    if (result.payload) {
      return result.payload;
    }

    if (!options?.forceActiveTab && sourcePayload) {
      return sourcePayload;
    }

    lastSourceErrorRef.current = result;
    return null;
  }, [sourcePayload]);

  return {
    sourcePayload,
    setSourcePayload,
    resolveSourcePayload,
    lastSourceErrorRef,
  };
};
