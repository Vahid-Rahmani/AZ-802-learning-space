/**
 * The official AZ-900 skills measured, taken verbatim from the current
 * Microsoft Learn study guide.
 *
 * Guide: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900
 * Section: "Skills measured as of July 20, 2026"
 *
 * Each bullet is reproduced exactly as published. The `id` is a local stable
 * slug used for grouping and for progress; it is not a Microsoft identifier and
 * is never shown as if it were. Weights are the published ranges from the
 * guide's "Skills at a glance" table.
 *
 * The study guide notes that the bullets illustrate how a skill is assessed and
 * that related topics may be covered, so a question may legitimately test a
 * neighbouring idea within the same objective.
 */

export type Az900DomainId = "cloud-concepts" | "architecture-services" | "management-governance";

export type Az900Objective = {
  /** Local stable slug. Grouping and progress only; not a Microsoft identifier. */
  id: string;
  /** Published weight range for the parent domain. */
  domainId: Az900DomainId;
  /** The official group heading this bullet sits under. */
  groupId: string;
  /** The bullet text exactly as published in the study guide. */
  text: string;
};

export const az900DomainDefinitions: Array<{ id: Az900DomainId; title: string; weightMin: number; weightMax: number }> = [
  { id: "cloud-concepts", title: "Describe cloud concepts", weightMin: 25, weightMax: 30 },
  { id: "architecture-services", title: "Describe Azure architecture and services", weightMin: 35, weightMax: 40 },
  { id: "management-governance", title: "Describe Azure management and governance", weightMin: 30, weightMax: 35 },
];

/**
 * Sampling weight per domain, taken as the midpoint of the published range so
 * the three shares stay traceable to the guide (25-30 / 35-40 / 30-35) instead
 * of being invented. The midpoints sum to 99 because the published ranges do
 * not share an exact split, so `az900DomainShares` normalises them to 100 for
 * display and for per-question sampling.
 */
const az900DomainMidpoints = Object.fromEntries(
  az900DomainDefinitions.map((domain) => [domain.id, (domain.weightMin + domain.weightMax) / 2]),
) as Record<Az900DomainId, number>;

const midpointTotal = az900DomainDefinitions.reduce((sum, domain) => sum + az900DomainMidpoints[domain.id], 0);

export const az900DomainWeights: Record<Az900DomainId, number> = Object.fromEntries(
  az900DomainDefinitions.map((domain) => [domain.id, Math.round((az900DomainMidpoints[domain.id] / midpointTotal) * 100)]),
) as Record<Az900DomainId, number>;

/**
 * Exact shares of 100 used for sampling. Integer weights alone lose the
 * remainder on a small exam, so the fractional part is carried here and the
 * sampler allocates any leftover questions by largest remainder.
 */
export const az900DomainShares: Array<{ id: Az900DomainId; share: number }> = az900DomainDefinitions.map((domain) => ({
  id: domain.id,
  share: az900DomainMidpoints[domain.id] / midpointTotal,
}));

export const az900ObjectiveGroups: Array<{ id: string; domainId: Az900DomainId; title: string }> = [
  { id: "describe-cloud-computing", domainId: "cloud-concepts", title: "Describe cloud computing" },
  { id: "describe-cloud-benefits", domainId: "cloud-concepts", title: "Describe the benefits of using cloud services" },
  { id: "describe-cloud-service-types", domainId: "cloud-concepts", title: "Describe cloud service types" },
  { id: "describe-core-architectural-components", domainId: "architecture-services", title: "Describe the core architectural components of Azure" },
  { id: "describe-compute-and-networking-services", domainId: "architecture-services", title: "Describe Azure compute and networking services" },
  { id: "describe-storage-services", domainId: "architecture-services", title: "Describe Azure storage services" },
  { id: "describe-identity-access-and-security", domainId: "architecture-services", title: "Describe Azure identity, access, and security" },
  { id: "describe-cost-management", domainId: "management-governance", title: "Describe cost management in Azure" },
  { id: "describe-governance-and-compliance", domainId: "management-governance", title: "Describe features and tools in Azure for governance and compliance" },
  { id: "describe-management-and-deployment", domainId: "management-governance", title: "Describe features and tools for managing and deploying Azure resources" },
  { id: "describe-monitoring-tools", domainId: "management-governance", title: "Describe monitoring tools in Azure" },
];

