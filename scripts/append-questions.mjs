import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Appends reviewed new questions to the bank.
 *
 * New questions are authored in English only and marked `runtime-google`, so the
 * existing Google Translate flow renders them alongside the rest of the bank
 * instead of creating a second, manually maintained translation set.
 *
 * The rewrite is line-based, like the rest of the project's tooling: each
 * question is one JSON object on one line, so appending never reformats or
 * reorders the existing 300 lines.
 *
 * Usage: node scripts/append-questions.mjs <batch.json>
 */
const root = process.cwd();
const batchArg = process.argv[2];
if (!batchArg) {
  console.error("Usage: node scripts/append-questions.mjs <batch.json>");
  process.exit(2);
}
const dryRun = process.argv.includes("--dry-run");

const STUDY_GUIDE_URL =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802";
const OFFICIAL_DOMAINS = new Set([
  "Deploy and manage AD DS",
  "Manage Windows Server instances and workloads in a hybrid environment",
  "Manage virtual machines",
  "Implement and manage on-premises and hybrid networking",
  "Manage storage and file services",
  "Secure Windows Server infrastructure",
  "Monitor and troubleshoot Windows Server environments",
  "Backup, recovery, high availability, and migration crossover",
]);

const sourcePath = path.join(root, "lib", "content", "questions.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);
const existing = lines
  .filter((line) => line.trimStart().startsWith("{"))
  .map((line) => JSON.parse(line.trim().replace(/,$/, "")));

const batch = JSON.parse(fs.readFileSync(path.resolve(root, batchArg), "utf8"));
if (!Array.isArray(batch) || batch.length === 0) {
  console.error("Batch file must be a non-empty array of new questions.");
  process.exit(2);
}

const existingIds = new Set(existing.map((question) => question.id));
const existingTexts = new Set(existing.map((question) => question.text.trim().toLowerCase()));
const problems = [];
const prepared = [];

for (const item of batch) {
  if (!OFFICIAL_DOMAINS.has(item.domain)) problems.push(`${item.newId}: domain is not an official domain or the capstone`);
  if (existingIds.has(item.newId)) problems.push(`${item.newId}: id already exists in the bank`);
  const number = Number(item.newId.split("-").pop());
  if (number !== existing.length + prepared.length + 1) {
    problems.push(`${item.newId}: ids must continue the sequence, expected az802-q-${String(existing.length + prepared.length + 1).padStart(3, "0")}`);
  }
  if (existingTexts.has(item.text.trim().toLowerCase())) problems.push(`${item.newId}: stem already exists in the bank`);
  if (!Array.isArray(item.options) || item.options.length !== 4) problems.push(`${item.newId}: needs exactly four options`);
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) problems.push(`${item.newId}: correct must be an option index`);
  if (!Array.isArray(item.sourceRefs) || item.sourceRefs.length === 0) problems.push(`${item.newId}: needs sourceRefs`);

  prepared.push({
    id: item.newId,
    domain: item.domain,
    text: item.text,
    options: item.options,
    correct: item.correct,
    source: STUDY_GUIDE_URL,
    rationale: {
      // Persian and German are supplied at display time by the existing Google
      // Translate flow. Storing a machine translation here would create a second
      // translation source that the project deliberately does not maintain.
      fa: item.rationaleEn,
      en: item.rationaleEn,
      de: item.rationaleEn,
    },
    skillId: item.skillId,
    reviewStatus: "draft",
    isOriginal: true,
    audit: {
      sourceRefs: item.sourceRefs,
      sourceVerified: false,
      answerVerified: false,
      originalityVerified: false,
      translationVerified: false,
      distractorsReviewed: false,
      reviewer: null,
      reviewedAt: null,
    },
    objective: item.objective,
    objectiveId: item.objectiveId,
    topic: item.topic,
    difficulty: item.difficulty,
    sourceRefs: item.sourceRefs,
    keyPoints: item.keyPoints,
    whyOthers: item.whyOthers,
    requirements: item.requirements,
    ...(item.commandPath ? { commandPath: item.commandPath } : {}),
    translations: "runtime-google",
  });
}

if (problems.length) {
  console.error(JSON.stringify({ status: "rejected", problems }, null, 2));
  process.exit(1);
}

const endIndex = lines.findIndex((line) => line.trim() === "];");
if (endIndex < 0) {
  console.error("Could not find the end of the questionBank array.");
  process.exit(2);
}
// The final existing entry carries a trailing comma already; new lines need one
// on every line except the last, and the closing bracket must follow.
const insertion = prepared.map((question) => `${JSON.stringify(question)},`);
const rewritten = [...lines.slice(0, endIndex), ...insertion, ...lines.slice(endIndex)];
const output = rewritten.join(eol).replace(/\s+$/, "") + eol;

if (dryRun) {
  console.log(JSON.stringify({ status: "dry-run", existing: existing.length, adding: prepared.length, total: existing.length + prepared.length }, null, 2));
  process.exit(0);
}

fs.writeFileSync(sourcePath, output, "utf8");
console.log(
  JSON.stringify(
    { status: "applied", existing: existing.length, added: prepared.length, total: existing.length + prepared.length },
    null,
    2,
  ),
);