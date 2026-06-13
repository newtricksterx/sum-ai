import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useCurrentSessionState } from "../../stores/sessionStorage";
import { useCurrentUserHistoryKey, useHistoryStorage } from "../../stores/historyStorage";
import type { ActionId } from "../../types/summary";
import { createActionItemId } from "../../types/summary";
import type { AddActionItemOptions, SummaryDocument } from "./utils/types";
import { errorDocument } from "./utils/document";
import { requestActionItem } from "./utils/actionItemRequest";
import { useSourcePayload } from "./useSourcePayload";

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

  const { setSourcePayload, resolveSourcePayload, lastSourceErrorRef } = useSourcePayload();

  const syncHistory = useCallback(() => {
    upsertHistoryItem(userHistoryKey, useCurrentSessionState.getState().session, historyLimit);
  }, [historyLimit, upsertHistoryItem, userHistoryKey]);

  const [loadingActionId, setLoadingActionId] = useState<ActionId | null>(null);
  const actionRequestInFlightRef = useRef(false);

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
        return {
          success: false,
          errorMessage: t("summaryErrors.actionInProgress", {
            defaultValue: "An action is already in progress.",
          }),
        };
      }

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      const clickQuizDifficulty = actionId === "quiz" ? quizDifficulty : undefined;

      try {
        await waitForNextPaintTask();

        // For a session-start (resetSession), do NOT touch the current session
        // until the action actually succeeds. Resolving the source or the
        // request itself can fail (e.g. a restricted page like the Chrome Web
        // Store); on failure we leave the existing session intact and only
        // surface the error to the caller.
        const resolved = await resolveSourcePayload({ forceActiveTab: options.forceActiveTab });
        if (resolved === null) {
          const sourceError = lastSourceErrorRef.current;
          const fallbackDoc = errorDocument(
            t("summaryErrors.sourceReadTitle", { defaultValue: "Could not read source" }),
            t("summaryErrors.sourceReadMessage", {
              defaultValue: "Could not read the current tab. Try reloading the page and trying again.",
            }),
          );
          const usedDoc = sourceError?.errorDocument ?? fallbackDoc;
          return {
            success: false,
            errorMessage: extractErrorMessage(
              usedDoc,
              t("summaryErrors.sourceReadMessage", {
                defaultValue: "Could not read the current tab. Try reloading the page and trying again.",
              }),
            ),
          };
        }

        const actionItemId = createActionItemId(actionId);
        const result = await requestActionItem({
          language,
          format,
          length,
          quizDifficulty: clickQuizDifficulty,
          type: actionId,
          sourcePayload: resolved,
          isAuthenticated: Boolean(userProfile),
          t,
        });

        if (!result.isSuccess) {
          return {
            success: false,
            errorMessage: extractErrorMessage(
              result.document,
              t("summaryErrors.generateFailed", { defaultValue: "Could not generate action item." }),
            ),
          };
        }

        if (!result.document || result.document.blocks.length === 0) {
          return {
            success: false,
            errorMessage: t("summaryErrors.emptyResponse", {
              defaultValue: "The backend returned an empty response.",
            }),
          };
        }

        // Success: only now do we replace the current session with a new one.
        if (options.resetSession) {
          resetSession();
          startSession(result.sourceUrl ?? resolved.sourceUrl ?? "");
        }

        addSessionActionItem({
          id: actionItemId,
          type: actionId,
          document: result.document,
          ...(clickQuizDifficulty ? { quizDifficulty: clickQuizDifficulty } : {}),
        });
        syncHistory();

        setSourcePayload(resolved);
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
      currency,
      format,
      hydrateProfile,
      language,
      length,
      lastSourceErrorRef,
      quizDifficulty,
      resetSession,
      resolveSourcePayload,
      setSourcePayload,
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
