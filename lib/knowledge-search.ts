import Fuse from "fuse.js";

export type KnowledgeQuestion = {
  id: string;
  domain: string;
  text: string;
  textFa?: string;
  options: string[];
  optionsFa?: string[];
  correct: number;
  source: string;
  rationale: { en: string; fa: string; de: string };
  /**
   * Optional teaching context. When present it is indexed alongside the stem so
   * a natural-language question can match the topic it covers rather than only
   * the exact wording of the stem.
   */
  objective?: string;
  topic?: string;
  keyPoints?: string[];
};

export type KnowledgeItem = {
  id: string;
  domain: string;
  question: string;
  questionFa: string;
  answer: string;
  answerFa: string;
  rationaleEn: string;
  rationaleFa: string;
  rationaleDe: string;
  source: string;
  questionSearch: string;
  questionFaSearch: string;
  answerSearch: string;
  answerFaSearch: string;
  rationaleSearch: string;
  domainSearch: string;
  optionsSearch: string;
  contextSearch: string;
  searchCorpus: string;
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[أإٱ]/g, "ا")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}._+\-/]+/gu, " ")
    .trim();
}

const stopWords = new Set(["the", "a", "an", "and", "or", "in", "on", "to", "for", "of", "is", "are", "what", "which", "how", "why", "best", "good", "should", "can", "چطور", "چگونه", "چیست", "کدام", "چرا", "بهترین", "خوب", "باید", "میتوان", "برای", "این", "آن", "را", "به", "از", "در", "و", "یا"]);

function toKnowledgeItem(question: KnowledgeQuestion): KnowledgeItem {
  const answer = question.options[question.correct] ?? "";
  const answerFa = question.optionsFa?.[question.correct] ?? "";
  const rationale = [question.rationale.en, question.rationale.fa, question.rationale.de].join(" ");
  const normalizedQuestion = normalizeSearchText(question.text);
  const normalizedQuestionFa = normalizeSearchText(question.textFa ?? "");
  const normalizedAnswer = normalizeSearchText(answer);
  const normalizedAnswerFa = normalizeSearchText(answerFa);
  const normalizedRationale = normalizeSearchText(rationale);
  const normalizedDomain = normalizeSearchText(question.domain);
  const normalizedOptions = normalizeSearchText([...question.options, ...(question.optionsFa ?? [])].join(" "));
  const normalizedContext = normalizeSearchText([question.objective ?? "", question.topic ?? "", ...(question.keyPoints ?? [])].join(" "));
  return {
    id: question.id,
    domain: question.domain,
    question: question.text,
    questionFa: question.textFa ?? "",
    answer,
    answerFa,
    rationaleEn: question.rationale.en,
    rationaleFa: question.rationale.fa,
    rationaleDe: question.rationale.de,
    source: question.source,
    questionSearch: normalizedQuestion,
    questionFaSearch: normalizedQuestionFa,
    answerSearch: normalizedAnswer,
    answerFaSearch: normalizedAnswerFa,
    rationaleSearch: normalizedRationale,
    domainSearch: normalizedDomain,
    optionsSearch: normalizedOptions,
    contextSearch: normalizedContext,
    searchCorpus: [normalizedQuestion, normalizedQuestionFa, normalizedAnswer, normalizedAnswerFa, normalizedRationale, normalizedDomain, normalizedOptions, normalizedContext].join(" "),
  };
}

function hasEvidenceOverlap(query: string, item: KnowledgeItem) {
  const tokens = normalizeSearchText(query).split(/\s+/).filter((token) => token.length >= 2 && !stopWords.has(token));
  return tokens.some((token) => item.searchCorpus.includes(token));
}

export function createKnowledgeSearch(questionBank: readonly KnowledgeQuestion[]) {
  const items = questionBank.map(toKnowledgeItem);
  const index = new Fuse(items, {
    includeScore: true,
    ignoreDiacritics: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
    threshold: 0.5,
    useTokenSearch: true,
    ignoreFieldNorm: true,
    keys: [
      { name: "questionSearch", weight: 0.32 },
      { name: "contextSearch", weight: 0.16 },
      { name: "questionFaSearch", weight: 0.24 },
      { name: "answerSearch", weight: 0.12 },
      { name: "answerFaSearch", weight: 0.1 },
      { name: "rationaleSearch", weight: 0.04 },
      { name: "domainSearch", weight: 0.02 },
      { name: "optionsSearch", weight: 0.01 },
    ],
  });

  return {
    search(query: string, limit = 6) {
      const normalized = normalizeSearchText(query);
      const results = normalized.length >= 2 ? index.search(normalized, { limit }) : [];
      const best = results[0];
      const bestScore = best?.score ?? 1;
      const supported = Boolean(best && (bestScore <= 0.35 || (bestScore <= 0.62 && hasEvidenceOverlap(query, best.item))));
      const answerStrength = bestScore <= 0.16 ? "Strong match" : bestScore <= 0.4 ? "Good match" : "Closest supported match";
      return { results, best, bestScore, supported, answerStrength };
    },
  };
}
