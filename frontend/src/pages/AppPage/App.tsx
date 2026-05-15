import './App.css'
import '../SummaryPage/Summary.css'
import { startTransition, useCallback, useMemo, useRef, useState, type ReactNode } from "react"
import MenuBar from '../../components/MenuBar/MenuBar'
import ToolBar from '../../components/ToolBar/ToolBar'
import { useSettingsStore } from '../../stores/settingsStore'
import { GetPageFromStorage, UpdatePageStorage } from '../../utils/storage'
import FrontPage from '../FrontPage/FrontPage'
import SummaryPage from '../SummaryPage/SummaryPage'
import { getPlainTextFromHtml } from '../../utils/html'
import HistoryPage from '../HistoryPage/HistoryPage'
import ProfilePage from '../ProfilePage/ProfilePage'
import { useCopySuccessTimer } from '../../components/ToolBar/useCopySuccessTimer'
import { useActionItem } from '../SummaryPage/useActionItem'
import { useAuthProfileStore } from '../../stores/authProfileStore'
import { useAppLanguageEffect } from './useAppLanguageEffect'
import { useHydrateProfileAfterLogin } from './useHydrateProfileAfterLogin'
import { useAuthLogoutReset } from './useAuthLogoutReset'
import { useHydrateProfileOnAuthChange } from './useHydrateProfileOnAuthChange'
import { useTrackMountedPages } from './useTrackMountedPages'
import { usePageSwitchCleanup } from './usePageSwitchCleanup'
import { SettingsPage } from '../SettingsPage/SettingsPage'
import { savePDF } from '../../utils/functions'


