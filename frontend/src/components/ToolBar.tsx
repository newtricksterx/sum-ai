import Button from "./Button";
import { Download } from 'lucide-react';
import { CopyState } from "../utils/states";
import { GoCopy } from "react-icons/go";


export interface ToolBarProps {
    onClickCopy: React.MouseEventHandler;
    onClickDownload: React.MouseEventHandler;
    isSummarizing?: boolean;
}

function ToolBar({ onClickCopy, onClickDownload, isSummarizing = false } : ToolBarProps) {
  const canUseSummaryActions = CopyState() && !isSummarizing;
  
  return (
    <nav className="flex flex-row gap-1 justify-end w-full">
        <Button className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"}`} disabled={!canUseSummaryActions} onClick={onClickDownload} title="Download summary as PDF">
          <Download size={12}/>
        </Button> 
        <Button className={`p-2 rounded-md ${canUseSummaryActions ? "" : "opacity-50"}`} disabled={!canUseSummaryActions} onClick={onClickCopy} title="Copy summary">
          <GoCopy size={12}/>
        </Button> 
    </nav>
  )
}

export default ToolBar;
