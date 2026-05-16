import { useEffect, useRef } from "react";
import type { UserProfile } from "../../stores/authProfileStore";
import { useCurrentSessionState } from "../../stores/sessionStorage";
import { useHistoryStorage } from "../../stores/historyStorage";

// Sentinel distinct from null/string so the first render is recognized as
// "no prior observation" and skipped — only true transitions act. Using null
// here would conflate "first render" with "currently logged out" and wrongly
// fire the logout-reset path on every cold start while anonymous.
const UNOBSERVED = Symbol("unobserved");

export const useRestoreSessionOnLogin = (authProfile: UserProfile | null) => {
  const previousEmailRef = useRef<string | null | typeof UNOBSERVED>(UNOBSERVED);

  useEffect(() => {
    const currentEmail = authProfile?.email ?? null;
    const previousEmail = previousEmailRef.current;
    previousEmailRef.current = currentEmail;

    if (previousEmail === UNOBSERVED) return;
    if (previousEmail === currentEmail) return;

    if (currentEmail === null) {
      useCurrentSessionState.getState().resetSession();
      return;
    }

    const list = useHistoryStorage.getState().histories[currentEmail];
    const mostRecent = list?.[0];
    if (mostRecent) {
      useCurrentSessionState.getState().restoreSession(mostRecent.session);
    } else {
      useCurrentSessionState.getState().resetSession();
    }
  }, [authProfile]);
};
