import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeSummaryActionItems, type SummaryActionItem } from "../types/summary";
import { SummaryDocument } from "../pages/SummaryPage/utils/types";
import { isSummaryDocument } from "../pages/SummaryPage/utils/document";


// Logged-out users should only keep one summary.
const DEFAULT_HISTORY_SIZE = 1;
// Special owner bucket for users without an authenticated identity.
const ANONYMOUS_OWNER_KEY = "anonymous";

export interface HistorySummary {
  url: string;
  document_content: SummaryDocument;
  json_content: string;
  actionItems?: SummaryActionItem[];
  isSuccess?: boolean;
}

type OwnerHistoryState = {
  cache: HistorySummary[];
  maxHistorySize: number;
};

// Guardrails for limits coming from API/local storage.
const normalizeHistorySize = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_HISTORY_SIZE;
  }

  const normalized = Math.floor(value);
  return normalized >= 1 ? normalized : DEFAULT_HISTORY_SIZE;
};

const normalizeOwnerKey = (ownerKey: string | null | undefined) => {
  if (typeof ownerKey !== "string") {
    return ANONYMOUS_OWNER_KEY;
  }

  const trimmed = ownerKey.trim();
  return trimmed.length > 0 ? trimmed : ANONYMOUS_OWNER_KEY;
};

const getDefaultOwnerHistory = (): OwnerHistoryState => ({
  cache: [],
  maxHistorySize: DEFAULT_HISTORY_SIZE,
});

const getOwnerHistory = (
  ownerHistories: Record<string, OwnerHistoryState>,
  ownerKey: string,
): OwnerHistoryState => ownerHistories[ownerKey] ?? getDefaultOwnerHistory();

interface HistoryState {
  cache: HistorySummary[];
  maxHistorySize: number;
  activeOwnerKey: string;
  ownerHistories: Record<string, OwnerHistoryState>;
  setHistoryOwner: (ownerKey: string, limit?: number | null) => void;
  setHistoryLimit: (limit: number | null | undefined) => void;
  addSummary: (summary: HistorySummary) => void;
  updateSummaryActionItems: (url: string, actionItems: SummaryActionItem[]) => void;
  clearHistory: () => void;
  removeSummary: (url: string) => void;
}

const normalizeHistorySummary = (value: unknown): HistorySummary | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<HistorySummary>;
  if (typeof candidate.url !== "string" || !(isSummaryDocument(candidate.document_content))|| typeof candidate.json_content !== "string") {
    return null;
  }

  return {
    url: candidate.url,
    document_content: candidate.document_content,
    json_content: candidate.json_content,
    actionItems: normalizeSummaryActionItems(candidate.actionItems),
    isSuccess: candidate.isSuccess !== false,
  };
};

const normalizeHistoryCache = (value: unknown): HistorySummary[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const normalizedItem = normalizeHistorySummary(item);
    return normalizedItem ? [normalizedItem] : [];
  });
};

const applyOwnerCache = (
  state: Pick<HistoryState, 'activeOwnerKey' | 'ownerHistories' | 'maxHistorySize'>,
  nextCache: HistorySummary[],
  nextLimit?: number,
) => {
  const maxHistorySize = nextLimit ?? state.maxHistorySize;
  return {
    cache: nextCache,
    maxHistorySize,
    ownerHistories: {
      ...state.ownerHistories,
      [state.activeOwnerKey]: { cache: nextCache, maxHistorySize },
    },
  };
};

