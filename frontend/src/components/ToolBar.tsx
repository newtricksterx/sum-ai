import Button from "./Button";
import { Download } from 'lucide-react';
import { CopyState } from "../utils/states";
import { GoCopy } from "react-icons/go";


export interface ToolBarProps {
    onClickCopy: React.MouseEventHandler;
    onClickDownload: React.MouseEventHandler;
}

function ToolBar({ onClickCopy, onClickDownload } : ToolBarProps) {
  
  return (
    <nav className="flex flex-row gap-1 justify-end w-full">
        <Button className={`p-2 rounded-md ${CopyState() ? "" : "opacity-50"}`} disabled={!CopyState()} onClick={onClickDownload} title="Download summary as PDF">
          <Download size={12}/>
        </Button> 
        <Button className={`p-2 rounded-md ${CopyState() ? "" : "opacity-50"}`} disabled={!CopyState()} onClick={onClickCopy} title="Copy summary">
          <GoCopy size={12}/>
        </Button> 
    </nav>
  )
}

export default ToolBar;
