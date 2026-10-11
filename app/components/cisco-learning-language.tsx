"use client";

import { useCcnaShell } from "@/app/ccna/layout";
import { useEffect, useState } from "react";
import { requestGoogleTranslation } from "@/app/components/google-translate";

/** A learning task is marked as authored content so the workspace can
 * translate it; the target language always comes from the shared site header. */
export type LearningLanguage = "en";

const translationCache = new Map<string, string | null>();

/**
 * Renders a Persian curriculum string through the same browser-only Google
 * Translate endpoint used by the site header. The shared header picker is the
 * only language control; no exercise-specific language state is kept here.
 */
export function LearningText({ text, className = "" }: { text?: string; className?: string }) {
  const { language: selectedLanguage } = useCcnaShell();
  const language = selectedLanguage || "en";
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

