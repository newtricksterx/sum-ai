import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { authInstance, setAuthLogoutHandler } from "../../services/axiosService";
import { useHistoryStore } from "../../stores/historyStore";

export type UserProfile = {
  id: number;
  username?: string | null;
  email: string;
  avatar_url?: string | null;
  first_name?: string;
  last_name?: string;
  subscription?: {
    plan_name: string;
    summary_limit: number | null;
    summaries_used?: number;
    history_limit: number | null;
    character_limit: number | null;
  };
  created_at: string;
  updated_at: string;
};

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

const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};

export const useProfileAccount = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);

  const resetHistoryOwner = useCallback(() => {
    setHistoryOwner("anonymous", 1);
  }, [setHistoryOwner]);

  const setAuthenticatedUser = useCallback(
    (profile: UserProfile) => {
      setUserProfile(profile);
      setHistoryOwner(
        getHistoryOwnerKeyFromEmail(profile.email),
        profile.subscription?.history_limit ?? 1,
      );
    },
    [setHistoryOwner],
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateProfile = async () => {
      setIsInitializing(true);

      try {
        const response = await authInstance.get<UserProfile>("/api/users/me");
        if (!isMounted) {
          return;
        }

        setAuthenticatedUser(response.data);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          setErrorMessage(parseApiErrorMessage(error));
        }

        setUserProfile(null);
        resetHistoryOwner();
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [resetHistoryOwner, setAuthenticatedUser]);

  useEffect(() => {
    setAuthLogoutHandler(() => {
      const wasAuthenticated = userProfile !== null;
      setUserProfile(null);
      setInfoMessage(null);
      if (wasAuthenticated) {
        setErrorMessage("Your session has expired. Please sign in with Google again.");
      } else {
        setErrorMessage(null);
      }
      resetHistoryOwner();
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, [resetHistoryOwner, userProfile]);

  const handleLogout = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await authInstance.post("/api/logout");
      setInfoMessage("You have been logged out.");
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      setUserProfile(null);
      resetHistoryOwner();
      setIsSubmitting(false);
    }
  }, [resetHistoryOwner]);

  return {
    userProfile,
    isInitializing,
    isSubmitting,
    errorMessage,
    infoMessage,
    handleLogout,
  };
};
