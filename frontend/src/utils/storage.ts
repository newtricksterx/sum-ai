import { Format, Language, Length, Theme } from "./types"

export const UpdateLanguageStorage = (currentLang: Language) => {
    localStorage.setItem('language', currentLang)
}

export const UpdateLengthStorage = (currentLength: Length) => {
    localStorage.setItem('length', currentLength)
}

export const UpdateFontSizeStorage = (currentFontSize: Number) => {
    localStorage.setItem('fontSize', currentFontSize.toString())
}

export const UpdateThemeStorage = (currentTheme: Theme) => {
    localStorage.setItem('theme', currentTheme)
}

export const UpdateSummaryStorage = (currentSummary: string) => {
    localStorage.setItem('summary', currentSummary)
}

export const UpdateFormatStorage = (currentFormat: Format) => {
    localStorage.setItem('format', currentFormat)
}

export const UpdatePageStorage = (currentPage: Number) => {
    localStorage.setItem('page', currentPage.toString());
}

export const GetLangFromStorage = () => {
    return localStorage && localStorage.getItem('language') ? localStorage.getItem('language') as Language : "english"
}

export const GetLengthFromStorage = () => {
    return localStorage && localStorage.getItem('length') ? localStorage.getItem('length') as Length : null
}

export const GetFontSizeFromStorage = () => {
    return localStorage && localStorage.getItem('fontSize') ? Number(localStorage.getItem('fontSize')) : null
}

export const GetThemeFromStorage = () => {
    return localStorage && localStorage.getItem('theme') ? localStorage.getItem('theme') as Theme : null
}

export const GetSummaryFromStorage = () => {
    return localStorage && localStorage.getItem('summary') ? localStorage.getItem('summary') as string : "empty"
}

export const GetFormatFromStorage = () => {
    return localStorage && localStorage.getItem('format') ? localStorage.getItem('format') as Format : null
}

export const GetPageFromStorage = () => {
    return localStorage && localStorage.getItem('page') ? Number(localStorage.getItem('page')) : null
}