import { az900Domains, az900Questions, az900Stages } from "../lib/content/az900.ts";

const errors = [];
const expectedDomainCounts = new Map([[az900Domains[0], 50], [az900Domains[1], 68], [az900Domains[2], 62]]);
if (az900Questions.length !== 180) errors.push(`Expected 180 questions, received ${az900Questions.length}`);
if (az900Stages.length !== 11) errors.push(`Expected 11 stages, received ${az900Stages.length}`);

const ids = new Set();
const normalizedTexts = new Set();
const answerPositions = [0, 0, 0, 0];
for (const question of az900Questions) {
  if (ids.has(question.id)) errors.push(`Duplicate id: ${question.id}`);
  ids.add(question.id);
  const normalized = question.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normalizedTexts.has(normalized)) errors.push(`Duplicate stem: ${question.id}`);
  normalizedTexts.add(normalized);
  if (!expectedDomainCounts.has(question.domain)) errors.push(`Unknown domain: ${question.id}`);
  if (!az900Stages.some((stage) => stage.id === question.objectiveGroupId)) errors.push(`Unknown objective group: ${question.id}`);
  if (!question.objectiveId) errors.push(`Missing leaf objective: ${question.id}`);
  if (question.options.length !== 4 || new Set(question.options).size !== 4) errors.push(`Invalid options: ${question.id}`);
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3) errors.push(`Invalid correct answer: ${question.id}`);
  else answerPositions[question.correct] += 1;
  if (!question.rationale.en.trim()) errors.push(`Missing rationale: ${question.id}`);
  if (!question.source.startsWith("https://learn.microsoft.com/")) errors.push(`Non-Microsoft source: ${question.id}`);
  if (!question.isOriginal) errors.push(`Originality flag missing: ${question.id}`);
}

for (const [domain, expected] of expectedDomainCounts) {
  const actual = az900Questions.filter((question) => question.domain === domain).length;
  if (actual !== expected) errors.push(`${domain}: expected ${expected}, received ${actual}`);
}

const leafObjectives = new Set(az900Questions.filter((question) => !question.objectiveId.startsWith("comparison-")).map((question) => question.objectiveId));
if (leafObjectives.size !== 57) errors.push(`Expected 57 leaf objectives, received ${leafObjectives.size}`);
for (const objectiveId of leafObjectives) {
  const count = az900Questions.filter((question) => question.objectiveId === objectiveId).length;
  if (count < 2) errors.push(`Leaf objective ${objectiveId} has only ${count} question(s)`);
}
for (const stage of az900Stages) {
  if (!stage.questionIds.length) errors.push(`Empty stage: ${stage.id}`);
  if (stage.questionIds.some((id) => !ids.has(id))) errors.push(`Stage ${stage.id} references an unknown question`);
}
for (const [index, count] of answerPositions.entries()) {
  const percentage = (count / az900Questions.length) * 100;
  if (percentage < 20 || percentage > 30) errors.push(`Answer position ${index} is ${percentage.toFixed(1)}%`);
}

if (errors.length) {
  console.error(JSON.stringify({ status:"failed", errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ status:"ok", questions:az900Questions.length, domains:Object.fromEntries([...expectedDomainCounts].map(([domain]) => [domain, az900Questions.filter((question) => question.domain === domain).length])), stages:az900Stages.length, leafObjectives:leafObjectives.size, answerPositions }));
