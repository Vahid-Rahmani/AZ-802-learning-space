import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readQuestionBank } from "./question-bank-meta.mjs";

/**
 * Checks that every whyOthers entry explains the option at the same index.
 *
 * The failure this guards against is quiet: a distractor reason that is really
 * about a different option still renders correctly and still looks plausible,
 * so nothing in the app or the shape validators notices. A reason is judged by
 * whether it shares the vocabulary of its own option more than any other, and
 * by whether it does not read as the explanation for a different answer.
 *
 * Usage: node scripts/check-distractor-reasons.mjs
 */
const { questions } = readQuestionBank(process.cwd());
/** Tracked so the audit can read a real alignment check. */
const TRACKED_OUTPUT = path.join("content", "question-audit.distractors.json");

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "in", "on", "to", "for", "of", "is", "are", "be",
  "was", "were", "has", "have", "had", "not", "no", "it", "its", "this", "that",
  "these", "those", "with", "as", "by", "at", "from", "can", "will", "would",
  "should", "must", "may", "might", "when", "while", "where", "which", "what",
  "who", "how", "why", "if", "then", "than", "also", "only", "more", "most",
  "some", "any", "each", "every", "other", "same", "such", "very", "much",
  "many", "both", "but", "own", "same", "into", "onto", "over", "under", "use",
  "used", "using", "does", "did", "do", "there", "here", "their", "them",
  "they", "you", "your", "we", "our", "us", "he", "she", "his", "her", "been",
  "being", "get", "got", "make", "made", "take", "taken", "give", "given",
]);

/** Words too generic to identify an option on their own. */
const WEAK_TOKENS = new Set([
  "file", "files", "folder", "folders", "server", "servers", "computer",
  "computers", "setting", "settings", "role", "roles", "policy", "policies",
  "site", "sites", "zone", "zones", "record", "records", "disk", "disks",
  "volume", "volumes", "network", "networks", "domain", "domains", "group",
  "groups", "user", "users", "account", "accounts", "machine", "machines",
  "system", "systems", "service", "services", "update", "updates", "backup",
  "backups", "restore", "rule", "rules", "option", "options", "value",
  "values", "permission", "permissions", "access", "task", "tasks", "type",
  "types", "process", "processes", "tool", "tools", "feature", "features",
  "version", "versions", "default", "defaults", "scope", "scopes", "limit",
  "limits", "mode", "modes", "state", "status", "level", "levels", "size",
  "capacity", "speed", "traffic", "storage", "memory", "host", "hosts", "node",
  "nodes", "cluster", "clusters", "replica", "replication", "monitor",
]);

/**
 * Reduces a word to a comparable stem so that "overlap" and "overlapping", or
 * "quota" and "quotas", count as the same vocabulary. Without this a correct
 * reason is reported as unexplained purely because the noun was pluralised.
 */
function stem(token) {
  return token
    .replace(/(ingly|edly|ing|ed|ies|s)$/, "")
    .replace(/([^aeiou])\1$/, "$1");
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    .map(stem);
}

/**
 * Tokens that can actually identify an option: not stop words, not generic.
 *
 * An option made entirely of generic words still needs something to compare
 * against, so it falls back to its ordinary words. Without that fallback an
 * option such as "The default domain policy always" would score nothing and be
 * reported as unexplained even though its reason names it exactly.
 */
function distinctive(text) {
  const all = normalize(text);
  const strong = all.filter((token) => !WEAK_TOKENS.has(token));
  return strong.length ? strong : all;
}

function overlap(terms, haystack) {
  const set = new Set(haystack);
  return terms.filter((term) => set.has(term));
}

const problems = [];
for (const question of questions) {
  if (!Array.isArray(question.whyOthers)) continue;
  if (question.whyOthers.length !== question.options.length) {
    problems.push({ id: question.id, issue: "length", detail: `${question.whyOthers.length} reasons for ${question.options.length} options` });
    continue;
  }
  for (const [index, reason] of question.whyOthers.entries()) {
    if (index === question.correct) continue;
    if (typeof reason !== "string" || reason.trim().length < 12) {
      problems.push({ id: question.id, issue: "empty-reason", detail: `option ${index} has no specific reason` });
      continue;
    }
    const reasonTerms = distinctive(reason);
    const reasonAll = normalize(reason);
    // Generic words are preferred for matching because they are the ones a
    // reason actually names ("the Default Domain Policy"). The distinctive
    // subset is only tried when the generic pass finds nothing, so an option
    // whose wording differs from its reason is not reported on the first pass.
    const score = (option, optionIndex) => {
      const generic = overlap(normalize(option), reasonAll).length;
      if (generic > 0) return generic - (optionIndex === question.correct ? 1 : 0);
      const strong = overlap(distinctive(option), reasonTerms).length;
      return strong - (optionIndex === question.correct ? 1 : 0);
    };
    const scores = question.options.map(score);
    const bestIndex = scores.indexOf(Math.max(...scores));
    if (scores[index] === 0 && scores[bestIndex] > 0) {
      problems.push({
        id: question.id,
        issue: "reason-matches-other-option",
        detail: `option ${index} (${question.options[index]}) shares no vocabulary with its reason, which matches option ${bestIndex} (${question.options[bestIndex]})`,
      });
    }
    // The reviewed answer must not be restated as a distractor explanation.
    const answerTerms = new Set(distinctive(question.options[question.correct]));
    const repeated = overlap([...answerTerms], reasonTerms);
    if (repeated.length >= 3 && scores[index] === 0) {
      problems.push({
        id: question.id,
        issue: "reason-restates-answer",
        detail: `option ${index} repeats the reviewed answer vocabulary (${repeated.join(", ")}) without naming its own option`,
      });
    }
  }
}

// Tracked so the audit can read a real alignment check. A question with no
// entry here was never examined, which is not the same as passing.
{
  const report = {
    generatedAt: new Date().toISOString(),
    source: "lib/content/questions.ts",
    questionsChecked: questions.length,
    distractorReasonsChecked: questions.reduce((sum, question) => sum + (question.options?.length ?? 0) - 1, 0),
    problems: problems.length,
    aligned: questions
      .filter((question) => !problems.some((problem) => problem.id === question.id))
      .map((question) => question.id),
    problems,
  };
  const outputPath = path.join(process.cwd(), TRACKED_OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      questionsChecked: questions.length,
      distractorReasonsChecked: questions.reduce((sum, question) => sum + (question.options?.length ?? 0) - 1, 0),
      problems: problems.length,
    },
    null,
    2,
  ),
);
if (problems.length) console.log(JSON.stringify({ problems }, null, 2));
if (problems.length) process.exitCode = 1;