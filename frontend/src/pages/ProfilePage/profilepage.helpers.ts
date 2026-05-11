import axios from "axios";

export const PLAN_TOOLTIP = "Your current subscription tier. It controls usage limits and available features.";
export const WORD_LIMIT_TOOLTIP = "The approximate maximum amount of text you can summarize in one request.";
export const HISTORY_CAPACITY_TOOLTIP = "The number of summaries this account can keep in saved history.";

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


export const DEFAULT_REQUEST_ERROR = "We could not complete that request. Please try again.";

export const parseApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      return responseData;
    }

    if (responseData && typeof responseData === "object") {
      const data = responseData as Record<string, unknown>;
      const detail = data.detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }

      const messages: string[] = [];
      Object.values(data).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === "string" && item.trim().length > 0) {
              messages.push(item);
            }
          });
          return;
        }

        if (typeof value === "string" && value.trim().length > 0) {
          messages.push(value);
        }
      });

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  return DEFAULT_REQUEST_ERROR;
};

export const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};