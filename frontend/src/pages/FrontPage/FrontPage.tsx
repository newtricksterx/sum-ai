import type React from 'react';
import { FileText, Languages } from 'lucide-react';
import PageCard from '../../components/PageCard/PageCard';
import { useTabChange } from './useTabChange';
import './FrontPage.css';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import { ActionGrid } from '../SummaryPage/components/ActionGrid/ActionGrid';
import { ActionId } from '../../types/summary';
import { SettingsPageDropdown } from '../SettingsPage/SettingsPageDropdown';
import type { SettingsPageDropdownOption } from '../SettingsPage/settingspage.utils';
import { all_languages } from '../../utils/constants';
import type { Language } from '../../utils/types';
import { useSettingsStore } from '../../stores/settingsStore';

interface FrontPageProps {
  onClickGenerate: (actionId: ActionId) => void;
  isGenerateDisabled?: boolean;
  loadingActionId?: ActionId | null;
}

const LANGUAGE_OPTION_LABEL: Record<Language, string> = {
  english: "English",
  french: "Français",
  spanish: "Español",
  mandarin: "普通话",
  hindi: "हिन्दी",
};

const LANGUAGE_OPTIONS: ReadonlyArray<SettingsPageDropdownOption<Language>> =
  all_languages.map((value) => ({ value, label: LANGUAGE_OPTION_LABEL[value] }));

const FrontPage: React.FC<FrontPageProps> = ({ onClickGenerate, loadingActionId = null }) => {
  const { t } = useTranslation();
  const activeTabMeta = useTabChange();
  const language = useSettingsStore((state) => state.language);
  const updateLanguage = useSettingsStore((state) => state.UpdateLanguage);

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
          
          <ActionGrid 
            onClickAction={onClickGenerate} 
            title={'Click to start a Session'} 
            loadingActionId={loadingActionId} 
            className='mb-0!'/>
        </section>

        <section className='front-language'>
          <div>
            <Languages className='front-language-icon' size={24}/>
            <label htmlFor="front-language-select" className='front-language-label'>{t("frontpage.language")}</label>
          </div>
          <SettingsPageDropdown<Language>
            id="front-language-select"
            value={language}
            options={LANGUAGE_OPTIONS}
            onValueChange={updateLanguage}
            ariaLabel={t("frontpage.language")}
          />
        </section>
      </PageCard>
    </main>
  );
};

export default FrontPage;


/*
          <button
            type="button"
            onClick={onClickGenerate}
            disabled={isGenerateDisabled}
            className={`front-generate-btn ${isGenerateDisabled ? "cursor-not-allowed opacity-70" : ""}`.trim()}
          >
            <WandSparkles size={15} />
            {t("frontpage.summarizeTab")}
*/