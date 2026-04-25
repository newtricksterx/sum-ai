import './App.css'
import './Summary.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import MenuBar from './components/MenuBar'
import ToolBar from './components/ToolBar'
import { useSettingsStore } from './stores/settingsStore'
import { GetPageFromStorage, GetSummaryFromStorage, UpdatePageStorage, UpdateSummaryStorage } from './utils/storage'
import LoaderCircle from './components/LoaderCircle'
import DOMPurify from 'dompurify'
import FrontPage from './pages/FrontPage'
import SummaryPage from './pages/SummaryPage'
import { summarizeActiveTab } from './services/summarizeService'
import { getPlainTextFromHtml } from './utils/html'
import HistoryPage from './pages/HistoryPage'
import { useHistoryStore } from './stores/historyStore'
import ProfilePage from './pages/ProfilePage'


function App() {
  const [currentPage, SetCurrentPage] = useState(GetPageFromStorage());
  const [summarizedContent, SetSummarizedContent] = useState<string | null>(GetSummaryFromStorage());
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const copyNoticeTimeoutRef = useRef<number | null>(null);

  const language = useSettingsStore((state) => state.language)
  const length = useSettingsStore((state) => state.length)
  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const format = useSettingsStore((state) => state.format)
  const addSummaryToHistory = useHistoryStore((state) => state.addSummary)

  const cleanedContent = useMemo(() => {
    return DOMPurify.sanitize(summarizedContent || "",
      {
        ALLOWED_TAGS: ['h1', 'h2', 'p', 'ul', 'li', 'strong', 'em', 'a', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      }
    );
  }, [summarizedContent]);

  useEffect(() => {
    return () => {
      if (copyNoticeTimeoutRef.current !== null) {
        window.clearTimeout(copyNoticeTimeoutRef.current);
      }
    };
  }, []);

  const renderUserInterface = () => {
    // Display the loading circle
    if(currentPage === 1 && summarizedContent == null){
      return (
        <div className="flex-1 flex relative justify-center items-center min-h-[300px] z-40">
          <LoaderCircle />
        </div>  
      )
    }

    // Display the summarized content
    if (currentPage === 1) {
      return (
        <SummaryPage content={cleanedContent} fontSize={fontSize}/>
      );
    }

    // display history content
    if (currentPage === 2){
      return (
        <HistoryPage onSelectHistory={onSelectHistory} />
      );
    }

    if (currentPage === 3){
      return (
        <ProfilePage />
      );
    }

    // Display the front page content
    return (
      <FrontPage onClickGenerate={onClickStartGenerate} />
    )
  }

  const Summarize = async (regenerateBool: boolean) => {
    SetSummarizedContent(null);

    const result = await summarizeActiveTab({
      baseUrl: import.meta.env.VITE_BASE_URL,
      length,
      regenerate: regenerateBool,
      format,
      language,
    });

    SetSummarizedContent(result.html);
    UpdateSummaryStorage(result.html);

    if (!result.isError && result.sourceUrl) {
      addSummaryToHistory({
        url: result.sourceUrl,
        content: result.html,
      });
    }
  };

  const onClickReturn = () => {
    SetCurrentPage(0);
    UpdatePageStorage(0);
  }

  const onClickForward = () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }

  const onClickClose = () => {
    SetCurrentPage(0);
    UpdatePageStorage(0);
    window.close();
  }  
  
  const onClickHistory = () => {
    SetCurrentPage(2);
    UpdatePageStorage(2);
  }

  const onClickProfile = () => {
    SetCurrentPage(3);
    UpdatePageStorage(3);
  }

  const onClickRegenerate = async () => {
    //console.log("regenerate")
    await Summarize(true);
  }

  const onClickStartGenerate = async () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
    await Summarize(false);
  }

  const onSelectHistory = (historyContent: string) => {
    SetSummarizedContent(historyContent);
    UpdateSummaryStorage(historyContent);
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }



  const onClickCopy = async () => {
    if (!summarizedContent) return;

    try {
      await navigator.clipboard.writeText(getPlainTextFromHtml(summarizedContent));
      setShowCopyNotice(true);

      if (copyNoticeTimeoutRef.current !== null) {
        window.clearTimeout(copyNoticeTimeoutRef.current);
      }

      copyNoticeTimeoutRef.current = window.setTimeout(() => {
        setShowCopyNotice(false);
      }, 1800);
    } catch (error) {
      console.log("Copy Error:", error);
    }
  }

  return (
    <section className={`${theme} flex flex-col w-[360px] min-h-[330px] max-h-[510px]`}>           
      {showCopyNotice && (
        <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 shadow-sm dark:border-emerald-900/80 dark:bg-emerald-950/70 dark:text-emerald-300">
          Copied successfully
        </div>
      )}
      <MenuBar 
        onClickReturn={onClickReturn} 
        onClickForward={onClickForward} 
        onClickClose={onClickClose}
        onClickRegenerate={onClickRegenerate} 
        onClickProfile={onClickProfile}
        onClickHistory={onClickHistory}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 h-auto">
        {renderUserInterface()}
      </div>
      {currentPage === 1 && <ToolBar onClickCopy={onClickCopy} />}
    </section>
  )
}

export default App
