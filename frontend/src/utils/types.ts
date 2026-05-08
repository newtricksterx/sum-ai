export type Theme = "light" | "dark";

export type Length = "short" | "medium" | "long";

export type Language = "english" | "french" | "spanish" | "mandarin" | "hindi";
export type Currency = "USD" | "CAD" | "EUR";

export type Format =
    | "bullet-point"
    | "paragraph"
    | "tl-dr"
    | "key-takeaways"
    | "action-items"
    | "q-and-a"
    | "pros-cons"

export type ButtonDisplyStatus = "block" | "hidden";

export type Settings = {
    language: Language;
    currency: Currency;
    length: Length;
    theme: Theme;
    fontSize: number;
    format: Format;
    UpdateLanguage: (lang: Language) => void;
    UpdateCurrency: (currency: Currency) => void;
    UpdateLength: (length: Length) => void;
    UpdateFontSize: (fontSize: number) => void;
    UpdateFormat: (format: Format) => void;
    UpdateTheme: () => void;
}
