import { useEffect, useMemo, useState } from 'react';
import axios from "axios";
import { CalendarClock, LogOut, ShieldCheck, UserRound } from "lucide-react";
import PageCard from '../components/PageCard/PageCard';
import * as Tabs from "@radix-ui/react-tabs";
import "./ProfilePage.css"
import LoginForm, { LoginPayload } from '../components/LoginForm';
import RegisterForm, { RegisterPayload } from '../components/RegisterForm';
import { authInstance, setAuthLogoutHandler } from "../services/axiosService";
import { useHistoryStore } from "../stores/historyStore";

type AuthMode = "login" | "register";

type UserProfile = {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription?: {
    plan_name: string;
    summary_limit: number | null;
    summaries_used?: number;
    history_limit: number | null;
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

const formatDate = (rawDate: string) => {
  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
};

const formatLimit = (value: number | null | undefined) => {
  if (value === null) {
    return "Unlimited";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return "Unavailable";
};

const formatSummariesLeft = (
  summaryLimit: number | null | undefined,
  summariesUsed: number | undefined,
) => {
  if (summaryLimit === null) {
    return "Unlimited";
  }

  if (typeof summaryLimit === "number") {
    const used = typeof summariesUsed === "number" ? summariesUsed : 0;
    return Math.max(summaryLimit - used, 0).toLocaleString();
  }

  return "Unavailable";
};

const ProfilePage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);

  useEffect(() => {
    const hydrateProfile = async () => {
      setIsInitializing(true);

      try {
        const response = await authInstance.get<UserProfile>("/api/users/me");
        setUserProfile(response.data);
        setHistoryOwner(
          `user:${response.data.id}`,
          response.data.subscription?.history_limit ?? 1,
        );
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          setErrorMessage(parseApiErrorMessage(error));
        }
        setUserProfile(null);
        setHistoryOwner("anonymous", 1);
      } finally {
        setIsInitializing(false);
      }
    };

    void hydrateProfile();
  }, [setHistoryOwner]);

  useEffect(() => {
    setAuthLogoutHandler(() => {
      setUserProfile(null);
      setMode("login");
      setInfoMessage(null);
      setErrorMessage("Your session has expired. Please login again.");
      setHistoryOwner("anonymous", 1);
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, [setHistoryOwner]);

  const displayName = useMemo(() => {
    if (!userProfile) {
      return "";
    }

    const fullName = `${userProfile.first_name ?? ""} ${userProfile.last_name ?? ""}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }

    const emailLocalPart = userProfile.email.split("@")[0]?.trim();
    return emailLocalPart && emailLocalPart.length > 0 ? emailLocalPart : userProfile.email;
  }, [userProfile]);

  const setAuthenticatedUser = (profile: UserProfile) => {
    setUserProfile(profile);
    setHistoryOwner(
      `user:${profile.id}`,
      profile.subscription?.history_limit ?? 1,
    );
  };

  const fetchCurrentUser = async () => {
    const meResponse = await authInstance.get<UserProfile>("/api/users/me");
    setAuthenticatedUser(meResponse.data);
    return meResponse.data;
  };

  const switchToLogin = () => {
    setMode("login");
    setErrorMessage(null);
  };

  const switchToRegister = () => {
    setMode("register");
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const onModeChange = (nextValue: string) => {
    if (nextValue === "register") {
      switchToRegister();
      return;
    }
    switchToLogin();
  };

  const handleLogin = async (payload: LoginPayload) => {
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
  };

  const handleRegister = async (payload: RegisterPayload) => {
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
  };

  const handleLogout = async () => {
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
      setHistoryOwner("anonymous", 1);
      setMode("login");
      setIsSubmitting(false);
    }
  };

  if (isInitializing) {
    return (
      <main className="h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
        <PageCard as="section" className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-20 rounded bg-gray-300 dark:bg-[#3a3a3a]" />
            <div className="h-4 w-40 rounded bg-gray-300 dark:bg-[#3a3a3a]" />
            <div className="h-12 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
            <div className="h-9 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
            <div className="h-9 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
          </div>
        </PageCard>
      </main>
    );
  }

  if (userProfile) {
    return (
      <main className="h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
        <PageCard as="section" className="p-4">
          <header className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
              Account
            </p>
            <h1 className="mt-1 text-[17px] font-semibold leading-tight text-gray-900 dark:text-gray-100">
              Account Overview
            </h1>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">
              Your session is active. Here is your non-sensitive profile information.
            </p>
          </header>

          <div className="space-y-3">
            {infoMessage && (
              <p className="rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/45 dark:text-emerald-300">
                {infoMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl border border-rose-200/90 bg-rose-50/90 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/45 dark:text-rose-300">
                {errorMessage}
              </p>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900">
                    <UserRound size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{displayName}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">{userProfile.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/45 dark:text-emerald-300">
                  <ShieldCheck size={12} />
                  Active
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                  Subscription
                </p>
                <div className="mt-1 space-y-1 text-[12px] text-gray-700 dark:text-gray-200">
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Plan:</span>{" "}
                    {userProfile.subscription?.plan_name ?? "Unavailable"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Summaries Left:</span>{" "}
                    {formatSummariesLeft(
                      userProfile.subscription?.summary_limit,
                      userProfile.subscription?.summaries_used,
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">History Limit:</span>{" "}
                    {formatLimit(userProfile.subscription?.history_limit)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                  Member Since
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-gray-900 dark:text-gray-100">
                  <CalendarClock size={12} />
                  {formatDate(userProfile.created_at)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                  Last Updated
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(userProfile.updated_at)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-gray-200 dark:hover:bg-[#343434]"
            >
              <LogOut size={14} />
              {isSubmitting ? "Signing Out..." : "Logout"}
            </button>
          </div>
        </PageCard>
      </main>
    );
  }

  return (
    <main className="test-profile-page px-3 py-3 font-noto">
      <PageCard className="test-profile-card p-4">
          <header className="test-profile-header">
              <p className="test-profile-kicker">Account</p>
              <h1 className="test-profile-title">Manage Your Profile</h1>
              <p className="test-profile-subtitle">Update your account details and security settings.</p>
          </header>

          <Tabs.Root className="TabsRoot" value={mode} onValueChange={onModeChange}>
              <Tabs.List className="TabsList" aria-label="Manage your account">
                  <Tabs.Trigger className="TabsTrigger" value="login">
                      Login
                  </Tabs.Trigger>
                  <Tabs.Trigger className="TabsTrigger" value="register">
                      Register
                  </Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content className="TabsContent" value="login">
                  <LoginForm
                    onSubmit={handleLogin}
                    onSwitchToRegister={switchToRegister}
                    isSubmitting={isSubmitting}
                    errorMessage={mode === "login" ? errorMessage : null}
                    infoMessage={mode === "login" ? infoMessage : null}
                  />
              </Tabs.Content>
              <Tabs.Content className="TabsContent" value="register">
                  <RegisterForm
                    onSubmit={handleRegister}
                    onSwitchToLogin={switchToLogin}
                    isSubmitting={isSubmitting}
                    errorMessage={mode === "register" ? errorMessage : null}
                  />
              </Tabs.Content>
          </Tabs.Root>
      </PageCard>
    </main>
  );
};

export default ProfilePage;
