import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useCurrentSessionState } from "../../stores/sessionStorage";
import { useCurrentUserHistoryKey, useHistoryStorage } from "../../stores/historyStorage";
import type { ActionId } from "../../types/summary";
import { createActionItemId } from "../../types/summary";
import type {
  AddActionItemOptions,
  ResolveSourcePayloadOptions,
  SourcePayload,
  SourcePayloadResolution,
} from "./utils/types";
import { isAnyActionItemMockEnabled } from "./utils/mocks";
import { errorDocument } from "./utils/document";
import {
  buildMockSourcePayload,
  buildSourcePayloadFromTab,
  sourcePayloadError,
} from "./utils/sourcePayload";
import { requestActionItem } from "./utils/actionItemRequest";
import { isRestrictedPage, resolveCurrentTab } from "../FrontPage/frontpage.helpers";

const waitForNextPaintTask = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      setTimeout(resolve, 0);
      return;
    }

    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });

export const useActionItem = () => {
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const currency = useSettingsStore((state) => state.currency);
  const userProfile = useAuthProfileStore((state) => state.profile);
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile);
  const historyLimit = useAuthProfileStore((state) => state.profile?.subscription?.history_limit ?? null);
  const userHistoryKey = useCurrentUserHistoryKey();
  const upsertHistoryItem = useHistoryStorage((state) => state.upsertHistoryItem);

  const actionItems = useCurrentSessionState((state) => state.session.action_items);
  const startSession = useCurrentSessionState((state) => state.startSession);
  const addSessionActionItem = useCurrentSessionState((state) => state.addActionItem);
  const removeSessionActionItem = useCurrentSessionState((state) => state.removeActionItem);
  const resetSession = useCurrentSessionState((state) => state.resetSession);

  const syncHistory = useCallback(() => {
    upsertHistoryItem(userHistoryKey, useCurrentSessionState.getState().session, historyLimit);
  }, [historyLimit, upsertHistoryItem, userHistoryKey]);
  const [sourcePayload, setSourcePayload] = useState<SourcePayload | null>(null);
  const lastSourceErrorRef = useRef<SourcePayloadResolution | null>(null);
  const [loadingActionId, setLoadingActionId] = useState<ActionId | null>(null);
  const actionRequestInFlightRef = useRef(false);

  // For restored sessions, re-extract the live source when the user is still on that page.
  const resolveSourcePayload = useCallback(async (
    options?: ResolveSourcePayloadOptions,
  ): Promise<SourcePayload | null> => {
    lastSourceErrorRef.current = null;

    if (isAnyActionItemMockEnabled()) {
      return !options?.forceActiveTab && sourcePayload ? sourcePayload : buildMockSourcePayload();
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

  const resetActionItemRequestState = useCallback(() => {
    actionRequestInFlightRef.current = false;
    setLoadingActionId(null);
  }, []);

  const addActionItem = useCallback(
    async (actionId: ActionId, options: AddActionItemOptions = {}) => {
      if (actionRequestInFlightRef.current) {
        return;
      }

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      try {
        await waitForNextPaintTask();

        if (options.resetSession) {
          resetSession();
          setSourcePayload(null);
        }

        const sourcePayload = await resolveSourcePayload({ forceActiveTab: options.forceActiveTab });
        if (sourcePayload === null) {
          const sourceError = lastSourceErrorRef.current;
          if (options.resetSession) {
            startSession(sourceError?.sourceUrl ?? "");
          }
          addSessionActionItem({
            id: createActionItemId(actionId),
            type: actionId,
            document: sourceError?.errorDocument ?? errorDocument(
              "Could not read source",
              "Could not read the current tab. Try reloading the page and trying again.",
            ),
          });
          syncHistory();
          return;
        }

        const actionItemId = createActionItemId(actionId);
        const result = await requestActionItem({
          baseUrl,
          language,
          format,
          length,
          type: actionId,
          sourcePayload,
          isAuthenticated: Boolean(userProfile),
          t,
        });

        if (options.resetSession) {
          startSession(result.sourceUrl ?? sourcePayload.sourceUrl ?? "");
        }

        if (!result.document || result.document.blocks.length === 0) {
          syncHistory();
          return;
        }

        addSessionActionItem({ id: actionItemId, type: actionId, document: result.document });
        syncHistory();
        if (!result.isSuccess) {
          return;
        }

        setSourcePayload(sourcePayload);
        if (userProfile) {
          void hydrateProfile(true, currency);
        }
      } finally {
        actionRequestInFlightRef.current = false;
        setLoadingActionId(null);
      }
    },
    [
      addSessionActionItem,
      baseUrl,
      currency,
      format,
      hydrateProfile,
      language,
      length,
      resetSession,
      resolveSourcePayload,
      startSession,
      syncHistory,
      t,
      userProfile,
    ],
  );

  const removeActionItem = useCallback(
    (actionItemId: string) => {
      removeSessionActionItem(actionItemId);
      syncHistory();
    },
    [removeSessionActionItem, syncHistory],
  );

  return {
    actionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
    resetActionItemRequestState,
  };
};
