import Button from "./Button";
import { MenuBarProps } from "../utils/interfaces";
import { MenuIconSize } from '../utils/constants'
import { Sun, Moon, ArrowLeft, Copy, X, ArrowRight, Sparkles } from 'lucide-react';
import SettingsDropdown from "./SettingsDropdown";
import { useSettingsStore } from "../stores/settingsStore";
import { ForwardState, RegenerateState, ReturnState } from "../utils/states";

function MenuBar({onClickReturn, onClickForward, onClickClose, onClickCopy, onClickRegenerate} : MenuBarProps) {
  const theme = useSettingsStore((state) => state.theme);
  const onClickTheme = useSettingsStore((state) => state.UpdateTheme)
  
  return (
    <nav className="flex flex-row gap-1 justify-between items-center border-b-[1px] border-b-gray-400 w-full">
        <Button onClick={onClickReturn} className={`p-2 rounded-3xl m-1 ${ReturnState() ? "" : "opacity-50"}`} disabled={!ReturnState()} title="Go to home page">
            <ArrowLeft  size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickForward} className={`p-2 rounded-3xl m-1 ${ForwardState() ? "" : "opacity-50"}`} disabled={!ForwardState()} title="Go to summary page">
            <ArrowRight  size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1 ${RegenerateState() ? "" : "opacity-50"}`} disabled={!RegenerateState()} onClick={onClickRegenerate} title="Generate summary">
          <Sparkles size={MenuIconSize}/>
        </Button>
        <Button className="p-2 rounded-3xl m-1" onClick={onClickCopy} title="Copy summary">
          <Copy size={MenuIconSize}/>
        </Button>
        <SettingsDropdown />
        <Button onClick={onClickTheme} className="p-2 rounded-3xl m-1" title="Select theme">
          {
            theme === "light" ? <Sun size={MenuIconSize}/> : <Moon size={MenuIconSize}/>
          }
        </Button>
        <Button onClick={onClickClose} className="p-2 hover:bg-red-500 dark:hover:bg-red-500" title="Close extension">
          <X size={MenuIconSize}/>
        </Button> 
    </nav>
  )
}

export default MenuBar;
