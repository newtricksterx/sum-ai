import { useCallback, useRef, useState } from "react";
import type {
  SummaryActionId,
  SummaryActionItem,
  SummaryFlashcardItem,
  SummaryQuizItem,
} from "../../types/summary";
import type { Language } from "../../utils/types";

type ActionItemErrorPayload = {
  message?: string;
  error?: string;
};

type ActionItemResponse = {
  isSuccess: boolean;
  content?: unknown;
};

type UseActionItemOptions = {
  baseUrl: string;
  language: Language;
  summarizedContent: string | null;
  initialActionItems?: SummaryActionItem[];
  onActionItemsChange?: (nextActionItems: SummaryActionItem[]) => void;
};

const MOCK_FLASHCARDS: SummaryFlashcardItem[] = [
  {
    question: "What is the core idea of this summary?",
    answer: "It condenses the source into key takeaways so you can review quickly.",
  },
  {
    question: "What does the summary keep from the original content?",
    answer: "It keeps the main arguments, evidence, and practical insights.",
  },
  {
    question: "How should you use this summary next?",
    answer: "Use it to decide what to read deeply and what to skim.",
  },
];

const MOCK_QUIZ_ITEMS: SummaryQuizItem[] = [
  {
    prompt: "What training objective do large language models primarily use?",
    options: [
      "Supervised classification on labeled datasets.",
      "Self-supervised next-token prediction on large text corpora.",
      "Reinforcement learning from environment rewards.",
      "Generative adversarial training.",
    ],
    correctIndex: 1,
    explanation: "LLMs are first trained with self-supervised next-token prediction.",
  },
  {
    prompt: "Which architecture powers most modern LLMs?",
    options: [
      "Recurrent neural networks.",
      "Convolutional neural networks.",
      "Transformers with attention.",
      "Restricted Boltzmann machines.",
    ],
    correctIndex: 2,
    explanation: "Transformers use attention to model relationships across long sequences.",
  },
];

const isMockActionItemModeEnabled = () => import.meta.env.VITE_USE_MOCK_ACTION_ITEM === "true";

const normalizeFlashcards = (value: unknown): SummaryFlashcardItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    let question: unknown;
    let answer: unknown;

    if (Array.isArray(item) && item.length === 2) {
      question = item[0];
      answer = item[1];
    } else if (item && typeof item === "object") {
      const candidate = item as { question?: unknown; answer?: unknown };
      question = candidate.question;
      answer = candidate.answer;
    }

    if (typeof question !== "string" || typeof answer !== "string") {
      return [];
    }

    const normalizedQuestion = question.trim();
    const normalizedAnswer = answer.trim();
    if (!normalizedQuestion || !normalizedAnswer) {
      return [];
    }

    return [{ question: normalizedQuestion, answer: normalizedAnswer }];
  });
};

const normalizeQuizItems = (value: unknown): SummaryQuizItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as {
      prompt?: unknown;
      options?: unknown;
      correctIndex?: unknown;
      explanation?: unknown;
    };

    if (typeof candidate.prompt !== "string" || typeof candidate.explanation !== "string") {
      return [];
    }

    if (!Array.isArray(candidate.options)) {
      return [];
    }

    const options = candidate.options.flatMap((option) => {
      if (typeof option !== "string") {
        return [];
      }

      const optionText = option.trim();
      if (!optionText) {
        return [];
      }

      return [optionText];
    });

    if (options.length < 2) {
      return [];
    }

    if (typeof candidate.correctIndex !== "number" || !Number.isInteger(candidate.correctIndex)) {
      return [];
    }

    if (candidate.correctIndex < 0 || candidate.correctIndex >= options.length) {
      return [];
    }

    const prompt = candidate.prompt.trim();
    const explanation = candidate.explanation.trim();
    if (!prompt || !explanation) {
      return [];
    }

    return [
      {
        prompt,
        options,
        correctIndex: candidate.correctIndex,
        explanation,
      },
    ];
  });
};

const getActionItemErrorPayload = async (response: Response): Promise<ActionItemErrorPayload | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const requestFlashcards = async (
  baseUrl: string,
  language: Language,
  summaryHtml: string,
): Promise<SummaryFlashcardItem[]> => {
  if (isMockActionItemModeEnabled()) {
    return MOCK_FLASHCARDS;
  }

  try {
    const response = await fetch(`${baseUrl}/api/action-item`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "flashcards",
        language,
        content: summaryHtml,
      }),
    });

    if (!response.ok) {
      const errorPayload = await getActionItemErrorPayload(response);
      const fallbackMessage = errorPayload?.message || errorPayload?.error || "Could not generate flashcards.";
      console.log("Action Item Error:", fallbackMessage);
      return [];
    }

    const result = (await response.json()) as ActionItemResponse;
    if (result.isSuccess !== true) {
      return [];
    }

    return normalizeFlashcards(result.content);
  } catch (error) {
    console.log("Fetch Action Item Error:", error);
    return [];
  }
};

const requestQuiz = async (
  baseUrl: string,
  language: Language,
  summaryHtml: string,
): Promise<SummaryQuizItem[]> => {
  if (isMockActionItemModeEnabled()) {
    return MOCK_QUIZ_ITEMS;
  }

  try {
    const response = await fetch(`${baseUrl}/api/action-item`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "quiz",
        language,
        content: summaryHtml,
      }),
    });

    if (!response.ok) {
      const errorPayload = await getActionItemErrorPayload(response);
      const fallbackMessage = errorPayload?.message || errorPayload?.error || "Could not generate quiz.";
      console.log("Action Item Error:", fallbackMessage);
      return [];
    }

    const result = (await response.json()) as ActionItemResponse;
    if (result.isSuccess !== true) {
      return [];
    }

    return normalizeQuizItems(result.content);
  } catch (error) {
    console.log("Fetch Action Item Error:", error);
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

      const actionItemId = `${actionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        if (summarizedContent === null) {
          return;
        }

        if (actionId === "flashcards") {
          const flashcards = await requestFlashcards(baseUrl, language, summarizedContent);
          if (flashcards.length === 0) {
            return;
          }

          setActionItems((previous) => {
            const nextActionItems = [
              ...previous,
              {
                id: actionItemId,
                type: actionId,
                flashcards,
              },
            ];

            onActionItemsChange?.(nextActionItems);
            return nextActionItems;
          });
          return;
        }

        if (actionId === "quiz") {
          const quiz = await requestQuiz(baseUrl, language, summarizedContent);
          if (quiz.length === 0) {
            return;
          }

          setActionItems((previous) => {
            const nextActionItems = [
              ...previous,
              {
                id: actionItemId,
                type: actionId,
                quiz,
              },
            ];

            onActionItemsChange?.(nextActionItems);
            return nextActionItems;
          });
          return;
        }

        setActionItems((previous) => {
          const nextActionItems = [
            ...previous,
            {
              id: actionItemId,
              type: actionId,
            },
          ];

          onActionItemsChange?.(nextActionItems);
          return nextActionItems;
        });
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
