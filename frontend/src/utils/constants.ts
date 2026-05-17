import { Currency, Format, Language, Length, QuizDifficulty } from "./types"

export const all_languages: Language[] = [
    "english",
    "french",
    "spanish",
    "mandarin",
    "hindi",
]

export const LANGUAGE_NATIVE_LABEL: Record<Language, string> = {
    english: "English",
    french: "Français",
    spanish: "Español",
    mandarin: "普通话",
    hindi: "हिन्दी",
}

export const all_lengths: Length[] = [
    "short",
    "medium",
    "long",
]

export const all_formats: Format[] = [
    "bullet-point",
    "paragraph",
    "tl-dr",
    "q-and-a",
    "pros-cons",
]

export const all_currencies: Currency[] = [
    "USD",
    "CAD",
    "EUR",
]

export const all_quizDifficulties: QuizDifficulty[] = [
    "easy",
    "medium",
    "hard",
]

export const MenuIconSize = 20;
