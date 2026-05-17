import type React from 'react';
import { useTranslation } from 'react-i18next';
import PageCard from '../../components/PageCard/PageCard';
import { ActionGrid } from '../SummaryPage/components/ActionGrid/ActionGrid';
import { ToastErrorMessage } from '../../components/ToastErrorMessage/ToastErrorMessage';
import { ActionId } from '../../types/summary';
import { useTabChange } from './useTabChange';
import { ActiveTabChip } from './components/ActiveTabChip';
import { LanguageSelector } from './components/LanguageSelector';
import '../../i18n';
import './FrontPage.css';

interface FrontPageProps {
  onClickGenerate: (actionId: ActionId) => void;
  loadingActionId?: ActionId | null;
  errorMessage: string | null;
  onDismissError: () => void;
}

const FrontPage: React.FC<FrontPageProps> = ({
  onClickGenerate,
  loadingActionId = null,
  errorMessage,
  onDismissError,
}) => {
  const { t } = useTranslation();
  const activeTabMeta = useTabChange();

  return (
    <main className="front-page-shell overflow-y-auto custom-scrollbar px-2 py-2 font-google">
      <PageCard as="section" className="front-page-card p-4">
        <h1 className="sr-only">{t("frontpage.heading")}</h1>

        <ActiveTabChip meta={activeTabMeta} />

        <section className="front-action-section" aria-label={t("frontpage.actionRegionAria")}>
          <ActionGrid
            onClickAction={onClickGenerate}
            title={t("frontpage.startSession")}
            loadingActionId={loadingActionId}
            className="mb-0!"
          />
        </section>

        <LanguageSelector />
      </PageCard>
      <ToastErrorMessage errorMessage={errorMessage} onDismissError={onDismissError} />
    </main>
  );
};

export default FrontPage;
