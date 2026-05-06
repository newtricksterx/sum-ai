import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { LoginPayload } from "../components/LoginForm";
import { RegisterPayload } from "../components/RegisterForm";
import { authInstance, setAuthLogoutHandler } from "../services/axiosService";
import { useHistoryStore } from "../stores/historyStore";

export type AuthMode = "login" | "register";

export type UserProfile = {
  id: number;
  email: string;
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
  const [mode, setMode] = useState<AuthMode>("login");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);
  const clearHistory = useHistoryStore((state) => state.clearHistory);

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

  const fetchCurrentUser = useCallback(async () => {
    const meResponse = await authInstance.get<UserProfile>("/api/users/me");
    setAuthenticatedUser(meResponse.data);
    return meResponse.data;
  }, [setAuthenticatedUser]);

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
      setUserProfile(null);
      setMode("login");
      setInfoMessage(null);
      setErrorMessage("Your session has expired. Please login again.");
      resetHistoryOwner();
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, [resetHistoryOwner]);

  const switchToLogin = useCallback(() => {
    setMode("login");
    setErrorMessage(null);
  }, []);

  const switchToRegister = useCallback(() => {
    setMode("register");
    setErrorMessage(null);
    setInfoMessage(null);
  }, []);

  const onModeChange = useCallback(
    (nextValue: string) => {
      if (nextValue === "register") {
        switchToRegister();
        return;
      }

      switchToLogin();
    },
    [switchToLogin, switchToRegister],
  );

  const handleLogin = useCallback(
    async (payload: LoginPayload) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        const response = await authInstance.post<{ detail?: string; user?: UserProfile }>("/api/login", payload);
        const responseUser = response.data.user;

        if (responseUser) {
          setAuthenticatedUser(responseUser);
        } else {
          await fetchCurrentUser();
        }

        setInfoMessage(response.data.detail ?? "Login successful.");
      } catch (error) {
        setErrorMessage(parseApiErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchCurrentUser, setAuthenticatedUser],
  );

  const handleRegister = useCallback(
    async (payload: RegisterPayload) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        await authInstance.post("/api/register", payload);
        try {
          await fetchCurrentUser();
        } catch {
          const loginResponse = await authInstance.post<{ user?: UserProfile }>("/api/login", payload);
          if (loginResponse.data.user) {
            setAuthenticatedUser(loginResponse.data.user);
          } else {
            await fetchCurrentUser();
          }
        }
        setMode("login");
        setInfoMessage("Account created. You are now signed in.");
      } catch (error) {
        setErrorMessage(parseApiErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchCurrentUser, setAuthenticatedUser],
  );

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
      setMode("login");
      setIsSubmitting(false);
    }
  }, [resetHistoryOwner]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await authInstance.delete("/api/users/me");
      clearHistory();
      setUserProfile(null);
      resetHistoryOwner();
      setMode("login");
      setInfoMessage("Your account has been deleted.");
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
    }
  }, [clearHistory, resetHistoryOwner]);

  return {
    mode,
    userProfile,
    isInitializing,
    isSubmitting,
    isDeletingAccount,
    errorMessage,
    infoMessage,
    switchToLogin,
    switchToRegister,
    onModeChange,
    handleLogin,
    handleRegister,
    handleLogout,
    handleDeleteAccount,
  };
};
