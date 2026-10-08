/**
 * The authored AZ-900 question bank.
 *
 * Drafts live in three files split by official domain so they stay reviewable,
 * then merge here. Nothing else should construct questions: `buildAz900Bank`
 * in `az900-build.ts` handles objective resolution, source provenance, answer
 * placement, and id assignment, including preserving `az900-q-001` through
 * `az900-q-180` for existing learner data.
 */

import { buildAz900Bank, coverageGaps, type AuthoredBank } from "./az900-build.ts";
import { architectureDrafts } from "./az900-questions-architecture.ts";
import { cloudConceptDrafts } from "./az900-questions-cloud.ts";
import { managementDrafts } from "./az900-questions-management.ts";
import type { Az900Question } from "./az900-types.ts";

const authored: AuthoredBank = {
  ...cloudConceptDrafts,
  ...architectureDrafts,
  ...managementDrafts,
};

export const az900Questions: Az900Question[] = buildAz900Bank(authored);

/** Objectives that still need more authored questions. Should be empty. */
export const az900CoverageGaps = coverageGaps(az900Questions);

export const az900QuestionById = new Map(az900Questions.map((question) => [question.id, question]));

export const az900QuestionsByObjective = new Map<string, Az900Question[]>();
for (const question of az900Questions) {
  const list = az900QuestionsByObjective.get(question.objectiveId) ?? [];
  list.push(question);
  az900QuestionsByObjective.set(question.objectiveId, list);
}

export const az900QuestionsByGroup = new Map<string, Az900Question[]>();
for (const question of az900Questions) {
  const list = az900QuestionsByGroup.get(question.objectiveGroupId) ?? [];
  list.push(question);
  az900QuestionsByGroup.set(question.objectiveGroupId, list);
}

export const az900QuestionsByDomain = new Map<string, Az900Question[]>();
for (const question of az900Questions) {
  const list = az900QuestionsByDomain.get(question.domainId) ?? [];
  list.push(question);
  az900QuestionsByDomain.set(question.domainId, list);
}

export { authored as az900AuthoredDrafts };