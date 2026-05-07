import './App.css'
import './Summary.css'
import { useEffect, useMemo, useState } from 'react'
import MenuBar from './components/MenuBar/MenuBar'
import ToolBar from './components/ToolBar/ToolBar'
import { useSettingsStore } from './stores/settingsStore'
import i18n, { APP_LANGUAGE_TO_I18N } from './i18n'
import { GetPageFromStorage, UpdatePageStorage } from './utils/storage'
import LoaderCircle from './components/LoaderCircle'
import DOMPurify from 'dompurify'
import FrontPage from './pages/FrontPage/FrontPage'
import SummaryPage from './pages/SummaryPage/SummaryPage'
import { getPlainTextFromHtml } from './utils/html'
import HistoryPage from './pages/HistoryPage/HistoryPage'
import { type HistorySummary } from './stores/historyStore'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import { useCopySuccessTimer } from './components/ToolBar/useCopySuccessTimer'
import { useHistoryOwnerSync } from './pages/HistoryPage/useHistoryOwnerSync'
import { useSummarizeActiveTab } from './pages/SummaryPage/useSummarizeActiveTab'


function App() {
  const [currentPage, SetCurrentPage] = useState(GetPageFromStorage());
  const { summarizedContent, summarize, setSummaryFromHistory } = useSummarizeActiveTab();
  const { isCopySuccess, showCopySuccess, resetCopySuccess } = useCopySuccessTimer();

  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const language = useSettingsStore((state) => state.language)

  useEffect(() => {
    const nextLanguage = APP_LANGUAGE_TO_I18N[language] ?? "en";
    void i18n.changeLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, [language]);

  const cleanedContent = useMemo(() => {
    return DOMPurify.sanitize(summarizedContent || "",
      {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'a', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      }
    );
  }, [summarizedContent]);

  useHistoryOwnerSync();

  const renderUserInterface = () => {
    // Display the loading circle
    if(currentPage === 1 && summarizedContent == null){
      return (
        <div className="flex-1 flex relative justify-center items-center min-h-75 z-40">
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
    await summarize(regenerateBool);
  };

  const onClickReturn = () => {
    SetCurrentPage(0);
    UpdatePageStorage(0);
  }

  const onClickForward = () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }
  
  const onClickHistory = () => {
    SetCurrentPage(2);
    UpdatePageStorage(2);
  }

  const onClickProfile = () => {
    SetCurrentPage(3);
    UpdatePageStorage(3);
  }

  const onClickDownload = async () => {
    if (!cleanedContent.trim()) return;

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const printableHtml = `
        <div class="pdf-export-root" style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.65; font-size: 12px;">
          <style>
            .pdf-export-root h1 { font-size: 20px; line-height: 1.35; margin: 0 0 12px; font-weight: 700; color: #111827; }
            .pdf-export-root h2 { font-size: 13px; line-height: 1.35; margin: 14px 0 8px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
            .pdf-export-root p { margin: 0 0 10px; }
            .pdf-export-root ul { margin: 0 0 12px 18px; padding: 0; list-style-type: disc; }
            .pdf-export-root li { margin: 0 0 6px; }
            .pdf-export-root strong { font-weight: 700; color: #111827; }
            .pdf-export-root a { color: #EFBF04; text-decoration: underline; }
          </style>
          ${cleanedContent}
        </div>
      `;

      await pdf.html(printableHtml, {
        margin: [28, 28, 28, 28],
        autoPaging: "text",
        width: 539,
        windowWidth: 539,
        html2canvas: {
          backgroundColor: "#ffffff",
          scale: 1,
        },
      });

      pdf.save("summary.pdf");
    } catch (error) {
      console.log("PDF export error:", error);
    }
  }

  const onClickGenerate = async () => {
    //console.log("regenerate")
    await Summarize(true);
  }

  const onClickStartGenerate = async () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
    await Summarize(false);
  }

  const onSelectHistory = (historyItem: HistorySummary) => {
    setSummaryFromHistory(historyItem);
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }

  const isSummarizing = currentPage === 1 && summarizedContent == null

  const onClickCopy = async () => {
    if (!summarizedContent) return;

    try {
      await navigator.clipboard.writeText(getPlainTextFromHtml(summarizedContent));
      showCopySuccess();
    } catch (error) {
      console.log("Copy Error:", error);
      resetCopySuccess();
    }
  }

  return (
    <section className={`${theme} app-shell flex flex-col w-90 max-h-137.5`}>
      <MenuBar 
        onClickReturn={onClickReturn} 
        onClickForward={onClickForward} 
        onClickProfile={onClickProfile}
        onClickHistory={onClickHistory}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
        {renderUserInterface()}
      </div>
      {currentPage === 1 && (
        <ToolBar
          onClickCopy={onClickCopy}
          onClickDownload={onClickDownload}
          isSummarizing={isSummarizing}
          onClickGenerate={onClickGenerate}
          isCopySuccess={isCopySuccess}
        />
      )}
    </section>
  )
}

export default App

