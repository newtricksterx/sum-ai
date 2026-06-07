import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authInstance } from "../../services/axiosService";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { parseApiErrorMessage, DEFAULT_REQUEST_ERROR } from "../../utils/apiError";

export const useProfileAccount = () => {
  const { t } = useTranslation();
  const userProfile = useAuthProfileStore((state) => state.profile);
  const profileStatus = useAuthProfileStore((state) => state.status);
  const logout = useAuthProfileStore((state) => state.logout);
  const currency = useSettingsStore((s) => s.currency);
  const language = useSettingsStore((s) => s.language);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setErrorMessage(null);
      return;
    }

    if (profileStatus === "error") {
      setErrorMessage(t("profile.requestError", { defaultValue: DEFAULT_REQUEST_ERROR }));
    }
  }, [profileStatus, userProfile, t]);

  const handleLogout = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await logout();
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [logout, t]);

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const openBillingPortal = useCallback(() => {
    const plan_slug = userProfile?.subscription?.plan_slug;
    if (plan_slug !== "standard" && plan_slug !== "pro") return;

    setErrorMessage(null);
    // Open the new tab synchronously while we still have the user-gesture
    // context — popup blockers reject window.open called after the await.
    const popup = window.open("about:blank", "_blank");

    void (async () => {
      try {
        const { data } = await authInstance.post<{ url: string }>(
          "/api/billing/checkout-session",
          { plan_slug, currency, language },
        );
        if (popup && !popup.closed) {
          popup.opener = null;
          popup.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } catch (error) {
        popup?.close();
        setErrorMessage(parseApiErrorMessage(error));
      }
    })();
  }, [userProfile, currency, language]);

  return {
    userProfile,
    isInitializing: profileStatus === "idle" || profileStatus === "loading",
    isSubmitting,
    errorMessage,
    handleLogout,
    openBillingPortal,
    dismissError,
  };
};