export const useHistoryStore = create<HistoryState>()(
    persist((set) => ({
        cache: [],
        maxHistorySize: DEFAULT_HISTORY_SIZE,
        activeOwnerKey: ANONYMOUS_OWNER_KEY,
        ownerHistories: {
            [ANONYMOUS_OWNER_KEY]: getDefaultOwnerHistory(),
        },
        setHistoryOwner: (ownerKey, limit) =>
            set((state) => {
                // Switch active owner while preserving the current owner's in-memory view.
                const nextOwnerKey = normalizeOwnerKey(ownerKey);
                const normalizedLimit = limit === undefined ? undefined : normalizeHistorySize(limit);
                const currentOwnerHistory: OwnerHistoryState = {
                    cache: state.cache,
                    maxHistorySize: state.maxHistorySize,
                };

                const baseTargetOwnerHistory = getOwnerHistory(state.ownerHistories, nextOwnerKey);
                // Optional limit lets callers update plan constraints while switching owner.
                const targetOwnerHistory = normalizedLimit === undefined
                    ? baseTargetOwnerHistory
                    : {
                        ...baseTargetOwnerHistory,
                        maxHistorySize: normalizedLimit,
                        cache: baseTargetOwnerHistory.cache.slice(0, normalizedLimit),
                    };

                return {
                    activeOwnerKey: nextOwnerKey,
                    ownerHistories: {
                        // Persist both snapshots so switching back restores prior history.
                        ...state.ownerHistories,
                        [state.activeOwnerKey]: currentOwnerHistory,
                        [nextOwnerKey]: targetOwnerHistory,
                    },
                    cache: targetOwnerHistory.cache,
                    maxHistorySize: targetOwnerHistory.maxHistorySize,
                };
            }),
        setHistoryLimit: (limit) =>
            set((state) => {
                const nextLimit = normalizeHistorySize(limit);
                const nextCache = state.cache.slice(0, nextLimit);
                return applyOwnerCache(state, nextCache, nextLimit);
            }),
        addSummary: (newSummary) => set((state) => {
            const normalizedSummary: HistorySummary = {
                ...newSummary,
                actionItems: normalizeSummaryActionItems(newSummary.actionItems),
                isSuccess: newSummary.isSuccess !== false,
            };
            // Move existing item to the top by removing duplicate URL first.
            const remaining = state.cache.filter(item => item.url !== normalizedSummary.url);
            const nextCache = [normalizedSummary, ...remaining].slice(0, state.maxHistorySize);
            return applyOwnerCache(state, nextCache);
        }),
        updateSummaryActionItems: (url, actionItems) => set((state) => {
            const existingIndex = state.cache.findIndex((item) => item.url === url);
            if (existingIndex === -1) {
                return state;
            }

            const normalizedActionItems = normalizeSummaryActionItems(actionItems);
            const nextCache = state.cache.map((item) =>
                item.url === url
                    ? { ...item, actionItems: normalizedActionItems }
                    : item,
            );

            return applyOwnerCache(state, nextCache);
        }),
        clearHistory: () => set((state) => applyOwnerCache(state, [])),
        removeSummary: (url) => set((state) => {
            const nextCache = state.cache.filter((item) => item.url !== url);
            return applyOwnerCache(state, nextCache);
        }),
    }), 

    {
        name: 'summary-history',
        // Persist owner buckets, not just the currently visible cache.
        partialize: (state) => ({
            ownerHistories: state.ownerHistories,
            activeOwnerKey: state.activeOwnerKey,
        }),
        merge: (persistedState, currentState) => {
            const stateFromStorage = (persistedState as Partial<HistoryState>) ?? {};
            const ownerHistoriesFromStorage = stateFromStorage.ownerHistories;
            const isOwnerHistoriesObject = ownerHistoriesFromStorage
                && typeof ownerHistoriesFromStorage === "object"
                && !Array.isArray(ownerHistoriesFromStorage);

            const normalizedOwnerHistories: Record<string, OwnerHistoryState> = {};
            if (isOwnerHistoriesObject) {
                // Current format: restore each owner bucket defensively.
                Object.entries(ownerHistoriesFromStorage).forEach(([ownerKey, ownerValue]) => {
                    const normalizedOwnerKey = normalizeOwnerKey(ownerKey);
                    const ownerCache = normalizeHistoryCache(ownerValue?.cache);
                    const ownerLimit = normalizeHistorySize(ownerValue?.maxHistorySize);

                    normalizedOwnerHistories[normalizedOwnerKey] = {
                        cache: ownerCache.slice(0, ownerLimit),
                        maxHistorySize: ownerLimit,
                    };
                });
            } else {
                // Backward compatibility: promote the old single-cache shape to anonymous owner.
                const legacyLimit = normalizeHistorySize(stateFromStorage.maxHistorySize);
                const legacyCache = normalizeHistoryCache(stateFromStorage.cache);
                normalizedOwnerHistories[ANONYMOUS_OWNER_KEY] = {
                    cache: legacyCache.slice(0, legacyLimit),
                    maxHistorySize: legacyLimit,
                };
            }

            if (!normalizedOwnerHistories[ANONYMOUS_OWNER_KEY]) {
                // Always ensure logged-out mode has a valid bucket.
                normalizedOwnerHistories[ANONYMOUS_OWNER_KEY] = getDefaultOwnerHistory();
            }

            const persistedActiveOwnerKey = normalizeOwnerKey(stateFromStorage.activeOwnerKey);
            const activeOwnerKey = normalizedOwnerHistories[persistedActiveOwnerKey]
                ? persistedActiveOwnerKey
                : ANONYMOUS_OWNER_KEY;
            const activeOwnerHistory = normalizedOwnerHistories[activeOwnerKey];

            return {
                ...currentState,
                ownerHistories: normalizedOwnerHistories,
                activeOwnerKey,
                cache: activeOwnerHistory.cache,
                maxHistorySize: activeOwnerHistory.maxHistorySize,
            };
        },
    })
);
