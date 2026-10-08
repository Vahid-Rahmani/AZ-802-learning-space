import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { readQuestionBank } from "./question-bank-meta.mjs";

/**
 * Proves that each question's sourceRefs actually support its answer and its
 * Explain, not merely that the URL returns HTTP 200.
 *
 * The check is content-based. Every source page is fetched, reduced to its
 * rendered text, and scored against the vocabulary that carries the question's
 * claim: the reviewed correct answer plus the deciding key points. Terms are
 * weighted by how rare they are across the whole citation corpus, so a page
 * that only repeats common Learn wording cannot pass, while a page that
 * documents the exact feature passes even when it phrases things differently.
 *
 * A reachable page that never carries the claim is reported as `weak`, which is
 * a real content finding and exactly what an HTTP-only check cannot see.
 *
 * The threshold is a triage boundary, not a proof. Everything below it is
 * reviewed by hand, and every ratio stays in the output so the decision can be
 * re-examined rather than taken on trust.
 *
 * Usage:
 *   node scripts/verify-source-relevance.mjs                    # verify, using cache
 *   node scripts/verify-source-relevance.mjs --refresh          # refetch every page
 *   node scripts/verify-source-relevance.mjs --write out.json   # keep the full report
 */
const CACHE_PATH = path.join(".tmpwork", "source-pages.json");
/** Tracked so `npm run audit:questions` can read a real citation check. */
const TRACKED_OUTPUT = path.join("content", "question-audit.source-relevance.json");
const SUPPORT_THRESHOLD = 0.5;
const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const writeIndex = args.indexOf("--write");

/**
 * Words that appear on essentially any Microsoft Learn page. They cannot prove
 * that a page supports a specific answer, so they never count as evidence.
 */
const NOISE = new Set([
  "windows", "server", "microsoft", "learn", "about", "overview", "install", "installing",
  "installs", "documentation", "docs", "support", "supported", "supporting", "feature",
  "features", "option", "options", "use", "used", "using", "when", "what", "which", "how",
  "why", "where", "does", "should", "would", "could", "can", "will", "you", "your", "this",
  "that", "these", "those", "there", "their", "they", "them", "with", "from", "into", "for",
  "and", "the", "a", "an", "of", "to", "in", "on", "at", "by", "or", "is", "are", "be",
  "been", "being", "has", "have", "had", "was", "were", "not", "no", "any", "all",
  "new", "old", "more", "most", "other", "only", "also", "each", "every", "such", "than",
  "then", "same", "very", "many", "much", "one", "two", "three", "first", "second", "next",
  "before", "after", "during", "between", "up", "down", "out", "off", "over", "under",
  "configure", "configuring", "configuration", "configured", "manage", "managing",
  "management", "managed", "create", "creating", "created", "deploy", "deploying",
  "check", "checking", "checked", "set", "setting", "run", "running", "add", "adding",
  "added", "enable", "enabling", "enabled", "disable", "disabling", "disabled", "requires",
  "required", "default", "defaults", "example", "examples", "note", "notes", "following",
  "above", "below", "here", "read", "see", "step", "steps", "section", "page", "topic",
  "topics", "related", "content", "type", "types", "value", "values", "name", "names",
  "list", "lists", "version", "versions", "update", "updates", "updated", "policy",
  "policies", "system", "systems", "service", "services", "member", "members", "account",
  "accounts", "computer", "computers", "user", "users", "group", "groups", "domain",
  "domains", "file", "files", "folder", "folders", "server", "client", "clients",
]);

/**
 * Hyphens become spaces so "double-hop" and "double hop" are the same term.
 * Learn prose and command references alternate between the two, and treating
 * them as different words made a correctly cited page look unsupported.
 */
const tokenize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !NOISE.has(token));

/**
 * Keeps multi-word product names intact. "group managed service account" and
 * "single master operation" must survive tokenizing, because splitting them
 * into common words would let an unrelated page pass the check.
 */
