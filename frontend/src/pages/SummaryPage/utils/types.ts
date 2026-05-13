import type { Format, Language, Length } from "../../../utils/types";
import type { SummaryActionItem } from "../../../types/summary";

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type SummarizeRequestParams = {
  baseUrl: string;
  length: Length;
  format: Format;
  language: Language;
  isAuthenticated: boolean;
  t: TranslateFn;
};

export type InlineItems = {
  link?: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  var?: boolean;
};

export type SummaryQuizOption = {
  key: string;
  correct: boolean;
  children: InlineItems[];
};

export type SummaryBlock = {
  type: string;
  children: InlineItems[];
  // Field-specific inline arrays used by qna_pair / flashcard / question blocks.
  // `children` stays as the canonical text bucket; these blocks emit `children: []`.
  question?: InlineItems[];
  answer?: InlineItems[];
  front?: InlineItems[];
  back?: InlineItems[];
  options?: SummaryQuizOption[];
  explanation?: InlineItems[];
};

export type SummaryDocument = {
  title: string;
  format: string;
  blocks: SummaryBlock[];
};

export type SummarizeResult = {
  // Always a SummaryDocument. Errors are represented as documents with format: "error".
  json: SummaryDocument;
  sourceUrl?: string;
  isSuccess: boolean;
};

export type SummarizeErrorPayload = {
  message?: string;
  summaries_limit?: number;
  limit_period?: string;
  retry_after_seconds?: number;
};

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
