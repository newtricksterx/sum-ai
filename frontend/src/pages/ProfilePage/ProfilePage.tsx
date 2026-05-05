import { useEffect, useMemo, useState } from 'react';
import axios from "axios";
import PageCard from '../../components/PageCard/PageCard';
import * as Tabs from "@radix-ui/react-tabs";
import "./ProfilePage.css";
import AlertPopup from '../../components/AlertPopup/AlertPopup';
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

const deriveWordLimit = (characterLimit: number | null | undefined) => {
  if (characterLimit === null) {
    return "Unlimited";
  }

  if (typeof characterLimit !== "number") {
    return "Unavailable";
  }

  if (characterLimit <= 10000) {
    return "1,500 words";
  }

  if (characterLimit <= 30000) {
    return "5,000 words";
  }

  return `${Math.round(characterLimit / 6.5).toLocaleString()} words`;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner);
  const clearHistory = useHistoryStore((state) => state.clearHistory);

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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await authInstance.delete("/api/users/me");
      clearHistory();
      setUserProfile(null);
      setHistoryOwner("anonymous", 1);
      setMode("login");
      setInfoMessage("Your account has been deleted.");
    } catch (error) {
      setErrorMessage(parseApiErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isInitializing) {
    return (
      <main className="h-full overflow-y-auto custom-scrollbar px-2 py-2 font-noto">
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
    const planName = userProfile.subscription?.plan_name ?? "Unavailable";
    const wordLimit = deriveWordLimit(userProfile.subscription?.character_limit);
    const historyLimitRaw = userProfile.subscription?.history_limit;
    const historyLimit =
      typeof historyLimitRaw === "number"
        ? `${historyLimitRaw.toLocaleString()} items`
        : formatLimit(historyLimitRaw);

    const summaryLimit = userProfile.subscription?.summary_limit;
    const summariesUsed = Math.max(0, userProfile.subscription?.summaries_used ?? 0);
    const isUnlimitedUsage = summaryLimit === null;
    const boundedSummaryLimit =
      typeof summaryLimit === "number" ? Math.max(0, summaryLimit) : null;
    const usagePercentage =
      boundedSummaryLimit && boundedSummaryLimit > 0
        ? Math.min(100, (Math.min(summariesUsed, boundedSummaryLimit) / boundedSummaryLimit) * 100)
        : 0;
    const usageClass =
      usagePercentage >= 80
        ? " pp-bar-fill--high"
        : usagePercentage >= 50
          ? " pp-bar-fill--mid"
          : "";

    const memberSince = formatDate(userProfile.created_at);
    const updatedAt = formatDate(userProfile.updated_at);
    const initials = getInitials(displayName || "User") || "U";
    const isAccountActionPending = isSubmitting || isDeletingAccount;

    return (
      <main className="profile-page-shell h-full overflow-y-auto custom-scrollbar px-2 py-2 font-noto">
        <PageCard as="section" className="profile-account-card p-3">
          <div className="pp-root">
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

            <div className="pp-card pp-identity" aria-label="Account identity">
              <div className="pp-avatar" aria-hidden="true">
                {initials}
              </div>

              <div className="pp-identity-info">
                <div className="pp-display-name">{displayName}</div>
                <div className="pp-email">{userProfile.email}</div>
                <span className="pp-status pp-status--active">
                  <span className="pp-status-dot" />
                  Active
                </span>
              </div>
            </div>

            <section className="pp-card pp-section" aria-label="Plan and limits">
              <p className="pp-section-title">Plan &amp; Limits</p>
              <div className="pp-stat-row">
                <span className="pp-stat-label">Plan</span>
                <span className="pp-stat-value">
                  <span className="pp-plan-badge">{planName}</span>
                </span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">Word limit</span>
                <span className="pp-stat-value">{wordLimit}</span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">History capacity</span>
                <span className="pp-stat-value">{historyLimit}</span>
              </div>
            </section>

            <section className="pp-card pp-section" aria-label="Usage this cycle">
              <div className="pp-usage">
                <div className="pp-usage-header">
                  <span className="pp-stat-label">Usage this cycle</span>
                  <span className={`pp-usage-count${usagePercentage >= 80 ? " pp-usage-count--high" : ""}`}>
                    {isUnlimitedUsage ? (
                      <>
                        {summariesUsed.toLocaleString()}
                        <span className="pp-usage-cap">uncapped</span>
                      </>
                    ) : (
                      <>
                        {Math.min(summariesUsed, boundedSummaryLimit ?? summariesUsed).toLocaleString()}
                        <span className="pp-usage-sep">/</span>
                        {(boundedSummaryLimit ?? 0).toLocaleString()}
                      </>
                    )}
                  </span>
                </div>

                {isUnlimitedUsage ? (
                  <div className="pp-bar-track pp-bar-track--unlimited">
                    <div className="pp-bar-fill pp-bar-fill--unlimited" />
                  </div>
                ) : (
                  <div
                    className="pp-bar-track"
                    role="progressbar"
                    aria-valuenow={usagePercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`pp-bar-fill${usageClass}`} style={{ width: `${usagePercentage}%` }} />
                  </div>
                )}
              </div>
            </section>

            <section className="pp-card pp-section pp-section--dates" aria-label="Account dates">
              <div className="pp-stat-row">
                <span className="pp-stat-label">Member since</span>
                <span className="pp-stat-value">{memberSince}</span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">Last updated</span>
                <span className="pp-stat-value">{updatedAt}</span>
              </div>
            </section>

            <div className="pp-actions">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isAccountActionPending}
                className="pp-logout-btn"
              >
                {isSubmitting ? "Signing out..." : "Log out"}
              </button>
              <AlertPopup
                trigger={
                  <button
                    type="button"
                    disabled={isAccountActionPending}
                    className="pp-delete-btn"
                  >
                    {isDeletingAccount ? "Deleting account..." : "Delete account"}
                  </button>
                }
                title="WARNING"
                description="This permanently deletes your account and signs you out of this browser."
                previewTitle={userProfile.email}
                previewText="Your current local summary history for this account will also be cleared."
                confirmLabel="Delete account"
                cancelLabel="Cancel"
                confirmTone="danger"
                onConfirm={() => void handleDeleteAccount()}
              />
            </div>
          </div>
        </PageCard>
      </main>
    );
  }

  return (
    <main className="test-profile-page px-2 py-2 font-noto">
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
