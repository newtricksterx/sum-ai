import './App.css'
import '../SummaryPage/Summary.css'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import MenuBar from '../../components/MenuBar/MenuBar'
import ToolBar from '../../components/ToolBar/ToolBar'
import LoaderCircle from '../../components/LoaderCircle'
import { useSettingsStore } from '../../stores/settingsStore'
import FrontPage from '../FrontPage/FrontPage'
import SummaryPage from '../SummaryPage/SummaryPage'
import { useActionItem } from '../SummaryPage/useActionItem'
import { useAuthProfileStore } from '../../stores/authProfileStore'
import { useCurrentSessionState, type SessionState } from '../../stores/sessionStorage'
import { useAppLanguageEffect } from './useAppLanguageEffect'
import { useHydrateProfileAfterLogin } from './useHydrateProfileAfterLogin'
import { useAuthLogoutReset } from './useAuthLogoutReset'
import { useRestoreSessionOnLogin } from './useRestoreSessionOnLogin'
import { useTrackMountedPages } from './useTrackMountedPages'
import { usePageSwitchCleanup } from './usePageSwitchCleanup'
import { usePageRouter } from './usePageRouter'
import { isLoggedOut } from '../../services/authSignals'
import { ActionId } from '../../types/summary'
import { PageType } from '../../utils/types'
import * as Toast from '@radix-ui/react-toast'
import { ErrorBoundary } from '../../components/ErrorBoundary'

const HistoryPage = lazy(() => import('../HistoryPage/HistoryPage'))
const ProfilePage = lazy(() => import('../ProfilePage/ProfilePage'))
const SettingsPage = lazy(() =>
  import('../SettingsPage/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

function App() {
  const {
    currentPage,
    mountedPages,
    setMountedPages,
    setPage,
    pageFrameRef,
    pageStorageTimeoutRef,
  } = usePageRouter();

  const {
    actionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
  } = useActionItem();

  const fontSize = useSettingsStore((state) => state.fontSize)
  const language = useSettingsStore((state) => state.language)
  const currency = useSettingsStore((state) => state.currency)
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile)
  const authProfile = useAuthProfileStore((state) => state.profile)
  const clearProfile = useAuthProfileStore((state) => state.clearProfile)
  const resetSession = useCurrentSessionState((state) => state.resetSession)

  useAppLanguageEffect(language);
  useHydrateProfileAfterLogin(hydrateProfile, currency);
  useAuthLogoutReset(clearProfile);
  useRestoreSessionOnLogin(authProfile);
  useTrackMountedPages(currentPage, setMountedPages);
  usePageSwitchCleanup(pageFrameRef, pageStorageTimeoutRef);

  const onMenuClick = useCallback((page: PageType) => {
    setPage(page);
  }, [setPage]);

  const onClickSignInPage = useCallback(() => {
    setPage("profile");
  }, [setPage]);

  const onClickClose = useCallback(() => {
    window.close();
  }, []);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dismissError = useCallback(() => setErrorMessage(null), []);

  const onClickStartSession = useCallback(async (actionId: ActionId) => {
    if (loadingActionId !== null) {
      return;
    }
    const result = await addActionItem(actionId, { resetSession: true, forceActiveTab: true });

    if (result.success) {
      setPage("session");
    } else {
      setErrorMessage(result.errorMessage);
    }
  }, [addActionItem, loadingActionId, setPage]);

  const onOpenHistorySession = useCallback((session: SessionState) => {
    useCurrentSessionState.getState().restoreSession(session);
    setPage("session");
  }, [setPage]);

  useEffect(() => {
    if (isLoggedOut()) {
      clearProfile();
    } else {
      void hydrateProfile(false, currency);
    }
  }, [hydrateProfile, clearProfile, currency]);

  const isActionItemLoading = loadingActionId !== null;

  const summaryPageContent = useMemo(() => (
    <SummaryPage
      fontSize={fontSize}
      actionItems={actionItems}
      onAddActionItem={addActionItem}
      onRemoveActionItem={removeActionItem}
      loadingActionId={loadingActionId}
    />
  ), [actionItems, addActionItem, fontSize, loadingActionId, removeActionItem]);

  const frontPageContent = useMemo(() => (
    <FrontPage
      onClickGenerate={onClickStartSession}
      loadingActionId={loadingActionId}
      errorMessage={errorMessage}
      onDismissError={dismissError}
      onClickSignInPage={onClickSignInPage}
    />
  ), [loadingActionId, onClickStartSession, errorMessage, dismissError, onClickSignInPage]);

  const historyPageContent = useMemo(
    () => <HistoryPage onOpenSession={onOpenHistorySession} onClickSignInPage={onClickSignInPage}/>,
    [onOpenHistorySession, onClickSignInPage],
  );
  const profilePageContent = useMemo(() => <ProfilePage />, []);
  const settingsPageContent = useMemo(() => <SettingsPage />, []);

  const pages: ReadonlyArray<{ key: PageType; content: ReactNode; lazy?: boolean }> = [
    { key: "home", content: frontPageContent },
    { key: "session", content: summaryPageContent },
    { key: "history", content: historyPageContent, lazy: true },
    { key: "profile", content: profilePageContent, lazy: true },
    { key: "settings", content: settingsPageContent, lazy: true },
  ];

  const renderPagePanel = (pageKey: PageType, content: ReactNode, isLazy?: boolean) => {
    if (!mountedPages[pageKey] && currentPage !== pageKey) {
      return null;
    }

    const isActivePage = currentPage === pageKey;
    return (
      <section
        key={pageKey}
        hidden={!isActivePage}
        className="app-page-panel"
      >
        <ErrorBoundary>
          {isLazy ? (
            <Suspense fallback={<LoaderCircle className='my-2'/>}>{content}</Suspense>
          ) : (
            content
          )}
        </ErrorBoundary>
      </section>
    );
  };

  return (
    <section className="app-shell flex flex-col w-90 max-h-137.5">
      <MenuBar
        currentPage={currentPage}
        onMenuClick={onMenuClick}
        onClickClose={onClickClose}
      />
      <Toast.Provider>
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
          {pages.map(({ key, content, lazy: isLazy }) => renderPagePanel(key, content, isLazy))}
        </div>
        {currentPage === "session" && (
          <ToolBar
            isSummarizing={false}
            isGenerateDisabled={isActionItemLoading}
            onClickNewSession={resetSession}
          />
        )}
        <Toast.Viewport className="fixed bottom-3 right-3 z-50 flex flex-col gap-2 outline-none" />
      </Toast.Provider>
    </section>
  )
}

export default App
