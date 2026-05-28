import { useTranslation } from "react-i18next";
import "../../../i18n";
import type { UserProfile } from "../../../stores/authProfileStore";
import { ProfilePageStatRow } from "../StatRow/ProfilePageStatRow";
import {
  deriveUsageMetrics,
  deriveWordLimit,
  formatLimit,
} from "../profilepage.helpers";
import '../ProfilePage.css'

type Subscription = NonNullable<UserProfile["subscription"]>;

interface PlanLimitsProps {
  subscription: Subscription | undefined;
  onClickUpgrade: () => void;
}

export const PlanLimits = ({ subscription, onClickUpgrade }: PlanLimitsProps) => {
  const { t } = useTranslation();

  const planName = subscription?.plan_name ?? t("profile.unavailable", "Unavailable");
  const wordLimit = deriveWordLimit(subscription?.character_limit);
  const historyLimit = formatLimit(subscription?.history_limit, " items");

  return (
    <section className="pp-card pp-section" aria-label="Plan and limits">
      <p className="pp-section-title">{t("profile.planAndLimits")}</p>

      <ProfilePageStatRow
        highlightAsBadge
        title="profile.plan"
        content="profile.planTooltip"
        arialabel="profile.planTooltipAria"
        value={planName}
      />

      <ProfilePageStatRow
        title="profile.wordLimit"
        content="profile.wordLimitTooltip"
        arialabel="profile.wordLimitTooltipAria"
        value={wordLimit}
      />

      <ProfilePageStatRow
        title="profile.historyCapacity"
        content="profile.historyCapacityTooltip"
        arialabel="profile.historyCapacityTooltipAria"
        value={historyLimit}
      />

      <button className="upgrade-btn" onClick={onClickUpgrade}>
        Upgrade Plan
      </button>
    </section>
  );
};

interface UsageProps {
  actionLimit: number | null | undefined;
  actionsUsed: number | null | undefined;
}

export const Usage = ({ actionLimit, actionsUsed }: UsageProps) => {
  const { t } = useTranslation();
  const { isUnlimited, boundedLimit, actionsUsed: normalizedUsed, displayUsed, percentage, usageClass } =
    deriveUsageMetrics(actionLimit, actionsUsed);

  return (
    <section className="pp-card pp-section" aria-label="Usage this cycle">
      <div className="pp-usage">
        <div className="pp-usage-header">
          <span className="pp-stat-label">{t("profile.usageCycle")}</span>
          <span className={`pp-usage-count${percentage >= 80 ? " pp-usage-count--high" : ""}`}>
            {isUnlimited ? (
              <>
                {normalizedUsed.toLocaleString()}
                <span className="pp-usage-cap">{t("profile.uncapped")}</span>
              </>
            ) : (
              <>
                {displayUsed.toLocaleString()}
                <span className="pp-usage-sep">/</span>
                {(boundedLimit ?? 0).toLocaleString()}
              </>
            )}
          </span>
        </div>

        {isUnlimited ? (
          <div className="pp-bar-track pp-bar-track--unlimited">
            <div className="pp-bar-fill pp-bar-fill--unlimited" />
          </div>
        ) : (
          <div
            className="pp-bar-track"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`pp-bar-fill${usageClass}`} style={{ width: `${percentage}%` }} />
          </div>
        )}
      </div>
    </section>
  );
};
