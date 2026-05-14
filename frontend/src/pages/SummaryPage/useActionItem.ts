import { useCallback, useRef, useState } from "react";
import type {
  ActionId,
  SummaryActionItem,
} from "../../types/summary";
import { coerceActionItemDocument } from "../../types/summary";
import type { Language } from "../../utils/types";
import type { SummaryDocument } from "./utils/types";
import type {
  ActionItemErrorPayload,
  ActionItemResponse,
  SourcePayload,
  UseActionItemOptions,
} from "./utils/types";
import {
  MOCK_FLASHCARDS_DOCUMENT,
  MOCK_QUIZ_DOCUMENT,
  MOCK_SUMMARY_ACTION_ITEM_DOCUMENT,
  isMockActionItemModeEnabled,
} from "./utils/mocks";
import { readErrorBody } from "./utils/sources";
import { buildSourceActionRequest } from "./useSummarizeActiveTab";


const MOCK_BY_ACTION_ID: Record<ActionId, SummaryDocument> = {
  flashcards: MOCK_FLASHCARDS_DOCUMENT,
  quiz: MOCK_QUIZ_DOCUMENT,
  summary: MOCK_SUMMARY_ACTION_ITEM_DOCUMENT,
};

const requestActionItem = async (
  baseUrl: string,
  language: Language,
  type: ActionId,
  sourcePayload: SourcePayload,
  mockDocument: SummaryDocument,
): Promise<SummaryDocument | null> => {
  if (isMockActionItemModeEnabled()) {
    return mockDocument;
  }

  try {
    const { body, headers } = buildSourceActionRequest(type, sourcePayload, { language });
    const response = await fetch(`${baseUrl}/api/action-item`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
    });

    if (!response.ok) {
      const errorPayload = await readErrorBody<ActionItemErrorPayload>(response);
      const fallbackMessage = errorPayload?.message || errorPayload?.error || "Could not generate action item.";
      console.error("Action Item Error:", fallbackMessage);
      return null;
    }

    const result = (await response.json()) as ActionItemResponse;
    if (result.isSuccess !== true) {
      return null;
    }

    return coerceActionItemDocument(result.content);
  } catch (error) {
    console.error("Fetch Action Item Error:", error);
    return null;
  }
};

export const useActionItem = ({
  baseUrl,
  language,
  resolveSourcePayload,
  initialActionItems = [],
  onActionItemsChange,
  onActionItemSuccess,
}: UseActionItemOptions) => {
  const [actionItems, setActionItemsState] = useState<SummaryActionItem[]>(initialActionItems);
  const actionItemsRef = useRef<SummaryActionItem[]>(initialActionItems);
  const setActionItems = useCallback((next: SummaryActionItem[]) => {
    actionItemsRef.current = next;
    setActionItemsState(next);
  }, []);
  const [loadingActionId, setLoadingActionId] = useState<ActionId | null>(null);
  const actionRequestInFlightRef = useRef(false);

  const resetActionItemRequestState = useCallback(() => {
    actionRequestInFlightRef.current = false;
    setLoadingActionId(null);
  }, []);

  const addActionItem = useCallback(
    async (actionId: ActionId) => {
      if (actionRequestInFlightRef.current) {
        return;
      }

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      try {
        const sourcePayload = await resolveSourcePayload();
        if (sourcePayload === null) {
          return;
        }

        const actionItemId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const mockDocument = MOCK_BY_ACTION_ID[actionId];
        const document = await requestActionItem(baseUrl, language, actionId, sourcePayload, mockDocument);

        if (!document || document.blocks.length === 0) {
          return;
        }

        const nextActionItems: SummaryActionItem[] = [
          ...actionItemsRef.current,
          { id: actionItemId, type: actionId, document },
        ];
        setActionItems(nextActionItems);
        onActionItemsChange?.(nextActionItems);
        onActionItemSuccess?.();
      } finally {
        actionRequestInFlightRef.current = false;
        setLoadingActionId(null);
      }
    },
    [baseUrl, language, onActionItemSuccess, onActionItemsChange, resolveSourcePayload, setActionItems],
  );

  const removeActionItem = useCallback(
    (actionItemId: string) => {
      const nextActionItems = actionItemsRef.current.filter((item) => item.id !== actionItemId);
      setActionItems(nextActionItems);
      onActionItemsChange?.(nextActionItems);
    },
    [onActionItemsChange, setActionItems],
  );

  return {
    actionItems,
    setActionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
    resetActionItemRequestState,
  };
};
