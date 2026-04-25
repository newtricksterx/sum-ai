import Button from "./Button";
import { Copy, Download } from 'lucide-react';
import { CopyState } from "../utils/states";


export interface ToolBarProps {
    onClickCopy: React.MouseEventHandler;
}

function ToolBar({ onClickCopy } : ToolBarProps) {
  
  return (
    <nav className="flex flex-row gap-1 justify-end w-full">
        <Button className={`p-2 rounded-md ${CopyState() ? "" : "opacity-50"}`} disabled={!CopyState()} onClick={onClickCopy} title="Copy summary">
          <Download size={12}/>
        </Button> 
        <Button className={`p-2 rounded-md ${CopyState() ? "" : "opacity-50"}`} disabled={!CopyState()} onClick={onClickCopy} title="Copy summary">
          <Copy size={12}/>
        </Button> 
    </nav>
  )
}

export default ToolBar;