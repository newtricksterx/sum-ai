import { useEffect, useMemo, useState } from 'react';
import axios from "axios";
import { CalendarClock, Clock3, LogOut, ShieldCheck } from "lucide-react";
import PageCard from '../../components/PageCard/PageCard';
import * as Tabs from "@radix-ui/react-tabs";
import "./ProfilePage.css";
import LoginForm, { LoginPayload } from '../../components/LoginForm';
import RegisterForm, { RegisterPayload } from '../../components/RegisterForm';
import { authInstance, setAuthLogoutHandler } from "../../services/axiosService";
import { useHistoryStore } from "../../stores/historyStore";

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
    character_limit: number | null;
  };
  created_at: string;
  updated_at: string;
};

type UsageDetails = {
  isTracked: boolean;
  percentage: number | null;
  detail: string;
  meterLabel: string;
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

const formatWordLimit = (characterLimit: number | null | undefined) => {
  if (characterLimit === null) {
    return "Unlimited words";
  }

  if (characterLimit === 10000) {
    return "1,500 words";
  }

  if (characterLimit === 30000) {
    return "5,000 words";
  }

  return "Unavailable";
};

const getUsageDetails = (
  summaryLimit: number | null | undefined,
  summariesUsed: number | undefined,
): UsageDetails => {
  if (typeof summaryLimit === "number") {
    if (summaryLimit <= 0) {
      return {
        isTracked: true,
        percentage: 0,
        detail: "No summary quota is currently available for this cycle.",
        meterLabel: "0 / 0",
      };
    }

    const usedRaw = typeof summariesUsed === "number" ? summariesUsed : 0;
    const used = Math.max(0, Math.min(usedRaw, summaryLimit));
    const percentage = Math.round((used / summaryLimit) * 100);

    return {
      isTracked: true,
      percentage,
      detail: `${used.toLocaleString()} of ${summaryLimit.toLocaleString()} summaries used in this billing cycle.`,
      meterLabel: `${used.toLocaleString()} / ${summaryLimit.toLocaleString()}`,
    };
  }

  if (summaryLimit === null) {
    return {
      isTracked: false,
      percentage: null,
      detail: "Unlimited plan active, summary usage is not capped.",
      meterLabel: "Unlimited",
    };
  }

  return {
    isTracked: false,
    percentage: null,
    detail: "Usage details are currently unavailable.",
    meterLabel: "Unavailable",
  };
};

const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
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
          getHistoryOwnerKeyFromEmail(response.data.email),
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

  const profileInitial = useMemo(() => {
    if (displayName.length === 0) {
      return "U";
    }

    return displayName.charAt(0).toUpperCase();
  }, [displayName]);

  const setAuthenticatedUser = (profile: UserProfile) => {
    setUserProfile(profile);
    setHistoryOwner(
      getHistoryOwnerKeyFromEmail(profile.email),
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
    const usage = getUsageDetails(
      userProfile.subscription?.summary_limit,
      userProfile.subscription?.summaries_used,
    );
    const planName = userProfile.subscription?.plan_name ?? "Unavailable";
    const wordLimit = formatWordLimit(userProfile.subscription?.character_limit);
    const historyLimit = formatLimit(userProfile.subscription?.history_limit);
    const memberSince = formatDate(userProfile.created_at);
    const updatedAt = formatDate(userProfile.updated_at);

    return (
      <main className="profile-page-shell h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
        <PageCard as="section" className="profile-account-card p-4">
          <header className="profile-account-header">
            <p className="profile-account-kicker">Account</p>
            <h1 className="profile-account-title">Profile Overview</h1>
            <p className="profile-account-subtitle">
              Key status, limits, and activity for your account.
            </p>
          </header>

          <div className="profile-account-content">
            {infoMessage && (
              <p className="profile-status-message profile-status-message--success">
                {infoMessage}
              </p>
            )}

            {errorMessage && (
              <p className="profile-status-message profile-status-message--error">
                {errorMessage}
              </p>
            )}

            <section className="profile-identity-panel" aria-label="Account identity">
              <div className="profile-identity-top">
                <div className="profile-identity-main">
                  <span className="profile-avatar-badge" aria-hidden="true">
                    <span>{profileInitial}</span>
                  </span>

                  <div className="profile-identity-text">
                    <p className="profile-identity-name">{displayName}</p>
                    <p className="profile-identity-email">{userProfile.email}</p>
                  </div>
                </div>

                <span className="profile-active-pill">
                  <ShieldCheck size={12} />
                  Active
                </span>
              </div>

              <div className="profile-identity-meta">
                <span className="profile-identity-meta-item">
                  <Clock3 size={12} />
                  Updated {updatedAt}
                </span>
              </div>
            </section>

            <section className="profile-metrics-grid" aria-label="Subscription metrics">
              <article className="profile-metric-card">
                <p className="profile-metric-label">Plan</p>
                <p className="profile-metric-value">{planName}</p>
                <p className="profile-metric-meta">Current subscription tier</p>
              </article>

              <article className="profile-metric-card">
                <p className="profile-metric-label">Up To</p>
                <p className="profile-metric-value">{wordLimit}</p>
                <p className="profile-metric-meta">Extracted Per Request</p>
              </article>

              <article className="profile-metric-card">
                <p className="profile-metric-label">History Capacity</p>
                <p className="profile-metric-value">{historyLimit}</p>
                <p className="profile-metric-meta">Saved summary slots</p>
              </article>

              <article className="profile-metric-card">
                <p className="profile-metric-label">Member Since</p>
                <p className="profile-metric-value profile-metric-value--icon">
                  <CalendarClock size={12} />
                  {memberSince}
                </p>
                <p className="profile-metric-meta">Account creation date</p>
              </article>
            </section>

            <section className="profile-usage-panel" aria-label="Summary usage details">
              <div className="profile-usage-head">
                <p className="profile-usage-title">Summary Usage</p>
                <span className="profile-usage-meter">{usage.meterLabel}</span>
              </div>

              {usage.isTracked && usage.percentage !== null && (
                <div className="profile-usage-track" role="img" aria-label={`Summary usage ${usage.percentage}%`}>
                  <div className="profile-usage-fill" style={{ width: `${usage.percentage}%` }} />
                </div>
              )}

              <p className="profile-usage-copy">{usage.detail}</p>
            </section>

            <div className="profile-action-row">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="profile-logout-button"
              >
                <LogOut size={14} />
                {isSubmitting ? "Signing Out..." : "Logout"}
              </button>
            </div>
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
          <h1 className="test-profile-title">Secure Account Access</h1>
          <p className="test-profile-subtitle">Sign in to view subscription limits, usage, and account status.</p>
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
