import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * Promotes each question's stored reviewStatus to match what the tracked
 * checks actually proved, so the value in the bank and the value in the audit
 * manifest can never disagree.
 *
 *   draft               any required technical check is missing or failing
 *   technical-approved  every check passed against real evidence
 *
 * Nothing is promoted on the strength of a field being present. The status is
 * derived from content/question-audit.manifest.json, which is itself derived
 * from the citation and distractor reports.
 */
const root = process.cwd();
const manifestPath = path.join(root, "content", "question-audit.manifest.json");
const dryRun = process.argv.includes("--dry-run");

if (!fs.existsSync(manifestPath)) {
  console.error("Run npm run audit:questions first; the manifest is the evidence source.");
  process.exit(2);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const verdict = new Map(manifest.questions.map((row) => [row.id, row]));
const approved = new Set(manifest.questions.filter((row) => row.technicalApproved).map((row) => row.id));

const sourcePath = path.join(root, "lib", "content", "questions.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const changes = [];
const rewritten = lines.map((line) => {
  if (!line.trimStart().startsWith("{")) return line;
  let question;
  try {
    question = JSON.parse(line.trim().replace(/,$/, ""));
  } catch {
    return line;
  }
  const row = verdict.get(question.id);
  const target = approved.has(question.id) ? "technical-approved" : "draft";
  const before = question.reviewStatus ?? "draft";
  // The per-question audit block is written in the bank too, so it is synced
  // from the same verdict instead of being left saying every check is false.
  const audit = question.audit ?? {};
  const approvedNow = approved.has(question.id);
  // The review timestamp records when this question last changed state, not
  // when the report happened to be regenerated, so a passing re-check leaves
  // the file untouched.
  const checksUnchanged = !row || !audit.sourceVerified === !row.checks.sourceVerified;
  const nextAudit = {
    ...audit,
    sourceRefs: (question.sourceRefs ?? []).slice(),
    sourceVerified: Boolean(row?.checks?.sourceVerified),
    answerVerified: Boolean(row?.checks?.answerVerified),
    originalityVerified: Boolean(row?.checks?.originalityVerified),
    translationVerified: Boolean(row?.checks?.translationVerified),
    distractorsReviewed: Boolean(row?.checks?.distractorsReviewed),
    reviewer: approvedNow ? "source-relevance + distractor alignment checks" : null,
    reviewedAt:
      approvedNow && target === question.reviewStatus && audit.reviewedAt && checksUnchanged
        ? audit.reviewedAt
        : approvedNow
          ? manifest.generatedAt
          : null,
  };
  // Only a real change is reported. The manifest is regenerated on every run,
  // so comparing timestamps would otherwise rewrite all 300 lines each time.
  const auditChanged = ["sourceRefs", "sourceVerified", "answerVerified", "originalityVerified", "translationVerified", "distractorsReviewed", "reviewer", "reviewedAt"].some(
    (key) => JSON.stringify(audit[key]) !== JSON.stringify(nextAudit[key]),
  );
  if (before === target && !auditChanged) return line;
  changes.push({ id: question.id, from: before, to: target });
  question.reviewStatus = target;
  question.audit = nextAudit;
  const comma = line.trimEnd().endsWith(",") ? "," : "";
  return JSON.stringify(question) + comma;
});

if (dryRun) {
  console.log(JSON.stringify({ status: "dry-run", changes: changes.length, byTransition: summarize(changes) }, null, 2));
  process.exit(0);
}

fs.writeFileSync(sourcePath, `${rewritten.join(eol)}`, "utf8");
console.log(JSON.stringify({ status: "applied", changes: changes.length, byTransition: summarize(changes) }, null, 2));

function summarize(entries) {
  const counts = {};
  for (const entry of entries) {
    const key = `${entry.from} -> ${entry.to}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}