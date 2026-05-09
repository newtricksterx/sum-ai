type ThrottlePayload = {
  summaries_limit?: number;
  limit_period?: string;
  retry_after_seconds?: number;
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

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

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const buildErrorSummaryHtml = (title: string, message: string) => {
  return `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>`;
};

export const buildThrottleMessage = (payload: ThrottlePayload, t: TranslateFn) => {
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

export const buildAnonymousThrottleMessage = (payload: ThrottlePayload, t: TranslateFn) => {
  const limitMessage = buildThrottleMessage(payload, t);
  const signInMessage = t("summaryErrors.signInForMore", {
    defaultValue: "Sign in to receive additional summaries.",
  });
  return `${limitMessage} ${signInMessage}`.trim();
};
