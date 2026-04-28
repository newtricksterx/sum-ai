import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CalendarClock,
  LogOut,
  UserRound,
} from "lucide-react";
import LoginForm, { LoginPayload } from "../components/LoginForm";
import RegisterForm, { RegisterPayload } from "../components/RegisterForm";
import { authInstance, setAuthLogoutHandler } from "../services/axiosService";

type AuthMode = "login" | "register";

type UserProfile = {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
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

const ProfilePage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const hydrateProfile = async () => {
      setIsInitializing(true);

      try {
        const response = await authInstance.get<UserProfile>("/api/users/me");
        setUserProfile(response.data);
      } catch (error) {
        if (!(axios.isAxiosError(error) && error.response?.status === 401)) {
          setErrorMessage(parseApiErrorMessage(error));
        }
        setUserProfile(null);
      } finally {
        setIsInitializing(false);
      }
    };

    void hydrateProfile();
  }, []);

  useEffect(() => {
    setAuthLogoutHandler(() => {
      setUserProfile(null);
      setMode("login");
      setInfoMessage(null);
      setErrorMessage("Your session has expired. Please login again.");
    });

    return () => {
      setAuthLogoutHandler(null);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!userProfile) {
      return "";
    }

    const fullName = `${userProfile.first_name ?? ""} ${userProfile.last_name ?? ""}`.trim();
    if (fullName.length > 0) {
      return fullName;
    }

    return userProfile.username;
  }, [userProfile]);

  const handleLogin = async (payload: LoginPayload) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const response = await authInstance.post<{ detail?: string; user?: UserProfile }>("/api/login", payload);
      const responseUser = response.data.user;

      if (responseUser) {
        setUserProfile(responseUser);
      } else {
        const meResponse = await authInstance.get<UserProfile>("/api/users/me");
        setUserProfile(meResponse.data);
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
      setMode("login");
      setInfoMessage("Account created. Please sign in with your new credentials.");
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
      setMode("login");
      setIsSubmitting(false);
    }
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

  if (isInitializing) {
    return (
      <main className="h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)] dark:border-[#323232] dark:bg-[#161a1f] dark:shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-[#2b2f35]" />
          <div className="mt-3 h-9 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-[#2b2f35]" />
          <div className="mt-2 h-9 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-[#2b2f35]" />
          <div className="mt-3 h-9 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-[#2b2f35]" />
        </section>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-[linear-gradient(156deg,rgba(255,255,255,0.98),rgba(245,250,252,0.95))] p-4 shadow-[0_12px_34px_rgba(15,23,42,0.12)] dark:border-[#323232] dark:bg-[linear-gradient(160deg,rgba(21,27,35,0.97),rgba(15,19,25,0.95))] dark:shadow-[0_14px_34px_rgba(0,0,0,0.38)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-100/70 blur-3xl dark:bg-sky-500/10" />

        <header className="relative z-10 mb-3">
          <h1 className="mt-2 text-[18px] font-bold leading-tight text-slate-900 dark:text-slate-100">
            {userProfile ? "Account Overview" : "Welcome Back"}
          </h1>
          <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
            {userProfile
              ? "Your session is active. Here is your non-sensitive profile information."
              : "Login or register to access your personalized profile settings."}
          </p>
        </header>

        {userProfile ? (
          <div className="relative z-10 space-y-3">
            {infoMessage && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                {infoMessage}
              </p>
            )}

            {errorMessage && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
                {errorMessage}
              </p>
            )}

            <div className="rounded-xl border border-slate-200/90 bg-white/80 p-3 dark:border-[#3a3a3a] dark:bg-[#1a1f24]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900">
                  <UserRound size={14} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">{userProfile.email}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-[#3a3a3a] dark:bg-[#1a1f24]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Username
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-slate-900 dark:text-slate-100">
                  {userProfile.username}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-[#3a3a3a] dark:bg-[#1a1f24]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Member Since
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-slate-900 dark:text-slate-100">
                  <CalendarClock size={12} />
                  {formatDate(userProfile.created_at)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-[#3a3a3a] dark:bg-[#1a1f24]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Last Updated
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(userProfile.updated_at)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#494949] dark:bg-[#2a3139] dark:hover:bg-[#353e47]"
            >
              <LogOut size={14} />
              {isSubmitting ? "Signing Out..." : "Logout"}
            </button>
          </div>
        ) : (
          <div className="relative z-10 space-y-3">

            <section className="rounded-xl border border-slate-200/90 bg-white/85 p-3 dark:border-[#3a3a3a] dark:bg-[#1a1f24]">
              <div className="mb-3 inline-flex w-full rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-[#3a3a3a] dark:bg-[#11161d]">
                <button
                  type="button"
                  onClick={switchToLogin}
                  className={`w-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === "login"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={switchToRegister}
                  className={`w-1/2 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === "register"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                  }`}
                >
                  Register
                </button>
              </div>

              {infoMessage && (
                <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {infoMessage}
                </p>
              )}

              {errorMessage && (
                <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-300">
                  {errorMessage}
                </p>
              )}

              {mode === "login" ? (
                <LoginForm
                  onSubmit={handleLogin}
                  onSwitchToRegister={switchToRegister}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <RegisterForm
                  onSubmit={handleRegister}
                  onSwitchToLogin={switchToLogin}
                  isSubmitting={isSubmitting}
                />
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
};

export default ProfilePage;
