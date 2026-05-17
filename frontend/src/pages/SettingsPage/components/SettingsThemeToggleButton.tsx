import { memo } from "react";
import { useTranslation } from "react-i18next";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { useSettingsStore } from "../../../stores/settingsStore";

export const SettingsThemeToggleButton = memo(function SettingsThemeToggleButton() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const UpdateTheme = useSettingsStore((state) => state.UpdateTheme);

  const label = theme === "light" ? t("settings.switchToDark") : t("settings.switchToLight");

  return (
    <button
      type="button"
      onClick={UpdateTheme}
      title={label}
      aria-label={label}
      className="settings-theme-button"
    >
      {theme === "light" ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
    </button>
  );
});
