type ThrottlePayload = {
  summaries_limit?: number;
  limit_period?: string;
  retry_after_seconds?: number;
};

const PERIOD_LABELS: Record<string, string> = {
  sec: "second",
  min: "minute",
  hour: "hour",
  day: "day",
};

const formatRetryTime = (retryAfterSeconds?: number) => {
  if (!retryAfterSeconds || retryAfterSeconds <= 0) return "";
  if (retryAfterSeconds < 60) return `${retryAfterSeconds} second(s)`;

  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `${minutes} minute(s)`;
};

export const buildErrorSummaryHtml = (title: string, message: string) => {
  return `<h1>${title}</h1><p>${message}</p>`;
};

export const buildThrottleMessage = (payload: ThrottlePayload) => {
  const summariesLimit = payload.summaries_limit;
  const periodKey = payload.limit_period ?? "";
  const periodLabel = PERIOD_LABELS[periodKey] ?? periodKey;
  const retryText = formatRetryTime(payload.retry_after_seconds);

  const limitText =
    summariesLimit && periodLabel
      ? `You can generate ${summariesLimit} summar${summariesLimit === 1 ? "y" : "ies"} per ${periodLabel}.`
      : "You have reached the summary limit.";

  const retryMessage = retryText ? ` Try again in about ${retryText}.` : "";
  return `${limitText}${retryMessage}`;
};
