import Button from "./Button";
import { MenuIconSize } from '../utils/constants'
import { X } from 'lucide-react';
import SettingsDropdown from "./SettingsDropdown";
import { GoHistory, GoHome  } from "react-icons/go";
import { ReaderIcon, PersonIcon } from "@radix-ui/react-icons";
import MenuBarButton from "./MenuBarButton";
import "./MenuBar.css";


export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickClose: React.MouseEventHandler;
    onClickProfile: React.MouseEventHandler;
    onClickHistory: React.MouseEventHandler;
}

function MenuBar({onClickReturn, onClickForward, onClickClose, onClickProfile, onClickHistory } : MenuBarProps) {
  return (
    <nav className="menu-bar-shell flex flex-row gap-1 justify-between items-center">
        <MenuBarButton onClick={onClickReturn}  title="Go to home page">
            <GoHome size={MenuIconSize}/>
        </MenuBarButton>
        <MenuBarButton onClick={onClickForward} title="Go to summary page">
            <ReaderIcon width={MenuIconSize} height={MenuIconSize}/>
        </MenuBarButton>
        <MenuBarButton onClick={onClickHistory} title="View history">
          <GoHistory size={MenuIconSize}/>
        </MenuBarButton>
        <MenuBarButton onClick={onClickProfile} title="Profile page">
          <PersonIcon width={MenuIconSize} height={MenuIconSize}/>
        </MenuBarButton>
        <SettingsDropdown />
        <Button onClick={onClickClose} className="p-2 hover:bg-red-500! dark:hover:bg-red-500!" title="Close extension">
          <X size={MenuIconSize}/>
        </Button> 
    </nav>
  )
}

export default MenuBar;
