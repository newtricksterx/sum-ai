import type React from 'react';
import { FileText, Globe, Sparkles, Type, WandSparkles } from 'lucide-react';
import PageCard from '../../components/PageCard/PageCard';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTabChange } from './useTabChange';
import { QUICK_STEPS, getSettingLabel } from './frontpage.helpers';
import './FrontPage.css';

interface FrontPageProps {
  onClickGenerate: () => void;
}

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate }) => {
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);
  const activeTabMeta = useTabChange();

  return (
    <main className="front-page-shell overflow-y-auto custom-scrollbar px-2 py-2 font-noto">
      <PageCard as="section" className="front-page-card p-4">
        <h1 className="sr-only">Generate a summary from your active tab</h1>

        <section className="front-tab-chip" aria-label="Active tab">
          <span className="front-tab-icon" aria-hidden="true">
            <FileText size={12} />
          </span>
          <div className="front-tab-meta">
            <p className="front-tab-label">Active tab</p>
            <p className="front-tab-title" title={activeTabMeta.title}>{activeTabMeta.title}</p>
            <p className="front-tab-domain" title={activeTabMeta.domain}>{activeTabMeta.domain}</p>
            <p className="front-tab-time">{activeTabMeta.readTime}</p>
          </div>
        </section>

        <section className="front-preset-panel" aria-label="Current summary preset">
          <div className="front-section-head">
            <p className="front-section-label">Summary preferences</p>
            <p className="front-section-meta">Edit in Settings</p>
          </div>
          <ul className="front-preset-grid">
            <li className="front-preset-item">
              <span className="front-preset-key">
                <Globe size={12} />
                Language
              </span>
              <p className="front-preset-value">{getSettingLabel(language)}</p>
            </li>

            <li className="front-preset-item">
              <span className="front-preset-key">
                <Type size={12} />
                Length
              </span>
              <p className="front-preset-value">{getSettingLabel(length)}</p>
            </li>

            <li className="front-preset-item">
              <span className="front-preset-key">
                <Sparkles size={12} />
                Format
              </span>
              <p className="front-preset-value">{getSettingLabel(format)}</p>
            </li>
          </ul>
        </section>

        <section className="front-flow" aria-label="How summary generation works">
          <p className="front-section-label">How it works</p>
          <ol className="front-flow-list">
            {QUICK_STEPS.map(({ text }, index) => (
              <li key={text} className="front-flow-row">
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
            Summarize this tab
          </button>
          <div className="front-footer-row" aria-label="Generation status">
            <span>Uses your saved settings</span>
            <span>Ready</span>
          </div>
        </section>
      </PageCard>
    </main>
  );
};

export default FrontPage;
