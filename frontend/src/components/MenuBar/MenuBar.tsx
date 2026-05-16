import { MenuIconSize } from '../../utils/constants'
import { GoHistory, GoHome  } from "react-icons/go";
import { ReaderIcon, PersonIcon, GearIcon, Cross1Icon } from "@radix-ui/react-icons";
import "./MenuBar.css";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { memo } from 'react';


export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickProfile: React.MouseEventHandler;
    onClickHistory: React.MouseEventHandler;
    onClickSettings: React.MouseEventHandler;
    onClickClose: React.MouseEventHandler;
}

function MenuBar({ 
    onClickReturn, 
    onClickForward, 
    onClickProfile, 
    onClickHistory, 
    onClickSettings,
    onClickClose } : MenuBarProps) 
  {

  const { t } = useTranslation();

  return (
    <nav className="menu-bar-shell flex flex-row gap-1 justify-between items-center border-b-gray-500 border-b-[0.25px]">
        <button className='menubar-btn' onClick={onClickReturn}  title={t("menu.home")}>
            <GoHome size={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickForward} title={t("menu.session")}>
            <ReaderIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickHistory} title={t("menu.history")}>
          <GoHistory size={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickSettings} title={t("menu.settings")}>
            <GearIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickProfile} title={t("menu.profile")}>
          <PersonIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
        <button className='menubar-btn hover:bg-red-500!' onClick={onClickClose} title={t("menu.close")}>
          <Cross1Icon width={MenuIconSize} height={MenuIconSize}/>
        </button>
    </nav>
  )
}

export default memo(MenuBar);
