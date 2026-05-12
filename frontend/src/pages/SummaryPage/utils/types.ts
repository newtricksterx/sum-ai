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

export type SummaryInline = {
  link?: string;
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  var?: boolean;
};

export type SummaryBlock = {
  type: string;
  children: SummaryInline[];
  question?: SummaryInline[];
  answer?: SummaryInline[];
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
