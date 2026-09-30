import { NextResponse } from "next/server";
import {
  createLocalExplanation,
  normalizeLocale,
  questionById,
  type StructuredQuestionExplanation,
} from "@/lib/question-explanations";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1_000;
const explanationCache = new Map<string, { expiresAt: number; value: StructuredQuestionExplanation }>();

function cacheKey(questionId: string, locale: StructuredQuestionExplanation["locale"]) {
  return `${questionId}\u0000${locale}`;
}

function readCache(key: string) {
  const entry = explanationCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    explanationCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: StructuredQuestionExplanation) {
  if (explanationCache.size >= MAX_CACHE_ENTRIES) explanationCache.clear();
  explanationCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

/**
 * Explanations are deliberately generated locally from the reviewed question
 * and its Microsoft Learn source. The previous Gemini API-key path was
 * removed: this endpoint must never receive, store, or forward a Google key.
 * The browser UI offers an optional Google AI Mode hand-off for users who want
 * a second explanation, while this source-linked answer remains available
 * without an account, key, quota, or third-party server call.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { questionId?: unknown; locale?: unknown; forceRefresh?: unknown } | null;
  const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
  const question = questionById(questionId);
  if (!question) return NextResponse.json({ error: "Unknown question." }, { status: 400 });

  const locale = normalizeLocale(body?.locale);
  const key = cacheKey(question.id, locale);
  const cached = body?.forceRefresh === true ? null : readCache(key);
  if (cached) return NextResponse.json(cached, { headers: { "cache-control": "private, max-age=86400" } });

  const explanation = createLocalExplanation(question, locale);
  writeCache(key, explanation);
  return NextResponse.json(explanation, { headers: { "cache-control": "private, max-age=86400" } });
}
