import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_HISTORY_SIZE = 5;

export interface HistorySummary {
  url: string;
  content: string;
}

interface HistoryState {
  cache: HistorySummary[];
  addSummary: (summary: HistorySummary) => void;
  clearHistory: () => void;
  removeSummary: (url: string) => void;
}

export const useHistoryStore = create<HistoryState>()(
    persist((set) => ({
        cache: [],
        addSummary: (newSummary) => set((state) => {
            // 1. Filter out the item if it already exists (to "move it to the front")
            const remaining = state.cache.filter(item => item.url !== newSummary.url);
             
            // 2. Add new item to the start of the array
            const updatedCache = [newSummary, ...remaining];
             
            // 3. Evict the oldest if we exceed maxSize
            return { cache: updatedCache.slice(0, MAX_HISTORY_SIZE) };
        }),
        clearHistory: () => set(() => ({ cache: [] })),
        removeSummary: (url) => set((state) => ({
            cache: state.cache.filter((item) => item.url !== url),
        })),
    }), 

    {
        name: 'summary-history',
        partialize: (state) => ({
            cache: state.cache.slice(0, MAX_HISTORY_SIZE),
        }),
        merge: (persistedState, currentState) => {
            const persistedCache = Array.isArray((persistedState as Partial<HistoryState>)?.cache)
                ? (persistedState as Partial<HistoryState>).cache ?? []
                : [];

            return {
                ...currentState,
                cache: persistedCache.slice(0, MAX_HISTORY_SIZE),
            };
        },
    })
);
