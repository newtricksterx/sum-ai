
import type {
  SummaryActionItem,
  SummaryFlashcardItem,
  SummaryQuizItem,
} from "../../../types/summary";
import type { Language } from "../../../utils/types";

export type ActionItemErrorPayload = {
  message?: string;
  error?: string;
};

export type ActionItemResponse = {
  isSuccess: boolean;
  content?: unknown;
};

export type UseActionItemOptions = {
  baseUrl: string;
  language: Language;
  summarizedContent: string | null;
  initialActionItems?: SummaryActionItem[];
  onActionItemsChange?: (nextActionItems: SummaryActionItem[]) => void;
};

export const MOCK_FLASHCARDS: SummaryFlashcardItem[] = [
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

export const MOCK_QUIZ_ITEMS: SummaryQuizItem[] = [
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

export const isMockActionItemModeEnabled = () => import.meta.env.VITE_USE_MOCK_ACTION_ITEM === "true";

export const getActionItemErrorPayload = async (response: Response): Promise<ActionItemErrorPayload | null> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};