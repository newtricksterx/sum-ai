import './App.css'
import './Summary.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import MenuBar from './components/MenuBar'
import { useSettingsStore } from './stores/settingsStore'
import { GetPageFromStorage, GetSummaryFromStorage, UpdatePageStorage, UpdateSummaryStorage } from './utils/storage'
import LoaderCircle from './components/LoaderCircle'
import DOMPurify from 'dompurify'
import FrontPage from './pages/FrontPage'
import SummaryPage from './pages/SummaryPage'


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

    // Display the front page content
    return (
      <FrontPage onClickGenerate={onClickStartGenerate} />
    )
  }

  const Summarize = async (regenerateBool: boolean) => {
    SetSummarizedContent(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    // 1. MOCK CHECK: Short-circuit the API call if in development mode
    if (import.meta.env.VITE_DEV === 'true') {
      console.log("Dev Mode: Using Mock Summary");
      
      // Simulate a 1-second network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockHtml = `
        <h1>Development Mock Summary</h1>
        <p>This is a <strong>simulated response</strong> to help you style your UI without calling Gemini.</p>
        <ul>
          <li><strong>Cost:</strong> $0.00 (Local)</li>
          <li><strong>Speed:</strong> Instant</li>
          <li><strong>Format:</strong> Matches your production HTML</li>
        </ul>
        <p>Check out <a href="https://google.com" target="_blank" rel="noopener">this test link</a> to see if your link styles work.</p>
      `;
      
      SetSummarizedContent(mockHtml);
      UpdateSummaryStorage(mockHtml);
      return; // Exit function early
    }

    // 2. REAL LOGIC: Only runs in Production
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
              const article = document.querySelector('article') || document.querySelector('main');
              const text = article ? article.innerText : document.body.innerText;
              // Basic cleanup: remove extra whitespace and newlines
              return text.replace(/\s\s+/g, ' ').trim().slice(0, 10000); 
            },
      });

    const pageText = injectionResults[0].result;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: pageText, 
          length: length, 
          regenerate: regenerateBool, 
          format: format, 
          language: language 
        })
      });

      const result = await response.json();
      SetSummarizedContent(result.data);
      UpdateSummaryStorage(result.data);
    } catch (error) {
      console.log("Fetch Error:", error);
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

  const onClickRegenerate = async () => {
    //console.log("regenerate")
    await Summarize(true);
  }

  const onClickStartGenerate = async () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
    await Summarize(false);
  }

  const getPlainTextFromHtml = (html: string) => {
    const parser = document.createElement('div');
    parser.innerHTML = html;
    return parser.textContent?.trim() ?? '';
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
        onClickCopy={onClickCopy}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 h-auto">
        {renderUserInterface()}
      </div>
    </section>
  )
}

export default App