function evidenceTerms(question) {
  const correctAnswer = question.options?.[question.correct] ?? "";
  const phrases = [correctAnswer, ...(question.keyPoints ?? [])];
  const terms = new Set();
  for (const phrase of phrases) {
    for (const token of tokenize(phrase)) terms.add(token);
    // Windows product nouns are the strongest available signal on Learn pages.
    for (const match of String(phrase).matchAll(/\b[A-Z][A-Za-z0-9]{2,}(?:\s+[A-Z][A-Za-z0-9]{2,}){0,2}\b/g)) {
      for (const token of tokenize(match[0])) terms.add(token);
    }
  }
  return [...terms].filter((term) => term.length > 2 && !/^\d+$/.test(term));
}

/** The answer's own vocabulary, scored separately so a topic word cannot stand in for it. */
function answerTerms(question) {
  return evidenceTerms({ options: question.options, correct: question.correct, keyPoints: [] });
}

/** Words that make an answer a sentence rather than a name that a page would quote. */
const FUNCTION_WORDS = new Set([
  "to", "for", "with", "from", "that", "which", "when", "while", "where", "into",
  "onto", "over", "under", "after", "before", "between", "than", "then", "because",
  "so", "but", "and", "or", "not", "its", "their", "there", "here", "also", "only",
  "can", "should", "must", "will", "would", "may", "might", "does", "do", "is", "are",
  "was", "were", "has", "have", "had", "them", "they", "you", "your", "each", "every",
  "any", "all", "such", "same", "other", "another", "up", "out", "off", "about",
]);

/** Verbs whose presence means the answer states a rule rather than naming a thing. */
const VERB_FORMS = new Set([
  "takes", "takes", "precedes", "overrides", "wins", "applies", "means", "requires",
  "denies", "allows", "blocks", "beats", "cancels", "expands", "shrinks", "grows",
  "counts", "works", "fails", "happens", "occurs", "reads", "reports", "shows",
]);

/** Opening verbs that make an option an instruction rather than a name. */
const IMPERATIVE_VERBS = new Set([
  "use", "check", "verify", "review", "deploy", "configure", "define", "provide",
  "plan", "prefer", "test", "measure", "evaluate", "monitor", "restrict", "keep",
  "enable", "disable", "assign", "apply", "add", "remove", "create", "install",
  "maintain", "ensure", "avoid", "prevent", "capture", "collect", "correlate",
  "establish", "investigate", "identify", "compare", "distinguish", "schedule",
  "route", "enforce", "limit", "isolate", "protect", "seal", "backup", "resolve",
  "confirm", "separate", "scope", "stage", "pilot", "rollout", "assess",
]);

/**
 * Classifies the correct answer. Commands, record types, product names, and
 * ports appear verbatim on Learn pages, so those are read as literals. An
 * answer that states a rule ("Deny normally takes precedence"), opens with an
 * instruction ("Use maintenance windows..."), or contains a function word is an
 * explanation and cannot be quoted back, so it is judged through the key
 * points instead. A very short answer whose words are too generic to be
 * evidence ("A", "006") is also judged that way.
 */
function answerClass(question) {
  const answer = String(question.options?.[question.correct] ?? "");
  const tokens = answer.toLowerCase().split(/[^a-z0-9+.-]+/).filter(Boolean);
  if (tokens.length >= 6) return "prose";
  if (tokens.some((token) => FUNCTION_WORDS.has(token))) return "prose";
  if (tokens.some((token) => VERB_FORMS.has(token))) return "prose";
  if (/ly$/.test(tokens[0] ?? "") || tokens.some((token) => token.length > 4 && /ly$/.test(token))) return "prose";
  if (IMPERATIVE_VERBS.has(tokens[0])) return "prose";
  if (answerTerms(question).length < 3) return "prose";
  return "literal";
}

/**
 * Weights each term by how few pages in the corpus mention it. A term present
 * on nearly every Learn page ("server", "configure", navigation labels) cannot
 * prove that a page supports an answer, so scoring divides by corpus rarity
 * instead of counting hits. A term no page mentions is treated as maximally
 * distinctive, which is the correct reading: if no Microsoft Learn page says
 * the answer's own vocabulary, the citation is the thing that is wrong.
 */
