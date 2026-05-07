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
}

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate }) => {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const activeTabMeta = useTabChange();
  const quickSteps = [t("frontpage.step1"), t("frontpage.step2"), t("frontpage.step3")];

  return (
    <main className="front-page-shell overflow-y-auto custom-scrollbar px-2 py-2 font-noto">
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

        <section className="front-flow" aria-label="How summary generation works">
          <p className="front-section-label">{t("frontpage.howItWorks")}</p>
          <ol className="front-flow-list">
            {quickSteps.map((text, index) => (
              <li key={`${text}-${index}`} className="front-flow-row">
                <span className="front-flow-index">{index + 1}</span>
                <div className="front-flow-copy">
                  <p className="front-flow-text">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="front-action-section" aria-label="Generate summary">
          <button type="button" onClick={onClickGenerate} className="front-generate-btn">
            <WandSparkles size={15} />
            {t("frontpage.summarizeTab")}
          </button>
          <div className="front-footer-row" aria-label="Generation status">
            <span>{t("frontpage.usesSavedSettings")}</span>
            <span>{t("frontpage.ready")}</span>
          </div>
        </section>
      </PageCard>
    </main>
  );
};

export default FrontPage;
