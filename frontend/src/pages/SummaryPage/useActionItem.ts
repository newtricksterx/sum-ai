import { useCallback, useRef, useState } from "react";
import type {
  SummaryActionId,
  SummaryActionItem,
} from "../../types/summary";
import { normalizeFlashcards, normalizeQuizItems } from "../../types/summary";
import type { Language } from "../../utils/types";
import type { ActionItemErrorPayload, ActionItemResponse, UseActionItemOptions } from "./utils/types";
import { MOCK_FLASHCARDS, MOCK_QUIZ_ITEMS, isMockActionItemModeEnabled } from "./utils/mocks";
import { readErrorBody } from "./utils/sources";


const requestActionItem = async <T>(
  baseUrl: string,
  language: Language,
  type: SummaryActionId,
  summaryJson: string,
  mockData: T[],
  normalizer: (content: unknown) => T[],
): Promise<T[]> => {
  if (isMockActionItemModeEnabled()) {
    return mockData;
  }

  try {
    const response = await fetch(`${baseUrl}/api/action-item`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, language, content: summaryJson }),
    });

    if (!response.ok) {
      const errorPayload = await readErrorBody<ActionItemErrorPayload>(response);
      const fallbackMessage = errorPayload?.message || errorPayload?.error || "Could not generate action item.";
      console.error("Action Item Error:", fallbackMessage);
      return [];
    }

    const result = (await response.json()) as ActionItemResponse;
    if (result.isSuccess !== true) {
      return [];
    }

    return normalizer(result.content);
  } catch (error) {
    console.error("Fetch Action Item Error:", error);
    return [];
  }
};

export const useActionItem = ({
  baseUrl,
  language,
  summarizedContent,
  initialActionItems = [],
  onActionItemsChange,
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

      actionRequestInFlightRef.current = true;
      setLoadingActionId(actionId);

      try {
        if (summarizedContent === null) {
          return;
        }

        const actionItemId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        if (actionId === "flashcards") {
          const flashcards = await requestActionItem(
            baseUrl, language, "flashcards", summarizedContent, MOCK_FLASHCARDS, normalizeFlashcards,
          );
          if (!flashcards.length) {
            return;
          }
          setActionItems((previous) => {
            const nextActionItems = [...previous, { id: actionItemId, type: actionId, flashcards }];
            onActionItemsChange?.(nextActionItems);
            return nextActionItems;
          });
          return;
        }

        if (actionId === "quiz") {
          const quiz = await requestActionItem(
            baseUrl, language, "quiz", summarizedContent, MOCK_QUIZ_ITEMS, normalizeQuizItems,
          );
          if (!quiz.length) {
            return;
          }
          setActionItems((previous) => {
            const nextActionItems = [...previous, { id: actionItemId, type: actionId, quiz }];
            onActionItemsChange?.(nextActionItems);
            return nextActionItems;
          });
        }
      } finally {
        actionRequestInFlightRef.current = false;
        setLoadingActionId(null);
      }
    },
    [baseUrl, language, onActionItemsChange, summarizedContent],
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
