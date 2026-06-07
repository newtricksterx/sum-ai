export type Theme = "light" | "dark";

export type Length = "short" | "medium" | "long";

export type Language = "english" | "french" | "spanish" | "mandarin" | "hindi";

export type Currency = "USD" | "CAD" | "EUR";

export type Format =
    | "bullet-point"
    | "paragraph"
    | "tl-dr"
    | "q-and-a"
    | "pros-cons"

export type QuizDifficulty = "easy" | "medium" | "hard";

export type Settings = {
    language: Language;
    currency: Currency;
    length: Length;
    theme: Theme;
    fontSize: number;
    format: Format;
    quizDifficulty: QuizDifficulty;
    UpdateLanguage: (lang: Language) => void;
    UpdateCurrency: (currency: Currency) => void;
    UpdateLength: (length: Length) => void;
    UpdateFontSize: (fontSize: number) => void;
    UpdateFormat: (format: Format) => void;
    UpdateQuizDifficulty: (quizDifficulty: QuizDifficulty) => void;
    UpdateTheme: () => void;
    saveSettings: (values: { 
        language: Language; 
        currency: Currency; 
        length: Length; 
        fontSize: number; 
        format: Format, 
        quizDifficulty: QuizDifficulty }) => void;
}

export type PageType = "home" | "session" | "history" | "settings" | "profile"