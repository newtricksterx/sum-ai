import { Currency, Format, Language, Length, QuizDifficulty, Theme } from "./types"

export const UpdateLanguageStorage = (currentLang: Language) => {
    localStorage.setItem('language', currentLang)
}

export const UpdateLengthStorage = (currentLength: Length) => {
    localStorage.setItem('length', currentLength)
}

export const UpdateCurrencyStorage = (currentCurrency: Currency) => {
    localStorage.setItem('currency', currentCurrency)
}

export const UpdateFontSizeStorage = (currentFontSize: number) => {
    localStorage.setItem('fontSize', currentFontSize.toString())
}

export const UpdateThemeStorage = (currentTheme: Theme) => {
    localStorage.setItem('theme', currentTheme)
}

export const UpdateFormatStorage = (currentFormat: Format) => {
    localStorage.setItem('format', currentFormat)
}

export const UpdateQuizDifficultyStorage = (currentQuizDifficulty: QuizDifficulty) => {
    localStorage.setItem('quizDifficulty', currentQuizDifficulty)
}

export const UpdatePageStorage = (currentPage: number) => {
    localStorage.setItem('page', currentPage.toString());
}

export const GetLangFromStorage = () => {
    return localStorage && localStorage.getItem('language') ? localStorage.getItem('language') as Language : "english"
}

export const GetLengthFromStorage = () => {
    return localStorage && localStorage.getItem('length') ? localStorage.getItem('length') as Length : null
}

export const GetCurrencyFromStorage = () => {
    return localStorage && localStorage.getItem('currency') ? localStorage.getItem('currency') as Currency : null
}

export const GetFontSizeFromStorage = () => {
    return localStorage && localStorage.getItem('fontSize') ? Number(localStorage.getItem('fontSize')) : null
}

export const GetThemeFromStorage = () => {
    return localStorage && localStorage.getItem('theme') ? localStorage.getItem('theme') as Theme : null
}

export const GetFormatFromStorage = () => {
    return localStorage && localStorage.getItem('format') ? localStorage.getItem('format') as Format : null
}

export const GetPageFromStorage = () => {
    return localStorage && localStorage.getItem('page') ? Number(localStorage.getItem('page')) : null
}

export const GetQuizDifficultyFromStorage = () => {
    return localStorage && localStorage.getItem('quizDifficulty') ? localStorage.getItem('quizDifficulty') as QuizDifficulty : null
}
