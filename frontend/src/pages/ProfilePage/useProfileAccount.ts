import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { authInstance } from "../../services/axiosService";
import { useAuthProfileStore } from "../../stores/authProfileStore";

const DEFAULT_REQUEST_ERROR = "We could not complete that request. Please try again.";

const parseApiErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      return responseData;
    }

    if (responseData && typeof responseData === "object") {
      const data = responseData as Record<string, unknown>;
      const detail = data.detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        return detail;
      }

      const messages: string[] = [];
      Object.values(data).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === "string" && item.trim().length > 0) {
              messages.push(item);
            }
          });
          return;
        }

        if (typeof value === "string" && value.trim().length > 0) {
          messages.push(value);
        }
      });

      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
  }

  return DEFAULT_REQUEST_ERROR;
};

export const useProfileAccount = () => {
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
      setErrorMessage(DEFAULT_REQUEST_ERROR);
    }
  }, [profileStatus, userProfile]);

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
      setIsSubmitting(false);
    }
  }, [clearProfile]);

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
