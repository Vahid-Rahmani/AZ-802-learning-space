import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  DIFFICULTIES,
  DOMAIN_TO_STAGE,
  EXPECTED_QUESTION_COUNT,
  isPageSpecificLearnUrl,
  readQuestionBank,
} from "./question-bank-meta.mjs";

const root = process.cwd();
const { sourcePath, lines, questions } = readQuestionBank(root);

const errors = [];
const warnings = [];
const audit = [];
const seenIds = new Set();

for (const [index, question] of questions.entries()) {
  const number = index + 1;
  const expectedId = `az802-q-${String(number).padStart(3, "0")}`;
  const id = typeof question.id === "string" ? question.id : "";
  if (id !== expectedId) errors.push(`${expectedId}: id is ${id || "missing"}`);
  if (seenIds.has(id)) errors.push(`${id}: duplicate id`);
  seenIds.add(id);
  if (typeof question.text !== "string" || question.text.trim().length < 8) errors.push(`${id}: English question text is missing or too short`);
  if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`${id}: exactly four English options are required`);
  if (Array.isArray(question.options) && new Set(question.options.map((option) => String(option).trim().toLowerCase())).size !== 4) errors.push(`${id}: English options are not unique`);
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3) errors.push(`${id}: correct must be an option index from 0 to 3`);

  // New content is stored in English only and translated at display time by the
  // site's existing Google Translate flow. Items that still carry stored
  // Persian keep the original strict requirement; runtime-translated items are
  // reported instead of failed, because storing Persian would create the
  // manual translation bank the project explicitly avoids.
  const runtimeTranslated = question.translations === "runtime-google";
  if (runtimeTranslated) {
    if (typeof question.textFa === "string" && question.textFa.trim() && !Array.isArray(question.optionsFa)) warnings.push(`${id}: textFa is stored without optionsFa`);
  } else {
    if (typeof question.textFa !== "string" || !question.textFa.trim()) errors.push(`${id}: Persian translation is missing`);
    if (!Array.isArray(question.optionsFa) || question.optionsFa.length !== 4) errors.push(`${id}: exactly four Persian options are required`);
  }
  if (typeof question.textDe !== "string" || !question.textDe.trim()) warnings.push(`${id}: German question translation is pending review`);
  if (!Array.isArray(question.optionsDe) || question.optionsDe.length !== 4) warnings.push(`${id}: exactly four German options are required before publication`);
  if (!question.rationale || typeof question.rationale.en !== "string" || typeof question.rationale.fa !== "string" || typeof question.rationale.de !== "string") errors.push(`${id}: all three rationale translations are required`);
  if (typeof question.rationale?.de === "string" && /Die richtige Antwort ist .*; sie passt zum Bereich .* und zum beschriebenen Szenario/.test(question.rationale.de)) warnings.push(`${id}: German rationale is still a template and needs content review`);
  if (typeof question.source !== "string" || !/^https:\/\//.test(question.source)) errors.push(`${id}: an HTTPS source URL is required`);
  if (typeof question.domain !== "string" || !DOMAIN_TO_STAGE.has(question.domain)) errors.push(`${id}: domain is not connected to a known training stage`);
  if (typeof question.skillId !== "string" || !question.skillId) errors.push(`${id}: skillId is missing`);
  if (question.isOriginal !== true) warnings.push(`${id}: isOriginal is not true`);

  // Enrichment fields are optional while the bank is completed domain by
  // domain, but every value that exists must be usable.
  if (question.objective !== undefined && (typeof question.objective !== "string" || question.objective.trim().length < 8)) errors.push(`${id}: objective must be the verbatim study-guide bullet when present`);
  if (question.objectiveId !== undefined && (typeof question.objectiveId !== "string" || !/^[a-z0-9-]+$/.test(question.objectiveId))) errors.push(`${id}: objectiveId must be a lowercase slug when present`);
  if (question.topic !== undefined && (typeof question.topic !== "string" || question.topic.trim().length < 2)) errors.push(`${id}: topic must be a non-empty label when present`);
  if (question.difficulty !== undefined && !DIFFICULTIES.includes(question.difficulty)) errors.push(`${id}: difficulty must be one of ${DIFFICULTIES.join(", ")}`);
  if (question.requirements !== undefined && (typeof question.requirements !== "string" || question.requirements.trim().length < 8)) errors.push(`${id}: requirements must be a meaningful note when present`);
  if (question.keyPoints !== undefined) {
    if (!Array.isArray(question.keyPoints) || question.keyPoints.some((point) => typeof point !== "string" || point.trim().length < 8)) errors.push(`${id}: keyPoints must be an array of meaningful strings when present`);
  }
  if (question.sourceRefs !== undefined) {
    if (!Array.isArray(question.sourceRefs) || question.sourceRefs.length === 0) errors.push(`${id}: sourceRefs must be a non-empty array when present`);
    else if (question.sourceRefs.some((reference) => !isPageSpecificLearnUrl(reference))) errors.push(`${id}: every sourceRefs entry must be a page-specific Microsoft Learn URL`);
  }
  if (question.commandPath !== undefined) {
    const valid =
      Array.isArray(question.commandPath) &&
      question.commandPath.length > 0 &&
      question.commandPath.every((step) => step && typeof step.label === "string" && step.label.trim() && typeof step.command === "string" && step.command.trim());
    if (!valid) errors.push(`${id}: commandPath must be a non-empty array of {label, command} when present`);
  }
  if (question.whyOthers !== undefined) {
    if (!Array.isArray(question.whyOthers) || question.whyOthers.length !== question.options.length) {
      errors.push(`${id}: whyOthers must be index-aligned with every option`);
    } else {
      question.whyOthers.forEach((reason, optionIndex) => {
        if (optionIndex === question.correct) return;
        if (typeof reason !== "string" || reason.trim().length < 12) errors.push(`${id}: whyOthers[${optionIndex}] needs a specific reason`);
      });
    }
  }

  audit.push({
    id,
    stageId: DOMAIN_TO_STAGE.get(question.domain) ?? null,
    domain: question.domain ?? null,
    sourceRefs: typeof question.source === "string" ? [question.source] : [],
    reviewStatus: "draft",
    isOriginal: question.isOriginal === true,
    checks: {
      sourceVerified: false,
      answerVerified: false,
      originalityVerified: false,
      translationVerified: false,
      distractorsReviewed: false,
    },
    reviewer: null,
    reviewedAt: null,
  });
}

