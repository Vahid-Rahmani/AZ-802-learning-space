"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { requestGoogleTranslation } from "@/app/components/google-translate";

export type LearningLanguage = "en" | "de" | "fa";

type LearningLanguageContextValue = {
  language: LearningLanguage;
  setLanguage: (language: LearningLanguage) => void;
};

const STORAGE_KEY = "cisco-learning-language";
const LearningLanguageContext = createContext<LearningLanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
});

export function LearningLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LearningLanguage>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "de" || saved === "fa") return saved;
    } catch {
      // The learning path still works when browser storage is disabled.
    }
    return "en";
  });

  const setLanguage = (next: LearningLanguage) => {
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the current session usable. */ }
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <LearningLanguageContext.Provider value={value}>{children}</LearningLanguageContext.Provider>;
}

export function useLearningLanguage() {
  return useContext(LearningLanguageContext);
}

export function LearningLanguageControl() {
  const { language, setLanguage } = useLearningLanguage();
  return <label className="cisco-learning-language-control">
    <span>Language</span>
    <select aria-label="Learning language" value={language} onChange={(event) => setLanguage(event.target.value as LearningLanguage)}>
      <option value="en">English</option>
      <option value="de">Deutsch</option>
      <option value="fa">فارسی (Persian)</option>
    </select>
  </label>;
}

const translationCache = new Map<string, string | null>();

/**
 * Renders a Persian curriculum string in the selected learning language.
 * English is the default; German uses the same browser-only Google web
 * translation path and Persian keeps the authored text unchanged.
 */
export function LearningText({ text, className = "" }: { text?: string; className?: string }) {
  const { language } = useLearningLanguage();
  const safeText = text ?? "";
  const cacheKey = `${language}\u0000${safeText}`;
  const [state, setState] = useState<{ key: string; value?: string | null }>({ key: "" });
  const shouldTranslate = language !== "fa" && Boolean(safeText.trim());

  useEffect(() => {
    let cancelled = false;
    if (!shouldTranslate) return () => { cancelled = true; };
    const cached = translationCache.get(cacheKey);
    if (cached !== undefined) return () => { cancelled = true; };
    void requestGoogleTranslation(language, safeText, "fa").then((value) => {
      translationCache.set(cacheKey, value);
      if (!cancelled) setState({ key: cacheKey, value });
    });
    return () => { cancelled = true; };
  }, [cacheKey, language, shouldTranslate, safeText]);

  const cachedValue = shouldTranslate ? translationCache.get(cacheKey) : safeText;
  const value = cachedValue !== undefined ? cachedValue : state.key === cacheKey ? state.value : undefined;
  const pending = shouldTranslate && value === undefined;
  return <span className={`cisco-learning-text ${className}`.trim()} dir={language === "fa" ? "rtl" : "ltr"} lang={language}>
    {pending ? "Translating…" : value ?? safeText}
  </span>;
}

