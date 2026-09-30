import { NextResponse } from "next/server";
import { getGoogleTranslateLanguage } from "@/lib/google-languages";

const MAX_TEXTS = 80;
const MAX_TEXT_LENGTH = 1_600;
const MAX_REQUEST_LENGTH = 18_000;
const cache = new Map<string, string>();
const GOOGLE_WEB_ENDPOINTS = [
  "https://translate.googleapis.com/translate_a/single",
  "https://translate.google.com/translate_a/single",
] as const;

type PublicGoogleSegment = Array<string | number | null | unknown[]>;
type PublicGoogleResponse = Array<unknown> & { 0?: PublicGoogleSegment[] };

function cacheKey(target: string, text: string) {
  return `${target}\u0000${text}`;
}

// The public Google web endpoint keeps the learning demo usable without a
// Google Cloud project, API key, server secret, or paid quota.
function joinedStringAt(segments: PublicGoogleSegment[], index: number) {
  return segments.map((segment) => typeof segment?.[index] === "string" ? segment[index] : "").join("").trim();
}

function extractRomanizedTranslation(segments: PublicGoogleSegment[]) {
  const inlineRomanization = joinedStringAt(segments, 2);
  if (/[A-Za-z]/.test(inlineRomanization)) return inlineRomanization;

  // Google web responses can also append a marker tuple: [1, "romanized text", ...].
  const marker = [...segments].reverse().find((segment) => segment?.[0] === 1 && typeof segment?.[1] === "string");
  const markedRomanization = typeof marker?.[1] === "string" ? marker[1].trim() : "";
  return /[A-Za-z]/.test(markedRomanization) ? markedRomanization : "";
}

async function translateWithGoogleWeb(target: string, text: string) {
  const language = getGoogleTranslateLanguage(target);
  if (!language) throw new Error("Unsupported Google Translate language");

  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: language.googleCode ?? language.code, q: text });
  params.append("dt", "t");
  if (language.romanize) params.append("dt", "rm");

  for (const endpoint of GOOGLE_WEB_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: {
          accept: "application/json",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": "Mozilla/5.0 (compatible; WinCraftLearning/1.0)",
        },
      });
      if (!response.ok) continue;
      const body = await response.json() as PublicGoogleResponse;
      const segments = Array.isArray(body[0]) ? body[0] : [];
      const translated = language.romanize ? extractRomanizedTranslation(segments) : joinedStringAt(segments, 0);
      if (translated) return translated;
    } catch {
      // Try the second Google web host before reporting a temporary failure.
    }
  }

  throw new Error("Google Translate returned no usable result");
}

async function translate(target: string, text: string) {
  const key = cacheKey(target, text);
  const cached = cache.get(key);
  if (cached) return cached;
  const result = await translateWithGoogleWeb(target, text);
  if (cache.size >= 4_000) cache.clear();
  cache.set(key, result);
  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { target?: unknown; texts?: unknown } | null;
  const target = typeof body?.target === "string" ? body.target.trim() : "";
  const sourceTexts = Array.isArray(body?.texts) ? body.texts : [];
  const texts = sourceTexts.map((item) => typeof item === "string" ? item.trim() : "");

  if (!getGoogleTranslateLanguage(target)) return NextResponse.json({ error: "Unsupported Google Translate language." }, { status: 400 });
  if (!texts.length || texts.length > MAX_TEXTS || texts.some((text) => !text || text.length > MAX_TEXT_LENGTH) || texts.join("").length > MAX_REQUEST_LENGTH) {
    return NextResponse.json({ error: "Translation request is too large or invalid." }, { status: 400 });
  }
  if (!target) return NextResponse.json({ translations: texts, provider: "original" }, { headers: { "cache-control": "no-store" } });

  try {
    const translations = await Promise.all(texts.map((text) => translate(target, text)));
    return NextResponse.json({ translations, provider: "google-web" }, { headers: { "cache-control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Google Translate is temporarily unavailable." }, { status: 503 });
  }
}