if (questions.length !== EXPECTED_QUESTION_COUNT) errors.push(`Expected ${EXPECTED_QUESTION_COUNT} questions, found ${questions.length}`);
// "invalid" means the bank is broken. "valid-with-warnings" means the shape is
// sound but outstanding review items remain, which is reported rather than
// folded into a single "draft" label that contradicted the per-question state.
const result = {
  generatedAt: new Date().toISOString(),
  expectedQuestionCount: EXPECTED_QUESTION_COUNT,
  actualQuestionCount: questions.length,
  status: errors.length ? "invalid" : "valid-with-warnings",
  reviewStatusCounts: Object.fromEntries(
    [...new Set(questions.map((question) => question.reviewStatus ?? "draft"))].map((status) => [
      status,
      questions.filter((question) => (question.reviewStatus ?? "draft") === status).length,
    ]),
  ),
  errors,
  warnings,
  questions: audit,
};

/**
 * Groups the warning text so a category is reported as a count instead of as
 * several hundred separate lines. A warning that is not grouped still appears
 * verbatim, so nothing is hidden by the categorisation.
 */
function summarizeWarnings(entries) {
  const known = [
    ["german-question-text", "German question translation is pending review"],
    ["german-options", "exactly four German options are required before publication"],
    ["german-rationale-template", "German rationale is still a template and needs content review"],
  ];
  const counts = {};
  const unmatched = [];
  for (const warning of entries) {
    const message = warning.replace(/^az802-q-\d+:\s*/, "");
    const match = known.find(([, prefix]) => message === prefix || message.startsWith(prefix));
    if (match) counts[match[0]] = (counts[match[0]] ?? 0) + 1;
    else unmatched.push(warning);
  }
  return { byCategory: counts, ungrouped: unmatched };
}

const writeIndex = process.argv.indexOf("--write");
if (writeIndex >= 0 && process.argv[writeIndex + 1]) {
  const outputPath = path.resolve(root, process.argv[writeIndex + 1]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify({ ...result, warningSummary: summarizeWarnings(warnings) }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${audit.length} audit records to ${path.relative(root, outputPath)}`);
}

// Kept as an explicit reset for re-reviewing a batch. It is never part of a
// normal run, and it is documented as destructive because it clears a status
// that the review checks earned.
if (process.argv.includes("--reset-to-draft")) {
  const rewritten = lines.map((line) => {
    if (!line.trimStart().startsWith("{")) return line;
    const question = JSON.parse(line.trim().replace(/,$/, ""));
    const comma = line.trimEnd().endsWith(",") ? "," : "";
    question.reviewStatus = "draft";
    question.audit = {
      sourceRefs: Array.isArray(question.sourceRefs) ? question.sourceRefs : typeof question.source === "string" ? [question.source] : [],
      sourceVerified: false,
      answerVerified: false,
      originalityVerified: false,
      translationVerified: false,
      distractorsReviewed: false,
      reviewer: null,
      reviewedAt: null,
    };
    return JSON.stringify(question) + comma;
  });
  fs.writeFileSync(sourcePath, `${rewritten.join("\n")}\n`, "utf8");
  console.log(`Reset ${audit.length} questions to draft. Re-run the review checks before trusting their status.`);
}

const warningSummary = summarizeWarnings(warnings);
console.log(
  JSON.stringify({
    status: result.status,
    questions: result.actualQuestionCount,
    errors: errors.length,
    warnings: warnings.length,
    warningsByCategory: warningSummary.byCategory,
    ungroupedWarnings: warningSummary.ungrouped.length,
  }),
);
if (warningSummary.ungrouped.length) console.log(JSON.stringify({ ungroupedWarnings: warningSummary.ungrouped }, null, 2));
if (errors.length) process.exitCode = 1;
