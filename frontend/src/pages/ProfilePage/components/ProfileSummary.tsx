import { useTranslation } from "react-i18next";
import "../../../i18n";
import { formatDate, getInitials } from "../profilepage.helpers";

interface IdentityCardProps {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export const IdentityCard = ({ displayName, email, avatarUrl }: IdentityCardProps) => {
  const { t } = useTranslation();
  const initials = getInitials(displayName || "User") || "U";

  return (
    <div className="pp-card pp-identity" aria-label="Account identity">
      <div className="pp-avatar" aria-hidden="true">
        {avatarUrl ? (
          <img
            src={avatarUrl}
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
        <div className="pp-email">{email}</div>
        <span className="pp-status pp-status--active">
          <span className="pp-status-dot" />
          {t("profile.active")}
        </span>
      </div>
    </div>
  );
};

interface AccountDatesProps {
  createdAt: string;
  updatedAt: string;
}

export const AccountDates = ({ createdAt, updatedAt }: AccountDatesProps) => {
  const { t } = useTranslation();

  return (
    <section className="pp-card pp-section pp-section--dates" aria-label="Account dates">
      <div className="pp-stat-row">
        <span className="pp-stat-label">{t("profile.memberSince")}</span>
        <span className="pp-stat-value">{formatDate(createdAt)}</span>
      </div>

      <div className="pp-stat-row">
        <span className="pp-stat-label">{t("profile.lastUpdated")}</span>
        <span className="pp-stat-value">{formatDate(updatedAt)}</span>
      </div>
    </section>
  );
};
