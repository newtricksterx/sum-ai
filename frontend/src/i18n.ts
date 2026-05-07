import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import fr from "./locales/fr";
import es from "./locales/es";
import zh from "./locales/zh";
import hi from "./locales/hi";

export const APP_LANGUAGE_TO_I18N: Record<string, string> = {
  english: "en",
  french: "fr",
  spanish: "es",
  mandarin: "zh",
  hindi: "hi",
};

const resources = {
  en,
  fr,
  es,
  zh,
  hi,
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export default i18n;
