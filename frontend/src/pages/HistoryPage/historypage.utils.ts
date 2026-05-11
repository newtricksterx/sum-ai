import { type HistorySummary } from '../../stores/historyStore';

export interface HistoryPageProps {
  onSelectHistory: (historyItem: HistorySummary) => void;
}

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const getHostName = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};
