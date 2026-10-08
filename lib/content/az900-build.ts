/**
 * Builds the AZ-900 question bank from authored drafts.
 *
 * Two requirements shape this file.
 *
 * 1. Stored learner data must survive. Attempts and Leitner cards are keyed by
 *    question id, so `az900-q-001` through `az900-q-180` keep pointing at the
 *    same official objective they always did. `az900-legacy-slots.ts` records
 *    that mapping in order, and the builder fills it first.
 * 2. Nothing may be published without provenance. Every objective has a
 *    reviewed list of Learn pages in `OBJECTIVE_SOURCE_REFS`; a question with no
 *    reference cannot be produced, and a reference that is not on Learn fails
 *    validation.
 */

import { az900ObjectiveById, az900ObjectiveGroups } from "./az900-objectives.ts";
import { LEGACY_OBJECTIVE_SLOTS } from "./az900-legacy-slots.ts";
import { az900Sources } from "./az900-sources.ts";
import type { Az900DomainId } from "./az900-objectives.ts";
import type { Az900Draft, Az900Question } from "./az900-types.ts";


const {
  sharedResponsibility,
  architectureStyles,
  reliabilityOverview,
  reliabilityPillar,
  serviceHealth,
  policyOverview,
  defenderForCloudIntro,
  managementGroups,
  armOverview,
  armTemplates,
  cloudShell,
} = az900Sources;

