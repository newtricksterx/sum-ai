import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import axios from "axios";
import { authInstance } from "../services/axiosService";

export type UserProfile = {
  id: number;
  username?: string | null;
  email: string;
  avatar_url?: string | null;
  first_name?: string;
  last_name?: string;
  subscription?: {
    plan_name: string;
    summary_limit: number | null;
    summaries_used?: number;
    history_limit: number | null;
    character_limit: number | null;
  };
  created_at: string;
  updated_at: string;
};

type AuthProfileStatus = "idle" | "loading" | "ready" | "error";

const ME_CACHE_TTL_MS = 60_000;

interface AuthProfileState {
  profile: UserProfile | null;
  status: AuthProfileStatus;
  lastFetchedAt: number | null;
  inFlightPromise: Promise<UserProfile | null> | null;
  hydrateProfile: (force?: boolean) => Promise<UserProfile | null>;
  clearProfile: () => void;
}

export const useAuthProfileStore = create<AuthProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      status: "ready",
      lastFetchedAt: null,
      inFlightPromise: null,
      hydrateProfile: async (force = false) => {
        const { profile, lastFetchedAt, inFlightPromise } = get();
        const now = Date.now();
        const isFresh = profile && lastFetchedAt !== null && now - lastFetchedAt < ME_CACHE_TTL_MS;

        if (!force && isFresh) {
          return profile;
        }

        if (inFlightPromise) {
          return inFlightPromise;
        }

        set({ status: "loading" });

        const nextInFlightPromise = authInstance
          .get<UserProfile>("/api/users/me")
          .then((response) => {
            const fetchedAt = Date.now();
            set({
              profile: response.data,
              status: "ready",
              lastFetchedAt: fetchedAt,
            });
            return response.data;
          })
          .catch((error: unknown) => {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              set({
                profile: null,
                status: "ready",
                lastFetchedAt: null,
              });
              return null;
            }

            set({
              profile: null,
              status: "error",
              lastFetchedAt: null,
            });
            throw error;
          })
          .finally(() => {
            set({ inFlightPromise: null });
          });

        set({ inFlightPromise: nextInFlightPromise });
        return nextInFlightPromise;
      },
      clearProfile: () =>
        set({
          profile: null,
          status: "ready",
          lastFetchedAt: null,
          inFlightPromise: null,
        }),
    }),
    {
      name: "auth-profile",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        lastFetchedAt: state.lastFetchedAt,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<AuthProfileState>),
        status: "ready",
        inFlightPromise: null,
      }),
    },
  ),
);
