import './App.css'
import '../../Summary.css'
import { useState } from "react"
import MenuBar from '../../components/MenuBar/MenuBar'
import ToolBar from '../../components/ToolBar/ToolBar'
import { useSettingsStore } from '../../stores/settingsStore'
import { GetPageFromStorage, UpdatePageStorage } from '../../utils/storage'
import LoaderCircle from '../../components/LoaderCircle'
import FrontPage from '../FrontPage/FrontPage'
import SummaryPage from '../SummaryPage/SummaryPage'
import { sanitizeSummaryHtml } from '../SummaryPage/sanitizeSummaryHtml'
import { getPlainTextFromHtml } from '../../utils/html'
import HistoryPage from '../HistoryPage/HistoryPage'
import { type HistorySummary } from '../../stores/historyStore'
import ProfilePage from '../ProfilePage/ProfilePage'
import { useCopySuccessTimer } from '../../components/ToolBar/useCopySuccessTimer'
import { useHistoryOwnerSync } from '../HistoryPage/useHistoryOwnerSync'
import { useSummarizeActiveTab } from '../SummaryPage/useSummarizeActiveTab'
import { useAuthProfileStore } from '../../stores/authProfileStore'
import { useHistoryStore } from '../../stores/historyStore'
import { useAppLanguageEffect } from './useAppLanguageEffect'
import { useHydrateProfileAfterLogin } from './useHydrateProfileAfterLogin'
import { useAuthLogoutReset } from './useAuthLogoutReset'


function App() {
  const [currentPage, setCurrentPage] = useState(GetPageFromStorage() ?? 0);
  const { summarizedContent, summarize, setSummaryFromHistory } = useSummarizeActiveTab();
  const { isCopySuccess, showCopySuccess, resetCopySuccess } = useCopySuccessTimer();

  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const language = useSettingsStore((state) => state.language)
  const hydrateProfile = useAuthProfileStore((state) => state.hydrateProfile)
  const clearProfile = useAuthProfileStore((state) => state.clearProfile)
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner)

  useAppLanguageEffect(language);
  useHydrateProfileAfterLogin(hydrateProfile);
  useAuthLogoutReset(clearProfile, setHistoryOwner);

  useHistoryOwnerSync();

  const setPage = (nextPage: number) => {
    setCurrentPage(nextPage);
    UpdatePageStorage(nextPage);
  };

  const Summarize = async (regenerateBool: boolean) => {
    await summarize(regenerateBool);
  };

  const onClickReturn = () => {
    setPage(0);
  };

  const onClickForward = () => {
    setPage(1);
  };

  const onClickHistory = () => {
    setPage(2);
  };

  const onClickProfile = () => {
    setPage(3);
  };

  const onClickDownload = async () => {
    const sanitizedSummary = sanitizeSummaryHtml(summarizedContent ?? "");

    if (!sanitizedSummary.trim()) return;

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
          ${sanitizedSummary}
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
    setPage(1);
    await Summarize(false);
  }

  const onSelectHistory = (historyItem: HistorySummary) => {
    setSummaryFromHistory(historyItem);
    setPage(1);
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

  const renderUserInterface = () => {
    // Display the loading circle
    if (currentPage === 1 && summarizedContent == null) {
      return (
        <div className="flex-1 flex relative justify-center items-center min-h-75 z-40">
          <LoaderCircle />
        </div>
      )
    }

    // Display the summarized content
    if (currentPage === 1) {
      return (
        <SummaryPage content={summarizedContent ?? ""} fontSize={fontSize} />
      );
    }

    // display history content
    if (currentPage === 2) {
      return (
        <HistoryPage onSelectHistory={onSelectHistory} />
      );
    }

    if (currentPage === 3) {
      return (
        <ProfilePage />
      );
    }

    // Display the front page content
    return (
      <FrontPage onClickGenerate={onClickStartGenerate} />
    )
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