/** Reviewed Learn pages behind each official objective. */
export const OBJECTIVE_SOURCE_REFS: Record<string, string[]> = {
  // Describe cloud computing
  "define-cloud-computing": [az900Sources.cafOverview, architectureStyles, az900Sources.sharedResponsibility],
  "shared-responsibility-model": [sharedResponsibility, az900Sources.cafOverview],
  "cloud-models": [architectureStyles, az900Sources.hubSpoke, az900Sources.hybridBenefit],
  "cloud-model-use-cases": [architectureStyles, az900Sources.hybridBenefit, az900Sources.hubSpoke],
  "consumption-based-model": [az900Sources.consumptionPricing, az900Sources.costManagement, az900Sources.serverlessFunctions],
  "cloud-pricing-models": [az900Sources.reservations, az900Sources.pricingCalculator, az900Sources.consumptionPricing],
  "serverless": [az900Sources.serverlessFunctions, az900Sources.containerApps, az900Sources.consumptionPricing],
  // Benefits of cloud services
  "availability-and-scalability-benefits": [reliabilityOverview, reliabilityPillar, az900Sources.vmScaleSets, az900Sources.vmAvailability],
  "reliability-and-predictability-benefits": [reliabilityOverview, reliabilityPillar, serviceHealth],
  "security-and-governance-benefits": [sharedResponsibility, az900Sources.zeroTrust, defenderForCloudIntro, policyOverview],
  "manageability-benefits": [armOverview, az900Sources.cloudShell, armTemplates, az900Sources.portal],
  // Cloud service types
  "describe-iaas": [az900Sources.vmsOverview, sharedResponsibility, architectureStyles],
  "describe-paas": [az900Sources.appService, az900Sources.paasSql, sharedResponsibility],
  "describe-saas": [az900Sources.entraWhatIs, az900Sources.appService, sharedResponsibility],
  "service-type-use-cases": [architectureStyles, sharedResponsibility, az900Sources.containerApps],
  // Core architectural components
  "regions-pairs-sovereign": [az900Sources.regionsOverview, az900Sources.regionsPaired, az900Sources.sovereignCloud, az900Sources.regionsList],
  "availability-zones": [az900Sources.availabilityZones, az900Sources.regionsOverview, az900Sources.redundancy],
  "datacenters": [az900Sources.regionsOverview, reliabilityOverview, az900Sources.regionsList],
  "resources-and-resource-groups": [armOverview, az900Sources.portalResources, az900Sources.resourceProviders],
  "subscriptions": [az900Sources.billingManage, az900Sources.costManagement, az900Sources.resourceProviders],
  "management-groups": [managementGroups, az900Sources.managementGroupsOverview, az900Sources.rbacScope],
  "scope-hierarchy": [az900Sources.rbacScope, managementGroups, az900Sources.resourceProviders],
  // Compute and networking
  "compare-compute-types": [az900Sources.vmsOverview, az900Sources.containerApps, az900Sources.serverlessFunctions],
  "virtual-machine-options": [az900Sources.vmAvailability, az900Sources.availabilitySets, az900Sources.vmScaleSets, az900Sources.virtualDesktop],
  "virtual-machine-resources": [az900Sources.vmsOverview, az900Sources.vmSizes, az900Sources.vnets],
  "application-hosting-options": [az900Sources.appService, az900Sources.containerApps, az900Sources.vmsOverview],
  "virtual-networking": [az900Sources.vnets, az900Sources.vnetSubnets, az900Sources.vnetPeering, az900Sources.azureDns, az900Sources.vpnGateway, az900Sources.expressRoute],
  "public-and-private-endpoints": [az900Sources.privateEndpoint, az900Sources.privateLink, az900Sources.storagePrivateEndpoints],
  // Storage
  "compare-storage-services": [az900Sources.storageAccount, az900Sources.blobs, az900Sources.files, az900Sources.queues, az900Sources.tables],
  "storage-tiers": [az900Sources.accessTiers, az900Sources.storageAccount, az900Sources.blobs],
  "storage-redundancy": [az900Sources.redundancy, az900Sources.availabilityZones, az900Sources.storageAccount],
  "storage-account-options": [az900Sources.storageAccount, az900Sources.blobs, az900Sources.files],
  "file-movement-options": [az900Sources.azCopy, az900Sources.storageExplorer, az900Sources.fileSync],
  "migration-options": [az900Sources.migrate, az900Sources.migrateAssessment, az900Sources.dataBox],
  // Identity, access, security
  "directory-services": [az900Sources.entraWhatIs, az900Sources.domainServices, az900Sources.managedIdentities],
  "authentication-methods": [az900Sources.singleSignOn, az900Sources.mfaConcept, az900Sources.passwordless, az900Sources.authenticationStrengths, az900Sources.authenticatorApp],
  "external-identities": [az900Sources.externalIdentities, az900Sources.conditionalAccess, az900Sources.entraWhatIs],
  "conditional-access": [az900Sources.conditionalAccess, az900Sources.authenticationStrengths, az900Sources.mfaGetStarted],
  "rbac": [az900Sources.rbac, az900Sources.rbacScope, managementGroups],
  "zero-trust": [az900Sources.zeroTrust, az900Sources.conditionalAccess, sharedResponsibility],
  "defense-in-depth": [sharedResponsibility, az900Sources.zeroTrust, az900Sources.privateLink],
  "defender-for-cloud": [defenderForCloudIntro, az900Sources.zeroTrust, sharedResponsibility],
  // Cost management
  "cost-factors": [az900Sources.consumptionPricing, az900Sources.costOptimization, az900Sources.pricingCalculator],
  "pricing-calculator": [az900Sources.pricingCalculator, az900Sources.costOptimization, az900Sources.reservations],
  "cost-management-capabilities": [az900Sources.costManagement, az900Sources.budgets, az900Sources.costManagementFaq],
  "tags": [az900Sources.tags, az900Sources.costOptimization, az900Sources.policyOverview],
  // Governance and compliance
  "purview-purpose": [az900Sources.purview, az900Sources.purviewPortal, az900Sources.policyOverview],
  "policy-purpose": [policyOverview, az900Sources.policyInitiatives, az900Sources.locks],
  "resource-locks": [az900Sources.locks, policyOverview, az900Sources.rbacScope],
  // Management and deployment
  "azure-portal": [az900Sources.portal, az900Sources.portalResources, az900Sources.cloudShell],
  "cloud-shell-cli-powershell": [cloudShell, az900Sources.cli, az900Sources.azurePowerShell],
  "azure-arc-purpose": [az900Sources.azureArc, az900Sources.azureArcServers, az900Sources.policyOverview],
  "infrastructure-as-code": [az900Sources.armTemplates, az900Sources.bicep, armOverview],
  "arm-and-templates": [armOverview, armTemplates, az900Sources.armSyntax],
  // Monitoring
  "advisor-purpose": [az900Sources.advisor, az900Sources.advisorGetStarted, az900Sources.costOptimization],
  "service-health": [serviceHealth, az900Sources.monitorOverview],
  "azure-monitor-tools": [az900Sources.monitorOverview, az900Sources.logAnalytics, az900Sources.monitorAlerts, az900Sources.appInsights],
};

/** Objective -> the study-guide group heading it belongs to. */
export const OBJECTIVE_GROUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const id of Object.keys(OBJECTIVE_SOURCE_REFS)) {
    const objective = az900ObjectiveById(id);
    if (!objective) continue;
    map[id] = objective.groupId;
  }
  return map;
})();

/** Study-guide groups that have at least one objective, in published order. */
export const AZ900_GROUPS_WITH_OBJECTIVES = az900ObjectiveGroups
  .filter((group) => Object.values(OBJECTIVE_GROUP).includes(group.id))
  .map((group) => group.id);

