import { useCallback, useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import "./ProfilePage.css";
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import TooltipComponent from '../../components/Tooltip/TooltipComponent';
import { useProfileAccount } from "../../hooks/useProfileAccount";
import { deriveWordLimit, formatLimit, formatDate, getInitials, 
  PLAN_TOOLTIP, WORD_LIMIT_TOOLTIP, 
  HISTORY_CAPACITY_TOOLTIP } from './profilepage.helpers';
import { FcGoogle } from "react-icons/fc";
import { MenuIconSize } from '../../utils/constants';

const ProfilePage: React.FC = () => {
  const {
    userProfile,
    isInitializing,
    isSubmitting,
    errorMessage,
    infoMessage,
    handleLogout,
  } = useProfileAccount();

  const googleSignInUrl = useMemo(() => {
    const configuredBaseUrl = (import.meta.env.VITE_BASE_URL ?? "").toString().trim();
    const defaultBaseUrl =
      typeof window !== "undefined" && window.location.protocol === "chrome-extension:"
        ? "http://localhost:8000"
        : typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:8000";

    const baseUrl = configuredBaseUrl.length > 0 ? configuredBaseUrl : defaultBaseUrl;

    try {
      return new URL("/accounts/google/login/?process=login", baseUrl).toString();
    } catch {
      return "http://localhost:8000/accounts/google/login/?process=login";
    }
  }, []);

  const handleGoogleSignIn = useCallback(() => {
    const chromeApi = globalThis.chrome;

    if (chromeApi?.tabs?.create) {
      chromeApi.tabs.create({ url: googleSignInUrl });
      return;
    }

    window.open(googleSignInUrl, "_blank", "noopener,noreferrer");
  }, [googleSignInUrl]);

  const displayName = useMemo(() => {
    if (!userProfile) {
      return "";
    }

    const username = userProfile.username?.trim();
    if (username && username.length > 0) {
      return username;
    }

    const emailLocalPart = userProfile.email.split("@")[0]?.trim();
    return emailLocalPart && emailLocalPart.length > 0 ? emailLocalPart : userProfile.email;
  }, [userProfile]);

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
    const isAccountActionPending = isSubmitting

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
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt=""
                    className="pp-avatar-image"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initials
                )}
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
                <span className="pp-stat-label">
                  Plan
                  <TooltipComponent
                    content={PLAN_TOOLTIP}
                    side="top"
                    triggerClassName="pp-stat-tooltip-trigger"
                    ariaLabel="What does plan mean?"
                  />
                </span>
                <span className="pp-stat-value">
                  <span className="pp-plan-badge">{planName}</span>
                </span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">
                  Word limit
                  <TooltipComponent
                    content={WORD_LIMIT_TOOLTIP}
                    side="top"
                    triggerClassName="pp-stat-tooltip-trigger"
                    ariaLabel="What does word limit mean?"
                  />
                </span>
                <span className="pp-stat-value">{wordLimit}</span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">
                  History capacity
                  <TooltipComponent
                    content={HISTORY_CAPACITY_TOOLTIP}
                    side="top"
                    triggerClassName="pp-stat-tooltip-trigger"
                    ariaLabel="What does history capacity mean?"
                  />
                </span>
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
              <AlertPopup
                trigger={
                  <button
                    type="button"
                    disabled={isAccountActionPending}
                    className="pp-logout-btn"
                  >
                    {isSubmitting ? "Signing out..." : "Log out"}
                  </button>
                }
                title="Log out?"
                description="Are you sure you want to log out of this browser session?"
                previewTitle={userProfile.email}
                confirmLabel="Log out"
                cancelLabel="Cancel"
                confirmTone="primary"
                onConfirm={() => void handleLogout()}
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

        <section className="TabsContent" aria-label="Sign in with Google">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="profile-google-btn"
          >
            <FcGoogle size={MenuIconSize}/>
            Sign in to Google
          </button>
        </section>
      </PageCard>
    </main>
  );
};

export default ProfilePage;
