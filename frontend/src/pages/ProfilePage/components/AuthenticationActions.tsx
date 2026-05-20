import { useCallback, useMemo } from "react";
import { FcGoogle } from "react-icons/fc";
import { useTranslation } from "react-i18next";
import "../../../i18n";
import PageCard from "../../../components/PageCard/PageCard";
import AlertPopup from "../../../components/AlertPopup/AlertPopup";
import { ToastErrorMessage } from "../../../components/ToastErrorMessage/ToastErrorMessage";
import { MenuIconSize } from "../../../utils/constants";
import { markLoginPending } from "../../../services/authSignals";

interface SignInViewProps {
  infoMessage: string | null;
  errorMessage: string | null;
  onDismissError: () => void;
}

export const SignInView = ({ infoMessage, errorMessage, onDismissError }: SignInViewProps) => {
  const { t } = useTranslation();

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
          <FcGoogle size={MenuIconSize} />
          {t("profile.signInGoogle")}
        </button>
      </PageCard>
      <ToastErrorMessage errorMessage={errorMessage} onDismissError={onDismissError} />
    </main>
  );
};

interface LogoutActionProps {
  email: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  cancelSubscription: () => void;
}

export const LogoutAction = ({ email, isSubmitting, onConfirm, cancelSubscription }: LogoutActionProps) => {
  const { t } = useTranslation();

  return (
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
        previewTitle={email}
        confirmLabel={t("profile.logout")}
        cancelLabel={t("profile.cancel", "Cancel")}
        onConfirm={onConfirm}
      />
      <AlertPopup
          trigger={
            <button
              type="button"
              className="pp-cancel-btn"
            >
              Cancel Subscription
            </button>
          }
        title="Cancel subscription"
        description="Are you sure that you want to cancel your subscription?"
        previewText="You will go back to the free plan once your current plan period ends."
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={cancelSubscription}
      />
    </div>
    
  );
};
