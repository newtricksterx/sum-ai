import { ChangeEvent, FormEvent, ReactNode, memo, useCallback, useMemo, useState } from "react";
import {
  Check,
  Coins,
  Languages,
  List,
  Ruler,
  Save,
  Type,
} from "lucide-react";
import PageCard from "../../components/PageCard/PageCard";
import "../../i18n";
import { useTranslation } from "react-i18next";
import { all_currencies, all_formats, all_languages, all_lengths } from "../../utils/constants";
import { Currency, Format, Language, Length } from "../../utils/types";
import { useSettingsStore } from "../../stores/settingsStore";
import { SettingsPageDropdown } from "./SettingsPageDropdown";
import "./SettingsPage.css";
import { SunIcon, MoonIcon, GearIcon } from "@radix-ui/react-icons";

const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 24;

function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) return 12;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));
}

function humanizeOption(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function SettingsRow({
  icon,
  label,
  hint,
  control,
}: {
  icon: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="settings-row-body">
        <div className="settings-row-label">{label}</div>
        {hint ? <div className="settings-row-hint">{hint}</div> : null}
      </div>
      <div className="settings-row-control">{control}</div>
    </div>
  );
}

const SettingsThemeToggleButton = memo(function SettingsThemeToggleButton() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const UpdateTheme = useSettingsStore((state) => state.UpdateTheme);

  return (
    <button
      type="button"
      onClick={UpdateTheme}
      title={theme === "light" ? t("settings.switchToDark") : t("settings.switchToLight")}
      aria-label={theme === "light" ? t("settings.switchToDark") : t("settings.switchToLight")}
      className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-[#3a3a3a] p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
    >
      {theme === "light" ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
    </button>
  );
});

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();

  const settingsLanguage = useSettingsStore((state) => state.language);
  const settingsCurrency = useSettingsStore((state) => state.currency);
  const settingsLength = useSettingsStore((state) => state.length);
  const settingsFontSize = useSettingsStore((state) => state.fontSize);
  const settingsFormat = useSettingsStore((state) => state.format);

  const UpdateLanguage = useSettingsStore((state) => state.UpdateLanguage);
  const UpdateCurrency = useSettingsStore((state) => state.UpdateCurrency);
  const UpdateLength = useSettingsStore((state) => state.UpdateLength);
  const UpdateFontSize = useSettingsStore((state) => state.UpdateFontSize);
  const UpdateFormat = useSettingsStore((state) => state.UpdateFormat);

  const [language, setLanguage] = useState<Language>(settingsLanguage);
  const [currency, setCurrency] = useState<Currency>(settingsCurrency);
  const [length, setLength] = useState<Length>(settingsLength);
  const [fontSize, setFontSize] = useState<number>(settingsFontSize);
  const [format, setFormat] = useState<Format>(settingsFormat);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);

  const languageOptionLabel: Record<Language, string> = useMemo(
    () => ({
      english: "English",
      french: "Français",
      spanish: "Español",
      mandarin: "普通话",
      hindi: "हिन्दी",
    }),
    [],
  );

  const getOptionLabel = useCallback(
    (value: string) => {
      const key = `settings.option.${value}`;
      const translated = t(key);
      if (translated !== key) {
        return translated;
      }
      return humanizeOption(value);
    },
    [t],
  );

  const clampedFontSize = useMemo(() => clampFontSize(fontSize), [fontSize]);

  const hasUnsavedChanges = useMemo(
    () =>
      language !== settingsLanguage ||
      currency !== settingsCurrency ||
      length !== settingsLength ||
      format !== settingsFormat ||
      clampedFontSize !== settingsFontSize,
    [
      clampedFontSize,
      currency,
      format,
      language,
      length,
      settingsCurrency,
      settingsFontSize,
      settingsFormat,
      settingsLanguage,
      settingsLength,
    ],
  );

  const showSavedState = hasSavedFeedback && !hasUnsavedChanges;

  const onFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setFontSize(Number.isFinite(next) ? next : 12);
  }, []);

  const onSaveSettings = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!hasUnsavedChanges) {
        setHasSavedFeedback(true);
        return;
      }

      UpdateLanguage(language);
      UpdateCurrency(currency);
      UpdateLength(length);
      UpdateFontSize(clampedFontSize);
      UpdateFormat(format);
      setFontSize(clampedFontSize);
      setHasSavedFeedback(true);
    },
    [
      UpdateCurrency,
      UpdateFontSize,
      UpdateFormat,
      UpdateLanguage,
      UpdateLength,
      clampedFontSize,
      currency,
      format,
      hasUnsavedChanges,
      language,
      length,
    ],
  );

  return (
    <main className="settings-page-shell h-full overflow-y-auto custom-scrollbar px-2 py-2 font-noto">
      <PageCard as="section" className="settings-page-card">
        <header className="settings-page-header">
            <h1 className="settings-page-title">
                <GearIcon width={16} height={16} />
                {t("settings.title")}
            </h1>
            <SettingsThemeToggleButton />
        </header>

        <form onSubmit={onSaveSettings} className="settings-form">
          <section className="settings-section">
            <p className="settings-section-label">
              {t("settings.sectionContent", { defaultValue: "Content" })}
            </p>
            
            <div className="settings-card">
              <SettingsRow
                icon={<Languages size={15} />}
                label={t("settings.language")}
                control={
                  <SettingsPageDropdown
                    id="settings-language"
                    value={language}
                    options={all_languages}
                    ariaLabel={t("settings.language")}
                    getOptionLabel={(value) => languageOptionLabel[value as Language] ?? value}
                    onValueChange={(nextValue) => {
                      setLanguage(nextValue);
                    }}
                  />
                }
              />

              <SettingsRow
                icon={<List size={15} />}
                label={t("settings.summaryFormat")}
                control={
                  <SettingsPageDropdown
                    id="settings-format"
                    value={format}
                    options={all_formats}
                    ariaLabel={t("settings.summaryFormat")}
                    getOptionLabel={getOptionLabel}
                    onValueChange={(nextValue) => {
                      setFormat(nextValue);
                    }}
                  />
                }
              />

              <SettingsRow
                icon={<Ruler size={15} />}
                label={t("settings.summaryLength")}
                control={
                  <SettingsPageDropdown
                    id="settings-length"
                    value={length}
                    options={all_lengths}
                    ariaLabel={t("settings.summaryLength")}
                    getOptionLabel={getOptionLabel}
                    onValueChange={(nextValue) => {
                      setLength(nextValue);
                    }}
                  />
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">
              {t("settings.sectionRegional", { defaultValue: "Regional" })}
            </p>
            <div className="settings-card">
              <SettingsRow
                icon={<Coins size={15} />}
                label={t("settings.currency")}
                control={
                  <SettingsPageDropdown
                    id="settings-currency"
                    value={currency}
                    options={all_currencies}
                    ariaLabel={t("settings.currency")}
                    getOptionLabel={getOptionLabel}
                    onValueChange={(nextValue) => {
                      setCurrency(nextValue);
                    }}
                  />
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">
              {t("settings.sectionAppearance", { defaultValue: "Appearance" })}
            </p>
            <div className="settings-card">
              <SettingsRow
                icon={<Type size={15} />}
                label={<label htmlFor="settings-font-size">{t("settings.fontSize")}</label>}
                hint={t("settings.fontSizeHint", { defaultValue: "Summary output text" })}
                control={
                  <div className="settings-fontsize-wrap">
                    <input
                      id="settings-font-size"
                      type="number"
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      step={1}
                      value={fontSize}
                      onChange={onFontSizeChange}
                      onBlur={() => setFontSize((current) => clampFontSize(current))}
                      className="settings-fontsize-input"
                    />
                    <span className="settings-fontsize-unit">px</span>
                  </div>
                }
              />
            </div>
          </section>

          <button
            type="submit"
            className={`settings-save-button${showSavedState ? " settings-save-button--saved" : ""}`}
          >
            {showSavedState ? <Check size={15} /> : <Save size={15} />}
            {showSavedState ? t("settings.saved") : t("settings.save")}
          </button>
        </form>
      </PageCard>
    </main>
  );
};
