export const formatDate = (rawDate: string) => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
};

export const formatLimit = (
  value: number | null | undefined,
  suffix = "",
  t?: (key: string, defaultValue: string) => string,
) => {
  if (value === null) {
    return t ? t("profile.unlimited", "Unlimited") : "Unlimited";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString()}${suffix}`;
  }

  return t ? t("profile.unavailable", "Unavailable") : "Unavailable";
};

export const deriveWordLimit = (
  characterLimit: number | null | undefined,
  t?: (key: string, defaultValue: string) => string,
) => {
  const words = t ? t("profile.words", "words") : "words";

  if (characterLimit === null) {
    return t ? t("profile.unlimited", "Unlimited") : "Unlimited";
  }

  if (typeof characterLimit !== "number") {
    return t ? t("profile.unavailable", "Unavailable") : "Unavailable";
  }

  if (characterLimit <= 10000) {
    return `1,500 ${words}`;
  }

  if (characterLimit <= 30000) {
    return `5,000 ${words}`;
  }

  return `${Math.round(characterLimit / 6.5).toLocaleString()} ${words}`;
};

type BillingIntervalTranslator = (key: string, defaultValue: string) => string;


export const deriveSubscriptionPrice = (
  priceMinor: number | null | undefined,
  currency: string | null | undefined,
  t: BillingIntervalTranslator,
) => {
  if (typeof priceMinor !== "number" || Number.isNaN(priceMinor) || priceMinor < 0) {
    return t("profile.unavailable", "Unavailable");
  }

  if (priceMinor === 0) {
    return t("profile.subscriptionPriceFree", "Free");
  }

  const normalizedCurrency = currency?.trim().toUpperCase();
  if (!normalizedCurrency) {
    return t("profile.unavailable", "Unavailable");
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
    }).format(priceMinor / 100);
  } catch {
    return `${(priceMinor / 100).toFixed(2)} ${normalizedCurrency}`;
  }
};

export const getUsageClass = (percentage: number): string => {
  if (percentage >= 80) return " pp-bar-fill--high";
  if (percentage >= 50) return " pp-bar-fill--mid";
  return "";
};

export const deriveDisplayName = (userProfile: { username?: string | null; email: string } | null | undefined): string => {
  if (!userProfile) return "";
  const username = userProfile.username?.trim();
  if (username && username.length > 0) return username;
  const emailLocalPart = userProfile.email.split("@")[0]?.trim();
  return emailLocalPart && emailLocalPart.length > 0 ? emailLocalPart : userProfile.email;
};

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

export const deriveUsageMetrics = (
  actionLimit: number | null | undefined,
  rawActionsUsed: number | null | undefined,
) => {
  const actionsUsed = Math.max(0, rawActionsUsed ?? 0);
  const isUnlimited = actionLimit === null;
  const boundedLimit =
    typeof actionLimit === "number" ? Math.max(0, actionLimit) : null;
  const percentage =
    boundedLimit && boundedLimit > 0
      ? Math.min(100, (Math.min(actionsUsed, boundedLimit) / boundedLimit) * 100)
      : 0;
  const displayUsed = Math.min(actionsUsed, boundedLimit ?? actionsUsed);
  const usageClass = getUsageClass(percentage);

  return { isUnlimited, boundedLimit, actionsUsed, displayUsed, percentage, usageClass };
};
