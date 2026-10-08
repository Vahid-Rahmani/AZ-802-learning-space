/**
 * Azure Fundamentals course data.
 *
 * The question bank itself lives in `az900-questions.ts` and is built from the
 * authored drafts plus the official objective catalog. This module assembles
 * the stages, lessons, labs, and course metadata that the page renders, and
 * re-exports the bank types so existing imports keep working.
 */

import { az900DomainDefinitions, az900ObjectiveById, az900ObjectiveGroups, az900DomainShares } from "./az900-objectives.ts";
import { az900Certification, az900Guide, az900PracticeAssessment } from "./az900-sources.ts";
import { AZ900_GROUPS_WITH_OBJECTIVES, coverageGaps, OBJECTIVE_GROUP } from "./az900-build.ts";
import {
  az900QuestionById,
  az900Questions,
  az900QuestionsByDomain,
  az900QuestionsByGroup,
  az900QuestionsByObjective,
} from "./az900-questions.ts";
import type { Az900Question } from "./az900-types.ts";

export type { Az900CommandStep, Az900Question, Az900Text } from "./az900-types.ts";
export type { Az900DomainId } from "./az900-objectives.ts";
export { az900Questions, az900QuestionById, az900QuestionsByObjective, az900QuestionsByGroup, az900QuestionsByDomain };
export { az900ObjectiveById, az900ObjectiveGroups, az900DomainDefinitions };
export { az900Guide, az900Certification, az900PracticeAssessment };
export { coverageGaps };
export type { Az900Question as Question };

/** Objective counts are read from the catalog so they cannot drift from it. */
export const az900ObjectiveCount = az900ObjectiveGroups.reduce(
  (total, group) => total + Object.values(OBJECTIVE_GROUP).filter((id) => id === group.id).length,
  0,
);

export const az900Domains = az900DomainDefinitions.map((domain) => domain.title);

/**
 * Sampling weight per domain, derived from the published ranges
 * (25-30 / 35-40 / 30-35) and rounded with largest remainder so the integers
 * sum to exactly 100.
 */
export const az900DomainWeights = (() => {
  const exact = az900DomainShares.map((entry) => ({
    id: entry.id,
    floor: Math.floor(entry.share * 100),
    remainder: entry.share * 100 - Math.floor(entry.share * 100),
  }));
  let leftover = 100 - exact.reduce((sum, entry) => sum + entry.floor, 0);
  const weights = Object.fromEntries(exact.map((entry) => [entry.id, entry.floor])) as Record<string, number>;
  for (const entry of [...exact].sort((a, b) => b.remainder - a.remainder)) {
    if (leftover <= 0) break;
    weights[entry.id] += 1;
    leftover -= 1;
  }
  return weights;
})();

export const az900StageRows = AZ900_GROUPS_WITH_OBJECTIVES.map((groupId, index) => {
  const group = az900ObjectiveGroups.find((item) => item.id === groupId)!;
  const domain = az900DomainDefinitions.find((item) => item.id === group.domainId)!;
  const objectiveIds = Object.keys(OBJECTIVE_GROUP).filter((id) => OBJECTIVE_GROUP[id] === groupId);
  const questionIds = objectiveIds.flatMap((id) => az900QuestionsByObjective.get(id)?.map((question) => question.id) ?? []);
  return {
    id: groupId,
    stage: index + 1,
    domain: domain.title,
    domainId: domain.id,
    title: group.title,
    objective: `${objectiveIds.length} official objectives in ${group.title}`,
    objectives: objectiveIds.map((id) => ({ id, text: az900ObjectiveById(id)!.text, questionCount: az900QuestionsByObjective.get(id)?.length ?? 0 })),
    questionIds,
    weight: `${domain.weightMin}\u2013${domain.weightMax}%`,
  };
});

export const az900Stages = az900StageRows;