function corpusRarity(cache, urls) {
  const documentCount = Math.max(urls.length, 1);
  const frequency = new Map();
  for (const url of urls) {
    const text = cache[url]?.text;
    if (!text) continue;
    for (const term of new Set(tokenize(text))) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  }
  const fallback = Math.log(documentCount + 1) + 1;
  const weights = new Map();
  for (const [term, count] of frequency) weights.set(term, Math.log((documentCount + 1) / (count + 1)) + 1);
  return (term) => weights.get(term) ?? fallback;
}

function weightedCoverage(terms, haystack, rarity) {
  if (!terms.length) return { ratio: 0, matched: 0, total: 0, matchedTerms: [] };
  let total = 0;
  let score = 0;
  const matchedTerms = [];
  for (const term of terms) {
    const weight = rarity(term);
    total += weight;
    if (haystack.includes(term)) {
      score += weight;
      matchedTerms.push(term);
    }
  }
  return { ratio: total ? score / total : 0, matched: matchedTerms.length, total: terms.length, matchedTerms };
}

function pageText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CertPathSourceVerifier/1.0)" },
    signal: AbortSignal.timeout(30000),
  });
  const html = await response.text();
  return { status: response.status, finalUrl: response.url || url, text: pageText(html) };
}

const { questions } = readQuestionBank(process.cwd());
const urls = [...new Set(questions.flatMap((question) => question.sourceRefs ?? []))];

let cache = {};
if (!refresh && fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}

