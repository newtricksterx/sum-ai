import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SummaryActionItem } from "../types/summary";

export type SessionState = {
    url: string;
    action_items: SummaryActionItem[]
}

export interface CurrentSessionState {
    session: SessionState;
    startSession: (newURL: string) => void;
    addActionItem: (newActionItem: SummaryActionItem) => void;
    removeActionItem: (actionItemId: string) => void;
    resetSession: () => void;
    restoreSession: (session: SessionState) => void;
}

const emptySession: SessionState = {
    url: "",
    action_items: [],
};

export const useCurrentSessionState = create<CurrentSessionState>()(
    persist(
        (set, get) => ({
            session: emptySession,
            startSession: (newURL) => set({ session: { ...emptySession, url: newURL } }),
            addActionItem: (newActionItem) =>
                set({ session: { ...get().session, action_items: [...get().session.action_items, newActionItem] } }),
            removeActionItem: (actionItemId) =>
                set({ session: { ...get().session, action_items: get().session.action_items.filter((item) => item.id !== actionItemId) } }),
            resetSession: () => set({ session: emptySession }),
            restoreSession: (session) => set({ session }),
        }),
        {
            name: "current-session",
            storage: createJSONStorage(() => localStorage)
        }
    )
)
