export const SUMMARY_ACTION_IDS = ["flashcards", "quiz"] as const;

export type SummaryActionId = (typeof SUMMARY_ACTION_IDS)[number];

export type SummaryFlashcardItem = {
  question: string;
  answer: string;
};

export type SummaryQuizItem = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type SummaryActionItem = {
  id: string;
  type: SummaryActionId;
  flashcards?: SummaryFlashcardItem[];
  quiz?: SummaryQuizItem[];
};

const SUMMARY_ACTION_ID_SET = new Set<string>(SUMMARY_ACTION_IDS);

export const isSummaryActionId = (value: unknown): value is SummaryActionId => {
  return typeof value === "string" && SUMMARY_ACTION_ID_SET.has(value);
};

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

export const normalizeSummaryActionItems = (value: unknown): SummaryActionItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap<SummaryActionItem>((item): SummaryActionItem[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as { id?: unknown; type?: unknown };
    if (typeof candidate.id !== "string") {
      return [];
    }

    if (!isSummaryActionId(candidate.type)) {
      return [];
    }

    if (candidate.type === "quiz") {
      const quiz = normalizeQuizItems((candidate as { quiz?: unknown }).quiz);
      if (quiz.length === 0) {
        const normalizedActionItem: SummaryActionItem = {
          id: candidate.id,
          type: candidate.type,
        };
        return [normalizedActionItem];
      }

      const normalizedActionItem: SummaryActionItem = {
        id: candidate.id,
        type: candidate.type,
        quiz,
      };
      return [normalizedActionItem];
    }

    if (candidate.type !== "flashcards") {
      const normalizedActionItem: SummaryActionItem = {
        id: candidate.id,
        type: candidate.type,
      };
      return [normalizedActionItem];
    }

    const flashcards = normalizeFlashcards((candidate as { flashcards?: unknown }).flashcards);
    if (flashcards.length === 0) {
      const normalizedActionItem: SummaryActionItem = {
        id: candidate.id,
        type: candidate.type,
      };
      return [normalizedActionItem];
    }

    const normalizedActionItem: SummaryActionItem = {
      id: candidate.id,
      type: candidate.type,
      flashcards,
    };
    return [normalizedActionItem];
  });
};
