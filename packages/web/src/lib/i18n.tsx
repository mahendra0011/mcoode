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
    "sidebar.runDebug": "Run and Debug",
    "sidebar.languages": "Languages & Runtimes",
    "sidebar.extensions": "Extensions",
    "sidebar.remote": "Remote Explorer",
    "sidebar.containers": "Containers",
    "sidebar.testing": "Testing",
    "sidebar.android": "Android Emulators",
    "chat.send": "Send",
    "nav.ai": "AI",
    "nav.cli": "CLI",
    "nav.tools": "Tools",
    "nav.live": "Live",
    "nav.docs": "Docs",
    "nav.login": "Log in",
    "nav.account": "Account",
    "palette.aiChat": "AI Chat",
    "palette.landing": "Landing",
    "palette.cli": "CLI",
    "palette.settings": "Settings",
    "chat.askFollowup": "Ask a follow-up...",
    "chat.askAgent": "Ask AI code agent...",
    "chat.searchHistory": "Search past conversations...",
    "git.commitMsg": "Enter commit message...",
    "git.branchName": "Enter branch name...",
    "ide.sendMessage": "Send message",
    "ide.cleanMode": "Clean Mode: dead code + AI-bloat removal",
    "ide.reviewChanges": "Review uncommitted changes",
    "ide.gitBranch": "Git Branch",
    "ide.cmdPalette": "Command Palette (/)",
    "ide.uploadProject": "Upload Project (Folder, File, ZIP)",
    "ide.closePanel": "Close AI Panel",
    "ide.layout": "Layout",
    "ide.noNotifications": "No Notifications",
    "ide.togglePanel": "Toggle Panel",
    "ide.primaryBar": "Toggle Primary Side Bar",
    "ide.secondaryBar": "Toggle Secondary Side Bar",
    "ide.settings": "Settings",
    "ide.exportZip": "Export workspace as ZIP",
    "ide.pushGit": "Push changes to Git repository",
    "ide.turnMachine": "Show mcode Turn Machine",
    "ide.toggleChat": "Toggle AI Chat & Prompt Section",
    "ide.uploadFiles": "Upload files, folders or ZIP project",
    "ide.attachFile": "Attach file or context",
    "ide.verification": "Verification",
    "ide.equivalence": "Behavioral Equivalence",
    "ide.securityAudit": "Security Audit",
  },
  hi: {
    "menu.file": "फ़ाइल",
    "menu.edit": "संपादित करें",
    "sidebar.explorer": "एक्सप्लोरर",
    "sidebar.search": "खोजें",
    "sidebar.sourceControl": "सोर्स कंट्रोल",
    "sidebar.runDebug": "चलाएँ और डीबग करें",
    "sidebar.languages": "भाषाएँ और रनटाइम",
    "sidebar.extensions": "एक्सटेंशन",
    "sidebar.remote": "रिमोट एक्सप्लोरर",
    "sidebar.containers": "कंटेनर",
    "sidebar.testing": "परीक्षण",
    "sidebar.android": "एंड्रॉइड एमुलेटर",
    "chat.send": "भेजें",
    "nav.ai": "एआई",
    "nav.cli": "सीएलआई",
    "nav.tools": "उपकरण",
    "nav.live": "लाइव",
    "nav.docs": "दस्तावेज़",
    "nav.login": "लॉग इन",
    "nav.account": "खाता",
    "palette.aiChat": "एआई चैट",
    "palette.landing": "मुख्य पृष्ठ",
    "palette.cli": "सीएलआई",
    "palette.settings": "सेटिंग्स",
    "chat.askFollowup": "आगे पूछें...",
    "chat.askAgent": "एआई कोड एजेंट से पूछें...",
    "chat.searchHistory": "पुरानी बातचीत खोजें...",
    "git.commitMsg": "कमिट संदेश लिखें...",
    "git.branchName": "ब्रांच का नाम लिखें...",
    "ide.sendMessage": "संदेश भेजें",
    "ide.cleanMode": "क्लीन मोड: डेड कोड + एआई ब्लोट हटाएँ",
    "ide.reviewChanges": "अनकमिटेड बदलाव देखें",
    "ide.gitBranch": "गिट ब्रांच",
    "ide.cmdPalette": "कमांड पैलेट (/)",
    "ide.uploadProject": "प्रोजेक्ट अपलोड करें (फ़ोल्डर, फ़ाइल, ZIP)",
    "ide.closePanel": "एआई पैनल बंद करें",
    "ide.layout": "लेआउट",
    "ide.noNotifications": "कोई सूचना नहीं",
    "ide.togglePanel": "पैनल बदलें",
    "ide.primaryBar": "प्राइमरी साइड बार बदलें",
    "ide.secondaryBar": "सेकेंडरी साइड बार बदलें",
    "ide.settings": "सेटिंग्स",
    "ide.exportZip": "वर्कस्पेस ZIP के रूप में निर्यात करें",
    "ide.pushGit": "बदलाव गिट रिपॉजिटरी में पुश करें",
    "ide.turnMachine": "mcode टर्न मशीन दिखाएँ",
    "ide.toggleChat": "एआई चैट और प्रॉम्प्ट सेक्शन बदलें",
    "ide.uploadFiles": "फ़ाइलें, फ़ोल्डर या ZIP प्रोजेक्ट अपलोड करें",
    "ide.attachFile": "फ़ाइल या संदर्भ जोड़ें",
    "ide.verification": "सत्यापन",
    "ide.equivalence": "व्यवहार समानता",
    "ide.securityAudit": "सुरक्षा ऑडिट",
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
