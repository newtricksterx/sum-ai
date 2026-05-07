import { useEffect } from "react";
import i18n, { APP_LANGUAGE_TO_I18N } from "../../i18n";

export const useAppLanguageEffect = (language: string) => {
  useEffect(() => {
    const nextLanguage = APP_LANGUAGE_TO_I18N[language as keyof typeof APP_LANGUAGE_TO_I18N] ?? "en";
    void i18n.changeLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, [language]);
};

