import { ChangeEvent, FormEvent, ReactNode, memo, useCallback, useMemo, useRef, useState } from "react";
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
import { useShallow } from "zustand/react/shallow";
import { SettingsPageDropdown } from "./SettingsPageDropdown";
import { SettingsPageDropdownOption } from "./settingspage.utils";
import "./SettingsPage.css";
import { SunIcon, MoonIcon, GearIcon } from "@radix-ui/react-icons";
import { MIN_FONT_SIZE, MAX_FONT_SIZE, SaveTimeoutHandle, clampFontSize, humanizeOption } from "./settingspage.utils";

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
      className="settings-theme-button"
    >
      {theme === "light" ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
    </button>
  );
});

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();

  const {
    language: settingsLanguage,
    currency: settingsCurrency,
    length: settingsLength,
    fontSize: settingsFontSize,
    format: settingsFormat,
    saveSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      language: state.language,
      currency: state.currency,
      length: state.length,
      fontSize: state.fontSize,
      format: state.format,
      saveSettings: state.saveSettings,
    }))
  );

  const [language, setLanguage] = useState<Language>(settingsLanguage);
  const [currency, setCurrency] = useState<Currency>(settingsCurrency);
  const [length, setLength] = useState<Length>(settingsLength);
  const [fontSize, setFontSize] = useState<number>(settingsFontSize);
  const [format, setFormat] = useState<Format>(settingsFormat);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);
  const saveTimeoutRef = useRef<SaveTimeoutHandle | null>(null);

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

  const languageOptions = useMemo<ReadonlyArray<SettingsPageDropdownOption<Language>>>(
    () =>
      all_languages.map((value) => ({
        value,
        label: languageOptionLabel[value] ?? humanizeOption(value),
      })),
    [languageOptionLabel],
  );

  const formatOptions = useMemo<ReadonlyArray<SettingsPageDropdownOption<Format>>>(
    () =>
      all_formats.map((value) => ({
        value,
        label: getOptionLabel(value),
      })),
    [getOptionLabel],
  );

  const lengthOptions = useMemo<ReadonlyArray<SettingsPageDropdownOption<Length>>>(
    () =>
      all_lengths.map((value) => ({
        value,
        label: getOptionLabel(value),
      })),
    [getOptionLabel],
  );

  const currencyOptions = useMemo<ReadonlyArray<SettingsPageDropdownOption<Currency>>>(
    () =>
      all_currencies.map((value) => ({
        value,
        label: getOptionLabel(value),
      })),
    [getOptionLabel],
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

  const onFontSizeBlur = useCallback(() => {
    setFontSize((current) => clampFontSize(current));
  }, []);

  const languageRow = useMemo(() => (
    <SettingsRow
      icon={<Languages size={15} />}
      label={t("settings.language")}
      control={
        <SettingsPageDropdown
          id="settings-language"
          value={language}
          options={languageOptions}
          ariaLabel={t("settings.language")}
          onValueChange={setLanguage}
        />
      }
    />
  ), [language, languageOptions, t]);

  const formatRow = useMemo(() => (
    <SettingsRow
      icon={<List size={15} />}
      label={t("settings.summaryFormat")}
      control={
        <SettingsPageDropdown
          id="settings-format"
          value={format}
          options={formatOptions}
          ariaLabel={t("settings.summaryFormat")}
          onValueChange={setFormat}
        />
      }
    />
  ), [format, formatOptions, t]);

  const lengthRow = useMemo(() => (
    <SettingsRow
      icon={<Ruler size={15} />}
      label={t("settings.summaryLength")}
      control={
        <SettingsPageDropdown
          id="settings-length"
          value={length}
          options={lengthOptions}
          ariaLabel={t("settings.summaryLength")}
          onValueChange={setLength}
        />
      }
    />
  ), [length, lengthOptions, t]);

  const currencyRow = useMemo(() => (
    <SettingsRow
      icon={<Coins size={15} />}
      label={t("settings.currency")}
      control={
        <SettingsPageDropdown
          id="settings-currency"
          value={currency}
          options={currencyOptions}
          ariaLabel={t("settings.currency")}
          onValueChange={setCurrency}
        />
      }
    />
  ), [currency, currencyOptions, t]);

  const fontSizeRow = useMemo(() => (
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
            onBlur={onFontSizeBlur}
            className="settings-fontsize-input"
          />
          <span className="settings-fontsize-unit">px</span>
        </div>
      }
    />
  ), [fontSize, onFontSizeBlur, onFontSizeChange, t]);

  const onSaveSettings = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!hasUnsavedChanges) {
        setHasSavedFeedback(true);
        return;
      }

      setFontSize(clampedFontSize);
      setHasSavedFeedback(true);

      const pendingTimeout = saveTimeoutRef.current;
      if (pendingTimeout !== null) {
        window.clearTimeout(pendingTimeout);
      }

      // Defer synchronous store/localStorage work to the next task so the
      // click interaction can paint immediately and reduce INP processing time.
      saveTimeoutRef.current = window.setTimeout(() => {
        saveSettings({ language, currency, length, fontSize: clampedFontSize, format });
        saveTimeoutRef.current = null;
      }, 0);
    },
    [
      saveSettings,
      clampedFontSize,
      currency,
      format,
      hasUnsavedChanges,
      language,
      length,
    ],
  );

  return (
    <main className="settings-page-shell h-full overflow-y-auto custom-scrollbar px-2 py-2 font-google">
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
              {languageRow}
              {formatRow}
              {lengthRow}
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">
              {t("settings.sectionRegional", { defaultValue: "Regional" })}
            </p>
            <div className="settings-card">
              {currencyRow}
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">
              {t("settings.sectionAppearance", { defaultValue: "Appearance" })}
            </p>
            <div className="settings-card">
              {fontSizeRow}
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
