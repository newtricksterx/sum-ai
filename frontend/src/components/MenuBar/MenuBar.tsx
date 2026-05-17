import { MenuIconSize } from '../../utils/constants'
import { GoHistory, GoHome  } from "react-icons/go";
import { ReaderIcon, PersonIcon, GearIcon, Cross1Icon } from "@radix-ui/react-icons";
import "./MenuBar.css";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { memo, type ReactNode } from 'react';
import type { PageType } from '../../utils/types';

type MenuItem = { page: PageType; icon: ReactNode; titleKey: string };

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  { page: "home", icon: <GoHome size={MenuIconSize} />, titleKey: "menu.home" },
  { page: "session", icon: <ReaderIcon width={MenuIconSize} height={MenuIconSize} />, titleKey: "menu.session" },
  { page: "history", icon: <GoHistory size={MenuIconSize} />, titleKey: "menu.history" },
  { page: "settings", icon: <GearIcon width={MenuIconSize} height={MenuIconSize} />, titleKey: "menu.settings" },
  { page: "profile", icon: <PersonIcon width={MenuIconSize} height={MenuIconSize} />, titleKey: "menu.profile" },
];

export interface MenuBarProps {
    onMenuClick: (page: PageType) => void;
    onClickClose: React.MouseEventHandler;
}

function MenuBar({ onMenuClick, onClickClose }: MenuBarProps) {
  const { t } = useTranslation();

  return (
    <nav className="menu-bar-shell">
        {MENU_ITEMS.map(({ page, icon, titleKey }) => (
            <button
                key={page}
                type="button"
                className='menubar-btn'
                onClick={() => onMenuClick(page)}
                title={t(titleKey)}
            >
                {icon}
            </button>
        ))}
        <button className='menubar-btn hover:bg-red-500!' onClick={onClickClose} title={t("menu.close")}>
          <Cross1Icon width={MenuIconSize} height={MenuIconSize}/>
        </button>
    </nav>
  )
}

export default memo(MenuBar);
