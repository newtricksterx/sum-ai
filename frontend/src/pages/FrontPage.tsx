import React from 'react';
import { Globe, Sparkles, Type, WandSparkles } from 'lucide-react';
import PageCard from '../components/PageCard/PageCard';
import { useSettingsStore } from '../stores/settingsStore';
import '../FrontPage.css';

interface FrontPageProps {
  onClickGenerate: () => void;
}

const QUICK_STEPS = [
  {
    title: 'Open any article or page',
    text: 'Choose the tab you want to condense before launching the flow.',
  },
    {
    title: 'Customize output',
    text: 'Set preset options to customize formats by clicking the Settings icon in the navigation bar.',
  },
  {
    title: 'Generate in one click',
    text: 'Run Generate Summary to convert long content into a scan-first result.',
  },
];

const SETTING_LABELS: Record<string, string> = {
  english: 'English',
  french: 'French',
  spanish: 'Spanish',
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  paragraph: 'Paragraph',
  'bullet-point': 'Bullet Points',
  'tl-dr-bullets': 'TL;DR + Bullets',
  'key-takeaways': 'Key Takeaways',
  'action-items': 'Action Items',
  'q-and-a': 'Q&A',
  'pros-cons': 'Pros & Cons',
};

const getSettingLabel = (value: string) => {
  if (SETTING_LABELS[value]) {
    return SETTING_LABELS[value];
  }

  return value.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate }) => {
  const language = useSettingsStore((state) => state.language);
  const length = useSettingsStore((state) => state.length);
  const format = useSettingsStore((state) => state.format);

  return (
    <main className="front-page-shell h-full overflow-y-auto custom-scrollbar px-3 py-3 font-noto">
      <PageCard as="section" className="front-page-card p-4">
        <header className="front-page-header">
          <div className="front-kicker-row">
            <p className="front-kicker">OneClick Summary</p>
          </div>

          <h1 className="front-title">Generate a summary from your active tab</h1>
        </header>

        <section className="front-preset-panel" aria-label="Current summary preset">
          <div className="front-section-head">
            <p className="front-section-label">Preset Snapshot</p>
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

        <section className="front-action-section" aria-label="Generate summary">
          <button type="button" onClick={onClickGenerate} className="front-generate-btn">
            <WandSparkles size={14} />
            Generate Summary
          </button>
        </section>

        <section className="front-flow" aria-label="How summary generation works">
          <ol className="front-flow-list">
            {QUICK_STEPS.map(({ title, text }, index) => (
              <li key={title} className="front-flow-row">
                <span className="front-flow-index">{index + 1}</span>
                <div className="front-flow-copy">
                  <p className="front-flow-title">{title}</p>
                  <p className="front-flow-text">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </PageCard>
    </main>
  );
};

export default FrontPage;
