import { useEffect } from "react";
import type { UserProfile } from "../../stores/authProfileStore";
import type { Currency } from "../../utils/types";

type HydrateProfileFn = (force?: boolean, currency?: string) => Promise<UserProfile | null>;

export const useHydrateProfileOnAuthChange = (
  authProfile: UserProfile | null,
  currency: Currency,
  hydrateProfile: HydrateProfileFn,
) => {
  useEffect(() => {
    if (!authProfile) {
      return;
    }

    void hydrateProfile(false, currency);
  }, [authProfile, currency, hydrateProfile]);
};
