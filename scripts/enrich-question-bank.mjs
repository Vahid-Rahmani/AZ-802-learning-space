import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Applies reviewed enrichment patches to lib/content/questions.ts.
 *
 * The bank is one JSON object per line. This tool rewrites only the patched
 * lines and preserves every other byte, so IDs, option order, correct answers,
 * and stored translations cannot drift by accident.
 *
 * Guarded on purpose: answer-bearing and translation-bearing fields require the
 * explicit `--allow-answer-fixes` flag, so a routine enrichment pass can never
 * silently change what a question means.
 */
const root = process.cwd();
const args = process.argv.slice(2);
const patchArg = args.find((value) => !value.startsWith("--"));
const allowAnswerFixes = args.includes("--allow-answer-fixes");
const dryRun = args.includes("--dry-run");

if (!patchArg) {
  console.error("Usage: node scripts/enrich-question-bank.mjs <patch.json> [--allow-answer-fixes] [--dry-run]");
  process.exit(2);
}

const ENRICHMENT_FIELDS = new Set([
  "objective",
  "objectiveId",
  "topic",
  "difficulty",
  "sourceRefs",
  "keyPoints",
  "whyOthers",
  "requirements",
  "commandPath",
  "translations",
  "source",
  "reviewStatus",
  "audit",
]);
const PROTECTED_FIELDS = new Set(["id", "domain", "text", "options", "correct", "rationale", "skillId", "isOriginal", "textFa", "optionsFa"]);

const patchPath = path.resolve(root, patchArg);
const patches = JSON.parse(fs.readFileSync(patchPath, "utf8"));
if (!patches || typeof patches !== "object" || Array.isArray(patches)) {
  console.error("Patch file must be an object keyed by question ID.");
  process.exit(2);
}

const sourcePath = path.join(root, "lib", "content", "questions.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const problems = [];
const touchedIds = [];
const seenPatchIds = new Set();

for (const [id, patch] of Object.entries(patches)) {
  if (!/^az802-q-\d{3,}$/.test(id)) problems.push(`${id}: patch key is not a valid question ID`);
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) problems.push(`${id}: patch must be an object`);
  for (const key of Object.keys(patch ?? {})) {
    if (PROTECTED_FIELDS.has(key) && !allowAnswerFixes) problems.push(`${id}: "${key}" is protected; rerun with --allow-answer-fixes only for a reviewed answer fix`);
    else if (!ENRICHMENT_FIELDS.has(key) && !PROTECTED_FIELDS.has(key)) problems.push(`${id}: unknown field "${key}"`);
  }
}

const rewritten = lines.map((line) => {
  if (!line.trimStart().startsWith("{")) return line;
  let question;
  try {
    question = JSON.parse(line.trim().replace(/,$/, ""));
  } catch {
    return line;
  }
  const patch = patches[question.id];
  if (!patch) return line;
  if (seenPatchIds.has(question.id)) problems.push(`${question.id}: patch applied twice`);
  seenPatchIds.add(question.id);
  const merged = { ...question, ...patch };
  touchedIds.push(question.id);
  const comma = line.trimEnd().endsWith(",") ? "," : "";
  return JSON.stringify(merged) + comma;
});

const missing = Object.keys(patches).filter((id) => !seenPatchIds.has(id));
for (const id of missing) problems.push(`${id}: no question with this ID exists in the bank`);

if (problems.length) {
  console.error(JSON.stringify({ status: "rejected", problems }, null, 2));
  process.exit(1);
}

if (dryRun) {
  console.log(JSON.stringify({ status: "dry-run", patches: touchedIds.length, ids: touchedIds }, null, 2));
  process.exit(0);
}

fs.writeFileSync(sourcePath, `${rewritten.join(eol)}${eol}`, "utf8");
console.log(JSON.stringify({ status: "applied", patches: touchedIds.length, ids: touchedIds }, null, 2));
