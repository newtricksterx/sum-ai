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
  SummaryDocument,
} from "./utils/types";
import { isAnyActionItemMockEnabled } from "./utils/mocks";
import { errorDocument } from "./utils/document";
import {
  buildMockSourcePayload,
  buildSourcePayloadFromTab,
  sourcePayloadError,
} from "./utils/sourcePayload";
import { requestActionItem } from "./utils/actionItemRequest";
import { isRestrictedPage, resolveCurrentTab } from "../FrontPage/utils/chromeTabs";

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

export type AddActionItemResult =
  | { success: true }
  | { success: false; errorMessage: string };

const extractErrorMessage = (
  doc: SummaryDocument | null | undefined,
  fallback: string,
): string => {
  if (!doc) return fallback;
  const text = doc.blocks?.[0]?.children?.[0]?.text;
  return typeof text === "string" && text.length > 0 ? text : fallback;
};

export const useActionItem = () => {
  const { t } = useTranslation();
  const baseUrl = import.meta.env.VITE_BASE_URL;
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const currency = useSettingsStore((state) => state.currency);
  const quizDifficulty = useSettingsStore((state) => state.quizDifficulty);
  const userProfile = useAuthProfileStore((state) => state.profile);
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile);
  const historyLimit = useAuthProfileStore((state) => state.profile?.subscription?.history_limit ?? 0);
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
    async (
      actionId: ActionId,
      options: AddActionItemOptions = {},
    ): Promise<AddActionItemResult> => {
      if (actionRequestInFlightRef.current) {
        return { success: false, errorMessage: "An action is already in progress." };
      }

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      // Snapshot at click time so later setting changes don't retroactively alter this item.
      const clickQuizDifficulty = actionId === "quiz" ? quizDifficulty : undefined;

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
          const fallbackDoc = errorDocument(
            "Could not read source",
            "Could not read the current tab. Try reloading the page and trying again.",
          );
          const usedDoc = sourceError?.errorDocument ?? fallbackDoc;
          syncHistory();
          return {
            success: false,
            errorMessage: extractErrorMessage(usedDoc, "Could not read the current tab."),
          };
        }

        const actionItemId = createActionItemId(actionId);
        const result = await requestActionItem({
          baseUrl,
          language,
          format,
          length,
          quizDifficulty: clickQuizDifficulty,
          type: actionId,
          sourcePayload,
          isAuthenticated: Boolean(userProfile),
          t,
        });

        if (options.resetSession) {
          startSession(result.sourceUrl ?? sourcePayload.sourceUrl ?? "");
        }

        if (!result.isSuccess) {
          syncHistory();
          return {
            success: false,
            errorMessage: extractErrorMessage(result.document, "Could not generate action item."),
          };
        }

        if (!result.document || result.document.blocks.length === 0) {
          syncHistory();
          return {
            success: false,
            errorMessage: "The backend returned an empty response.",
          };
        }

        addSessionActionItem({
          id: actionItemId,
          type: actionId,
          document: result.document,
          ...(clickQuizDifficulty ? { quizDifficulty: clickQuizDifficulty } : {}),
        });
        syncHistory();

        setSourcePayload(sourcePayload);
        if (userProfile) {
          void hydrateProfile(true, currency);
        }
        return { success: true };
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
      quizDifficulty,
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