function App() {
  const [currentPage, setCurrentPage] = useState(() => GetPageFromStorage() ?? 0);
  const pendingPageRef = useRef<number | null>(null);
  const pageFrameRef = useRef<number | null>(null);
  const pageStorageTimeoutRef = useRef<number | null>(null);
  const [mountedPages, setMountedPages] = useState<Record<number, true>>(() => {
    const initialPage = GetPageFromStorage() ?? 0;
    return { [initialPage]: true };
  });
  const {
    actionItems,
    loadingActionId,
    addActionItem,
    removeActionItem,
  } = useActionItem();
  const { isCopySuccess, showCopySuccess, resetCopySuccess } = useCopySuccessTimer();

  const fontSize = useSettingsStore((state) => state.fontSize)
  const language = useSettingsStore((state) => state.language)
  const currency = useSettingsStore((state) => state.currency)
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile)
  const authProfile = useAuthProfileStore((state) => state.profile)
  const clearProfile = useAuthProfileStore((state) => state.clearProfile)

  useAppLanguageEffect(language);
  useHydrateProfileAfterLogin(hydrateProfile, currency);
  useAuthLogoutReset(clearProfile);

  
  useHydrateProfileOnAuthChange(authProfile, currency, hydrateProfile);
  useTrackMountedPages(currentPage, setMountedPages);

  const schedulePageStorageWrite = useCallback((nextPage: number) => {
    if (typeof window === "undefined") {
      UpdatePageStorage(nextPage);
      return;
    }

    if (pageStorageTimeoutRef.current !== null) {
      window.clearTimeout(pageStorageTimeoutRef.current);
    }

    // Defer localStorage writes so rapid menu taps do not block input handling.
    pageStorageTimeoutRef.current = window.setTimeout(() => {
      UpdatePageStorage(nextPage);
      pageStorageTimeoutRef.current = null;
    }, 120);
  }, []);

  const commitPage = useCallback((nextPage: number) => {
    startTransition(() => {
      setCurrentPage((prevPage) => (prevPage === nextPage ? prevPage : nextPage));
    });
    schedulePageStorageWrite(nextPage);
  }, [schedulePageStorageWrite]);

  const setPage = useCallback((nextPage: number) => {
    pendingPageRef.current = nextPage;

    if (typeof window === "undefined") {
      commitPage(nextPage);
      pendingPageRef.current = null;
      return;
    }

    if (pageFrameRef.current !== null) {
      return;
    }

    pageFrameRef.current = window.requestAnimationFrame(() => {
      pageFrameRef.current = null;
      const scheduledPage = pendingPageRef.current;
      pendingPageRef.current = null;

      if (typeof scheduledPage !== "number") {
        return;
      }

      commitPage(scheduledPage);
    });
  }, [commitPage]);
  usePageSwitchCleanup(pageFrameRef, pageStorageTimeoutRef);

  const onClickReturn = useCallback(() => {
    setPage(0);
  }, [setPage]);

  const onClickForward = useCallback(() => {
    setPage(1);
  }, [setPage]);

  const onClickHistory = useCallback(() => {
    setPage(2);
  }, [setPage]);

  const onClickProfile = useCallback(() => {
    setPage(3);
  }, [setPage]);

  const onClickSettings = useCallback(() => {
    setPage(4);
  }, [setPage]);

  const onClickDownload = async () => {
    await savePDF("test pdf");
  }


  const onClickStartSession = useCallback(async () => {
    if (loadingActionId !== null) {
      return;
    }
    setPage(1);
    await addActionItem("summary", { resetSession: true, forceActiveTab: true });
  }, [addActionItem, loadingActionId, setPage]);

  const isActionItemLoading = loadingActionId !== null;
  const canUseSummaryActions = useMemo(() => {
    if (currentPage !== 1) {
      return false;
    }
    return true;
  }, [currentPage]);

  const onClickCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPlainTextFromHtml("test copy"));
      showCopySuccess();
    } catch (error) {
      console.error("Copy Error:", error);
      resetCopySuccess();
    }
  }

  const summaryPageContent = useMemo(() => {

    return (
      <SummaryPage
        fontSize={fontSize}
        actionItems={actionItems}
        onAddActionItem={addActionItem}
        onRemoveActionItem={removeActionItem}
        loadingActionId={loadingActionId} isSummarySuccess={false}      />
    );
  }, [actionItems, addActionItem, fontSize, loadingActionId, removeActionItem]);

  const frontPageContent = useMemo(
    () => <FrontPage onClickGenerate={onClickStartSession} isGenerateDisabled={isActionItemLoading} />,
    [isActionItemLoading, onClickStartSession],
  );
  const historyPageContent = useMemo(() => <HistoryPage />, []);
  const profilePageContent = useMemo(() => <ProfilePage />, []);
  const settingsPageContent = useMemo(() => <SettingsPage />, []);

  const renderPagePanel = (pageIndex: number, content: ReactNode) => {
    if (!mountedPages[pageIndex] && currentPage !== pageIndex) {
      return null;
    }

    const isActivePage = currentPage === pageIndex;
    return (
      <section
        key={pageIndex}
        hidden={!isActivePage}
        className="app-page-panel"
      >
        {content}
      </section>
    );
  };

  const renderUserInterface = () => {
    return (
      <>
        {renderPagePanel(0, frontPageContent)}
        {renderPagePanel(1, summaryPageContent)}
        {renderPagePanel(2, historyPageContent)}
        {renderPagePanel(3, profilePageContent)}
        {renderPagePanel(4, settingsPageContent)}
      </>
    );
  };

  return (
    <section className="app-shell flex flex-col w-90 max-h-137.5">
      <MenuBar
        onClickReturn={onClickReturn}
        onClickForward={onClickForward}
        onClickProfile={onClickProfile}
        onClickHistory={onClickHistory}
        onClickSettings={onClickSettings}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
        {renderUserInterface()}
      </div>
      {currentPage === 1 && (
        <ToolBar
          onClickCopy={onClickCopy}
          onClickDownload={onClickDownload}
          isSummarizing={false}
          isGenerateDisabled={isActionItemLoading}
          onClickGenerate={onClickStartSession}
          isCopySuccess={isCopySuccess}
          canUseSummaryActions={canUseSummaryActions}
        />
      )}
    </section>
  )
}

export default App
