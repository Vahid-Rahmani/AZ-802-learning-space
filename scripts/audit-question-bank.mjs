import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_QUESTION_COUNT, isPageSpecificLearnUrl } from "./question-bank-meta.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "lib", "content", "questions.ts");
const outputPath = path.join(root, "content", "question-audit.manifest.json");
const source = fs.readFileSync(sourcePath, "utf8");
const start = source.indexOf("const questionBank = [");
const end = source.indexOf("];", start);
if (start < 0 || end < 0) throw new Error("Could not locate questionBank");
const questions = JSON.parse(source.slice(source.indexOf("[", start), end + 1));
const seen = new Set();
const rows = questions.map((question) => {
  const issues = [];
  if (!question.id || seen.has(question.id)) issues.push("duplicate-or-missing-id");
  seen.add(question.id);

  // The objective must be the verbatim study-guide bullet, not an invented
  // exam number, so a local slug alone is not enough evidence.
  if (!question.objective || typeof question.objective !== "string" || !question.objective.trim()) issues.push("missing-objective");
  const specificRefs = Array.isArray(question.sourceRefs) ? question.sourceRefs.filter((reference) => isPageSpecificLearnUrl(reference)) : [];
  if (specificRefs.length === 0) issues.push("missing-specific-source");
  if (!question.topic || typeof question.topic !== "string" || !question.topic.trim()) issues.push("missing-topic");
  if (!["easy", "medium", "hard"].includes(question.difficulty)) issues.push("missing-difficulty");

  const runtimeTranslated = question.translations === "runtime-google";
  const reasons =
    Array.isArray(question.whyOthers) &&
    question.whyOthers.length === (question.options?.length ?? 0) &&
    question.whyOthers.every((reason, index) => index === question.correct || (typeof reason === "string" && reason.trim()).length >= 12);
  if (!reasons) issues.push("missing-option-reasoning");

  if (!question.text || !Array.isArray(question.options) || question.options.length < 2) issues.push("invalid-question-shape");
  if (typeof question.correct !== "number" || question.correct < 0 || question.correct >= question.options.length) issues.push("invalid-correct-answer");
  if (!question.rationale?.en || !question.rationale?.fa || !question.rationale?.de) issues.push("missing-trilingual-rationale");
  if (!runtimeTranslated && (!question.textFa || !Array.isArray(question.optionsFa) || question.optionsFa.length !== question.options.length)) issues.push("missing-persian-translation");
  return { id: question.id, domain: question.domain, status: issues.length ? "draft" : "audited", issues };
});
const report = {
  generatedAt: new Date().toISOString(),
  source: "lib/content/questions.ts",
  total: rows.length,
  published: 0,
  audited: rows.filter((row) => row.status === "audited").length,
  draft: rows.filter((row) => row.status === "draft").length,
  byIssue: Object.fromEntries([...new Set(rows.flatMap((row) => row.issues))].map((issue) => [issue, rows.filter((row) => row.issues.includes(issue)).length])),
  questions: rows,
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Audited ${report.total} questions: ${report.audited} structurally ready, ${report.draft} draft`);
if (report.total !== EXPECTED_QUESTION_COUNT) process.exitCode = 1;
