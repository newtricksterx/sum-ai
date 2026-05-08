import { Save, Check, Sun, Moon } from "lucide-react";
import { all_currencies, all_formats, all_languages, all_lengths, MenuIconSize } from "../../utils/constants";
import Button from "../Button";
import { useCallback, useRef, useState } from "react";
import { Currency, Format, Language, Length } from "../../utils/types";
import { useSettingsStore } from "../../stores/settingsStore";
import { GearIcon } from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import "../../i18n";
import { SettingsMenuSelector } from "./settingsdropdown.utils";
import { useClickOutside } from "./useClickOutside";


export default function SettingsDropdown() {
    const { t } = useTranslation();
    const settings_lang = useSettingsStore((state) => state.language);
    const settings_currency = useSettingsStore((state) => state.currency);
    const settings_length = useSettingsStore((state) => state.length);
    const settings_fontSize = useSettingsStore((state) => state.fontSize);
    const settings_format = useSettingsStore((state) => state.format);
    const theme = useSettingsStore((state) => state.theme);
    const UpdateLang = useSettingsStore((state) => state.UpdateLanguage);
    const UpdateCurrency = useSettingsStore((state) => state.UpdateCurrency);
    const UpdateLength = useSettingsStore((state) => state.UpdateLength);
    const UpdateFontSize = useSettingsStore((state) => state.UpdateFontSize);
    const UpdateFormat = useSettingsStore((state) => state.UpdateFormat);
    const UpdateTheme = useSettingsStore((state) => state.UpdateTheme);

    const [language, SetLanguage] = useState<Language>(settings_lang);
    const [currency, SetCurrency] = useState<Currency>(settings_currency);
    const [length, SetLength] = useState<Length>(settings_length);
    const [fontSize, SetFontSize] = useState<number>(settings_fontSize);
    const [format, SetFormat] = useState<Format>(settings_format)
    const [saved, SetSaved] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const openSelectorsRef = useRef<Record<string, boolean>>({});
    const hasOpenSelectorRef = useRef(false);
    const languageOptionLabel: Record<Language, string> = {
        english: "English",
        french: "Français",
        spanish: "Español",
        mandarin: "普通话",
        hindi: "हिन्दी",
    };
    const isLanguageChanged = language !== settings_lang;

    const getOptionLabel = useCallback((value: string) => {
        const translated = t(`settings.option.${value}`);
        if (translated !== `settings.option.${value}`) {
            return translated;
        }

        return value
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }, [t]);
    const getLanguageOptionLabel = useCallback((value: string) => {
        if (value in languageOptionLabel) {
            return languageOptionLabel[value as Language];
        }
        return value;
    }, []);

    const onClickSettings = useCallback(() => {
        setIsOpen((prev) => {
            const next = !prev;
            if (!next) {
                openSelectorsRef.current = {};
                hasOpenSelectorRef.current = false;
            }
            return next;
        });
    }, []);

    const onSelectorOpenChange = useCallback((id: string, open: boolean) => {
        if (openSelectorsRef.current[id] === open) return;
        const next = { ...openSelectorsRef.current, [id]: open };
        openSelectorsRef.current = next;
        hasOpenSelectorRef.current = Object.values(next).some(Boolean);
    }, []);

    useClickOutside({
        isOpen,
        menuRef,
        hasOpenSelectorRef,
        onClose: () => {
            openSelectorsRef.current = {};
            hasOpenSelectorRef.current = false;
            setIsOpen(false);
        },
    });

    function onSaveSettings(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        UpdateLang(language);
        UpdateCurrency(currency);
        UpdateLength(length);
        UpdateFontSize(fontSize);
        UpdateFormat(format);
        SetSaved(true);
    }

    return (
        <div className="relative z-50" ref={menuRef}>
            <Button onClick={onClickSettings} className="p-2 rounded-3xl m-1" title={t("settings.buttonTitle")}>
                <GearIcon width={MenuIconSize} height={MenuIconSize}/>
            </Button>
            <div
                className={`
                    fixed top-[3.1rem] left-1/2 -translate-x-1/2 border-2 font-noto bg-[#eee] border-gray-200
                    dark:bg-[#303030] dark:border-[#373737] shadow-xs rounded-lg
                    grid transition-[grid-template-rows,opacity] duration-200 ease-out
                    overflow-hidden w-[350px] max-w-[calc(100vw-1rem)] origin-top
                    ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none border-transparent"}
                `}>
                {/* header */}
                <div className="px-3.5 pt-3 pb-2 border-b border-gray-100 dark:border-[#2e2e2e] flex items-center justify-between">
                    <span className="text-[12px] font-semibold tracking-[0.18em] uppercase text-gray-400 dark:text-gray-500">
                        <strong>{t("settings.title")}</strong>
                    </span>
                    <button
                        type="button"
                        onClick={UpdateTheme}
                        title={theme === "light" ? t("settings.switchToDark") : t("settings.switchToLight")}
                        aria-label={theme === "light" ? t("settings.switchToDark") : t("settings.switchToLight")}
                        className="inline-flex items-center justify-center rounded-md border border-gray-200 dark:border-[#3a3a3a] p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                    >
                        {theme === "light" ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>

                <form onSubmit={onSaveSettings} className="flex flex-col">
                    <div className="px-3.5 py-3 border-b border-gray-100 dark:border-[#2e2e2e]">
                        <div className="grid grid-cols-2 gap-2.5">
                            <SettingsMenuSelector
                                id="lang"
                                label={t("settings.language")}
                                list={all_languages}
                                value={language}
                                getOptionLabel={getLanguageOptionLabel}
                                onMenuOpenChange={(nextOpen) => {
                                    onSelectorOpenChange("lang", nextOpen);
                                }}
                                onValueChange={(nextValue) => {
                                    SetSaved(false);
                                    SetLanguage(nextValue);
                                }}
                            />

                            <SettingsMenuSelector
                                id="format"
                                label={t("settings.summaryFormat")}
                                list={all_formats}
                                value={format}
                                getOptionLabel={getOptionLabel}
                                onMenuOpenChange={(nextOpen) => {
                                    onSelectorOpenChange("format", nextOpen);
                                }}
                                onValueChange={(nextValue) => {
                                    SetSaved(false);
                                    SetFormat(nextValue);
                                }}
                            />

                            <SettingsMenuSelector
                                id="length"
                                label={t("settings.summaryLength")}
                                list={all_lengths}
                                value={length}
                                getOptionLabel={getOptionLabel}
                                onMenuOpenChange={(nextOpen) => {
                                    onSelectorOpenChange("length", nextOpen);
                                }}
                                onValueChange={(nextValue) => {
                                    SetSaved(false);
                                    SetLength(nextValue);
                                }}
                            />

                            <SettingsMenuSelector
                                id="currency"
                                label={t("settings.currency", { defaultValue: "Currency" })}
                                list={all_currencies}
                                value={currency}
                                getOptionLabel={getOptionLabel}
                                onMenuOpenChange={(nextOpen) => {
                                    onSelectorOpenChange("currency", nextOpen);
                                }}
                                onValueChange={(nextValue) => {
                                    SetSaved(false);
                                    SetCurrency(nextValue);
                                }}
                            />

                            <div className="flex flex-col gap-1.5 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-gray-50/70 dark:bg-[#2a2a2a] p-2.5">
                                <label htmlFor="font-size" className="text-[11px] font-medium tracking-wide text-gray-600 dark:text-gray-300">{t("settings.fontSize")}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        id="font-size" type="number"
                                        value={fontSize}
                                        onChange={(e) => { SetSaved(false); SetFontSize(Number(e.target.value)); }}
                                        className="w-16 text-center text-[13px] font-medium text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#232323]"
                                    />
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">px</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* footer */}
                    <div className="px-3.5 py-2.5 flex justify-end">
                        
                        {isLanguageChanged ? (
                            <p className="px-3.5 pb-2.5 text-[11px] text-gray-500 dark:text-gray-400 mb-0!">
                                {t("settings.languageChangeHint")}
                            </p>
                        ) : null}
                        {saved ? (
                            <button
                            className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1 rounded-full border
                             cursor-pointer border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a]
                             transition-colors"
                            >
                            <Check size={12} className="text-green-500" /> {t("settings.saved")}
                            </button>
                        ) : (
                            <button
                            type="submit"
                            className="flex items-center gap-1.5 text-[12px]
                            font-medium px-3.5 py-1 rounded-full border cursor-pointer
                            border-gray-200 dark:border-[#3a3a3a] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                            >
                            <Save size={12} /> {t("settings.save")}
                            </button>
                    )}
                    </div>
                </form>
            </div>
        </div>
    )
}
