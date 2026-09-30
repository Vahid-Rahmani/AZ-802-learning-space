import { NextResponse } from "next/server";
import { isGoogleTranslateLanguage } from "@/lib/google-languages";

const MAX_TEXTS = 80;
const MAX_TEXT_LENGTH = 1_600;
const MAX_REQUEST_LENGTH = 18_000;
const cache = new Map<string, string>();

type GoogleCloudResponse = { data?: { translations?: Array<{ translatedText?: string }> } };
type PublicGoogleResponse = Array<Array<[string]>>;

function cacheKey(target: string, text: string) {
  return `${target}\u0000${text}`;
}

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function translateWithConfiguredGoogleApi(target: string, texts: string[], key: string) {
  const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ q: texts, source: "en", target, format: "text" }),
  });
  if (!response.ok) throw new Error(`Google Cloud Translation returned ${response.status}`);
  const body = await response.json() as GoogleCloudResponse;
  const results = body.data?.translations?.map((item) => decodeHtml(item.translatedText ?? "")) ?? [];
  if (results.length !== texts.length) throw new Error("Google Cloud Translation returned an incomplete response");
  return results;
}

// The public Google web endpoint keeps the no-configuration learning demo
// usable. Production owners can set GOOGLE_TRANSLATE_API_KEY to use the
// supported Google Cloud Translation API instead.
async function translateWithGoogleWeb(target: string, text: string) {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: target, dt: "t", q: text });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Google Translate returned ${response.status}`);
  const body = await response.json() as PublicGoogleResponse;
  const translated = body[0]?.map((part) => part[0] ?? "").join("");
  if (!translated) throw new Error("Google Translate returned an empty result");
  return translated;
}

async function translate(target: string, text: string) {
  const key = cacheKey(target, text);
  const cached = cache.get(key);
  if (cached) return cached;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const result = apiKey ? (await translateWithConfiguredGoogleApi(target, [text], apiKey))[0] : await translateWithGoogleWeb(target, text);
  if (cache.size >= 4_000) cache.clear();
  cache.set(key, result);
  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { target?: unknown; texts?: unknown } | null;
  const target = typeof body?.target === "string" ? body.target.trim() : "";
  const sourceTexts = Array.isArray(body?.texts) ? body.texts : [];
  const texts = sourceTexts.map((item) => typeof item === "string" ? item.trim() : "");

  if (!isGoogleTranslateLanguage(target)) return NextResponse.json({ error: "Unsupported Google Translate language." }, { status: 400 });
  if (!texts.length || texts.length > MAX_TEXTS || texts.some((text) => !text || text.length > MAX_TEXT_LENGTH) || texts.join("").length > MAX_REQUEST_LENGTH) {
    return NextResponse.json({ error: "Translation request is too large or invalid." }, { status: 400 });
  }
  if (!target) return NextResponse.json({ translations: texts, provider: "original" }, { headers: { "cache-control": "no-store" } });

  try {
    const translations = await Promise.all(texts.map((text) => translate(target, text)));
    return NextResponse.json({ translations, provider: process.env.GOOGLE_TRANSLATE_API_KEY ? "google-cloud" : "google" }, { headers: { "cache-control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Google Translate is temporarily unavailable." }, { status: 503 });
  }
}
