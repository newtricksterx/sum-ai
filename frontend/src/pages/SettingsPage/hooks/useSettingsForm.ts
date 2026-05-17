import { useCallback, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSettingsStore } from "../../../stores/settingsStore";
import type { Currency, Format, Language, Length, QuizDifficulty } from "../../../utils/types";
import { SaveTimeoutHandle, clampFontSize } from "../settingspage.utils";

export type SettingsFormValues = {
  language: Language;
  currency: Currency;
  length: Length;
  fontSize: number;
  format: Format;
  quizDifficulty: QuizDifficulty;
};

export type SettingsFormSetters = {
  setLanguage: (value: Language) => void;
  setCurrency: (value: Currency) => void;
  setLength: (value: Length) => void;
  setFontSize: (value: number) => void;
  setFormat: (value: Format) => void;
  setQuizDifficulty: (value: QuizDifficulty) => void;
};

export type UseSettingsForm = {
  values: SettingsFormValues;
  setters: SettingsFormSetters;
  hasUnsavedChanges: boolean;
  showSavedState: boolean;
  clampFontSizeOnBlur: () => void;
  save: () => void;
};

export function useSettingsForm(): UseSettingsForm {
  const {
    language: storeLanguage,
    currency: storeCurrency,
    length: storeLength,
    fontSize: storeFontSize,
    format: storeFormat,
    quizDifficulty: storeQuizDifficulty,
    saveSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      language: state.language,
      currency: state.currency,
      length: state.length,
      fontSize: state.fontSize,
      format: state.format,
      quizDifficulty: state.quizDifficulty,
      saveSettings: state.saveSettings,
    })),
  );

  const [language, setLanguage] = useState<Language>(storeLanguage);
  const [currency, setCurrency] = useState<Currency>(storeCurrency);
  const [length, setLength] = useState<Length>(storeLength);
  const [fontSize, setFontSize] = useState<number>(storeFontSize);
  const [format, setFormat] = useState<Format>(storeFormat);
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>(storeQuizDifficulty);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(false);
  const saveTimeoutRef = useRef<SaveTimeoutHandle | null>(null);

  const clampedFontSize = clampFontSize(fontSize);

  const hasUnsavedChanges =
    language !== storeLanguage ||
    currency !== storeCurrency ||
    length !== storeLength ||
    format !== storeFormat ||
    quizDifficulty !== storeQuizDifficulty ||
    clampedFontSize !== storeFontSize;

  const showSavedState = hasSavedFeedback && !hasUnsavedChanges;

  const clampFontSizeOnBlur = useCallback(() => {
    setFontSize((current) => clampFontSize(current));
  }, []);

  const save = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasSavedFeedback(true);
      return;
    }

    setFontSize(clampedFontSize);
    setHasSavedFeedback(true);

    const pendingTimeout = saveTimeoutRef.current;
    if (pendingTimeout !== null) {
      window.clearTimeout(pendingTimeout);
    }

    // Defer synchronous store/localStorage work to the next task so the
    // click interaction can paint immediately and reduce INP processing time.
    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings({ language, currency, length, fontSize: clampedFontSize, format, quizDifficulty });
      saveTimeoutRef.current = null;
    }, 0);
  }, [
    clampedFontSize,
    currency,
    format,
    hasUnsavedChanges,
    language,
    length,
    quizDifficulty,
    saveSettings,
  ]);

  const values = useMemo<SettingsFormValues>(
    () => ({ language, currency, length, fontSize, format, quizDifficulty }),
    [language, currency, length, fontSize, format, quizDifficulty],
  );

  const setters = useMemo<SettingsFormSetters>(
    () => ({
      setLanguage,
      setCurrency,
      setLength,
      setFontSize,
      setFormat,
      setQuizDifficulty,
    }),
    [],
  );

  return { values, setters, hasUnsavedChanges, showSavedState, clampFontSizeOnBlur, save };
}
