import Button from "./Button";
import { Check, Download } from 'lucide-react';
import { CopyState } from "../utils/states";
import { GoCopy } from "react-icons/go";
import "./ToolBar.css";


export interface ToolBarProps {
    onClickCopy: React.MouseEventHandler;
    onClickDownload: React.MouseEventHandler;
    onClickGenerate?: React.MouseEventHandler;
    isCopySuccess?: boolean;
    isSummarizing?: boolean;
}

function ToolBar({
  onClickCopy,
  onClickDownload,
  isSummarizing = false,
  onClickGenerate = () => {},
  isCopySuccess = false,
} : ToolBarProps) {
  const canUseSummaryActions = CopyState() && !isSummarizing;
  
  return (
    <nav className="m-1 flex w-full flex-row items-center justify-between">
        <span className={`toolbar-generate-shell ${isSummarizing ? "is-disabled" : ""}`}>
        <button
          type="button"
          onClick={onClickGenerate}
          disabled={isSummarizing}
          title="Generate a new summary for the current tab"
          className={`toolbar-generate-btn inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] transition-colors ${
            isSummarizing
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 opacity-80 dark:border-[#343434] dark:bg-[#242424] dark:text-gray-500"
              : "cursor-pointer border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-[#3a3a3a] dark:bg-[#2a2a2a] dark:text-gray-200 dark:hover:bg-[#343434]"
          }`}
        >
          Generate Summary
        </button>
        </span>
        <div id="tools" className="ml-auto flex flex-row items-center gap-1">
          <Button className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"}`} disabled={!canUseSummaryActions} onClick={onClickDownload} title="Download summary as PDF">
            <Download size={12}/>
          </Button> 
          <Button
            className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"} ${
              isCopySuccess ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300" : ""
            }`}
            disabled={!canUseSummaryActions}
            onClick={onClickCopy}
            title="Copy summary"
          >
            {isCopySuccess ? <Check size={12}/> : <GoCopy size={12}/>}
          </Button>
        </div>
    </nav>
  )
}

export default ToolBar;
