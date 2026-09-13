"use client";
import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Lang = "en" | "hi";

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    "menu.file": "File",
    "menu.edit": "Edit",
    "sidebar.explorer": "Explorer",
    "sidebar.search": "Search",
    "sidebar.sourceControl": "Source Control",
    "chat.send": "Send",
  },
  hi: {
    "menu.file": "फ़ाइल",
    "menu.edit": "संपादित करें",
    "sidebar.explorer": "एक्सप्लोरर",
    "sidebar.search": "खोजें",
    "sidebar.sourceControl": "सोर्स कंट्रोल",
    "chat.send": "भेजें",
  },
};

const I18nContext = createContext<{ lang: Lang; t: (key: string) => string; setLang: (l: Lang) => void }>({
  lang: "en",
  t: (k) => STRINGS.en[k] || k,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("mcode_ui_lang") as Lang) || "en";
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("mcode_ui_lang", l);
  }, []);
  const t = useCallback((key: string) => STRINGS[lang][key] || STRINGS.en[key] || key, [lang]);
  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
