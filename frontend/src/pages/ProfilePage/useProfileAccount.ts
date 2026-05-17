import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { authInstance } from "../../services/axiosService";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { parseApiErrorMessage, DEFAULT_REQUEST_ERROR } from "../../utils/apiError";

export const useProfileAccount = () => {
  const { t } = useTranslation();
  const userProfile = useAuthProfileStore((state) => state.profile);
  const profileStatus = useAuthProfileStore((state) => state.status);
  const clearProfile = useAuthProfileStore((state) => state.clearProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

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
    setInfoMessage(null);

    try {
      await authInstance.post("/api/logout");
      clearProfile();
      setInfoMessage(t("profile.loggedOut", { defaultValue: "You have been logged out." }));
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }, [clearProfile, t]);

  const dismissError = useCallback(() => setErrorMessage(null), []);

  return {
    userProfile,
    isInitializing: profileStatus === "loading",
    isSubmitting,
    errorMessage,
    infoMessage,
    handleLogout,
    dismissError,
  };
};
