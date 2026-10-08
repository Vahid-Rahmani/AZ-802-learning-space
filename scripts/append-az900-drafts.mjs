/**
 * Appends reviewed AZ-900 drafts to the per-domain authoring files.
 *
 * Why this exists: the bank is authored as drafts grouped by objective, and the
 * builder preserves `az900-q-001`..`az900-q-180` for stored learner data by
 * consuming each objective's array in order. New drafts must therefore be added
 * at the *end* of an objective's array, never in the middle, or a stored attempt
 * would silently start pointing at a different question.
 *
 * The rewrite is line-based and append-only: existing lines are never
 * reformatted or reordered, so a review diff shows exactly the added questions.
 *
 * Usage: node scripts/append-az900-drafts.mjs <batch.json> [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const batchArg = process.argv[2];
if (!batchArg) {
  console.error("Usage: node scripts/append-az900-drafts.mjs <batch.json> [--dry-run]");
  process.exit(2);
}
const dryRun = process.argv.includes("--dry-run");

const DOMAIN_FILES = [
  "lib/content/az900-questions-cloud.ts",
  "lib/content/az900-questions-architecture.ts",
  "lib/content/az900-questions-management.ts",
];
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);

const batch = JSON.parse(fs.readFileSync(path.resolve(root, batchArg), "utf8"));
if (!Array.isArray(batch) || batch.length === 0) {
  console.error("Batch file must be a non-empty array of { objectiveId, draft } entries.");
  process.exit(2);
}

const sources = new Map(DOMAIN_FILES.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
const problems = [];
const keyCounts = new Map();

/** Reads the stem out of a generated `question: "..."` line without regex escapes. */
function stemFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("question: ")) return null;
  const literal = trimmed.slice("question: ".length).replace(/,$/, "");
  try {
    return JSON.parse(literal);
  } catch {
    return null;
  }
}

// Every stem already in the bank, so a new question can never duplicate one.
const existingStems = new Set();
for (const text of sources.values()) {
  for (const line of text.split(LF)) {
    const stem = stemFromLine(line);
    if (stem) existingStems.add(stem.trim().toLowerCase());
  }
}

/** Finds the closing `  ],` of one objective array in a file's line list. */
function findArrayEnd(lines, objectiveKey) {
  const quoted = '"' + objectiveKey + '": [';
  const bare = objectiveKey + ': [';
  const keyLine = lines.findIndex((line) => { const trimmed = line.trim(); return trimmed === quoted || trimmed === bare; });
  if (keyLine < 0) return -1;
  for (let index = keyLine + 1; index < lines.length; index += 1) {
    if (lines[index] === "  ],") return index;
    if (lines[index].startsWith('  "') || lines[index] === "};") return -1;
  }
  return -1;
}

const prepared = new Map(DOMAIN_FILES.map((file) => [file, []]));
const seenStems = new Set();

for (const entry of batch) {
  const { objectiveId, draft } = entry;
  if (!objectiveId || !draft) { problems.push("entry without objectiveId or draft"); continue; }
  const matches = DOMAIN_FILES.filter((file) => { const body = sources.get(file); return body.includes('  "' + objectiveId + '": [') || body.includes('  ' + objectiveId + ': ['); });
  if (matches.length !== 1) { problems.push(objectiveId + ": expected exactly one authoring file, found " + matches.length); continue; }
  const file = matches[0];
  keyCounts.set(objectiveId, (keyCounts.get(objectiveId) ?? 0) + 1);

  const stem = String(draft.question ?? "").trim();
  if (!stem) problems.push(objectiveId + ": missing question stem");
  if (existingStems.has(stem.toLowerCase()) || seenStems.has(stem.toLowerCase())) problems.push(objectiveId + ": stem already exists: " + stem.slice(0, 70));
  seenStems.add(stem.toLowerCase());
  if (!draft.correct?.trim()) problems.push(objectiveId + ": missing correct answer");
  if (!Array.isArray(draft.wrong) || draft.wrong.length !== 3 || draft.wrong.some((option) => !option?.trim())) problems.push(objectiveId + ": needs three non-empty wrong options");
  if (!Array.isArray(draft.keyPoints) || draft.keyPoints.length < 3 || draft.keyPoints.some((point) => !point?.trim())) problems.push(objectiveId + ": needs at least three keyPoints");
  if (!Array.isArray(draft.whyOthers) || draft.whyOthers.length !== 3 || draft.whyOthers.some((reason) => !reason?.trim())) problems.push(objectiveId + ": needs three distractor reasons");
  if (!draft.rationale?.trim() || draft.rationale.trim().length < 120) problems.push(objectiveId + ": rationale is too short to explain the answer");
  if (!["easy", "medium", "hard"].includes(draft.difficulty)) problems.push(objectiveId + ": difficulty must be easy, medium, or hard");
  if (!draft.topic?.trim()) problems.push(objectiveId + ": missing topic");

  prepared.get(file).push({ objectiveId, draft });
}

if (problems.length) {
  console.error(JSON.stringify({ status: "rejected", problems }, null, 2));
  process.exit(1);
}

function quote(value) {
  return JSON.stringify(value);
}

function serialize(draft, indent) {
  const pad = " ".repeat(indent);
  const inner = " ".repeat(indent + 2);
  const lines = [pad + "{"];
  lines.push(inner + "question: " + quote(draft.question) + ",");
  lines.push(inner + "correct: " + quote(draft.correct) + ",");
  lines.push(inner + "wrong: [");
  for (const option of draft.wrong) lines.push(inner + "  " + quote(option) + ",");
  lines.push(inner + "],");
  lines.push(inner + "rationale: " + quote(draft.rationale) + ",");
  lines.push(inner + "keyPoints: [");
  for (const point of draft.keyPoints) lines.push(inner + "  " + quote(point) + ",");
  lines.push(inner + "],");
  lines.push(inner + "whyOthers: [");
  for (const reason of draft.whyOthers) lines.push(inner + "  " + quote(reason) + ",");
  lines.push(inner + "],");
  lines.push(inner + "difficulty: " + quote(draft.difficulty) + ",");
  lines.push(inner + "topic: " + quote(draft.topic) + ",");
  lines.push(pad + "},");
  return lines;
}

let added = 0;
for (const file of DOMAIN_FILES) {
  const entries = prepared.get(file);
  if (!entries.length) continue;
  const original = sources.get(file);
  const eol = original.includes(CR + LF) ? CR + LF : LF;
  const lines = original.split(eol);
  const byObjective = new Map();
  for (const entry of entries) {
    const list = byObjective.get(entry.objectiveId) ?? [];
    list.push(entry.draft);
    byObjective.set(entry.objectiveId, list);
  }
  // Insert from the bottom of the file upward so earlier indexes stay valid.
  const insertions = [];
  for (const [objectiveId, drafts] of byObjective) {
    const index = findArrayEnd(lines, objectiveId);
    if (index < 0) { problems.push(objectiveId + ": could not locate the array end in " + file); continue; }
    insertions.push({ index, drafts });
  }
  if (problems.length) continue;
  for (const insertion of [...insertions].sort((a, b) => b.index - a.index)) {
    const block = insertion.drafts.flatMap((draft) => serialize(draft, 4));
    lines.splice(insertion.index, 0, ...block);
    added += insertion.drafts.length;
  }
  const output = lines.join(eol).replace(/\s+$/, "") + eol;
  if (!dryRun) fs.writeFileSync(path.join(root, file), output, "utf8");
}

if (problems.length) {
  console.error(JSON.stringify({ status: "rejected", problems }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: dryRun ? "dry-run" : "applied", added, objectives: keyCounts.size }, null, 2));
