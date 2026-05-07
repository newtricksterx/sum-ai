import { MenuIconSize } from '../../utils/constants'
import SettingsDropdown from "../SettingsDropdown";
import { GoHistory, GoHome  } from "react-icons/go";
import { ReaderIcon, PersonIcon } from "@radix-ui/react-icons";
import MenuBarButton from "../MenuBarButton";
import "./MenuBar.css";
import { useTranslation } from "react-i18next";
import "../../i18n";


export interface MenuBarProps {
    onClickReturn: React.MouseEventHandler;
    onClickForward: React.MouseEventHandler;
    onClickProfile: React.MouseEventHandler;
    onClickHistory: React.MouseEventHandler;
}

function MenuBar({onClickReturn, onClickForward, onClickProfile, onClickHistory } : MenuBarProps) {
  const { t } = useTranslation();

  return (
    <nav className="menu-bar-shell flex flex-row gap-1 justify-between items-center border-b-gray-500 border-b-[0.25px]">
        <MenuBarButton onClick={onClickReturn}  title={t("menu.home")}>
            <GoHome size={MenuIconSize}/>
        </MenuBarButton>
        <MenuBarButton onClick={onClickForward} title={t("menu.summary")}>
            <ReaderIcon width={MenuIconSize} height={MenuIconSize}/>
        </MenuBarButton>
        <SettingsDropdown />
        <MenuBarButton onClick={onClickHistory} title={t("menu.history")}>
          <GoHistory size={MenuIconSize}/>
        </MenuBarButton>
        <MenuBarButton onClick={onClickProfile} title={t("menu.profile")}>
          <PersonIcon width={MenuIconSize} height={MenuIconSize}/>
        </MenuBarButton>
    </nav>
  )
}

export default MenuBar;
