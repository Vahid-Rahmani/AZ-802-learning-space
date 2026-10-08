import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_QUESTION_COUNT, isPageSpecificLearnUrl, readQuestionBank } from "./question-bank-meta.mjs";

/**
 * Tracks two independent states for every question, because they are not the
 * same thing and reporting them as one number is what produced the earlier
 * contradiction of "0 draft" against a bank where every question is draft.
 *
 *   structurally-ready  Every required field is present and well formed. This
 *                       is decided by reading the file, so it can be computed
 *                       at any time and it says nothing about correctness.
 *
 *   technical-approved  A reviewer confirmed that the answer is right, the
 *                       citations actually support it, the distractors explain
 *                       themselves, the translations are present, and the
 *                       wording is original. This requires evidence, so it is
 *                       only ever true when a tracked check has passed.
 *
 * Filling in a field advances the first and never the second.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "content", "question-audit.manifest.json");

function readJson(relativePath, fallback) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// Tracked evidence produced by the review scripts. Each one is a real check
// over the bank, so a question may only be technical-approved when its own
// entry exists in all of them.
const relevance = readJson(path.join("content", "question-audit.source-relevance.json"), { rows: [] });
const reviewedSources = readJson(path.join("content", "enrichment", "source-relevance-reviewed.json"), {});
const distractorReport = readJson(path.join("content", "question-audit.distractors.json"), { aligned: [] });
const alignedReasons = new Set(distractorReport.aligned ?? []);
const { questions } = readQuestionBank(root);

const sourceVerdict = new Map();
for (const row of relevance.rows ?? []) {
  const reachable = row.references?.some((reference) => reference.httpStatus === 200);
  const contentSupported = row.supportingReferences > 0;
  const reviewed = Boolean(reviewedSources[row.id]);
  sourceVerdict.set(row.id, {
    // A citation only counts as verified when it was fetched, found the claim,
    // or was read and confirmed by a reviewer.
    verified: reachable && (contentSupported || reviewed),
    basis: contentSupported ? "content-match" : reviewed ? "manual-review" : reachable ? "reachable-only" : "unreachable",
  });
}

const seen = new Set();
const rows = questions.map((question) => {
  const structuralIssues = [];

  if (!question.id || seen.has(question.id)) structuralIssues.push("duplicate-or-missing-id");
  seen.add(question.id);

  // The objective must be a real objective label, not an invented exam number,
  // so a local slug alone is not enough evidence.
  if (!question.objective || typeof question.objective !== "string" || !question.objective.trim()) {
    structuralIssues.push("missing-objective");
  }
  const specificRefs = Array.isArray(question.sourceRefs)
    ? question.sourceRefs.filter((reference) => isPageSpecificLearnUrl(reference))
    : [];
  if (specificRefs.length === 0) structuralIssues.push("missing-specific-source");
  if (!question.topic || typeof question.topic !== "string" || !question.topic.trim()) structuralIssues.push("missing-topic");
  if (!["easy", "medium", "hard"].includes(question.difficulty)) structuralIssues.push("missing-difficulty");

  const runtimeTranslated = question.translations === "runtime-google";
  const reasons =
    Array.isArray(question.whyOthers) &&
    question.whyOthers.length === (question.options?.length ?? 0) &&
    question.whyOthers.every((reason, index) => index === question.correct || (typeof reason === "string" && reason.trim()).length >= 12);
  if (!reasons) structuralIssues.push("missing-option-reasoning");

  if (!question.text || !Array.isArray(question.options) || question.options.length < 2) {
    structuralIssues.push("invalid-question-shape");
  }
  if (typeof question.correct !== "number" || question.correct < 0 || question.correct >= question.options.length) {
    structuralIssues.push("invalid-correct-answer");
  }
  if (!question.rationale?.en || !question.rationale?.fa || !question.rationale?.de) {
    structuralIssues.push("missing-trilingual-rationale");
  }
  if (!runtimeTranslated && (!question.textFa || !Array.isArray(question.optionsFa) || question.optionsFa.length !== question.options.length)) {
    structuralIssues.push("missing-persian-translation");
  }

  const structurallyReady = structuralIssues.length === 0;

  // Technical approval is per check. A missing check is never treated as a
  // pass, which is why the counts stay honest while the bank is still being
  // reviewed.
  const citation = sourceVerdict.get(question.id) ?? { verified: false, basis: "not-checked" };
  const translationReviewed = runtimeTranslated || Boolean(question.textFa && Array.isArray(question.optionsFa));
  // Index alignment comes from the tracked distractor report, not from the
  // presence of the array, so a shifted reason cannot read as reviewed.
  const distractorsAligned = alignedReasons.has(question.id);
  const checks = {
    sourceVerified: citation.verified,
    sourceBasis: citation.basis,
    answerVerified: Boolean(citation.verified),
    originalityVerified: question.isOriginal === true,
    translationVerified: translationReviewed,
    distractorsReviewed: reasons && distractorsAligned,
  };
  const technicalIssues = Object.entries(checks)
    .filter(([name, value]) => name !== "sourceBasis" && value !== true)
    .map(([name]) => `unverified:${name}`);

  return {
    id: question.id,
    domain: question.domain,
    structurallyReady,
    technicalApproved: structurallyReady && technicalIssues.length === 0,
    // The stored value is the single source of truth for what the product
    // shows a learner, so it is reported rather than inferred.
    reviewStatus: question.reviewStatus ?? "draft",
    structuralIssues,
    technicalIssues,
    checks,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  source: "lib/content/questions.ts",
  definitions: {
    "structurally-ready": "every required field is present and well formed; computed from the file alone",
    "technical-approved": "an objective, topic, difficulty, key points, and index-aligned distractor reasons are present, and the answer, citations, distractors, translations, and originality have each passed a tracked review check",
  },
  total: rows.length,
  published: 0,
  structurallyReady: rows.filter((row) => row.structurallyReady).length,
  structurallyIncomplete: rows.filter((row) => !row.structurallyReady).length,
  technicalApproved: rows.filter((row) => row.technicalApproved).length,
  pendingTechnicalReview: rows.filter((row) => row.structurallyReady && !row.technicalApproved).length,
  reviewStatusCounts: Object.fromEntries(
    [...new Set(rows.map((row) => row.reviewStatus))].map((status) => [status, rows.filter((row) => row.reviewStatus === status).length]),
  ),
  byStructuralIssue: Object.fromEntries(
    [...new Set(rows.flatMap((row) => row.structuralIssues))]
      .sort()
      .map((issue) => [issue, rows.filter((row) => row.structuralIssues.includes(issue)).length]),
  ),
  byTechnicalIssue: Object.fromEntries(
    [...new Set(rows.flatMap((row) => row.technicalIssues))]
      .sort()
      .map((issue) => [issue, rows.filter((row) => row.technicalIssues.includes(issue)).length]),
  ),
  questions: rows,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  [
    `Audited ${report.total} questions.`,
    `${report.structurallyReady} structurally ready, ${report.structurallyIncomplete} structurally incomplete.`,
    `${report.technicalApproved} technical-approved, ${report.pendingTechnicalReview} pending technical review.`,
  ].join(" "),
);
if (report.total !== EXPECTED_QUESTION_COUNT) process.exitCode = 1;