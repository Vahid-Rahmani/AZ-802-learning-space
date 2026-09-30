"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GOOGLE_TRANSLATE_LANGUAGES } from "@/lib/google-languages";

type TranslationContextValue = { language: string };
const TranslationContext = createContext<TranslationContextValue>({ language: "" });
const cache = new Map<string, string>();
const waiting = new Map<string, Array<(translation: string | null) => void>>();
let queueTimer: ReturnType<typeof setTimeout> | null = null;

function keyFor(language: string, text: string) {
  return `${language}\u0000${text}`;
}

function flushQueue() {
  queueTimer = null;
  const firstKey = waiting.keys().next().value as string | undefined;
  if (!firstKey) return;
  const language = firstKey.split("\u0000", 1)[0];
  const matching = [...waiting.entries()].filter(([key]) => key.startsWith(`${language}\u0000`)).slice(0, 16);
  const texts = matching.map(([key]) => key.slice(language.length + 1));
  for (const [key] of matching) waiting.delete(key);
  void fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: language, texts }) })
    .then(async (response) => response.ok ? await response.json() as { translations?: string[] } : null)
    .then((payload) => {
      matching.forEach(([key, resolvers], index) => {
        const translation = payload?.translations?.[index] || null;
        if (translation) cache.set(key, translation);
        resolvers.forEach((resolve) => resolve(translation));
      });
    })
    .catch(() => matching.forEach(([, resolvers]) => resolvers.forEach((resolve) => resolve(null))))
    .finally(() => {
      if (waiting.size && !queueTimer) queueTimer = setTimeout(flushQueue, 0);
    });
}

function requestTranslation(language: string, text: string) {
  const key = keyFor(language, text);
  const existing = cache.get(key);
  if (existing) return Promise.resolve(existing);
  return new Promise<string | null>((resolve) => {
    const resolvers = waiting.get(key) ?? [];
    resolvers.push(resolve);
    waiting.set(key, resolvers);
    if (!queueTimer) queueTimer = setTimeout(flushQueue, 0);
  });
}

export function GoogleSubtitleProvider({ language, children }: { language: string; children: ReactNode }) {
  const value = useMemo(() => ({ language }), [language]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

/** Keeps English visible and renders the selected Google translation below it. */
export function GoogleSubtitle({ text, className = "", subtitleClassName = "", enabled = true }: { text: string; className?: string; subtitleClassName?: string; enabled?: boolean }) {
  const { language } = useContext(TranslationContext);
  const lookupKey = enabled && language && text.trim() ? keyFor(language, text) : "";
  const [result, setResult] = useState<{ key: string; translation: string | null }>({ key: "", translation: null });

  useEffect(() => {
    let cancelled = false;
    if (!lookupKey) return;
    void requestTranslation(language, text).then((result) => {
      if (!cancelled) setResult({ key: lookupKey, translation: result });
    });
    return () => { cancelled = true; };
  }, [language, lookupKey, text]);

  const translation = result.key === lookupKey ? result.translation : undefined;
  const pending = Boolean(lookupKey) && translation === undefined;

  return <span className={`google-subtitle ${className}`} dir="ltr">
    <span className="google-subtitle-original">{text}</span>
    {language && enabled && <span className={`google-subtitle-translation ${subtitleClassName}`} dir="ltr">{translation ?? (pending ? "Translating…" : "Translation unavailable")}</span>}
  </span>;
}

export function GoogleTranslateControl({ language, onLanguageChange }: { language: string; onLanguageChange: (language: string) => void }) {
  const selectedLanguage = GOOGLE_TRANSLATE_LANGUAGES.find((item) => item.code === language)?.label ?? "English (original)";
  return <div className="google-translate-control" aria-label="Google Translate subtitles">
    <label htmlFor="wincraft-language" className="google-translate-label">Translate</label>
    <select id="wincraft-language" value={language} onChange={(event) => onLanguageChange(event.target.value)} aria-describedby="wincraft-translate-help">
      {GOOGLE_TRANSLATE_LANGUAGES.map((item) => <option key={item.code || "original"} value={item.code}>{item.label}</option>)}
    </select>
    <span id="wincraft-translate-help" className="google-translate-status" aria-live="polite">{language ? `${selectedLanguage} subtitles` : "English original"}</span>
  </div>;
}
