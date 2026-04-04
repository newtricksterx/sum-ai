import Button from "./Button";
import { MenuBarProps } from "../utils/interfaces";
import { MenuIconSize } from '../utils/constants'
import { Sun, Moon, ArrowLeft, RefreshCcw, RotateCw, X, ArrowRight } from 'lucide-react';
import SettingsDropdown from "./SettingsDropdown";
import { useSettingsStore } from "../stores/settingsStore";
import { ForwardState, RegenerateState, ReturnState } from "../utils/states";

function MenuBar({onClickReturn, onClickForward, onClickClose, onClickRefresh, onClickRegenerate} : MenuBarProps) {
  const theme = useSettingsStore((state) => state.theme);
  const onClickTheme = useSettingsStore((state) => state.UpdateTheme)
  

  return (
    <nav className="flex flex-row gap-1 justify-between items-center border-b-[1px] border-b-gray-400 w-full">
        <Button onClick={onClickReturn} className={`p-2 rounded-3xl m-1 ${ReturnState() ? "" : "opacity-50"}`} disabled={!ReturnState()} title="Go back to previous page">
            <ArrowLeft  size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickForward} className={`p-2 rounded-3xl m-1 ${ForwardState() ? "" : "opacity-50"}`} disabled={!ForwardState()} title="Go back to previous page">
            <ArrowRight  size={MenuIconSize}/>
        </Button>
        <Button onClick={onClickTheme} className="p-2 rounded-3xl m-1" title="Select theme">
          {
            theme === "light" ? <Sun size={MenuIconSize}/> : <Moon size={MenuIconSize}/>
          }
        </Button>
        <Button className="p-2 rounded-3xl m-1" onClick={onClickRefresh} title="Refresh summary">
          <RotateCw size={MenuIconSize}/>
        </Button>
        <Button className={`p-2 rounded-3xl m-1 ${RegenerateState() ? "" : "opacity-50"}`} disabled={!RegenerateState()} onClick={onClickRegenerate} title="Regenerate summary">
          <RefreshCcw size={MenuIconSize}/>
        </Button>
        <SettingsDropdown />
        <Button onClick={onClickClose} className="p-2 hover:bg-red-500 dark:hover:bg-red-500" title="Close extension">
          <X size={MenuIconSize}/>
        </Button> 
    </nav>
  )
}

/*
        <div>
            <Dropdown className='w-[10px] hover:bg-gray-200' list={all_languages} onChangeDropdown={onChangeDropdownLang} defaultValue={lang_default} name='languages' id='lang'/>
        </div>
        <div>
            <Dropdown className='w-[65px] hover:bg-gray-200' list={all_lengths} onChangeDropdown={onChangeDropdownLength} defaultValue={length_default} name='lengths' id='length'/>
        </div>
*/

export default MenuBar;