import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CalendarClock,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import LoginForm, { LoginPayload } from "../components/LoginForm";
import RegisterForm, { RegisterPayload } from "../components/RegisterForm";
import { authInstance, setAuthLogoutHandler } from "../services/axiosService";

type AuthMode = "login" | "register";

type UserProfile = {
  id: number;
  email: string;
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

    const emailLocalPart = userProfile.email.split("@")[0]?.trim();
    return emailLocalPart && emailLocalPart.length > 0 ? emailLocalPart : userProfile.email;
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
        <section className="rounded-2xl border border-gray-200 bg-[#eee] p-4 shadow-sm dark:border-[#373737] dark:bg-[#303030]">
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-20 rounded bg-gray-300 dark:bg-[#3a3a3a]" />
            <div className="h-4 w-40 rounded bg-gray-300 dark:bg-[#3a3a3a]" />
            <div className="h-12 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
            <div className="h-9 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
            <div className="h-9 w-full rounded-xl bg-white/80 dark:bg-[#2a2a2a]" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
      <section className="rounded-2xl border border-gray-200 bg-[#eee] p-4 shadow-sm dark:border-[#373737] dark:bg-[#303030]">
        <header className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
            Account
          </p>
          <h1 className="mt-1 text-[17px] font-semibold leading-tight text-gray-900 dark:text-gray-100">
            {userProfile ? "Account Overview" : "Welcome Back"}
          </h1>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-600 dark:text-gray-300">
            {userProfile
              ? "Your session is active. Here is your non-sensitive profile information."
              : "Sign in or create an account to access your profile settings."}
          </p>
        </header>

        {userProfile ? (
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
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-gray-200 bg-white p-3 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
              <p className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">
                Sign in to manage your account and keep your settings connected.
              </p>

              <div className="mt-3 inline-flex w-full rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-[#3a3a3a] dark:bg-[#252525]">
                <button
                  type="button"
                  onClick={switchToLogin}
                  className={`w-1/2 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    mode === "login"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-[#303030] dark:text-gray-100"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={switchToRegister}
                  className={`w-1/2 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    mode === "register"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-[#303030] dark:text-gray-100"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                  }`}
                >
                  Register
                </button>
              </div>
            </section>

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

            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-[#3a3a3a] dark:bg-[#2a2a2a]">
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
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default ProfilePage;
