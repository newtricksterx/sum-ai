export type Theme = "light" | "dark";

export type Length = "short" | "medium" | "long";

export type Language = "english" | "french" | "spanish";

export type Format =
    | "bullet-point"
    | "paragraph"
    | "tl-dr-bullets"
    | "key-takeaways"
    | "action-items"
    | "q-and-a"
    | "pros-cons"

export type ButtonDisplyStatus = "block" | "hidden";

export type Settings = {
    language: Language;
    length: Length;
    theme: Theme;
    fontSize: number;
    format: Format;
    UpdateLanguage: (lang: Language) => void;
    UpdateLength: (length: Length) => void;
    UpdateFontSize: (fontSize: number) => void;
    UpdateFormat: (format: Format) => void;
    UpdateTheme: () => void;
}
