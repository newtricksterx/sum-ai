import type { ActionId } from "../../../types/summary";
import type { Format, Language, Length, QuizDifficulty } from "../../../utils/types";
import type { PdfPayload } from "./pdf";

export type SourceType = "webpage" | "pdf" | "youtube";

export type SourcePayload = {
  sourceType: SourceType;
  sourceUrl: string | undefined;
  sourceContent: string;
  pdf?: PdfPayload;
};

export type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

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

export type ActionItemThrottlePayload = {
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

export type ResolveSourcePayloadOptions = {
  forceActiveTab?: boolean;
};

export type AddActionItemOptions = ResolveSourcePayloadOptions & {
  resetSession?: boolean;
};

export type SourcePayloadResolution = {
  payload: SourcePayload | null;
  errorDocument: SummaryDocument | null;
  sourceUrl?: string;
};

export type ActionItemRequestResult = {
  document: SummaryDocument | null;
  sourceUrl?: string;
  isSuccess: boolean;
};

export type ActionItemRequestErrorPayload = ActionItemErrorPayload & ActionItemThrottlePayload;

export type ActionItemPostResult<TErrorPayload> =
  | { ok: true; result: ActionItemResponse }
  | { ok: false; status: number; errorPayload: TErrorPayload | null };

export type PostActionItemArgs = {
  type: ActionId;
  sourcePayload: SourcePayload;
  extras?: { length?: Length; format?: Format; language?: Language; quizDifficulty?: QuizDifficulty };
};

export type RequestActionItemArgs = {
  language: Language;
  type: ActionId;
  sourcePayload: SourcePayload;
  format?: Format;
  length?: Length;
  quizDifficulty?: QuizDifficulty;
  isAuthenticated?: boolean;
  t?: TranslateFn;
};
