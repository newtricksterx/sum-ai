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

export const formatLimit = (value: number | null | undefined, suffix = "") => {
  if (value === null) {
    return "Unlimited";
  }

  if (typeof value === "number") {
    return `${value.toLocaleString()}${suffix}`;
  }

  return "Unavailable";
};

export const deriveWordLimit = (characterLimit: number | null | undefined) => {
  if (characterLimit === null) {
    return "Unlimited";
  }

  if (typeof characterLimit !== "number") {
    return "Unavailable";
  }

  if (characterLimit <= 10000) {
    return "1,500 words";
  }

  if (characterLimit <= 30000) {
    return "5,000 words";
  }

  return `${Math.round(characterLimit / 6.5).toLocaleString()} words`;
};

type BillingIntervalTranslator = (key: string, defaultValue: string) => string;

export const deriveBillingInterval = (
  billingInterval: string | null | undefined,
  t: BillingIntervalTranslator,
) => {
  const normalizedInterval = billingInterval?.trim().toLowerCase();

  if (normalizedInterval === "daily") {
    return t("profile.billingIntervalDaily", "Daily");
  }

  if (normalizedInterval === "weekly") {
    return t("profile.billingIntervalWeekly", "Weekly");
  }

  if (normalizedInterval === "monthly") {
    return t("profile.billingIntervalMonthly", "Monthly");
  }

  if (normalizedInterval === "yearly") {
    return t("profile.billingIntervalYearly", "Yearly");
  }

  if (normalizedInterval && normalizedInterval.length > 0) {
    return normalizedInterval.charAt(0).toUpperCase() + normalizedInterval.slice(1);
  }

  return t("profile.unavailable", "Unavailable");
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
