import './App.css'
import { useState } from 'react'
import MenuBar from './components/MenuBar'
import { useSettingsStore } from './stores/settingsStore'
import { GetPageFromStorage, GetSummaryFromStorage, UpdatePageStorage, UpdateSummaryStorage } from './utils/storage'
import { NotebookPen } from 'lucide-react';
import LoaderCircle from './components/LoaderCircle'
import DOMPurify from 'dompurify'


function App() {
  const [currentPage, SetCurrentPage] = useState(GetPageFromStorage());
  const [summarizedContent, SetSummarizedContent] = useState<string | null>(GetSummaryFromStorage());

  const language = useSettingsStore((state) => state.language)
  const length = useSettingsStore((state) => state.length)
  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const format = useSettingsStore((state) => state.format)

  const UserInterface = () => {
    const cleanedContent = DOMPurify.sanitize(summarizedContent || "", 
      {
        ALLOWED_TAGS: ['h1', 'h2', 'p', 'ul', 'li', 'strong', 'em', 'a', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'] 
      }
    )


    if(currentPage === 1 && summarizedContent == null){
      return (
        <div className="flex-1 flex relative justify-center items-center min-h-[210px] z-40">
          <LoaderCircle />
        </div>
      )
    }

    if(currentPage === 1){
      return (        
        <div style={{ fontSize: `${fontSize}px` }} 
              className={`font-noto p-2 m-2 min-h-[210px] h-max flex-shrink-0`} 
              dangerouslySetInnerHTML={{ __html:
                
                cleanedContent!
                
              }}>
        </div>
      )
    }

    return (
      <div className='flex-1 flex relative justify-center items-center min-h-[210px]'>
          <button onClick={onClickSumPage} 
            className="flex flex-row gap-2 items-center cursor-pointer border-0 rounded-3xl bg-[#303030] text-gray-100 hover:bg-[#373737]
            dark:bg-gray-100 dark:text-black py-1.5 px-3 dark:hover:bg-gray-200 text-[14px] mx-auto my-auto font-noto
            mt-2 mb-2" >
          <NotebookPen />
          Summarize This Page
        </button>
      </div>

    )
  }

  const Summarize = async (regenerateBool: boolean) => {
    SetSummarizedContent(null);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;

    // 1. Extract text directly from the user's current tab
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const article = document.querySelector('article');
        return article ? article.innerText : document.body.innerText;
      },
    });

    const pageText = injectionResults[0].result;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        
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

  const onClickSumPage = async () => {
    SetCurrentPage(1)
    UpdatePageStorage(1);
    await Summarize(false);
  }
  

  const onClickReturn = () => {
    SetCurrentPage(0);
    UpdatePageStorage(0);
  }

  const onClickForward = () => {
    SetCurrentPage(1);
    UpdatePageStorage(1);
  }

  const onClickClose = () => {
    window.close();
  }

  const onClickRegenerate = async () => {
    //console.log("regenerate")
    await Summarize(true);
  }

  const onClickRefresh = () => {
    //chrome.runtime.reload();
    window.location.reload();
  }

  return (
    <section className={`${theme} flex flex-col w-[360px] max-h-[510px]`}>           
      <MenuBar 
        onClickReturn={onClickReturn} 
        onClickForward={onClickForward} 
        onClickClose={onClickClose}
        onClickRegenerate={onClickRegenerate} 
        onClickRefresh={onClickRefresh}
      />
      <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar min-h-0 h-auto">
        <UserInterface />
      </div>
    </section>
  )
}

export default App


