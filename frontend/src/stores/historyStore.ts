import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Summary {
  url: string;
  content: string;
}

interface HistoryState {
  cache: Summary[];
  maxSize: number;
  addSummary: (summary: Summary) => void;
}

export const useHistoryStore = create<HistoryState>()(
    persist((set) => ({
        cache: [],
        maxSize: 5, // Keep only the last 5
        addSummary: (newSummary) => set((state) => {
            // 1. Filter out the item if it already exists (to "move it to the front")
            const remaining = state.cache.filter(item => item.url !== newSummary.url);
            
            // 2. Add new item to the start of the array
            const updatedCache = [newSummary, ...remaining];
            
            // 3. Evict the oldest if we exceed maxSize
            return { cache: updatedCache.slice(0, state.maxSize) };
        }),
    }), 

    { name: 'summary-history' })
);