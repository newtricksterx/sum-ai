import { FormEvent } from "react";
import { Check, Coins, Languages, List, Ruler, Save, Type } from "lucide-react";
import { GearIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import PageCard from "../../components/PageCard/PageCard";
import "../../i18n";
import "./SettingsPage.css";
import {
  LANGUAGE_NATIVE_LABEL,
  all_currencies,
  all_formats,
  all_languages,
  all_lengths,
  all_quizDifficulties,
} from "../../utils/constants";
import { SettingsPageDropdown } from "./SettingsPageDropdown";
import { SettingsRow } from "./components/SettingsRow";
import { SettingsThemeToggleButton } from "./components/SettingsThemeToggleButton";
import { SettingsFontSizeField } from "./components/SettingsFontSizeField";
import { useSettingsForm } from "./hooks/useSettingsForm";

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { values, setters, showSavedState, clampFontSizeOnBlur, save } = useSettingsForm();

  const translateOption = (value: string) => t(`settings.option.${value}`);

  const languageOptions = all_languages.map((value) => ({
    value,
    label: LANGUAGE_NATIVE_LABEL[value],
  }));
  const formatOptions = all_formats.map((value) => ({ value, label: translateOption(value) }));
  const lengthOptions = all_lengths.map((value) => ({ value, label: translateOption(value) }));
  const currencyOptions = all_currencies.map((value) => ({ value, label: translateOption(value) }));
  const quizDifficultyOptions = all_quizDifficulties.map((value) => ({
    value,
    label: translateOption(value),
  }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

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

        <form onSubmit={onSubmit} className="settings-form">
          <section className="settings-section">
            <p className="settings-section-label">{t("settings.sectionAppearance")}</p>
            <div className="settings-card">
              <SettingsRow
                icon={<Type size={15} />}
                label={<label htmlFor="settings-font-size">{t("settings.fontSize")}</label>}
                control={
                  <SettingsFontSizeField
                    id="settings-font-size"
                    value={values.fontSize}
                    onChange={setters.setFontSize}
                    onBlur={clampFontSizeOnBlur}
                  />
                }
              />
              <SettingsRow
                icon={<Languages size={15} />}
                label={t("settings.language")}
                control={
                  <SettingsPageDropdown
                    id="settings-language"
                    value={values.language}
                    options={languageOptions}
                    ariaLabel={t("settings.language")}
                    onValueChange={setters.setLanguage}
                  />
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">{t("settings.sectionSummary")}</p>
            <div className="settings-card">
              <SettingsRow
                icon={<List size={15} />}
                label={t("settings.summaryFormat")}
                control={
                  <SettingsPageDropdown
                    id="settings-format"
                    value={values.format}
                    options={formatOptions}
                    ariaLabel={t("settings.summaryFormat")}
                    onValueChange={setters.setFormat}
                  />
                }
              />
              <SettingsRow
                icon={<Ruler size={15} />}
                label={t("settings.summaryLength")}
                control={
                  <SettingsPageDropdown
                    id="settings-length"
                    value={values.length}
                    options={lengthOptions}
                    ariaLabel={t("settings.summaryLength")}
                    onValueChange={setters.setLength}
                  />
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">{t("settings.sectionLearn")}</p>
            <div className="settings-card">
              <SettingsRow
                icon={<QuestionMarkCircledIcon width={15} height={15} />}
                label={t("settings.quizDifficulty")}
                control={
                  <SettingsPageDropdown
                    id="settings-quiz-difficulty"
                    value={values.quizDifficulty}
                    options={quizDifficultyOptions}
                    ariaLabel={t("settings.quizDifficulty")}
                    onValueChange={setters.setQuizDifficulty}
                  />
                }
              />
            </div>
          </section>

          <section className="settings-section">
            <p className="settings-section-label">{t("settings.sectionRegional")}</p>
            <div className="settings-card">
              <SettingsRow
                icon={<Coins size={15} />}
                label={t("settings.currency")}
                control={
                  <SettingsPageDropdown
                    id="settings-currency"
                    value={values.currency}
                    options={currencyOptions}
                    ariaLabel={t("settings.currency")}
                    onValueChange={setters.setCurrency}
                  />
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
