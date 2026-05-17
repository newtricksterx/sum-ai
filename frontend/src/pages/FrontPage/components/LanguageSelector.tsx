import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { all_languages, LANGUAGE_NATIVE_LABEL } from "../../../utils/constants";
import type { Language } from "../../../utils/types";
import { useSettingsStore } from "../../../stores/settingsStore";
import { SettingsPageDropdown } from "../../SettingsPage/SettingsPageDropdown";
import type { SettingsPageDropdownOption } from "../../SettingsPage/settingspage.utils";

const LANGUAGE_OPTIONS: ReadonlyArray<SettingsPageDropdownOption<Language>> =
  all_languages.map((value) => ({ value, label: LANGUAGE_NATIVE_LABEL[value] }));

export function LanguageSelector() {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const updateLanguage = useSettingsStore((state) => state.UpdateLanguage);

  return (
    <section className="front-language">
      <div>
        <Languages className="front-language-icon" size={24} />
        <label htmlFor="front-language-select" className="front-language-label">
          {t("frontpage.language")}
        </label>
      </div>
      <SettingsPageDropdown<Language>
        id="front-language-select"
        value={language}
        options={LANGUAGE_OPTIONS}
        onValueChange={updateLanguage}
        ariaLabel={t("frontpage.language")}
      />
    </section>
  );
}