export const az900Objectives: Az900Objective[] = [
  // Describe cloud computing
  { id: "define-cloud-computing", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Define cloud computing" },
  { id: "shared-responsibility-model", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Describe the shared responsibility model" },
  { id: "cloud-models", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Define cloud models, including public, private, and hybrid" },
  { id: "cloud-model-use-cases", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Identify appropriate use cases for each cloud model" },
  { id: "consumption-based-model", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Describe the consumption-based model" },
  { id: "cloud-pricing-models", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Compare cloud pricing models" },
  { id: "serverless", domainId: "cloud-concepts", groupId: "describe-cloud-computing", text: "Describe serverless" },

  // Describe the benefits of using cloud services
  { id: "availability-and-scalability-benefits", domainId: "cloud-concepts", groupId: "describe-cloud-benefits", text: "Describe the benefits of high availability and scalability in the cloud" },
  { id: "reliability-and-predictability-benefits", domainId: "cloud-concepts", groupId: "describe-cloud-benefits", text: "Describe the benefits of reliability and predictability in the cloud" },
  { id: "security-and-governance-benefits", domainId: "cloud-concepts", groupId: "describe-cloud-benefits", text: "Describe the benefits of security and governance in the cloud" },
  { id: "manageability-benefits", domainId: "cloud-concepts", groupId: "describe-cloud-benefits", text: "Describe the benefits of manageability in the cloud" },

  // Describe cloud service types
  { id: "describe-iaas", domainId: "cloud-concepts", groupId: "describe-cloud-service-types", text: "Describe infrastructure as a service (IaaS)" },
  { id: "describe-paas", domainId: "cloud-concepts", groupId: "describe-cloud-service-types", text: "Describe platform as a service (PaaS)" },
  { id: "describe-saas", domainId: "cloud-concepts", groupId: "describe-cloud-service-types", text: "Describe software as a service (SaaS)" },
  { id: "service-type-use-cases", domainId: "cloud-concepts", groupId: "describe-cloud-service-types", text: "Identify appropriate use cases for each cloud service type (IaaS, PaaS, and SaaS)" },

  // Describe the core architectural components of Azure
  { id: "regions-pairs-sovereign", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe Azure regions, region pairs, and sovereign regions" },
  { id: "availability-zones", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe availability zones" },
  { id: "datacenters", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe Azure datacenters" },
  { id: "resources-and-resource-groups", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe Azure resources and resource groups" },
  { id: "subscriptions", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe subscriptions" },
  { id: "management-groups", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe management groups" },
  { id: "scope-hierarchy", domainId: "architecture-services", groupId: "describe-core-architectural-components", text: "Describe the hierarchy of resource groups, subscriptions, and management groups" },

  // Describe Azure compute and networking services
  { id: "compare-compute-types", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Compare compute types, including containers, virtual machines, and functions" },
  { id: "virtual-machine-options", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Describe virtual machine options, including Azure virtual machines, Azure Virtual Machine Scale Sets, availability sets, and Azure Virtual Desktop" },
  { id: "virtual-machine-resources", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Describe the resources required for virtual machines" },
  { id: "application-hosting-options", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Describe application hosting options, including web apps, containers, and virtual machines" },
  { id: "virtual-networking", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Describe virtual networking, including the purpose of Azure virtual networks, subnets, peering, Azure DNS, Azure VPN Gateway, and ExpressRoute" },
  { id: "public-and-private-endpoints", domainId: "architecture-services", groupId: "describe-compute-and-networking-services", text: "Define public and private endpoints" },

  // Describe Azure storage services
  { id: "compare-storage-services", domainId: "architecture-services", groupId: "describe-storage-services", text: "Compare Azure Storage services" },
  { id: "storage-tiers", domainId: "architecture-services", groupId: "describe-storage-services", text: "Describe storage tiers" },
  { id: "storage-redundancy", domainId: "architecture-services", groupId: "describe-storage-services", text: "Describe redundancy options" },
  { id: "storage-account-options", domainId: "architecture-services", groupId: "describe-storage-services", text: "Describe storage account options and storage types" },
  { id: "file-movement-options", domainId: "architecture-services", groupId: "describe-storage-services", text: "Identify options for moving files, including AzCopy, Azure Storage Explorer, and Azure File Sync" },
  { id: "migration-options", domainId: "architecture-services", groupId: "describe-storage-services", text: "Describe migration options, including Azure Migrate and Azure Data Box" },

  // Describe Azure identity, access, and security
  { id: "directory-services", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe directory services in Azure, including Microsoft Entra ID and Microsoft Entra Domain Services" },
  { id: "authentication-methods", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe authentication methods in Azure, including single sign-on (SSO), multifactor authentication (MFA), and passwordless" },
  { id: "external-identities", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe external identities in Azure" },
  { id: "conditional-access", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe Microsoft Entra Conditional Access" },
  { id: "rbac", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe Azure role-based access control (RBAC)" },
  { id: "zero-trust", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe the concept of Zero Trust" },
  { id: "defense-in-depth", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe the purpose of the defense-in-depth model" },
  { id: "defender-for-cloud", domainId: "architecture-services", groupId: "describe-identity-access-and-security", text: "Describe the purpose of Microsoft Defender for Cloud" },

  // Describe cost management in Azure
  { id: "cost-factors", domainId: "management-governance", groupId: "describe-cost-management", text: "Describe factors that can affect costs in Azure" },
  { id: "pricing-calculator", domainId: "management-governance", groupId: "describe-cost-management", text: "Explore the pricing calculator" },
  { id: "cost-management-capabilities", domainId: "management-governance", groupId: "describe-cost-management", text: "Describe cost management capabilities in Azure" },
  { id: "tags", domainId: "management-governance", groupId: "describe-cost-management", text: "Describe the purpose of tags" },

  // Describe features and tools in Azure for governance and compliance
  { id: "purview-purpose", domainId: "management-governance", groupId: "describe-governance-and-compliance", text: "Describe the purpose of Microsoft Purview in Azure" },
  { id: "policy-purpose", domainId: "management-governance", groupId: "describe-governance-and-compliance", text: "Describe the purpose of Azure Policy" },
  { id: "resource-locks", domainId: "management-governance", groupId: "describe-governance-and-compliance", text: "Describe the purpose of resource locks" },

  // Describe features and tools for managing and deploying Azure resources
  { id: "azure-portal", domainId: "management-governance", groupId: "describe-management-and-deployment", text: "Describe the Azure portal" },
  { id: "cloud-shell-cli-powershell", domainId: "management-governance", groupId: "describe-management-and-deployment", text: "Describe Azure Cloud Shell, Azure CLI, and Azure PowerShell" },
  { id: "azure-arc-purpose", domainId: "management-governance", groupId: "describe-management-and-deployment", text: "Describe the purpose of Azure Arc" },
  { id: "infrastructure-as-code", domainId: "management-governance", groupId: "describe-management-and-deployment", text: "Describe infrastructure as code (IaC)" },
  { id: "arm-and-templates", domainId: "management-governance", groupId: "describe-management-and-deployment", text: "Describe Azure Resource Manager (ARM) and ARM templates" },

  // Describe monitoring tools in Azure
  { id: "advisor-purpose", domainId: "management-governance", groupId: "describe-monitoring-tools", text: "Describe the purpose of Azure Advisor" },
  { id: "service-health", domainId: "management-governance", groupId: "describe-monitoring-tools", text: "Describe Azure Service Health" },
  { id: "azure-monitor-tools", domainId: "management-governance", groupId: "describe-monitoring-tools", text: "Describe Azure Monitor, including Log Analytics, Azure Monitor alerts, and Azure Monitor Application Insights" },
];

const objectiveIndex = new Map(az900Objectives.map((objective) => [objective.id, objective]));
const groupIndex = new Map(az900ObjectiveGroups.map((group) => [group.id, group]));
const domainIndex = new Map(az900DomainDefinitions.map((domain) => [domain.id, domain]));

export function az900ObjectiveById(id: string) {
  return objectiveIndex.get(id);
}

export function az900GroupById(id: string) {
  return groupIndex.get(id);
}

export function az900DomainById(id: Az900DomainId) {
  return domainIndex.get(id);
}

/** Verbatim bullet text, or undefined when the id is not an official objective. */
export function az900ObjectiveText(id: string) {
  return objectiveIndex.get(id)?.text;
}