function hashSeed(value: string) {
  let state = 2166136261;
  for (const character of value) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return state;
}

/**
 * Places the correct answer deterministically. Deriving the position from the
 * objective and question index keeps it stable across builds while spreading
 * answers across all four positions.
 */
function placeOptions(correct: string, wrong: [string, string, string], seed: number) {
  const position = seed % 4;
  const options = [...wrong];
  options.splice(position, 0, correct);
  return { options, correct: position };
}

export type AuthoredBank = Record<string, Az900Draft[]>;

function toQuestion(objectiveId: string, draft: Az900Draft, index: number): Az900Question {
  const objective = az900ObjectiveById(objectiveId);
  if (!objective) throw new Error(`Unknown objective: ${objectiveId}`);
  const refs = OBJECTIVE_SOURCE_REFS[objectiveId];
  if (!refs?.length) throw new Error(`No reviewed source for objective: ${objectiveId}`);
  const seed = hashSeed(`${objectiveId}:${draft.question}`);
  const { options, correct } = placeOptions(draft.correct, draft.wrong, seed + index);
  const whyOthers = [...draft.whyOthers];
  // `whyOthers` is indexed by option position, matching QuestionExplanation.
  const aligned: string[] = [];
  for (let position = 0; position < 4; position += 1) {
    aligned.push(position === correct ? draft.rationale : whyOthers.shift() ?? draft.rationale);
  }
  return {
    id: "",
    courseId: "az900",
    domain: objective.domainId,
    domainId: objective.domainId as Az900DomainId,
    objectiveGroupId: objective.groupId,
    objectiveId,
    objective: objective.text,
    topic: draft.topic ?? objective.text,
    text: draft.question,
    options,
    correct,
    source: refs[0],
    sourceRefs: refs,
    rationale: { en: draft.rationale, fa: "", de: "" },
    skillId: objective.groupId,
    reviewStatus: "technical-approved",
    isOriginal: true,
    difficulty: draft.difficulty ?? "medium",
    keyPoints: draft.keyPoints,
    whyOthers: aligned,
    ...(draft.requirements ? { requirements: draft.requirements } : {}),
    ...(draft.commandPath ? { commandPath: draft.commandPath } : {}),
    translations: "runtime-google",
  };
}

/**
 * Fills the preserved legacy slots first so existing attempts and cards keep
 * resolving to the same objective, then appends the remaining new questions
 * with fresh ids after the legacy range.
 */
export function buildAz900Bank(authored: AuthoredBank) {
  const remaining = new Map<string, Az900Draft[]>();
  for (const [objectiveId, drafts] of Object.entries(authored)) remaining.set(objectiveId, [...drafts]);

  const consumed = new Map<string, number>();
  const take = (objectiveId: string) => {
    const queue = remaining.get(objectiveId);
    const position = consumed.get(objectiveId) ?? 0;
    if (!queue || position >= queue.length) return null;
    consumed.set(objectiveId, position + 1);
    return queue[position];
  };

  const questions: Az900Question[] = [];

  LEGACY_OBJECTIVE_SLOTS.forEach((objectiveId, index) => {
    const draft = take(objectiveId);
    // Failing loudly beats emitting a hollow question: a shortfall means the
    // legacy range would silently get thinner and stored attempts would point
    // at nothing.
    if (!draft) throw new Error(`Objective "${objectiveId}" has fewer authored drafts than preserved question slots`);
    questions.push({ ...toQuestion(objectiveId, draft, index), id: `az900-q-${String(index + 1).padStart(3, "0")}` });
  });

  // Any authored question that did not fit a legacy slot becomes a new id.
  let next = LEGACY_OBJECTIVE_SLOTS.length + 1;
  for (const [objectiveId, drafts] of Object.entries(authored)) {
    const position = consumed.get(objectiveId) ?? 0;
    for (let index = position; index < drafts.length; index += 1) {
      questions.push({
        ...toQuestion(objectiveId, drafts[index], index),
        id: `az900-q-${String(next).padStart(3, "0")}`,
      });
      next += 1;
    }
  }

  return questions;
}

/** Reports objectives that did not receive enough authored questions. */
export function coverageGaps(questions: Az900Question[], minimum = 4) {
  const counts = new Map<string, number>();
  for (const question of questions) counts.set(question.objectiveId, (counts.get(question.objectiveId) ?? 0) + 1);
  return Object.keys(OBJECTIVE_SOURCE_REFS)
    .filter((objectiveId) => (counts.get(objectiveId) ?? 0) < minimum)
    .map((objectiveId) => ({ objectiveId, count: counts.get(objectiveId) ?? 0 }));
}