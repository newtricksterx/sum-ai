import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SummaryActionItem } from "../types/summary";

export interface CurrentSessionState {
    url: string;
    action_items: SummaryActionItem[];
    startSession: (newURL: string) => void;
    addActionItem: (newActionItem: SummaryActionItem) => void;
    removeActionItem: (actionItemId: string) => void;
    resetSession: () => void;
}

const emptySession = {
    url: "",
    isSuccess: false,
    action_items: [] as SummaryActionItem[],
};

export const useCurrentSessionState = create<CurrentSessionState>()(
    persist(
        (set, get) => ({
            ...emptySession,
            startSession: (newURL) => set({ ...emptySession, url: newURL }),
            addActionItem: (newActionItem) => set({ action_items: [...get().action_items, newActionItem] }),
            removeActionItem: (actionItemId) =>
                set({ action_items: get().action_items.filter((item) => item.id !== actionItemId) }),
            resetSession: () => set({ ...emptySession }),
        }),
        {
            name: "current-session",
            storage: createJSONStorage(() => localStorage)
        }
    )
)
