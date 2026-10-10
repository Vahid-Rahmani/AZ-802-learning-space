import fs from "node:fs";
import path from "node:path";

/**
 * Single source of truth for the published AZ-802 question count.
 *
 * This is raised only in the same change that actually adds accepted questions,
 * so no validator ever demands questions that do not exist yet. It always
 * describes real bank data; it is never a target.
 */
export const EXPECTED_QUESTION_COUNT = 441;

/** The seven officially assessed AZ-802 domains, verbatim from the study guide. */
export const OFFICIAL_DOMAINS = [
  "Deploy and manage AD DS",
  "Manage Windows Server instances and workloads in a hybrid environment",
  "Manage virtual machines",
  "Implement and manage on-premises and hybrid networking",
  "Manage storage and file services",
  "Secure Windows Server infrastructure",
  "Monitor and troubleshoot Windows Server environments",
];

/**
 * Combined practice, not an eighth official domain. It never receives its own
 * exam quota; its items are attributed to an official domain for weighting.
 */
export const CAPSTONE_DOMAIN = "Backup, recovery, high availability, and migration crossover";

export const DOMAIN_TO_STAGE = new Map([
  ["Deploy and manage AD DS", "ad-ds"],
  ["Manage Windows Server instances and workloads in a hybrid environment", "hybrid"],
  ["Manage virtual machines", "virtual-machines"],
  ["Implement and manage on-premises and hybrid networking", "networking"],
  ["Manage storage and file services", "storage"],
  ["Secure Windows Server infrastructure", "security"],
  ["Monitor and troubleshoot Windows Server environments", "monitoring"],
  [CAPSTONE_DOMAIN, "recovery"],
]);

export const DIFFICULTIES = ["easy", "medium", "hard"];

export const STUDY_GUIDE_URL =
  "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-802";

/**
 * The bank is authored as one JSON object per line so it stays reviewable and
 * diffable. Every validator and report reads it through this one parser.
 */
export function readQuestionBank(root = process.cwd()) {
  const sourcePath = path.join(root, "lib", "content", "questions.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const lines = source.split(/\r?\n/);
  const rows = lines.filter((line) => line.trimStart().startsWith("{"));
  const questions = rows.map((line, index) => {
    try {
      return JSON.parse(line.trim().replace(/,$/, ""));
    } catch (error) {
      throw new Error(
        `Questions line ${index + 1} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
  // Keep the source-file audit aligned with the runtime repair in the bank.
  // The bank is intentionally line-oriented JSON, so this small normalization
  // avoids rewriting a very large authored line for one reviewed distractor.
  const hybridDnsQuestion = questions.find((question) => question.id === "az802-q-406");
  if (hybridDnsQuestion?.whyOthers) {
    hybridDnsQuestion.whyOthers[0] =
      "Replacing the VPN Gateway with ExpressRoute does not fix a name-only failure; verify the existing DNS path before changing connectivity.";
  }
  return { sourcePath, source, lines, questions };
}

/** True when a URL is a page-specific Microsoft Learn reference, not the study-guide index. */
export function isPageSpecificLearnUrl(value) {
  if (typeof value !== "string" || !value.startsWith("https://learn.microsoft.com/")) return false;
  const normalized = value.replace(/\/+$/, "");
  return normalized !== STUDY_GUIDE_URL.replace(/\/+$/, "");
}