export const az900Lessons = az900StageRows.map((stage) => ({
  id: `az900-lesson-${stage.id}`,
  stageId: stage.id,
  title: stage.title,
  objective: stage.objectives.map((objective) => objective.text).join("; "),
  body: `This lesson covers the official AZ-900 objectives under ${stage.title} (${stage.weight} of the exam). Work through each objective, then use stage practice to check the exact facts rather than a memorised summary.`,
  estimatedMinutes: Math.max(15, Math.round(stage.questionIds.length * 1.5)),
  sources: [...new Set(stage.questionIds.flatMap((id) => az900QuestionById.get(id)?.sourceRefs ?? []))],
}));

export const az900Labs = [
  {
    id: "az900-lab-cost-estimate",
    title: "Build and defend a cost estimate",
    description: "Estimate a small web workload in the pricing calculator, then compare it against the deployment a team would actually create.",
    checklist: [
      "Pick a region and record its service availability limits",
      "Enter compute, storage, and egress assumptions separately",
      "Add a budget with an alert action for the project",
      "Define owner, environment, and cost-center tags and explain who applies them",
      "Name one Advisor recommendation that could reduce the estimate",
    ],
  },
  {
    id: "az900-lab-governance",
    title: "Design the governance hierarchy",
    description: "Draw a management-group, subscription, resource-group, RBAC, Policy, and lock design for two environments and justify each scope.",
    checklist: [
      "Draw management group to subscription to resource group to resource",
      "Place an RBAC assignment at the narrowest workable scope and justify it",
      "Add an audit-effect policy, then a deny-effect policy for locations",
      "Protect one critical resource with a CanNotDelete lock",
      "Explain how an exclusion changes what a parent assignment applies to",
    ],
  },
  {
    id: "az900-lab-monitoring",
    title: "Route each signal to the right tool",
    description: "Map a real operational question to the Azure service that answers it, and record what evidence you would collect.",
    checklist: [
      "Use Advisor for an optimization recommendation",
      "Use Service Health for a platform event affecting your region",
      "Use Log Analytics with a Kusto query over request logs",
      "Use an Azure Monitor alert with an action group on the query result",
      "Use Application Insights to investigate one slow request",
    ],
  },
  {
    id: "az900-lab-resilience",
    title: "Design for a facility failure",
    description: "Choose between an availability set, zone-redundant deployment, and multi-region deployment for three scenarios and defend each decision.",
    checklist: [
      "Name the failure each design survives and the failure it does not",
      "Confirm the service supports zone redundancy in your chosen region",
      "Explain why geo-redundant storage is not a substitute for application design",
      "Record what the Azure Monitor signal would be for each design",
    ],
  },
];

export const az900Course = {
  id: "az900" as const,
  code: "AZ-900",
  title: "Microsoft Azure Fundamentals",
  subtitle: "Cloud concepts, Azure architecture and services, management, and governance",
  questionCount: az900Questions.length,
  objectiveCount: az900ObjectiveCount,
  sourceVersion: "Skills measured as of July 20, 2026",
  studyGuide: az900Guide,
  certification: az900Certification,
  practiceAssessment: az900PracticeAssessment,
  examSandbox: "https://mscertdemo.starttest.com/",
  coverageGaps: coverageGaps(az900Questions),
  domainWeights: az900DomainWeights,
};

export function az900QuestionCountForObjective(objectiveId: string) {
  return az900QuestionsByObjective.get(objectiveId)?.length ?? 0;
}

export function az900QuestionCountForDomain(domainId: string) {
  return az900QuestionsByDomain.get(domainId)?.length ?? 0;
}

/** Labs were reshaped to describe the task rather than restate a source link. */
export const az900PracticalScenarios = az900Labs.map((lab, index) => ({
  id: lab.id,
  title: { fa: lab.title, en: lab.title, de: lab.title },
  prompt: { fa: lab.description, en: lab.description, de: lab.description },
  skillId: az900StageRows[index % az900StageRows.length].id,
  checklist: lab.checklist,
}));