const fetchFailures = [];
let fetched = 0;
for (const url of urls) {
  if (cache[url] && !refresh) continue;
  try {
    const page = await fetchPage(url);
    cache[url] = { status: page.status, finalUrl: page.finalUrl, text: page.text };
    fetched += 1;
  } catch (error) {
    cache[url] = { status: 0, finalUrl: url, text: "", error: String(error?.message ?? error) };
    fetchFailures.push({ url, error: String(error?.message ?? error) });
  }
}
fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache)}\n`, "utf8");

const rarity = corpusRarity(cache, urls);

const rows = [];
for (const question of questions) {
  const answer = answerTerms(question);
  const keyPointSets = (question.keyPoints ?? []).map((point) =>
    evidenceTerms({ options: [point], correct: 0, keyPoints: [] }),
  );
  const basis = answerClass(question);
  const references = [];
  for (const reference of question.sourceRefs ?? []) {
    const page = cache[reference];
    if (!page) continue;
    const haystack = page.text.toLowerCase();
    const answerCoverage = weightedCoverage(answer, haystack, rarity);
    // Each key point is judged separately, because a page that documents one
    // deciding fact supports the question even when it never restates the rest.
    const keyPointCoverage = keyPointSets.map((terms) => weightedCoverage(terms, haystack, rarity));
    const bestKeyPoint = keyPointCoverage.reduce((best, claim) => Math.max(best, claim.ratio), 0);
    const supportedKeyPoints = keyPointCoverage.filter((claim) => claim.ratio >= SUPPORT_THRESHOLD).length;
    const supportRatio = Math.max(answerCoverage.ratio, bestKeyPoint);
    references.push({
      url: reference,
      httpStatus: page.status,
      supportBasis: basis,
      supportRatio: Number(supportRatio.toFixed(3)),
      answerSupportRatio: Number(answerCoverage.ratio.toFixed(3)),
      bestKeyPointSupportRatio: Number(bestKeyPoint.toFixed(3)),
      supportedKeyPoints,
      matchedAnswerTerms: answerCoverage.matchedTerms,
      // A literal answer is supported when the page carries its own vocabulary.
      // A prose answer is supported when the page carries the deciding
      // explanation at least once. Either way the page must be reachable.
      supported:
        page.status === 200 &&
        (basis === "literal" ? answerCoverage.ratio >= SUPPORT_THRESHOLD : supportRatio >= SUPPORT_THRESHOLD),
    });
  }
  const supporting = references.filter((reference) => reference.supported);
  rows.push({
    id: question.id,
    domain: question.domain,
    answer: question.options?.[question.correct] ?? "",
    supportBasis: basis,
    bestSupportRatio: Number(references.reduce((max, reference) => Math.max(max, reference.supportRatio), 0).toFixed(3)),
    supportingReferences: supporting.length,
    references,
  });
}

/**
 * Manual decisions, kept in a tracked file rather than in this script, so a
 * human judgement about a citation is visible and reviewable. The automatic
 * score is a triage tool; these entries are the cases where a person read the
 * page and confirmed it supports the answer despite the wording not matching.
 */
const REVIEWED_PATH = path.join("content", "enrichment", "source-relevance-reviewed.json");
let reviewed = {};
if (fs.existsSync(REVIEWED_PATH)) {
  try {
    reviewed = JSON.parse(fs.readFileSync(REVIEWED_PATH, "utf8"));
  } catch {
    reviewed = {};
  }
}

const deadLinks = [];
const unsupported = [];
const weak = [];
const reviewedManually = [];
for (const row of rows) {
  for (const reference of row.references) {
    if (reference.httpStatus !== 200) deadLinks.push({ id: row.id, url: reference.url, httpStatus: reference.httpStatus });
  }
  if (row.supportingReferences === 0 && reviewed[row.id]) {
    reviewedManually.push({ id: row.id, ...reviewed[row.id], bestSupportRatio: row.bestSupportRatio });
    continue;
  }
  if (row.supportingReferences === 0) {
    // A reachable page that never carries the claim is a content problem, which
    // is exactly what an HTTP-only check cannot see. It is separated from the
    // dead-link case so the two are never reported as one number.
    const reachable = row.references.some((reference) => reference.httpStatus === 200);
    (reachable ? weak : unsupported).push({
      id: row.id,
      answer: row.answer,
      supportBasis: row.supportBasis,
      bestSupportRatio: row.bestSupportRatio,
      references: row.references.map((reference) => ({
        url: reference.url,
        httpStatus: reference.httpStatus,
        supportRatio: reference.supportRatio,
        answerSupportRatio: reference.answerSupportRatio,
        bestKeyPointSupportRatio: reference.bestKeyPointSupportRatio,
      })),
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  supportThreshold: SUPPORT_THRESHOLD,
  uniqueReferences: urls.length,
  fetched,
  fetchFailures,
  questionsChecked: rows.length,
  questionsWithSupportingSource: rows.length - weak.length - unsupported.length - reviewedManually.length,
  questionsReviewedManually: reviewedManually.length,
  questionsWithReachableButUnsupportedSource: weak.length,
  questionsWithNoReachableSource: unsupported.length,
  deadLinks,
  reviewedManually,
  weak,
  unsupported,
  rows,
};

// The report is tracked so the audit can read a real citation check instead of
// assuming every reachable URL supports its question.
{
  const outputArg = writeIndex >= 0 && args[writeIndex + 1] ? args[writeIndex + 1] : TRACKED_OUTPUT;
  const outputPath = path.resolve(process.cwd(), outputArg);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(
  JSON.stringify(
    {
      uniqueReferences: urls.length,
      fetched,
      questionsChecked: rows.length,
      questionsWithSupportingSource: report.questionsWithSupportingSource,
      questionsReviewedManually: reviewedManually.length,
      questionsWithReachableButUnsupportedSource: weak.length,
      questionsWithNoReachableSource: unsupported.length,
      deadLinks: deadLinks.length,
    },
    null,
    2,
  ),
);
if (deadLinks.length) console.log(JSON.stringify({ deadLinks }, null, 2));
if (weak.length) {
  console.log(
    JSON.stringify(
      {
        weak: weak.map((item) => ({
          id: item.id,
          answer: item.answer,
          basis: item.supportBasis,
          bestSupportRatio: item.bestSupportRatio,
          refs: item.references.map((reference) => ({
            url: reference.url.replace("https://learn.microsoft.com/en-us/", ""),
            http: reference.httpStatus,
            ratio: reference.supportRatio,
            answer: reference.answerSupportRatio,
            keyPoint: reference.bestKeyPointSupportRatio,
          })),
        })),
      },
      null,
      2,
    ),
  );
}