import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActiveTabMeta } from "../utils/activeTabMeta";

type ActiveTabChipProps = {
  meta: ActiveTabMeta;
};

export function ActiveTabChip({ meta }: ActiveTabChipProps) {
  const { t } = useTranslation();

  return (
    <section className="front-tab-chip" aria-label={t("frontpage.activeTab")}>
      <span className="front-tab-icon" aria-hidden="true">
        <FileText size={12} />
      </span>
      <div className="front-tab-meta">
        <p className="front-tab-label">{t("frontpage.activeTab")}</p>
        <p className="front-tab-title" title={meta.title}>{meta.title}</p>
        <p className="front-tab-domain" title={meta.domain}>{meta.domain}</p>
        <p className="front-tab-time">{meta.readTime}</p>
      </div>
    </section>
  );
}
