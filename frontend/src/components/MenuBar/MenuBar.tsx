import { MenuIconSize } from '../../utils/constants'
import { GoHistory, GoHome  } from "react-icons/go";
import { ReaderIcon, PersonIcon, GearIcon } from "@radix-ui/react-icons";
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
}

function MenuBar({ 
    onClickReturn, 
    onClickForward, 
    onClickProfile, 
    onClickHistory, 
    onClickSettings } : MenuBarProps) 
  {

  const { t } = useTranslation();

  return (
    <nav className="menu-bar-shell flex flex-row gap-1 justify-between items-center border-b-gray-500 border-b-[0.25px]">
        <button className='menubar-btn' onClick={onClickReturn}  title={t("menu.home")}>
            <GoHome size={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickForward} title={t("menu.summary")}>
            <ReaderIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickSettings} title={t("menu.summary")}>
            <GearIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickHistory} title={t("menu.history")}>
          <GoHistory size={MenuIconSize}/>
        </button>
        <button className='menubar-btn' onClick={onClickProfile} title={t("menu.profile")}>
          <PersonIcon width={MenuIconSize} height={MenuIconSize}/>
        </button>
    </nav>
  )
}

export default memo(MenuBar);
