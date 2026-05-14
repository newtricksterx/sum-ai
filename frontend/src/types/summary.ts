import type { SummaryDocument } from "../pages/SummaryPage/utils/types";
import { isSummaryDocument, parseSummaryDocument } from "../pages/SummaryPage/utils/document";

export const SUMMARY_ACTION_IDS = ["flashcards", "quiz", "summary"] as const;

export type ActionId = (typeof SUMMARY_ACTION_IDS)[number];

export type SummaryActionItem = {
  id: string;
  type: ActionId;
  document: SummaryDocument;
};

const SUMMARY_ACTION_ID_SET = new Set<string>(SUMMARY_ACTION_IDS);

export const isSummaryActionId = (value: unknown): value is ActionId => {
  return typeof value === "string" && SUMMARY_ACTION_ID_SET.has(value);
};

// Accepts either a SummaryDocument-shaped object or a JSON string serialization of one.
export const coerceActionItemDocument = (value: unknown): SummaryDocument | null => {
  if (isSummaryDocument(value)) {
    return value;
  }
  if (typeof value === "string") {
    return parseSummaryDocument(value);
  }
  return null;
};

export const normalizeSummaryActionItems = (value: unknown): SummaryActionItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap<SummaryActionItem>((item): SummaryActionItem[] => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as { id?: unknown; type?: unknown; document?: unknown };
    if (typeof candidate.id !== "string") {
      return [];
    }

    if (!isSummaryActionId(candidate.type)) {
      return [];
    }

    const document = coerceActionItemDocument(candidate.document);
    if (!document) {
      return [];
    }

    return [{ id: candidate.id, type: candidate.type, document }];
  });
};
