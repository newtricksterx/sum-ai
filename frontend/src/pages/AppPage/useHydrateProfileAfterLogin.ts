import { useEffect } from "react";
import { clearLoginPending, isLoginPending } from "../../services/authSignals";

type HydrateProfile = (force?: boolean, currency?: string) => Promise<unknown>;

export const useHydrateProfileAfterLogin = (
  hydrateProfile: HydrateProfile,
  currency: string,
) => {
  useEffect(() => {
    let isMounted = true;

    const hydrateAfterLoginIfNeeded = async () => {
      if (!isLoginPending()) {
        return;
      }

      try {
        await hydrateProfile(true, currency);
      } catch {
        // If login is incomplete/failed, the store will remain unauthenticated.
      } finally {
        if (isMounted) {
          clearLoginPending();
        }
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
