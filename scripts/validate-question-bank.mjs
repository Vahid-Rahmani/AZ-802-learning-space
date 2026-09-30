import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourcePath = path.join(root, "lib/content/questions.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split(/\r?\n/);
const rows = lines.filter((line) => line.trimStart().startsWith("{"));
const questions = rows.map((line, index) => {
  try {
    return JSON.parse(line.trim().replace(/,$/, ""));
  } catch (error) {
    throw new Error(`Line ${index + 1} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const stageByDomain = new Map([
  ["Deploy and manage AD DS", "ad-ds"],
  ["Manage Windows Server instances and workloads in a hybrid environment", "hybrid"],
  ["Manage virtual machines", "virtual-machines"],
  ["Implement and manage on-premises and hybrid networking", "networking"],
  ["Manage storage and file services", "storage"],
  ["Secure Windows Server infrastructure", "security"],
  ["Monitor and troubleshoot Windows Server environments", "monitoring"],
  ["Backup, recovery, high availability, and migration crossover", "recovery"],
]);

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
  if (typeof question.textFa !== "string" || !question.textFa.trim()) errors.push(`${id}: Persian translation is missing`);
  if (!Array.isArray(question.optionsFa) || question.optionsFa.length !== 4) errors.push(`${id}: exactly four Persian options are required`);
  if (typeof question.textDe !== "string" || !question.textDe.trim()) warnings.push(`${id}: German question translation is pending review`);
  if (!Array.isArray(question.optionsDe) || question.optionsDe.length !== 4) warnings.push(`${id}: exactly four German options are required before publication`);
  if (!question.rationale || typeof question.rationale.en !== "string" || typeof question.rationale.fa !== "string" || typeof question.rationale.de !== "string") errors.push(`${id}: all three rationale translations are required`);
  if (typeof question.rationale?.de === "string" && /Die richtige Antwort ist .*; sie passt zum Bereich .* und zum beschriebenen Szenario/.test(question.rationale.de)) warnings.push(`${id}: German rationale is still a template and needs content review`);
  if (typeof question.source !== "string" || !/^https:\/\//.test(question.source)) errors.push(`${id}: an HTTPS source URL is required`);
  if (typeof question.domain !== "string" || !stageByDomain.has(question.domain)) errors.push(`${id}: domain is not connected to a known training stage`);
  if (typeof question.skillId !== "string" || !question.skillId) errors.push(`${id}: skillId is missing`);
  if (question.isOriginal !== true) warnings.push(`${id}: isOriginal is not true`);
  audit.push({
    id,
    stageId: stageByDomain.get(question.domain) ?? null,
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

if (questions.length !== 300) errors.push(`Expected exactly 300 questions, found ${questions.length}`);
const result = {
  generatedAt: new Date().toISOString(),
  expectedQuestionCount: 300,
  actualQuestionCount: questions.length,
  status: errors.length ? "invalid" : "draft",
  errors,
  warnings,
  questions: audit,
};

const writeIndex = process.argv.indexOf("--write");
if (writeIndex >= 0 && process.argv[writeIndex + 1]) {
  const outputPath = path.resolve(root, process.argv[writeIndex + 1]);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`Wrote ${audit.length} draft audit records to ${path.relative(root, outputPath)}`);
}

if (process.argv.includes("--apply-draft")) {
  const rewritten = lines.map((line) => {
    if (!line.trimStart().startsWith("{")) return line;
    const question = JSON.parse(line.trim().replace(/,$/, ""));
    const comma = line.trimEnd().endsWith(",") ? "," : "";
    question.reviewStatus = "draft";
    question.audit = {
      sourceRefs: typeof question.source === "string" ? [question.source] : [],
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
  console.log(`Marked ${audit.length} questions as draft and added audit metadata.`);
}

console.log(JSON.stringify({ status: result.status, questions: result.actualQuestionCount, errors: errors.length, warnings: warnings.length }));
if (errors.length) process.exitCode = 1;
