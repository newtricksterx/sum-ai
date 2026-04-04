import './App.css'
import { useState } from 'react'
import MenuBar from './components/MenuBar'
import { BASE_URL, isDebugMode } from './utils/constants'
import { useSettingsStore } from './stores/settingsStore'
import { GetPageFromStorage, GetSummaryFromStorage, UpdatePageStorage, UpdateSummaryStorage } from './utils/storage'
import { NotebookPen } from 'lucide-react';
import LoaderCircle from './components/LoaderCircle'


function App() {
  const [currentPage, SetCurrentPage] = useState(GetPageFromStorage());
  const [summarizedContent, SetSummarizedContent] = useState<string | null>(GetSummaryFromStorage());

  const language = useSettingsStore((state) => state.language)
  const length = useSettingsStore((state) => state.length)
  const theme = useSettingsStore((state) => state.theme)
  const fontSize = useSettingsStore((state) => state.fontSize)
  const format = useSettingsStore((state) => state.format)

  const UserInterface = () => {
    if(currentPage === 1 && summarizedContent == null){
      return (
        <LoaderCircle />
      )
    }

    /*
        <p style={{ fontSize: `${fontSize}px` }} className={`font-noto p-2 m-2 border-2 border-solid rounded-md overflow-hidden text-clip`}>
          {summarizedContent}
        </p>
    */

    if(currentPage === 1){
      return (        
        <div style={{ fontSize: `${fontSize}px` }} className={`font-noto p-2 m-2 border-2 border-solid rounded-md overflow-hidden text-clip`} dangerouslySetInnerHTML={{ __html:
          
          summarizedContent!
          
        }}>

        </div>
      )
    }

    return (
      <button onClick={onClickSumPage} 
        className="flex flex-row gap-2 items-center cursor-pointer border-0 rounded-3xl bg-[#303030] text-gray-100 hover:bg-[#373737]
        dark:bg-gray-100 dark:text-black py-1.5 px-3 dark:hover:bg-gray-200 text-[14px] mx-auto my-auto font-noto" >
        <NotebookPen />
        Summarize This Page
      </button>
    )
  }

  const Summarize = async (regenerateBool: boolean) => {
    SetSummarizedContent(null)

    //console.log("BASE URL: " + BASE_URL)
    //console.log("Debug Mode: " + isDebugMode)

    if(isDebugMode){
      const query = "summarize the content in this page: (text), where the length is: " + length.toString() + 
      `. ${regenerateBool ? "It also must be a different version" : ""}` + Math.floor(Math.random() * 100).toString(); 

      SetSummarizedContent(query);
      UpdateSummaryStorage(query);
      return;
    }

    let [tab] = await chrome.tabs.query({active: true});
    const url = tab.url;

    //console.log(url)
    /*
    let results = await chrome.scripting.executeScript({
      target: {tabId: tab.id!},
      args: [tab.url],
      func: (url) => {
        // return document.body.innerHTML.toString()
        console.log(url)
        return url;
      }
    })

    console.log(results[0].result!)
    */

    

    try {
      const response = await fetch(`${BASE_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: url, length: length, regenerate: regenerateBool, format: format, language: language })
      }) // html: results[0].result!

      const result = await response.json()

      //console.log('Full result:', result);

      SetSummarizedContent(result.data);
      UpdateSummaryStorage(result.data);
    } catch(error){
      console.log(error)
    }
  }

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
    <section className={`${theme} flex flex-col w-[360px] h-full`}>          
      <MenuBar onClickReturn={onClickReturn} onClickForward={onClickForward} onClickClose={onClickClose}
        onClickRegenerate={onClickRegenerate} onClickRefresh={onClickRefresh}/>
      <UserInterface />
    </section>
  )
}

export default App

  /*
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1 className='text-red-300'>Vite + React</h1>
      <div className="card">
        <input type="color" defaultValue={colour} onChange={(e) => SetColour(e.target.value)}/>
        <button onClick={onclick}>
          Click Here
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
  */

