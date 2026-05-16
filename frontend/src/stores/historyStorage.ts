import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SessionState } from "./sessionStorage";
import { useAuthProfileStore } from "./authProfileStore";

export const ANONYMOUS_HISTORY_KEY = "anonymous";

export type HistoryItem = {
    url: string;
    updatedAt: number;
    session: SessionState;
};

type HistoryByUser = Record<string, HistoryItem[]>;

export interface HistoryStorageState {
    histories: HistoryByUser;
    upsertHistoryItem: (userKey: string, session: SessionState, limit: number | null) => void;
    removeHistoryItem: (userKey: string, url: string) => void;
    clearHistory: (userKey: string) => void;
}

export const useHistoryStorage = create<HistoryStorageState>()(
    persist(
        (set, get) => ({
            histories: {},
            upsertHistoryItem: (userKey, session, limit) => {
                if (!session.url) return;
                const current = get().histories[userKey] ?? [];
                const filtered = current.filter((item) => item.url !== session.url);
                const next: HistoryItem[] = [
                    { url: session.url, updatedAt: Date.now(), session },
                    ...filtered,
                ];
                const trimmed = limit != null && limit > 0 ? next.slice(0, limit) : next;
                set({ histories: { ...get().histories, [userKey]: trimmed } });
            },
            removeHistoryItem: (userKey, url) => {
                const current = get().histories[userKey] ?? [];
                set({ histories: { ...get().histories, [userKey]: current.filter((item) => item.url !== url) } });
            },
            clearHistory: (userKey) => {
                set({ histories: { ...get().histories, [userKey]: [] } });
            },
        }),
        {
            name: "user-history",
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export const useCurrentUserHistoryKey = (): string => {
    const email = useAuthProfileStore((state) => state.profile?.email);
    return email ?? ANONYMOUS_HISTORY_KEY;
};

// Stable empty-array reference: zustand's selector is read via useSyncExternalStore,
// which throws React error #185 when consecutive snapshots return different references.
// A fresh `[]` literal here would break that contract whenever the current user has no
// history entry yet (very common: anonymous first load, fresh login, etc.).
const EMPTY_HISTORY: HistoryItem[] = [];

export const useCurrentUserHistory = (): HistoryItem[] => {
    const key = useCurrentUserHistoryKey();
    return useHistoryStorage((state) => state.histories[key] ?? EMPTY_HISTORY);
};
