"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GOOGLE_TRANSLATE_LANGUAGES, getGoogleTranslateLanguage } from "@/lib/google-languages";

type TranslationContextValue = { language: string };
const TranslationContext = createContext<TranslationContextValue>({ language: "" });
const cache = new Map<string, string>();
const waiting = new Map<string, Array<(translation: string | null) => void>>();
let queueTimer: ReturnType<typeof setTimeout> | null = null;
let queueRunning = false;
const inFlight = new Map<string, Promise<string | null>>();

// Public Google web translation, requested from the visitor's browser rather
// than the deployment server. No Cloud credentials or paid API are involved.
async function translateInBrowser(language: string, text: string): Promise<string | null> {
  const target = getGoogleTranslateLanguage(language);
  if (!target) return null;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 1200) {
    const space = remaining.lastIndexOf(" ", 1200);
    const end = space > 600 ? space + 1 : 1200;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  if (remaining) chunks.push(remaining);
  const results: string[] = [];
  for (const chunk of chunks) {
    const params = new URLSearchParams({ client: "gtx", sl: "en", tl: target.googleCode ?? target.code, dt: "t", q: chunk });
    if (target.romanize) params.append("dt", "rm");
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, { credentials: "omit", signal: AbortSignal.timeout(10000) });
      if (!response.ok) return null;
      const body: unknown = await response.json();
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null;
      const segments = body[0].filter((segment: unknown): segment is unknown[] => Array.isArray(segment));
      const translated = segments.map(segment => typeof segment[target.romanize ? 2 : 0] === "string" ? segment[target.romanize ? 2 : 0] : "").join("").trim();
      const marker = target.romanize ? [...segments].reverse().find(segment => segment[0] === 1 && typeof segment[1] === "string") : undefined;
      const value = target.romanize && !/[A-Za-z]/.test(translated) && typeof marker?.[1] === "string" ? marker[1] : translated;
      if (!value) return null;
      results.push(value);
    } catch { return null; }
  }
  return results.join(" ");
}

function keyFor(language: string, text: string) {
  return `${language}\u0000${text}`;
}

function isRtlLanguage(language: string) {
  if (language.toLowerCase() === "ur-latn") return false;
  return /^(ar|ckb|dv|fa|he|ps|sd|ur)(?:-|$)/i.test(language);
}

async function flushQueue() {
  queueTimer = null;
  if (queueRunning) return;
  const firstKey = waiting.keys().next().value as string | undefined;
  if (!firstKey) return;
  const language = firstKey.split("\u0000", 1)[0];
  const matching = [...waiting.entries()].filter(([key]) => key.startsWith(`${language}\u0000`)).slice(0, 2);
  queueRunning = true;
  for (const [key] of matching) waiting.delete(key);
  try {
    await Promise.all(matching.map(async ([key, resolvers]) => {
        const request = translateInBrowser(language, key.slice(language.length + 1));
        inFlight.set(key, request);
        const translation = await request;
        if (translation) cache.set(key, translation);
        inFlight.delete(key);
        resolvers.forEach((resolve) => resolve(translation));
    }));
  } finally {
    queueRunning = false;
    if (waiting.size && !queueTimer) queueTimer = setTimeout(flushQueue, 150);
  }
}

function requestTranslation(language: string, text: string) {
  const key = keyFor(language, text);
  const existing = cache.get(key);
  if (existing) return Promise.resolve(existing);
  const running = inFlight.get(key);
  if (running) return running;
  return new Promise<string | null>((resolve) => {
    const resolvers = waiting.get(key) ?? [];
    resolvers.push(resolve);
    waiting.set(key, resolvers);
    if (!queueTimer && !queueRunning) queueTimer = setTimeout(flushQueue, 0);
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
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const retryTranslation = () => { setResult({ key: "", translation: null }); setRetry(value => value + 1); };
    window.addEventListener("klybit-retry-translation", retryTranslation);
    return () => window.removeEventListener("klybit-retry-translation", retryTranslation);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!lookupKey) return;
    void requestTranslation(language, text).then((result) => {
      if (!cancelled) setResult({ key: lookupKey, translation: result });
    });
    return () => { cancelled = true; };
  }, [language, lookupKey, text, retry]);

  const translation = result.key === lookupKey ? result.translation : undefined;
  const pending = Boolean(lookupKey) && translation === undefined;
  const showTranslation = Boolean(lookupKey);

  const translationDirection = isRtlLanguage(language) ? "rtl" : "ltr";
  return <span className={`google-subtitle ${className}`} dir="ltr">
    <span className="google-subtitle-original">{text}</span>
    {showTranslation && <span className={`google-subtitle-translation ${subtitleClassName}`} dir={translationDirection} lang={language}>{pending ? "Translating…" : translation ?? "Translation unavailable — retry in Settings."}</span>}
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
    {language && <button type="button" onClick={() => window.dispatchEvent(new Event("klybit-retry-translation"))}>Retry translation</button>}
  </div>;
}
