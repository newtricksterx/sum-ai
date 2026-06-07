import { Currency, Format, Language, Length, QuizDifficulty, Theme, PageType } from "./types"

type StorageSchema = {
    language: Language;
    length: Length;
    currency: Currency;
    fontSize: number;
    theme: Theme;
    format: Format;
    quizDifficulty: QuizDifficulty;
    page: PageType;
}

type StorageKey = keyof StorageSchema;

const setStorage = (key: StorageKey, value: string | number) => {
    localStorage.setItem(key, String(value));
}

const getStringStorage = <K extends StorageKey>(key: K): StorageSchema[K] | null => {
    return (localStorage?.getItem(key) as StorageSchema[K]) ?? null;
}

const getNumericStorage = (key: StorageKey): number | null => {
    const raw = localStorage?.getItem(key);
    return raw !== null ? Number(raw) : null;
}

export const UpdateLanguageStorage = (value: Language) => setStorage('language', value);
export const UpdateLengthStorage = (value: Length) => setStorage('length', value);
export const UpdateCurrencyStorage = (value: Currency) => setStorage('currency', value);
export const UpdateFontSizeStorage = (value: number) => setStorage('fontSize', value);
export const UpdateThemeStorage = (value: Theme) => setStorage('theme', value);
export const UpdateFormatStorage = (value: Format) => setStorage('format', value);
export const UpdateQuizDifficultyStorage = (value: QuizDifficulty) => setStorage('quizDifficulty', value);
export const UpdatePageStorage = (value: PageType) => setStorage('page', value);

export const GetLangFromStorage = (): Language => getStringStorage('language') ?? "english";
export const GetLengthFromStorage = () => getStringStorage('length');
export const GetCurrencyFromStorage = () => getStringStorage('currency');
export const GetFontSizeFromStorage = () => getNumericStorage('fontSize');
export const GetThemeFromStorage = () => getStringStorage('theme');
export const GetFormatFromStorage = () => getStringStorage('format');
export const GetPageFromStorage = (): PageType => getStringStorage('page') ?? "home";
export const GetQuizDifficultyFromStorage = () => getStringStorage('quizDifficulty');
