import { create } from "zustand";
import { Format, Language, Length, Theme } from "../utils/types";
import { GetFontSizeFromStorage, GetFormatFromStorage, GetLangFromStorage, GetLengthFromStorage, GetThemeFromStorage, UpdateFontSizeStorage, UpdateFormatStorage, UpdateLanguageStorage, UpdateLengthStorage, UpdateThemeStorage } from "../utils/storage";

export type Settings = {
    language: Language;
    length: Length;
    theme: Theme;
    fontSize: Number;
    format: Format;
    UpdateLanguage: (lang: Language) => void;
    UpdateLength: (length: Length) => void;
    UpdateFontSize: (fontSize: Number) => void;
    UpdateFormat: (format: Format) => void;
    UpdateTheme: () => void;
}

export const useSettingsStore = create<Settings>()((set) => ({
    language: GetLangFromStorage() ?? "english",
    length: GetLengthFromStorage() ?? "short",
    theme: GetThemeFromStorage() ?? "light",
    fontSize: GetFontSizeFromStorage() ?? 12,
    format: GetFormatFromStorage() ?? "paragraph",
    UpdateLanguage: (lang) => set(() => {
        UpdateLanguageStorage(lang)
        return {language: lang}
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
    UpdateTheme: () => set((state) => {
        const newTheme = state.theme === "light" ? "dark" : "light";
        UpdateThemeStorage(newTheme)
        //console.log(newTheme)
        if(newTheme === "dark"){
            document.querySelector('html')?.classList.remove("light")
            document.querySelector('html')?.classList.add("dark")
        }
        else{
            document.querySelector('html')?.classList.remove("dark")
            document.querySelector('html')?.classList.add("light")
        }
        
        return {theme: newTheme}
    })
}))