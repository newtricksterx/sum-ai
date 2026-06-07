import PageCard from '../../components/PageCard/PageCard';
import { ToastErrorMessage } from '../../components/ToastErrorMessage/ToastErrorMessage';
import { useProfileAccount } from "./useProfileAccount";
import { deriveDisplayName } from './profilepage.helpers';
import '../../i18n';
import { SignInView, LogoutAction } from './components/AuthenticationActions';
import { PlanLimits, Usage } from './components/SubscriptionSection';
import { IdentityCard, AccountDates } from './components/ProfileSummary';
import "./ProfilePage.css";
import { useState } from 'react';
import { PricingPage } from './components/PricingPage/PricingPage';

type ProfilePageTypes = "profile" | "pricing"

const ProfilePage: React.FC = () => {
  const {
    userProfile,
    isInitializing,
    isSubmitting,
    errorMessage,
    handleLogout,
    openBillingPortal,
    dismissError,
  } = useProfileAccount();

  const [page, setPage] = useState<ProfilePageTypes>("profile")

  const onClickUpgrade = () => {
    setPage("pricing")
  }

  const onClickReturn = () => {
    setPage("profile")
  }

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

  if (!userProfile) {
    return (
      <SignInView
        errorMessage={errorMessage}
        onDismissError={dismissError}
      />
    );
  }

  if (page === "pricing"){
    return (
      <PricingPage onClickReturn={onClickReturn} currentPlanSlug={userProfile.subscription?.plan_slug} />
    )
  }

  const displayName = deriveDisplayName(userProfile);

  return (
    <main className="profile-page-shell h-full overflow-y-auto custom-scrollbar px-2 py-2 font-google">
      <PageCard as="section" className="profile-account-card p-3">
        <div className="pp-root">
          <IdentityCard
            displayName={displayName}
            email={userProfile.email}
            avatarUrl={userProfile.avatar_url}
          />

          <PlanLimits subscription={userProfile.subscription} onClickUpgrade={onClickUpgrade}/>

          <Usage
            actionLimit={userProfile.subscription?.action_limit}
            actionsUsed={userProfile.subscription?.actions_used}
          />

          <AccountDates
            createdAt={userProfile.created_at}
            updatedAt={userProfile.updated_at}
          />

          <LogoutAction
            email={userProfile.email}
            isSubmitting={isSubmitting}
            plan_slug={userProfile?.subscription?.plan_slug}
            onConfirm={() => void handleLogout()}
            cancelSubscription={openBillingPortal}
          />
        </div>
      </PageCard>
      <ToastErrorMessage errorMessage={errorMessage} onDismissError={dismissError} />
    </main>
  );
};

export default ProfilePage;
