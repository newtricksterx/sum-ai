import Button from "./Button";
import { MenuIconSize } from '../utils/constants'
import { X } from 'lucide-react';
import SettingsDropdown from "./SettingsDropdown";
import { RegenerateState } from "../utils/states";
import { GoHistory } from "react-icons/go";
import { VscHome, VscAccount, VscOutput, VscEditSparkle } from "react-icons/vsc";



export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickClose: React.MouseEventHandler;
    onClickProfile: React.MouseEventHandler;
    onClickRegenerate: React.MouseEventHandler;
    onClickHistory: React.MouseEventHandler;
}

function MenuBar({onClickReturn, onClickForward, onClickClose, onClickProfile, onClickRegenerate, onClickHistory} : MenuBarProps) {
  
  return (
    <nav className="flex flex-row gap-1 justify-between items-center border-b-[1px] border-b-gray-400 w-full">
        <Button onClick={onClickReturn} className={`p-2 rounded-3xl m-1`}  title="Go to home page">
            <VscHome size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickForward} className={`p-2 rounded-3xl m-1`} title="Go to summary page">
            <VscOutput  size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1 ${RegenerateState() ? "" : "opacity-50"}`} disabled={!RegenerateState()} onClick={onClickRegenerate} title="Generate summary">
          <VscEditSparkle size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickHistory} className="p-2 rounded-3xl m-1" title="View history">
          <GoHistory size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1`} onClick={onClickProfile} title="Profile page">
          <VscAccount size={MenuIconSize}/>
        </Button>
        <SettingsDropdown />
        <Button onClick={onClickClose} className="p-2 hover:bg-red-500 dark:hover:bg-red-500" title="Close extension">
          <X size={MenuIconSize}/>
        </Button> 
    </nav>
  )
}

export default MenuBar;
