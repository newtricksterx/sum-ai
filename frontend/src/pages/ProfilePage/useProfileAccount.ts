import { useCallback, useEffect, useState } from "react";
import { authInstance } from "../../services/axiosService";
import { useHistoryStore } from "../../stores/historyStore";
import { useAuthProfileStore } from "../../stores/authProfileStore";
import { DEFAULT_REQUEST_ERROR, parseApiErrorMessage, getHistoryOwnerKeyFromEmail } from "./profilepage.helpers";

export const useProfileAccount = () => {
  const userProfile = useAuthProfileStore((state) => state.profile);
  const profileStatus = useAuthProfileStore((state) => state.status);
  const clearProfile = useAuthProfileStore((state) => state.clearProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);

  const resetHistoryOwner = useCallback(() => {
    setHistoryOwner("anonymous", 1);
  }, [setHistoryOwner]);

  useEffect(() => {
    if (userProfile) {
      setHistoryOwner(
        getHistoryOwnerKeyFromEmail(userProfile.email),
        userProfile.subscription?.history_limit ?? 1,
      );
      setErrorMessage(null);
      return;
    }

    if (profileStatus === "error") {
      setErrorMessage(DEFAULT_REQUEST_ERROR);
    }
    resetHistoryOwner();
  }, [profileStatus, resetHistoryOwner, setHistoryOwner, userProfile]);

  const handleLogout = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await authInstance.post("/api/logout");
      clearProfile();
      setInfoMessage("You have been logged out.");
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      resetHistoryOwner();
      setIsSubmitting(false);
    }
  }, [clearProfile, resetHistoryOwner]);

  return {
    userProfile,
    isInitializing: profileStatus === "loading",
    isSubmitting,
    errorMessage,
    infoMessage,
    handleLogout,
  };
};
