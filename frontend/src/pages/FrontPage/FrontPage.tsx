import type React from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FcGoogle } from 'react-icons/fc';
import PageCard from '../../components/PageCard/PageCard';
import { ActionGrid } from '../SummaryPage/components/ActionGrid/ActionGrid';
import { useExport } from '../SummaryPage/components/ActionGrid/export';
import { ToastErrorMessage } from '../../components/ToastErrorMessage/ToastErrorMessage';
import { ActionId } from '../../types/summary';
import { useTabChange } from './useTabChange';
import { ActiveTabChip } from './components/ActiveTabChip';
import { LanguageSelector } from './components/LanguageSelector';
import { useAuthProfileStore } from '../../stores/authProfileStore';
import { MenuIconSize } from '../../utils/constants';
import '../../i18n';
import './FrontPage.css';

interface FrontPageProps {
  onClickGenerate: (actionId: ActionId) => void;
  loadingActionId?: ActionId | null;
  errorMessage: string | null;
  onDismissError: () => void;
  onClickSignInPage: () => void;
}

const FrontPage: React.FC<FrontPageProps> = ({
  onClickGenerate,
  loadingActionId = null,
  errorMessage,
  onDismissError,
  onClickSignInPage,
}) => {
  const { t } = useTranslation();
  const activeTabMeta = useTabChange();
  const profile = useAuthProfileStore((state) => state.profile);
  const { handleExport, isExportLoading } = useExport();
  const [exportError, setExportError] = useState<string | null>(null);

  const handleClickExport = useCallback(async () => {
    const result = await handleExport();
    if (!result.success) {
      setExportError(result.errorMessage);
    }
  }, [handleExport]);

  const activeError = errorMessage || exportError;
  const dismissActiveError = useCallback(() => {
    if (errorMessage) onDismissError();
    setExportError(null);
  }, [errorMessage, onDismissError]);

  return (
    <main className="front-page-shell overflow-y-auto custom-scrollbar px-2 py-2 font-google">
      <PageCard as="section" className="front-page-card p-4">
        <h1 className="sr-only">{t("frontpage.heading")}</h1>

        <ActiveTabChip meta={activeTabMeta} />

        <section className="front-action-section" aria-label={t("frontpage.actionRegionAria")}>
          <ActionGrid
            onClickAction={onClickGenerate}
            onClickExport={handleClickExport}
            title={t("frontpage.startSession")}
            loadingActionId={loadingActionId}
            isExportLoading={isExportLoading}
            className="mb-0!"
          />
        </section>

        <LanguageSelector />

        {!profile && (
          <section className="front-signin-section">
            <p className="front-signin-prompt">{t("frontpage.signInPrompt")}</p>
            <button
              type="button"
              onClick={onClickSignInPage}
              className="front-signin-btn"
            >
              <FcGoogle size={MenuIconSize} />
              {t("frontpage.signInButton")}
            </button>
          </section>
        )}
      </PageCard>
      <ToastErrorMessage errorMessage={activeError} onDismissError={dismissActiveError} />
    </main>
  );
};

export default FrontPage;
