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

export const formatLimit = (value: number | null | undefined) => {
  if (value === null) {
    return "Unlimited";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
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

export const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};