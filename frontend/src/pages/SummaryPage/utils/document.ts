import type {
  SummarizeErrorPayload,
  SummarizeResult,
  SummaryBlock,
  SummaryDocument,
  SummaryInline,
  TranslateFn,
} from "./types";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ALLOWED_BLOCK_TYPES = new Set(["bullet", "heading", "paragraph", "tl-dr", "qna_pair", "pro", "con"]);

const isSummaryInline = (value: unknown): value is SummaryInline => {
  if (!isObject(value) || typeof value.text !== "string") return false;
  if (value.bold !== undefined && typeof value.bold !== "boolean") return false;
  if (value.italic !== undefined && typeof value.italic !== "boolean") return false;
  if (value.code !== undefined && typeof value.code !== "boolean") return false;
  if (value.var !== undefined && typeof value.var !== "boolean") return false;
  if (value.link !== undefined && typeof value.link !== "string") return false;
  return true;
};

const isSummaryInlineArray = (value: unknown): value is SummaryInline[] =>
  Array.isArray(value) && value.every(isSummaryInline);

const isSummaryBlock = (value: unknown): value is SummaryBlock => {
  if (!isObject(value) || typeof value.type !== "string" || !ALLOWED_BLOCK_TYPES.has(value.type)) {
    return false;
  }
  if (!isSummaryInlineArray(value.children)) return false;
  if (value.question !== undefined && !isSummaryInlineArray(value.question)) return false;
  if (value.answer !== undefined && !isSummaryInlineArray(value.answer)) return false;
  if (value.type === "qna_pair" && (!isSummaryInlineArray(value.question) || !isSummaryInlineArray(value.answer))) {
    return false;
  }
  return true;
};

// Runtime type guard for objects that already have the SummaryDocument shape.
export const isSummaryDocument = (value: unknown): value is SummaryDocument => {
  if (!isObject(value)) return false;
  if (typeof value.title !== "string" || typeof value.format !== "string") return false;
  if (!Array.isArray(value.blocks)) return false;
  return value.blocks.every(isSummaryBlock);
};

// Validates a JSON string and returns a typed SummaryDocument, or null if the input isn't a well-formed document.
export const parseSummaryDocument = (raw: unknown): SummaryDocument | null => {
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(parsed)) return null;
  if (typeof parsed.title !== "string" || typeof parsed.format !== "string" || !Array.isArray(parsed.blocks)) {
    return null;
  }

  const parseInlineArray = (candidate: unknown): SummaryInline[] => {
    if (!Array.isArray(candidate)) return [];
    const inlines: SummaryInline[] = [];
    for (const childCandidate of candidate) {
      if (!isObject(childCandidate) || typeof childCandidate.text !== "string") continue;
      const inline: SummaryInline = { text: childCandidate.text };
      if (childCandidate.bold === true) inline.bold = true;
      if (childCandidate.italic === true) inline.italic = true;
      if (childCandidate.code === true) inline.code = true;
      if (childCandidate.var === true) inline.var = true;
      if (typeof childCandidate.link === "string") inline.link = childCandidate.link;
      inlines.push(inline);
    }
    return inlines;
  };

  const blocks: SummaryBlock[] = [];
  for (const blockCandidate of parsed.blocks) {
    if (!isObject(blockCandidate)) continue;
    if (typeof blockCandidate.type !== "string" || !ALLOWED_BLOCK_TYPES.has(blockCandidate.type)) continue;

    if (blockCandidate.type === "qna_pair") {
      blocks.push({
        type: "qna_pair",
        children: [],
        question: parseInlineArray(blockCandidate.question),
        answer: parseInlineArray(blockCandidate.answer),
      });
      continue;
    }

    if (!Array.isArray(blockCandidate.children)) continue;
    blocks.push({ type: blockCandidate.type, children: parseInlineArray(blockCandidate.children) });
  }

  return { title: parsed.title, format: parsed.format, blocks };
};

// Flattens a summary into plain text for string-only consumers (PDF download, action-item endpoint).
export const documentToText = (value: SummaryDocument): string =>
  value.blocks
    .map((block) => block.children.map((child) => child.text).join(""))
    .filter((line) => line.length > 0)
    .map((line) => `• ${line}`)
    .join("\n");

export const documentToJSONString = (value: SummaryDocument): string => {
  return JSON.stringify(value)
}

// Builds an error-shaped SummaryDocument so the renderer can display failure states the same way it displays summaries.
export const errorDocument = (title: string, message: string): SummaryDocument => ({
  title,
  format: "error",
  blocks: [
    { type: "paragraph", children: [{ text: message }] },
  ],
});

// Wraps an errorDocument as a SummarizeResult for callers that return the hook's result type.
export const errorResult = (title: string, message: string): SummarizeResult => ({
  json: errorDocument(title, message),
  isSuccess: false,
});

const PERIOD_LABEL_DEFAULTS: Record<string, string> = {
  sec: "second",
  min: "minute",
  hour: "hour",
  day: "day",
};

const formatRetryTime = (t: TranslateFn, retryAfterSeconds?: number) => {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) return "";
  if (retryAfterSeconds < 60) {
    return t("summaryErrors.retrySeconds", {
      count: retryAfterSeconds,
      defaultValue: `${retryAfterSeconds} second(s)`,
    });
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return t("summaryErrors.retryMinutes", {
    count: minutes,
    defaultValue: `${minutes} minute(s)`,
  });
};

export const throttleMessage = (payload: SummarizeErrorPayload, t: TranslateFn) => {
  const summariesLimit = payload.summaries_limit;
  const periodKey = payload.limit_period ?? "";
  const periodLabel =
    t(`summaryErrors.period.${periodKey}`, {
      defaultValue: PERIOD_LABEL_DEFAULTS[periodKey] ?? periodKey,
    }) || periodKey;
  const retryText = formatRetryTime(t, payload.retry_after_seconds);

  let limitText = t("summaryErrors.limitReached", {
    defaultValue: "You have reached the summary limit.",
  });

  if (summariesLimit && periodLabel) {
    const templateKey =
      summariesLimit === 1
        ? "summaryErrors.limitPerPeriodSingular"
        : "summaryErrors.limitPerPeriodPlural";

    limitText = t(templateKey, {
      count: summariesLimit,
      period: periodLabel,
      defaultValue:
        summariesLimit === 1
          ? `You can generate ${summariesLimit} summary per ${periodLabel}.`
          : `You can generate ${summariesLimit} summaries per ${periodLabel}.`,
    });
  }

  const retryMessage = retryText
    ? ` ${t("summaryErrors.tryAgain", {
        time: retryText,
        defaultValue: `Try again in about ${retryText}.`,
      })}`
    : "";

  return `${limitText}${retryMessage}`;
};

export const anonymousThrottleMessage = (payload: SummarizeErrorPayload, t: TranslateFn) => {
  const limitMessage = throttleMessage(payload, t);
  const signInMessage = t("summaryErrors.signInForMore", {
    defaultValue: "Sign in to receive additional summaries.",
  });
  return `${limitMessage} ${signInMessage}`.trim();
};
