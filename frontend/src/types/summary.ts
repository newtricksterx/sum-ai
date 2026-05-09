export const SUMMARY_ACTION_IDS = ["flashcards", "quiz", "terms", "outline"] as const;

export type SummaryActionId = (typeof SUMMARY_ACTION_IDS)[number];

export type SummaryActionItem = {
  id: string;
  type: SummaryActionId;
};

const SUMMARY_ACTION_ID_SET = new Set<string>(SUMMARY_ACTION_IDS);

export const isSummaryActionId = (value: unknown): value is SummaryActionId => {
  return typeof value === "string" && SUMMARY_ACTION_ID_SET.has(value);
};

export const normalizeSummaryActionItems = (value: unknown): SummaryActionItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
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

    return [{ id: candidate.id, type: candidate.type }];
  });
};
