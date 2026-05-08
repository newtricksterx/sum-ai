import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import axios from "axios";
import { authInstance } from "../services/axiosService";

export type UserProfile = {
  username?: string | null;
  email: string;
  avatar_url?: string | null;
  subscription?: {
    plan_name: string;
    billing_interval?: string | null;
    price_minor?: number | null;
    currency?: string | null;
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
  lastCurrency: string | null;
  inFlightPromise: Promise<UserProfile | null> | null;
  inFlightCurrency: string | null;
  hydrateProfile: (force?: boolean, currency?: string) => Promise<UserProfile | null>;
  clearProfile: () => void;
}

export const useAuthProfileStore = create<AuthProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      status: "ready",
      lastFetchedAt: null,
      lastCurrency: null,
      inFlightPromise: null,
      inFlightCurrency: null,
      hydrateProfile: async (force = false, currency) => {
        const { profile, lastFetchedAt, inFlightPromise, inFlightCurrency, lastCurrency } = get();
        const now = Date.now();
        const requestedCurrency = (currency ?? lastCurrency ?? "USD").trim().toUpperCase();
        const isFresh = (
          profile
          && lastFetchedAt !== null
          && now - lastFetchedAt < ME_CACHE_TTL_MS
          && lastCurrency === requestedCurrency
        );

        if (!force && isFresh) {
          return profile;
        }

        if (inFlightPromise && inFlightCurrency === requestedCurrency) {
          return inFlightPromise;
        }

        set({ status: "loading" });

        const nextInFlightPromise = authInstance
          .get<UserProfile>("/api/users/me", {
            params: { currency: requestedCurrency },
          })
          .then((response) => {
            const fetchedAt = Date.now();
            set({
              profile: response.data,
              status: "ready",
              lastFetchedAt: fetchedAt,
              lastCurrency: requestedCurrency,
            });
            return response.data;
          })
          .catch((error: unknown) => {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              set({
                profile: null,
                status: "ready",
                lastFetchedAt: null,
                lastCurrency: null,
              });
              return null;
            }

            set({
              profile: null,
              status: "error",
              lastFetchedAt: null,
              lastCurrency: null,
            });
            throw error;
          })
          .finally(() => {
            set({
              inFlightPromise: null,
              inFlightCurrency: null,
            });
          });

        set({
          inFlightPromise: nextInFlightPromise,
          inFlightCurrency: requestedCurrency,
        });
        return nextInFlightPromise;
      },
      clearProfile: () =>
        set({
          profile: null,
          status: "ready",
          lastFetchedAt: null,
          lastCurrency: null,
          inFlightPromise: null,
          inFlightCurrency: null,
        }),
    }),
    {
      name: "auth-profile",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profile: state.profile,
        lastFetchedAt: state.lastFetchedAt,
        lastCurrency: state.lastCurrency,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<AuthProfileState>),
        status: "ready",
        inFlightPromise: null,
        inFlightCurrency: null,
      }),
    },
  ),
);
