import { create } from "zustand";
import { Settings } from "../utils/types";
import { GetCurrencyFromStorage, GetFontSizeFromStorage, GetFormatFromStorage, GetLangFromStorage, GetLengthFromStorage, GetThemeFromStorage, UpdateCurrencyStorage, UpdateFontSizeStorage, UpdateFormatStorage, UpdateLanguageStorage, UpdateLengthStorage, UpdateThemeStorage } from "../utils/storage";

function applyThemeToDocument(theme: "light" | "dark") {
    if (typeof document === "undefined") {
        return;
    }

    const root = document.documentElement;
    const isDark = theme === "dark";

    root.classList.add("theme-switching");

    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = theme;

    if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
            root.classList.remove("theme-switching");
        });
    } else {
        root.classList.remove("theme-switching");
    }
}

function scheduleThemePersistence(theme: "light" | "dark") {
    if (typeof window === "undefined") {
        UpdateThemeStorage(theme);
        return;
    }

    // Defer synchronous localStorage write to keep the interaction handler lighter for INP.
    window.setTimeout(() => {
        UpdateThemeStorage(theme);
    }, 0);
}

export const useSettingsStore = create<Settings>()((set) => ({
    language: GetLangFromStorage() ?? "english",
    currency: GetCurrencyFromStorage() ?? "USD",
    length: GetLengthFromStorage() ?? "short",
    theme: GetThemeFromStorage() ?? "light",
    fontSize: GetFontSizeFromStorage() ?? 12,
    format: GetFormatFromStorage() ?? "paragraph",
    UpdateLanguage: (lang) => set(() => {
        UpdateLanguageStorage(lang)
        return {language: lang}
    }),
    UpdateCurrency: (currency) => set(() => {
        UpdateCurrencyStorage(currency)
        return { currency }
    }),
    UpdateLength: (leng) => set(() => {
        UpdateLengthStorage(leng)
        return {length: leng}
    }),
    UpdateFontSize: (fontSize) => set(() => {
        UpdateFontSizeStorage(fontSize)
        return {fontSize: fontSize}
    }),
    UpdateFormat: (format) => set(() => {
        UpdateFormatStorage(format)
        return {format: format}
    }),
    saveSettings: ({ language, currency, length, fontSize, format }) => set(() => {
        UpdateLanguageStorage(language);
        UpdateCurrencyStorage(currency);
        UpdateLengthStorage(length);
        UpdateFontSizeStorage(fontSize);
        UpdateFormatStorage(format);
        return { language, currency, length, fontSize, format };
    }),
    UpdateTheme: () => set((state) => {
        const newTheme = state.theme === "light" ? "dark" : "light";
        applyThemeToDocument(newTheme);
        scheduleThemePersistence(newTheme);

        return {theme: newTheme}
    })
}))
