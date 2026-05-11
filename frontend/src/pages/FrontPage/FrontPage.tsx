import type React from 'react';
import { FileText, Globe, Sparkles, Type, WandSparkles } from 'lucide-react';
import PageCard from '../../components/PageCard/PageCard';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTabChange } from './useTabChange';
import './FrontPage.css';
import { useTranslation } from 'react-i18next';
import '../../i18n';

interface FrontPageProps {
  onClickGenerate: () => void;
  isGenerateDisabled?: boolean;
}

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate, isGenerateDisabled = false }) => {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const activeTabMeta = useTabChange();

  return (
    <main className="front-page-shell overflow-y-auto custom-scrollbar px-2 py-2 font-google">
      <PageCard as="section" className="front-page-card p-4">
        <h1 className="sr-only">{t("frontpage.heading")}</h1>

        <section className="front-tab-chip" aria-label={t("frontpage.activeTab")}>
          <span className="front-tab-icon" aria-hidden="true">
            <FileText size={12} />
          </span>
          <div className="front-tab-meta">
            <p className="front-tab-label">{t("frontpage.activeTab")}</p>
            <p className="front-tab-title" title={activeTabMeta.title}>{activeTabMeta.title}</p>
            <p className="front-tab-domain" title={activeTabMeta.domain}>{activeTabMeta.domain}</p>
            <p className="front-tab-time">{activeTabMeta.readTime}</p>
          </div>
        </section>

        <section className="front-action-section" aria-label="Generate summary">
          <button
            type="button"
            onClick={onClickGenerate}
            disabled={isGenerateDisabled}
            className={`front-generate-btn ${isGenerateDisabled ? "cursor-not-allowed opacity-70" : ""}`.trim()}
          >
            <WandSparkles size={15} />
            {t("frontpage.summarizeTab")}
          </button>
        </section>

        <section className="front-preset-panel" aria-label="Current summary preset">
          <div className="front-section-head">
            <p className="front-section-label">{t("frontpage.summaryPreferences")}</p>
            <p className="front-section-meta">{t("frontpage.editInSettings")}</p>
          </div>
          <ul className="front-preset-grid">
            <li className="front-preset-item">
              <span className="front-preset-key">
                <Globe size={12} />
                {t("frontpage.language")}
              </span>
              <p className="front-preset-value">{t(`settings.option.${language}`)}</p>
            </li>

            <li className="front-preset-item">
              <span className="front-preset-key">
                <Type size={12} />
                {t("frontpage.length")}
              </span>
              <p className="front-preset-value">{t(`settings.option.${length}`)}</p>
            </li>

            <li className="front-preset-item">
              <span className="front-preset-key">
                <Sparkles size={12} />
                {t("frontpage.format")}
              </span>
              <p className="front-preset-value">{t(`settings.option.${format}`)}</p>
            </li>
          </ul>
        </section>
      </PageCard>
    </main>
  );
};

export default FrontPage;
