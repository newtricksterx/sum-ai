import './App.css'
import './Summary.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import MenuBar from './components/MenuBar'
import ToolBar from './components/ToolBar/ToolBar'
import { useSettingsStore } from './stores/settingsStore'
import { GetPageFromStorage, GetSummaryFromStorage, UpdatePageStorage, UpdateSummaryStorage } from './utils/storage'
import LoaderCircle from './components/LoaderCircle'
import DOMPurify from 'dompurify'
import FrontPage from './pages/FrontPage/FrontPage'
import SummaryPage from './pages/SummaryPage'
import { summarizeActiveTab } from './services/summarizeService'
import { getPlainTextFromHtml } from './utils/html'
import HistoryPage from './pages/HistoryPage'
import { useHistoryStore, type HistorySummary } from './stores/historyStore'
import ProfilePage from './pages/ProfilePage/ProfilePage'
import { authInstance } from './services/axiosService'

type MeResponse = {
  email?: string;
  subscription?: {
    history_limit: number | null;
  };
};

const getHistoryOwnerKeyFromEmail = (email: string | null | undefined) => {
  if (typeof email !== "string") {
    return "anonymous";
  }

  const normalizedEmail = email.trim().toLowerCase();
  return normalizedEmail.length > 0 ? `user:${normalizedEmail}` : "anonymous";
};


function App() {
  const [currentPage, SetCurrentPage] = useState(GetPageFromStorage());
  const [summarizedContent, SetSummarizedContent] = useState<string | null>(GetSummaryFromStorage());
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const copySuccessTimeoutRef = useRef<number | null>(null);

  const language = useSettingsStore((state) => state.language)
  const length = useSettingsStore((state) => state.length)
  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const format = useSettingsStore((state) => state.format)
  const addSummaryToHistory = useHistoryStore((state) => state.addSummary)
  const setHistoryOwner = useHistoryStore((state) => state.setHistoryOwner)

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
      if (copySuccessTimeoutRef.current !== null) {
        window.clearTimeout(copySuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncHistoryLimit = async () => {
      try {
        const response = await authInstance.get<MeResponse>("/api/users/me");
        if (!isMounted) {
          return;
        }
        setHistoryOwner(
          getHistoryOwnerKeyFromEmail(response.data.email),
          response.data.subscription?.history_limit ?? 1,
        );
      } catch {
        if (isMounted) {
          setHistoryOwner("anonymous", 1);
        }
      }
    };

    void syncHistoryLimit();

    return () => {
      isMounted = false;
    };
  }, [setHistoryOwner]);

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
    SetSummarizedContent(historyItem.content);
    UpdateSummaryStorage(historyItem.content);
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }

  const isSummarizing = currentPage === 1 && summarizedContent == null

  const onClickCopy = async () => {
    if (!summarizedContent) return;

    try {
      await navigator.clipboard.writeText(getPlainTextFromHtml(summarizedContent));
      setIsCopySuccess(true);

      if (copySuccessTimeoutRef.current !== null) {
        window.clearTimeout(copySuccessTimeoutRef.current);
      }

      copySuccessTimeoutRef.current = window.setTimeout(() => {
        setIsCopySuccess(false);
      }, 1800);
    } catch (error) {
      console.log("Copy Error:", error);
      setIsCopySuccess(false);
    }
  }

  return (
    <section className={`${theme} app-shell flex flex-col w-[360px] max-h-[550px]`}>
      <MenuBar 
        onClickReturn={onClickReturn} 
        onClickForward={onClickForward} 
        onClickClose={onClickClose}
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

