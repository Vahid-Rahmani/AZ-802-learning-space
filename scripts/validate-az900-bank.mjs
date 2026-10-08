/**
 * Validates the AZ-900 question bank before it can be trusted.
 *
 * The point of this script is that a claim on the page ("reviewed against
 * Microsoft Learn", "57 official objectives", "original") is only worth
 * something if something checks it. It fails on:
 *
 * - ids, stems, and options that are duplicated or malformed
 * - objectives that are not in the official study-guide catalog
 * - objectives with no reviewed Learn reference, or a non-Learn reference
 * - explanations that are missing the deciding facts or distractor reasons
 * - answer placement that clusters instead of spreading
 * - coverage shortfalls against the preserved learner-data id range
 */

import {
  az900Course,
  az900DomainDefinitions,
  az900DomainWeights,
  az900ObjectiveCount,
  az900Questions,
  az900Stages,
} from "../lib/content/az900.ts";
import { az900Objectives } from "../lib/content/az900-objectives.ts";
import { LEGACY_OBJECTIVE_SLOTS } from "../lib/content/az900-legacy-slots.ts";

const errors = [];
const MINIMUM_PER_OBJECTIVE = 4;
const LEGACY_ID_COUNT = 180;

/**
 * Short but exact options are legitimate when the answer really is a short
 * official name or policy effect. Anything else that is too short to stand on
 * its own is a drafting mistake.
 */
const EXACT_SHORT_OPTIONS = new Set([
  "IaaS", "PaaS", "SaaS", "IaaS, PaaS, or SaaS", "Deny", "Audit", "Modify", "Append",
  "LRS", "ZRS", "GRS", "GZRS", "RA-GRS", "AzCopy", "Both", "Neither",
]);

const officialObjectives = new Set(az900Objectives.map((objective) => objective.id));
const objectiveText = new Map(az900Objectives.map((objective) => [objective.id, objective.text]));

if (az900Objectives.length !== az900ObjectiveCount) {
  errors.push(`objective count mismatch: catalog ${az900Objectives.length}, exported ${az900ObjectiveCount}`);
}
if (LEGACY_OBJECTIVE_SLOTS.length !== LEGACY_ID_COUNT) {
  errors.push(`preserved slot table has ${LEGACY_OBJECTIVE_SLOTS.length} entries, expected ${LEGACY_ID_COUNT}`);
}

const ids = new Set();
const normalizedStems = new Set();
const answerPositions = [0, 0, 0, 0];
const objectiveCounts = new Map();

for (const question of az900Questions) {
  const { id } = question;
  if (ids.has(id)) errors.push(`Duplicate id: ${id}`);
  ids.add(id);

  const normalizedStem = question.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normalizedStems.has(normalizedStem)) errors.push(`Duplicate stem: ${id}`);
  normalizedStems.add(normalizedStem);

  if (!officialObjectives.has(question.objectiveId)) errors.push(`Objective not in the official catalog: ${id} (${question.objectiveId})`);
  if (question.objective !== objectiveText.get(question.objectiveId)) errors.push(`Objective text does not match the catalog: ${id}`);
  if (!question.objectiveGroupId) errors.push(`Missing group: ${id}`);
  if (!question.topic) errors.push(`Missing topic: ${id}`);

  if (question.options.length !== 4) errors.push(`Expected 4 options: ${id}`);
  else if (new Set(question.options).size !== 4) errors.push(`Duplicate options: ${id}`);
  const correctText = question.options[question.correct];
  for (const option of question.options) {
    if (option.trim().length < 8 && !EXACT_SHORT_OPTIONS.has(option.trim())) {
      errors.push(`Option too short to be meaningful: ${id} (${option})`);
    }
  }
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > question.options.length - 1) {
    errors.push(`Invalid correct index: ${id}`);
  } else {
    answerPositions[question.correct] += 1;
    if (!correctText?.trim()) errors.push(`Correct option is empty: ${id}`);
  }

  if (!question.rationale.en.trim()) errors.push(`Missing rationale: ${id}`);
  if (question.rationale.fa || question.rationale.de) errors.push(`Stored translation is not allowed: ${id}`);
  if (question.translations !== "runtime-google") errors.push(`Question is not marked for runtime translation: ${id}`);
  if (!question.keyPoints?.length) errors.push(`Missing keyPoints: ${id}`);
  if (!question.whyOthers?.length) errors.push(`Missing whyOthers: ${id}`);
  else if (question.whyOthers.some((reason) => !reason?.trim())) errors.push(`Empty distractor reason: ${id}`);
  if (!["easy", "medium", "hard"].includes(question.difficulty)) errors.push(`Unknown difficulty: ${id}`);
  if (question.reviewStatus !== "technical-approved") errors.push(`Question is not reviewed: ${id}`);
  if (!question.isOriginal) errors.push(`Originality flag missing: ${id}`);

  if (!question.sourceRefs?.length) errors.push(`Missing sourceRefs: ${id}`);
  for (const reference of question.sourceRefs ?? []) {
    if (!reference.startsWith("https://learn.microsoft.com/")) errors.push(`Non-Microsoft reference: ${id} (${reference})`);
  }
  if (question.source !== question.sourceRefs?.[0]) errors.push(`Primary source does not match the first reviewed reference: ${id}`);
  if (question.commandPath?.some((step) => !step.label || !step.command)) errors.push(`Incomplete commandPath step: ${id}`);

  objectiveCounts.set(question.objectiveId, (objectiveCounts.get(question.objectiveId) ?? 0) + 1);
}

