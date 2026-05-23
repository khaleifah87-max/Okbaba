import React, { createContext, useContext, useState, useCallback } from "react";
import { I18nManager } from "react-native";
import { en, TranslationKeys } from "./en";
import { ar } from "./ar";
import { ur } from "./ur";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Language = "en" | "ar" | "ur";

const translations: Record<Language, Record<TranslationKeys, string>> = {
  en,
  ar,
  ur,
};

export const RTL_LANGUAGES: Language[] = ["ar", "ur"];

export function isRTL(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key) => en[key],
  isRTL: false,
});

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>("ar");

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    const rtl = isRTL(lang);
    I18nManager.allowRTL(rtl);
    AsyncStorage.setItem("app_language", lang).catch(() => {});
  }, []);

  // Load saved language on mount
  React.useEffect(() => {
    AsyncStorage.getItem("app_language").then((saved) => {
      if (saved && (saved === "en" || saved === "ar" || saved === "ur")) {
        setLanguageState(saved as Language);
        I18nManager.allowRTL(isRTL(saved as Language));
      }
    }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKeys): string => {
      return translations[language][key] ?? en[key];
    },
    [language]
  );

  const value: I18nContextType = {
    language,
    setLanguage,
    t,
    isRTL: isRTL(language),
  };

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation() {
  return useContext(I18nContext);
}