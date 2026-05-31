import { create } from "zustand";
import axios from "axios";
import { authInstance, getCsrfToken } from "../services/axiosService";
import { markLoggedOut } from "../services/authSignals";

export type UserProfile = {
  username?: string | null;
  email: string;
  avatar_url?: string | null;
  subscription?: {
    plan_slug?: string;
    plan_name: string;
    billing_interval?: string | null;
    price_minor?: number | null;
    currency?: string | null;
    action_limit: number | null;
    actions_used?: number;
    history_limit: number | null;
    character_limit: number | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
  };
  created_at: string;
  updated_at: string;
};

type AuthProfileStatus = "idle" | "loading" | "ready" | "error";

const ME_CACHE_TTL_MS = 60_000;

// Clean up stale localStorage data from previous versions that used persist.
try { localStorage.removeItem("auth-profile"); } catch { /* noop */ }

interface AuthProfileState {
  profile: UserProfile | null;
  status: AuthProfileStatus;
  lastFetchedAt: number | null;
  lastCurrency: string | null;
  inFlightPromise: Promise<UserProfile | null> | null;
  inFlightCurrency: string | null;
  hydrateProfile: (force?: boolean, currency?: string) => Promise<UserProfile | null>;
  clearProfile: () => void;
  logout: () => Promise<void>;
}

export const useAuthProfileStore = create<AuthProfileState>()(
  (set, get) => ({
    profile: null,
    status: "idle",
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
    logout: async () => {
      markLoggedOut();
      let logoutFailed = false;
      try {
        await getCsrfToken(true);
        await authInstance.post("/api/logout");
      } catch (err) {
        logoutFailed = true;
        console.error("[logout] backend logout failed:", err);
      }
      set({
        profile: null,
        status: "ready",
        lastFetchedAt: null,
        lastCurrency: null,
        inFlightPromise: null,
        inFlightCurrency: null,
      });
      await getCsrfToken(true).catch(() => undefined);
      if (logoutFailed) {
        throw new Error("Logout failed on the server. Your session cookies may not have been cleared.");
      }
    },
  }),
);
