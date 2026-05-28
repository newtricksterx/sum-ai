import { useEffect } from "react";
import { clearLoginPending, isLoginPending } from "../../services/authSignals";
import { getCsrfToken } from "../../services/axiosService";

type HydrateProfile = (force?: boolean, currency?: string) => Promise<unknown>;

export const useHydrateProfileAfterLogin = (
  hydrateProfile: HydrateProfile,
  currency: string,
) => {
  useEffect(() => {
    let isMounted = true;
    let isHydrating = false;

    const hydrateAfterLoginIfNeeded = async () => {
      if (isHydrating || !isLoginPending()) {
        return;
      }

      isHydrating = true;
      try {
        // The pre-login CSRF token was scoped to the anonymous session.
        // Refresh it before any post-login mutating request can fire.
        await getCsrfToken(true).catch(() => undefined);
        await hydrateProfile(true, currency);
      } catch {
        // If login is incomplete/failed, the store will remain unauthenticated.
      } finally {
        if (isMounted) {
          clearLoginPending();
        }
        isHydrating = false;
      }
    };

    void hydrateAfterLoginIfNeeded();

    const handleWindowFocus = () => {
      void hydrateAfterLoginIfNeeded();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void hydrateAfterLoginIfNeeded();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currency, hydrateProfile]);
};
