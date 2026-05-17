import { useCallback, useMemo } from 'react';
import PageCard from '../../components/PageCard/PageCard';
import "./ProfilePage.css";
import AlertPopup from '../../components/AlertPopup/AlertPopup';
import { ToastErrorMessage } from '../../components/ToastErrorMessage/ToastErrorMessage';
import { useProfileAccount } from "./useProfileAccount";
import { deriveBillingInterval, deriveSubscriptionPrice, deriveWordLimit, formatLimit, formatDate, getInitials, getUsageClass, deriveDisplayName } from './profilepage.helpers';
import { FcGoogle } from "react-icons/fc";
import { MenuIconSize } from '../../utils/constants';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import { markLoginPending } from '../../services/authSignals';
import { ProfilePageStatRow } from './StatRow/ProfilePageStatRow';

const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    userProfile,
    isInitializing,
    isSubmitting,
    errorMessage,
    infoMessage,
    handleLogout,
    dismissError,
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
    markLoginPending();
    const chromeApi = globalThis.chrome;

    if (chromeApi?.tabs?.create) {
      chromeApi.tabs.create({ url: googleSignInUrl });
      return;
    }

    window.open(googleSignInUrl, "_blank", "noopener,noreferrer");
  }, [googleSignInUrl]);

  const displayName = useMemo(() => deriveDisplayName(userProfile), [userProfile]);

  if (isInitializing) {
    return (
      <main className="h-full overflow-y-auto custom-scrollbar px-2 py-2 font-google">
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
    const planName = userProfile.subscription?.plan_name ?? t("profile.unavailable", "Unavailable");
    const wordLimit = deriveWordLimit(userProfile.subscription?.character_limit);
    const historyLimitRaw = userProfile.subscription?.history_limit;
    const historyLimit = formatLimit(historyLimitRaw, " items");
    const billingInterval = deriveBillingInterval(
      userProfile.subscription?.billing_interval,
      (key, defaultValue) => t(key, { defaultValue }),
    );
    const subscriptionPrice = deriveSubscriptionPrice(
      userProfile.subscription?.price_minor,
      userProfile.subscription?.currency,
      (key, defaultValue) => t(key, { defaultValue }),
    );

    const summaryLimit = userProfile.subscription?.summary_limit;
    const summariesUsed = Math.max(0, userProfile.subscription?.summaries_used ?? 0);
    const isUnlimitedUsage = summaryLimit === null;
    const boundedSummaryLimit =
      typeof summaryLimit === "number" ? Math.max(0, summaryLimit) : null;
    const usagePercentage =
      boundedSummaryLimit && boundedSummaryLimit > 0
        ? Math.min(100, (Math.min(summariesUsed, boundedSummaryLimit) / boundedSummaryLimit) * 100)
        : 0;
    const usageClass = getUsageClass(usagePercentage);

    const memberSince = formatDate(userProfile.created_at);
    const updatedAt = formatDate(userProfile.updated_at);
    const initials = getInitials(displayName || "User") || "U";
    return (
      <main className="profile-page-shell h-full overflow-y-auto custom-scrollbar px-2 py-2 font-google">
        <PageCard as="section" className="profile-account-card p-3">
          <div className="pp-root">
            {infoMessage && (
              <p className="profile-status-message profile-status-message--success">
                {infoMessage}
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
                  {t("profile.active")}
                </span>
              </div>
            </div>

            <section className="pp-card pp-section" aria-label="Plan and limits">
              <p className="pp-section-title">{t("profile.planAndLimits")}</p>

              <ProfilePageStatRow 
                badge_id='plan'
                title='profile.plan' 
                content='profile.planTooltip'
                arialabel='profile.planTooltipAria' 
                value={planName} 
              />

              <ProfilePageStatRow 
                title='profile.wordLimit' 
                content='profile.wordLimitTooltip'
                arialabel='profile.wordLimitTooltipAria' 
                value={wordLimit} 
              />

              <ProfilePageStatRow 
                title='profile.historyCapacity' 
                content='profile.historyCapacityTooltip'
                arialabel='profile.historyCapacityTooltipAria' 
                value={historyLimit} 
              />

              <ProfilePageStatRow 
                title='profile.billingInterval'
                content='profile.billingIntervalTooltip'
                arialabel='profile.billingIntervalTooltipAria' 
                value={billingInterval} 
              />

              <ProfilePageStatRow 
                title='profile.subscriptionPrice'
                titleDefault='Subscription price'
                content='profile.subscriptionPriceTooltip'
                contentDefault='Current recurring cost for your active plan.'
                arialabel='profile.subscriptionPriceTooltipAria' 
                arialabelDefault='What does subscription price mean?'
                value={subscriptionPrice} 
              />
            </section>

            <section className="pp-card pp-section" aria-label="Usage this cycle">
              <div className="pp-usage">
                <div className="pp-usage-header">
                  <span className="pp-stat-label">{t("profile.usageCycle")}</span>
                  <span className={`pp-usage-count${usagePercentage >= 80 ? " pp-usage-count--high" : ""}`}>
                    {isUnlimitedUsage ? (
                      <>
                        {summariesUsed.toLocaleString()}
                        <span className="pp-usage-cap">{t("profile.uncapped")}</span>
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
                <span className="pp-stat-label">{t("profile.memberSince")}</span>
                <span className="pp-stat-value">{memberSince}</span>
              </div>

              <div className="pp-stat-row">
                <span className="pp-stat-label">{t("profile.lastUpdated")}</span>
                <span className="pp-stat-value">{updatedAt}</span>
              </div>
            </section>

            <div className="pp-actions">
              <AlertPopup
                trigger={
                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="pp-logout-btn"
                  >
                    {isSubmitting ? t("profile.signingOut") : t("profile.logout")}
                  </button>
                }
                title={t("profile.logoutTitle")}
                description={t("profile.logoutDescription")}
                previewTitle={userProfile.email}
                confirmLabel={t("profile.logout")}
                cancelLabel={t("profile.cancel", "Cancel")}
                onConfirm={() => void handleLogout()}
              />
            </div>
          </div>
        </PageCard>
        <ToastErrorMessage errorMessage={errorMessage} onDismissError={dismissError} />
      </main>
    );
  }

  return (
    <main className="test-profile-page px-2 py-2 font-google">
      <PageCard className="test-profile-card p-4">
        <header className="test-profile-header">
          <p className="test-profile-kicker">{t("profile.account")}</p>
          <h1 className="test-profile-title">{t("profile.secureAccess")}</h1>
          <p className="test-profile-subtitle">{t("profile.signInDescription")}</p>
        </header>

        {infoMessage && (
          <p className="profile-status-message profile-status-message--success">
            {infoMessage}
          </p>
        )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="profile-google-btn"
          >
            <FcGoogle size={MenuIconSize}/>
            {t("profile.signInGoogle")}
          </button>
      </PageCard>
      <ToastErrorMessage errorMessage={errorMessage} onDismissError={dismissError} />
    </main>
  );
};

export default ProfilePage;
