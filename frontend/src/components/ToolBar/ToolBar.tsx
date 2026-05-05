import Button from "../Button";
import { Check, Download } from 'lucide-react';
import { CopyState } from "../../utils/states";
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
    <nav className="toolbar-shell m-1 flex flex-row items-center justify-between">
        <span className={`toolbar-generate-shell ${isSummarizing ? "is-disabled" : ""}`}>
        <button
          type="button"
          onClick={onClickGenerate}
          disabled={isSummarizing}
          title="Generate a new summary for the current tab"
          className={`toolbar-generate-btn inline-flex items-center justify-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.01em] transition-colors ${
            isSummarizing
              ? "toolbar-generate-btn-disabled cursor-not-allowed opacity-80"
              : "toolbar-generate-btn-active cursor-pointer"
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
