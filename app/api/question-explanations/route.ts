import { NextResponse } from "next/server";
import {
  createLocalExplanation,
  normalizeLocale,
  questionById,
  stripJsonFence,
  type ExplanationLocale,
  type StructuredQuestionExplanation,
} from "@/lib/question-explanations";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1_000;
const explanationCache = new Map<string, { expiresAt: number; value: StructuredQuestionExplanation }>();

type GeminiPayload = {
  summary?: unknown;
  whyCorrect?: unknown;
  distractors?: unknown;
  decisionSteps?: unknown;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function shortText(value: unknown, maxLength = 1_200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseGeminiPayload(value: string): GeminiPayload | null {
  try {
    const parsed = JSON.parse(stripJsonFence(value)) as unknown;
    return parsed && typeof parsed === "object" ? parsed as GeminiPayload : null;
  } catch {
    return null;
  }
}

function mergeGeminiExplanation(
  question: NonNullable<ReturnType<typeof questionById>>,
  locale: ExplanationLocale,
  payload: GeminiPayload,
): StructuredQuestionExplanation | null {
  const summary = shortText(payload.summary, 600);
  const whyCorrect = shortText(payload.whyCorrect, 1_600);
  const decisionSteps = Array.isArray(payload.decisionSteps)
    ? payload.decisionSteps.map((step) => shortText(step, 500)).filter(Boolean).slice(0, 6)
    : [];
  const distractors = Array.isArray(payload.distractors)
    ? payload.distractors.map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { optionIndex?: unknown; reason?: unknown };
      const optionIndex = typeof row.optionIndex === "number" && Number.isInteger(row.optionIndex) ? row.optionIndex : -1;
      const reason = shortText(row.reason, 700);
      if (optionIndex < 0 || optionIndex >= question.options.length || optionIndex === question.correct || !reason) return null;
      return { optionIndex, option: question.options[optionIndex], reason };
    }).filter((item): item is { optionIndex: number; option: string; reason: string } => Boolean(item))
    : [];
  if (!summary || !whyCorrect || decisionSteps.length < 2 || distractors.length < Math.max(1, question.options.length - 1)) return null;
  return {
    questionId: question.id,
    locale,
    provider: "gemini",
    summary,
    whyCorrect,
    distractors,
    decisionSteps,
    // Keep the visual graph deterministic and accessible. The model explains
    // the question; it must not be able to inject arbitrary graph markup.
    schematic: createLocalExplanation(question, locale).schematic,
    source: { title: "Microsoft Learn — AZ-802 study guide", url: question.source },
    generatedAt: new Date().toISOString(),
  };
}

async function explainWithGemini(
  question: NonNullable<ReturnType<typeof questionById>>,
  locale: ExplanationLocale,
  apiKey: string,
) {
  const model = process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash";
  const prompt = [
    "You are an AZ-802 learning assistant. Explain the supplied original practice question; do not reproduce or invent any real Microsoft exam item.",
    "Use only the supplied question, options, answer, rationale, and official source. Return JSON only with summary, whyCorrect, distractors, and decisionSteps.",
    "distractors must contain one object for every incorrect option using its zero-based optionIndex and a concise reason.",
    `Write the explanation in ${locale === "fa" ? "Persian" : locale === "de" ? "German" : "English"}, while preserving Windows Server command names and technical terms in English in parentheses when useful.`,
    JSON.stringify({
      id: question.id,
      domain: question.domain,
      question: question.text,
      options: question.options,
      correctOptionIndex: question.correct,
      rationale: question.rationale.en,
      officialSource: question.source,
    }),
  ].join("\n\n");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const body = await response.json() as GeminiResponse;
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  return parseGeminiPayload(text);
}

function cacheKey(questionId: string, locale: ExplanationLocale) {
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { questionId?: unknown; locale?: unknown; forceRefresh?: unknown } | null;
  const questionId = typeof body?.questionId === "string" ? body.questionId.trim() : "";
  const question = questionById(questionId);
  if (!question) return NextResponse.json({ error: "Unknown question." }, { status: 400 });
  const locale = normalizeLocale(body?.locale);
  const key = cacheKey(question.id, locale);
  const cached = body?.forceRefresh === true ? null : readCache(key);
  if (cached) return NextResponse.json(cached, { headers: { "cache-control": "private, max-age=86400" } });

  const local = createLocalExplanation(question, locale);
  let explanation = local;
  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      const payload = await explainWithGemini(question, locale, apiKey);
      const generated = payload ? mergeGeminiExplanation(question, locale, payload) : null;
      if (generated) explanation = generated;
    } catch {
      // Keep the local, source-linked explanation available when Gemini is
      // not configured, rate-limited, or temporarily unavailable.
    }
  }
  writeCache(key, explanation);
  return NextResponse.json(explanation, { headers: { "cache-control": "private, max-age=86400" } });
}