// Learner data must keep resolving: ids 1..180 exist and keep their objective.
for (let index = 0; index < LEGACY_ID_COUNT; index += 1) {
  const id = `az900-q-${String(index + 1).padStart(3, "0")}`;
  const question = az900Questions[index];
  if (!question) { errors.push(`Missing preserved question: ${id}`); continue; }
  if (question.id !== id) errors.push(`Position ${index + 1} should be ${id} but is ${question.id}`);
  if (question.objectiveId !== LEGACY_OBJECTIVE_SLOTS[index]) {
    errors.push(`${id} objective drifted: expected ${LEGACY_OBJECTIVE_SLOTS[index]}, found ${question.objectiveId}`);
  }
}

for (const objective of az900Objectives) {
  const count = objectiveCounts.get(objective.id) ?? 0;
  if (count < MINIMUM_PER_OBJECTIVE) errors.push(`Objective ${objective.id} has ${count} questions, minimum is ${MINIMUM_PER_OBJECTIVE}`);
}
for (const objectiveId of objectiveCounts.keys()) {
  if (!officialObjectives.has(objectiveId)) errors.push(`Bank references an unknown objective: ${objectiveId}`);
}

const weightTotal = Object.values(az900DomainWeights).reduce((sum, weight) => sum + weight, 0);
if (weightTotal !== 100) errors.push(`Domain weights sum to ${weightTotal}, expected 100`);
for (const domain of az900DomainDefinitions) {
  const share = az900DomainWeights[domain.id];
  if (share < domain.weightMin || share > domain.weightMax) {
    errors.push(`${domain.title} samples at ${share}%, outside the published ${domain.weightMin}-${domain.weightMax}%`);
  }
}

for (const [index, count] of answerPositions.entries()) {
  const percentage = (count / az900Questions.length) * 100;
  if (percentage < 20 || percentage > 30) errors.push(`Answer position ${index} holds ${percentage.toFixed(1)}% of questions`);
}

for (const stage of az900Stages) {
  if (!stage.questionIds.length) errors.push(`Empty stage: ${stage.id}`);
  if (stage.questionIds.some((id) => !ids.has(id))) errors.push(`Stage ${stage.id} references an unknown question`);
  if (!stage.objectives.length) errors.push(`Stage ${stage.id} lists no objectives`);
}

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errorCount: errors.length, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "ok",
  questions: az900Questions.length,
  objectives: az900ObjectiveCount,
  stages: az900Stages.length,
  domainWeights: az900DomainWeights,
  domains: Object.fromEntries(az900DomainDefinitions.map((domain) => [domain.id, (az900Questions.filter((question) => question.domainId === domain.id)).length])),
  minimumPerObjective: Math.min(...objectiveCounts.values()),
  answerPositions,
  studyGuide: az900Course.studyGuide,
}, null, 2));