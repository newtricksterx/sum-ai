import Button from "./Button";
import { MenuIconSize } from '../utils/constants'
import { House, Copy, X, NotebookText, WandSparkles, History } from 'lucide-react';
import SettingsDropdown from "./SettingsDropdown";
import { RegenerateState, CopyState } from "../utils/states";

export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickClose: React.MouseEventHandler;
    onClickCopy: React.MouseEventHandler;
    onClickRegenerate: React.MouseEventHandler;
    onClickHistory: React.MouseEventHandler;
}

function MenuBar({onClickReturn, onClickForward, onClickClose, onClickCopy, onClickRegenerate, onClickHistory} : MenuBarProps) {
  
  return (
    <nav className="flex flex-row gap-1 justify-between items-center border-b-[1px] border-b-gray-400 w-full">
        <Button onClick={onClickReturn} className={`p-2 rounded-3xl m-1`}  title="Go to home page">
            <House  size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickForward} className={`p-2 rounded-3xl m-1`} title="Go to summary page">
            <NotebookText  size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1 ${RegenerateState() ? "" : "opacity-50"}`} disabled={!RegenerateState()} onClick={onClickRegenerate} title="Generate summary">
          <WandSparkles size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1 ${CopyState() ? "" : "opacity-50"}`} disabled={!CopyState()} onClick={onClickCopy} title="Copy summary">
          <Copy size={MenuIconSize}/>
        </Button>
        <SettingsDropdown />
        <Button onClick={onClickHistory} className="p-2 rounded-3xl m-1" title="View history">
          <History size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickClose} className="p-2 hover:bg-red-500 dark:hover:bg-red-500" title="Close extension">
          <X size={MenuIconSize}/>
        </Button> 
    </nav>
  )
}

export default MenuBar;
