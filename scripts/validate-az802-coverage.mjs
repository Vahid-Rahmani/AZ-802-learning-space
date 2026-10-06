import process from "node:process";
import {
  CAPSTONE_DOMAIN,
  OFFICIAL_DOMAINS,
  isPageSpecificLearnUrl,
  readQuestionBank,
} from "./question-bank-meta.mjs";

/**
 * Coverage and quality gate for the AZ-802 bank.
 *
 * Two different jobs:
 *  - Always: block duplicate or near-duplicate questions, and prove every
 *    official domain still has content. A missing domain is a structural break.
 *  - Report: how far the domain-by-domain enrichment has progressed.
 *
 * `--require-complete` turns the progress report into a hard failure. It is
 * used at the final checkpoint, not during the phased work, so the gate is
 * strict when it matters and never blocks a partial, honest state.
 */
const requireComplete = process.argv.includes("--require-complete");

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "to", "for", "of", "is", "are", "be",
  "what", "which", "how", "why", "should", "would", "must", "can", "you", "your",
  "this", "that", "it", "its", "with", "as", "by", "at", "from", "if", "when", "does",
]);

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function jaccard(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

const { questions } = readQuestionBank(process.cwd());
const errors = [];
const warnings = [];

const byDomain = new Map([...OFFICIAL_DOMAINS, CAPSTONE_DOMAIN].map((domain) => [domain, 0]));
for (const question of questions) {
  byDomain.set(question.domain, (byDomain.get(question.domain) ?? 0) + 1);
}

for (const domain of OFFICIAL_DOMAINS) {
  const count = byDomain.get(domain) ?? 0;
  if (count === 0) errors.push(`Official domain has no questions: ${domain}`);
}

const duplicateIds = new Map();
for (const question of questions) duplicateIds.set(question.id, (duplicateIds.get(question.id) ?? 0) + 1);
for (const [id, count] of duplicateIds) if (count > 1) errors.push(`Duplicate question id: ${id} (${count} copies)`);

// Duplicate detection runs over normalized stems. An exact repeat always fails;
// a very close repeat fails too, because a reworded twin adds no coverage.
const stems = questions.map((question) => ({ id: question.id, tokens: normalize(question.text), text: question.text }));
const exactSeen = new Map();
for (const stem of stems) {
  const key = [...stem.tokens].sort().join(" ");
  if (exactSeen.has(key)) errors.push(`Duplicate question text: ${stem.id} repeats ${exactSeen.get(key)}`);
  else exactSeen.set(key, stem.id);
}
for (let i = 0; i < stems.length; i += 1) {
  for (let j = i + 1; j < stems.length; j += 1) {
    const score = jaccard(stems[i].tokens, stems[j].tokens);
    if (score >= 0.9) errors.push(`Near-duplicate questions (${score.toFixed(2)}): ${stems[i].id} / ${stems[j].id}`);
    else if (score >= 0.75) warnings.push(`Possible overlap (${score.toFixed(2)}): ${stems[i].id} / ${stems[j].id}`);
  }
}

const enriched = questions.filter(
  (question) =>
    typeof question.objective === "string" &&
    question.objective.trim() &&
    typeof question.topic === "string" &&
    question.topic.trim() &&
    ["easy", "medium", "hard"].includes(question.difficulty) &&
    Array.isArray(question.sourceRefs) &&
    question.sourceRefs.some((reference) => isPageSpecificLearnUrl(reference)) &&
    Array.isArray(question.whyOthers),
);
const pending = questions.filter((question) => !enriched.includes(question));

// Anything added beyond the original bank must be fully sourced and reasoned:
// a question that cannot prove its answer never enters the learning flow.
const baselineMax = 300;
const questionNumber = (id) => Number(String(id).split("-").pop());
for (const question of pending) {
  const number = questionNumber(question.id);
  if (Number.isFinite(number) && number > baselineMax) errors.push(`New question is not fully sourced/reasoned: ${question.id}`);
}

if (requireComplete && pending.length) {
  errors.push(`${pending.length} question(s) still need objective/topic/difficulty/sourceRefs/whyOthers before this checkpoint can close`);
}

const report = {
  total: questions.length,
  enriched: enriched.length,
  pending: pending.length,
  byDomain: Object.fromEntries([...OFFICIAL_DOMAINS, CAPSTONE_DOMAIN].map((domain) => [domain, byDomain.get(domain) ?? 0])),
  pendingIds: pending.map((question) => question.id),
  errors,
  warnings,
};
console.log(
  JSON.stringify(
    {
      status: errors.length ? "invalid" : warnings.length ? "pass-with-warnings" : "pass",
      total: report.total,
      enriched: report.enriched,
      pending: report.pending,
      byDomain: report.byDomain,
      errors: report.errors.length,
      warnings: report.warnings.length,
    },
    null,
    2,
  ),
);
if (errors.length) console.log(JSON.stringify({ errors }, null, 2));
if (warnings.length) console.log(JSON.stringify({ warnings }, null, 2));
if (errors.length) process.exitCode = 1;
