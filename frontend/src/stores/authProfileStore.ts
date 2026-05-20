import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import axios from "axios";
import { authInstance } from "../services/axiosService";

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
  };
  created_at: string;
  updated_at: string;
};

type AuthProfileStatus = "idle" | "loading" | "ready" | "error";

const ME_CACHE_TTL_MS = 60_000;
const AUTH_PROFILE_PERSIST_VERSION = 2;
const AUTH_PROFILE_STORAGE_KEY = "auth-profile";

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

type PersistedAuthProfileState = {
  encodedProfile?: string | null;
  lastFetchedAt?: number | null;
  lastCurrency?: string | null;
};

const encodeProfileText = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
};

const decodeProfileText = (value: string) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
};

const encodeProfileForStorage = (profile: UserProfile | null): string | null => {
  if (!profile) {
    return null;
  }

  return encodeProfileText(JSON.stringify(profile));
};

const decodeProfileFromStorage = (encoded: string | null | undefined): UserProfile | null => {
  if (!encoded) {
    return null;
  }

  try {
    return JSON.parse(decodeProfileText(encoded)) as UserProfile;
  } catch {
    return null;
  }
};

// Returns true iff the persisted blob exists AND decodes to a non-null profile.
// When in-memory `profile` is set but this returns false, the cache has been
// wiped or modified out from under us — caller should force a logout.
export const isPersistedAuthProfileIntact = (): boolean => {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: PersistedAuthProfileState };
    const encoded = parsed?.state?.encodedProfile;
    if (!encoded) return false;
    return decodeProfileFromStorage(encoded) !== null;
  } catch {
    return false;
  }
};

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
      logout: async () => {
        try {
          await authInstance.post("/api/logout");
        } catch {
          // Best effort. If we're being invoked because the local cache is
          // corrupt, the JWT cookie or CSRF token may already be invalid.
        }
        set({
          profile: null,
          status: "ready",
          lastFetchedAt: null,
          lastCurrency: null,
          inFlightPromise: null,
          inFlightCurrency: null,
        });
        try {
          localStorage.removeItem(AUTH_PROFILE_STORAGE_KEY);
        } catch {
          // localStorage can throw in private mode; non-fatal.
        }
      },
    }),
    {
      name: AUTH_PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: AUTH_PROFILE_PERSIST_VERSION,
      migrate: (persistedState, version) => {
        // Any pre-v2 shape (hand-rolled v1, or unversioned) is incompatible
        // with the current encoded-blob layout. Drop the profile and let the
        // next hydrateProfile() refetch it from /api/users/me.
        if (version < AUTH_PROFILE_PERSIST_VERSION) {
          const legacy = (persistedState as Partial<PersistedAuthProfileState>) ?? {};
          return {
            encodedProfile: null,
            lastFetchedAt: null,
            lastCurrency: legacy.lastCurrency ?? null,
          } satisfies PersistedAuthProfileState;
        }
        return persistedState as PersistedAuthProfileState;
      },
      partialize: (state): PersistedAuthProfileState => ({
        encodedProfile: encodeProfileForStorage(state.profile),
        lastFetchedAt: state.lastFetchedAt,
        lastCurrency: state.lastCurrency,
      }),
      merge: (persistedState, currentState) => {
        const { encodedProfile, ...persistedAuthState } =
          (persistedState as PersistedAuthProfileState | undefined) ?? {};

        return {
          ...currentState,
          ...persistedAuthState,
          profile: decodeProfileFromStorage(encodedProfile),
          status: "ready",
          inFlightPromise: null,
          inFlightCurrency: null,
        };
      },
    },
  ),
);
