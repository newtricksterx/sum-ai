import { useCallback, useRef, useState } from "react";
import type {
  SummaryActionId,
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
import { MOCK_FLASHCARDS_DOCUMENT, MOCK_QUIZ_DOCUMENT, isMockActionItemModeEnabled } from "./utils/mocks";
import { readErrorBody } from "./utils/sources";
import { buildSourceActionRequest } from "./useSummarizeActiveTab";


const requestActionItem = async (
  baseUrl: string,
  language: Language,
  type: SummaryActionId,
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
  sourcePayload,
  initialActionItems = [],
  onActionItemsChange,
  onActionItemSuccess,
}: UseActionItemOptions) => {
  const [actionItems, setActionItems] = useState<SummaryActionItem[]>(initialActionItems);
  const [loadingActionId, setLoadingActionId] = useState<SummaryActionId | null>(null);
  const actionRequestInFlightRef = useRef(false);

  const resetActionItemRequestState = useCallback(() => {
    actionRequestInFlightRef.current = false;
    setLoadingActionId(null);
  }, []);

  const addActionItem = useCallback(
    async (actionId: SummaryActionId) => {
      if (actionRequestInFlightRef.current) {
        return;
      }

      if (sourcePayload === null) {
        return;
      }

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      try {
        const actionItemId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const mockDocument = actionId === "flashcards" ? MOCK_FLASHCARDS_DOCUMENT : MOCK_QUIZ_DOCUMENT;
        const document = await requestActionItem(baseUrl, language, actionId, sourcePayload, mockDocument);

        if (!document || document.blocks.length === 0) {
          return;
        }

        setActionItems((previous) => {
          const nextActionItems: SummaryActionItem[] = [
            ...previous,
            { id: actionItemId, type: actionId, document },
          ];
          onActionItemsChange?.(nextActionItems);
          return nextActionItems;
        });
        onActionItemSuccess?.();
      } finally {
        actionRequestInFlightRef.current = false;
        setLoadingActionId(null);
      }
    },
    [baseUrl, language, onActionItemSuccess, onActionItemsChange, sourcePayload],
  );

  const removeActionItem = useCallback(
    (actionItemId: string) => {
      setActionItems((previous) => {
        const nextActionItems = previous.filter((item) => item.id !== actionItemId);
        onActionItemsChange?.(nextActionItems);
        return nextActionItems;
      });
    },
    [onActionItemsChange],
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
