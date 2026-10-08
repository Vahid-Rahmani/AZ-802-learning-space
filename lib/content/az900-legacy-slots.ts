/**
 * Objective slot for every question id that existed before the AZ-900 bank was
 * rebuilt, keyed by that id in order.
 *
 * Attempts and Leitner cards are stored by question id, so this table is what
 * keeps a learner's history pointing at the same official objective after the
 * questions themselves are replaced with sourced, reviewed items.
 *
 * Read only. Changing an entry re-points existing progress at a different
 * objective, so regenerate deliberately and expect to clear derived progress.
 *
 * 180 preserved ids across 57 objectives.
 */
export const LEGACY_OBJECTIVE_SLOTS_BY_ID: Record<string, string> = {
  "az900-q-001": "define-cloud-computing",
  "az900-q-002": "define-cloud-computing",
  "az900-q-003": "define-cloud-computing",

  "az900-q-004": "shared-responsibility-model",
  "az900-q-005": "shared-responsibility-model",
  "az900-q-006": "shared-responsibility-model",
  "az900-q-007": "shared-responsibility-model",

  "az900-q-008": "cloud-models",
  "az900-q-009": "cloud-models",
  "az900-q-010": "cloud-models",

  "az900-q-011": "cloud-model-use-cases",
  "az900-q-012": "cloud-model-use-cases",
  "az900-q-013": "cloud-model-use-cases",
  "az900-q-014": "cloud-model-use-cases",
  "az900-q-015": "cloud-model-use-cases",
  "az900-q-016": "cloud-model-use-cases",
  "az900-q-017": "cloud-model-use-cases",

  "az900-q-018": "consumption-based-model",
  "az900-q-019": "consumption-based-model",
  "az900-q-020": "consumption-based-model",

  "az900-q-021": "cloud-pricing-models",
  "az900-q-022": "cloud-pricing-models",
  "az900-q-023": "cloud-pricing-models",

  "az900-q-024": "serverless",
  "az900-q-025": "serverless",
  "az900-q-026": "serverless",

  "az900-q-027": "availability-and-scalability-benefits",
  "az900-q-028": "availability-and-scalability-benefits",
  "az900-q-029": "availability-and-scalability-benefits",
  "az900-q-030": "availability-and-scalability-benefits",
  "az900-q-031": "availability-and-scalability-benefits",
  "az900-q-032": "availability-and-scalability-benefits",
  "az900-q-033": "availability-and-scalability-benefits",

  "az900-q-034": "reliability-and-predictability-benefits",
  "az900-q-035": "reliability-and-predictability-benefits",
  "az900-q-036": "reliability-and-predictability-benefits",

  "az900-q-037": "security-and-governance-benefits",
  "az900-q-038": "security-and-governance-benefits",

  "az900-q-039": "manageability-benefits",
  "az900-q-040": "manageability-benefits",

  "az900-q-041": "describe-iaas",
  "az900-q-042": "describe-iaas",

  "az900-q-043": "describe-paas",
  "az900-q-044": "describe-paas",
  "az900-q-045": "describe-paas",

  "az900-q-046": "describe-saas",
  "az900-q-047": "describe-saas",

  "az900-q-048": "service-type-use-cases",
  "az900-q-049": "service-type-use-cases",
  "az900-q-050": "service-type-use-cases",

  "az900-q-051": "regions-pairs-sovereign",
  "az900-q-052": "regions-pairs-sovereign",
  "az900-q-053": "regions-pairs-sovereign",
  "az900-q-054": "regions-pairs-sovereign",
  "az900-q-055": "regions-pairs-sovereign",
  "az900-q-056": "regions-pairs-sovereign",

  "az900-q-057": "availability-zones",
  "az900-q-058": "availability-zones",
  "az900-q-059": "availability-zones",
  "az900-q-060": "availability-zones",

  "az900-q-061": "datacenters",
  "az900-q-062": "datacenters",
  "az900-q-063": "datacenters",

  "az900-q-064": "resources-and-resource-groups",
  "az900-q-065": "resources-and-resource-groups",
  "az900-q-066": "resources-and-resource-groups",

  "az900-q-067": "subscriptions",
  "az900-q-068": "subscriptions",
  "az900-q-069": "subscriptions",

  "az900-q-070": "management-groups",
  "az900-q-071": "management-groups",
  "az900-q-072": "management-groups",

  "az900-q-073": "scope-hierarchy",
  "az900-q-074": "scope-hierarchy",
  "az900-q-075": "scope-hierarchy",

  "az900-q-076": "compare-compute-types",
  "az900-q-077": "compare-compute-types",

  "az900-q-078": "virtual-machine-options",
  "az900-q-079": "virtual-machine-options",
  "az900-q-080": "virtual-machine-options",

  "az900-q-081": "virtual-machine-resources",
  "az900-q-082": "virtual-machine-resources",

  "az900-q-083": "application-hosting-options",
  "az900-q-084": "application-hosting-options",

  "az900-q-085": "virtual-networking",
  "az900-q-086": "virtual-networking",
  "az900-q-087": "virtual-networking",

  "az900-q-088": "public-and-private-endpoints",
  "az900-q-089": "public-and-private-endpoints",

  "az900-q-090": "compare-storage-services",
  "az900-q-091": "compare-storage-services",

  "az900-q-092": "storage-tiers",
  "az900-q-093": "storage-tiers",

  "az900-q-094": "storage-redundancy",
  "az900-q-095": "storage-redundancy",
  "az900-q-096": "storage-redundancy",

  "az900-q-097": "storage-account-options",
  "az900-q-098": "storage-account-options",

  "az900-q-099": "file-movement-options",
  "az900-q-100": "file-movement-options",

  "az900-q-101": "migration-options",
  "az900-q-102": "migration-options",

  "az900-q-103": "directory-services",
  "az900-q-104": "directory-services",

  "az900-q-105": "authentication-methods",
  "az900-q-106": "authentication-methods",

  "az900-q-107": "external-identities",
  "az900-q-108": "external-identities",

  "az900-q-109": "conditional-access",
  "az900-q-110": "conditional-access",

  "az900-q-111": "rbac",
  "az900-q-112": "rbac",
  "az900-q-113": "rbac",

  "az900-q-114": "zero-trust",
  "az900-q-115": "zero-trust",

  "az900-q-116": "defense-in-depth",
  "az900-q-117": "defense-in-depth",

  "az900-q-118": "defender-for-cloud",
  "az900-q-119": "defender-for-cloud",

  "az900-q-120": "cost-factors",
  "az900-q-121": "cost-factors",
  "az900-q-122": "cost-factors",
  "az900-q-123": "cost-factors",

  "az900-q-124": "pricing-calculator",
  "az900-q-125": "pricing-calculator",
  "az900-q-126": "pricing-calculator",
  "az900-q-127": "pricing-calculator",

  "az900-q-128": "cost-management-capabilities",
  "az900-q-129": "cost-management-capabilities",
  "az900-q-130": "cost-management-capabilities",
  "az900-q-131": "cost-management-capabilities",

  "az900-q-132": "tags",
  "az900-q-133": "tags",
  "az900-q-134": "tags",
  "az900-q-135": "tags",

  "az900-q-136": "purview-purpose",
  "az900-q-137": "purview-purpose",
  "az900-q-138": "purview-purpose",
  "az900-q-139": "purview-purpose",

  "az900-q-140": "policy-purpose",
  "az900-q-141": "policy-purpose",
  "az900-q-142": "policy-purpose",
  "az900-q-143": "policy-purpose",

  "az900-q-144": "resource-locks",
  "az900-q-145": "resource-locks",
  "az900-q-146": "resource-locks",
  "az900-q-147": "resource-locks",

  "az900-q-148": "azure-portal",
  "az900-q-149": "azure-portal",
  "az900-q-150": "azure-portal",
  "az900-q-151": "azure-portal",

  "az900-q-152": "cloud-shell-cli-powershell",
  "az900-q-153": "cloud-shell-cli-powershell",
  "az900-q-154": "cloud-shell-cli-powershell",
  "az900-q-155": "cloud-shell-cli-powershell",

  "az900-q-156": "azure-arc-purpose",
  "az900-q-157": "azure-arc-purpose",
  "az900-q-158": "azure-arc-purpose",
  "az900-q-159": "azure-arc-purpose",

  "az900-q-160": "infrastructure-as-code",
  "az900-q-161": "infrastructure-as-code",
  "az900-q-162": "infrastructure-as-code",
  "az900-q-163": "infrastructure-as-code",

  "az900-q-164": "arm-and-templates",
  "az900-q-165": "arm-and-templates",
  "az900-q-166": "arm-and-templates",
  "az900-q-167": "arm-and-templates",

  "az900-q-168": "advisor-purpose",
  "az900-q-169": "advisor-purpose",
  "az900-q-170": "advisor-purpose",
  "az900-q-171": "advisor-purpose",

  "az900-q-172": "service-health",
  "az900-q-173": "service-health",
  "az900-q-174": "service-health",
  "az900-q-175": "service-health",
  "az900-q-176": "service-health",

  "az900-q-177": "azure-monitor-tools",
  "az900-q-178": "azure-monitor-tools",
  "az900-q-179": "azure-monitor-tools",
  "az900-q-180": "azure-monitor-tools",
};

/** Objective ids in preserved-id order, which is how the builder consumes them. */
export const LEGACY_OBJECTIVE_SLOTS: string[] = Object.values(LEGACY_OBJECTIVE_SLOTS_BY_ID);
