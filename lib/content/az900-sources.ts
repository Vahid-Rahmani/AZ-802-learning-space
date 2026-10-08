/**
 * Verified Microsoft Learn sources for the AZ-900 bank.
 *
 * Every URL in this file was fetched with HTTP 200 and its content inspected
 * while the AZ-900 bank was written. Nothing here is a guessed link, a
 * training-module landing page, or a redirect that was not confirmed to land on
 * the intended article. When a page moves, re-verify it here rather than
 * inline in a question, so the whole bank keeps one auditable source list.
 *
 * Guide that defines the objective wording and weights:
 * https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900
 */

const learn = "https://learn.microsoft.com/en-us/";

function page(path: string) {
  return learn + path;
}

export const az900Guide = page("credentials/certifications/resources/study-guides/az-900");
export const az900Certification = page("credentials/certifications/azure-fundamentals/");
export const az900PracticeAssessment = page(
  "credentials/certifications/azure-fundamentals/practice/assessment?assessment-type=practice&assessmentId=23&practice-assessment-type=certification",
);

/**
 * Canonical, content-verified pages keyed by the local objective slug. A
 * question's `sourceRefs` must come from this map so an explanation can never
 * point a learner at a page nobody read.
 */
export const az900Sources = {
  // Shared across domains
  sharedResponsibility: page("azure/security/fundamentals/shared-responsibility"),
  architectureStyles: page("azure/architecture/guide/architecture-styles"),
  cafOverview: page("azure/cloud-adoption-framework/overview"),

  // Describe cloud computing
  cloudConceptPatterns: page("azure/cloud-adoption-framework/"),
  consumptionPricing: page("azure/cost-management-billing/cost-management-billing-faq"),
  pricingCalculator: page("azure/cost-management-billing/costs/pricing-calculator"),
  reservations: page("azure/cost-management-billing/reservations/save-compute-costs-reservations"),
  hybridBenefit: page("azure/cost-management-billing/azure-hybrid-benefits/"),
  serverlessFunctions: page("azure/azure-functions/functions-overview"),

  // Cloud benefits
  reliabilityOverview: page("azure/reliability/overview"),
  reliabilityPillar: page("azure/well-architected/reliability"),
  serviceHealth: page("azure/service-health/overview"),
  policyOverview: page("azure/governance/policy/overview"),
  defenderForCloudIntro: page("azure/defender-for-cloud/defender-for-cloud-introduction"),
  managementGroups: page("azure/governance/management-groups/azure-management"),
  armOverview: page("azure/azure-resource-manager/management/overview"),
  armTemplates: page("azure/azure-resource-manager/templates/overview"),
  cloudShell: page("azure/cloud-shell/overview"),

  // Service types
  vmsOverview: page("azure/virtual-machines/overview"),
  appService: page("azure/app-service/overview"),
  paasSql: page("azure/azure-sql/database/sql-database-paas-overview"),
  entraWhatIs: page("entra/fundamentals/what-is-entra"),

  // Core architectural components
  regionsOverview: page("azure/reliability/regions-overview"),
  regionsPaired: page("azure/reliability/regions-paired"),
  regionsList: page("azure/reliability/regions-list"),
  sovereignCloud: page("azure/reliability/concept-reliability-sovereignty"),
  availabilityZones: page("azure/reliability/availability-zones-overview"),
  portalResources: page("azure/azure-resource-manager/management/manage-resources-portal"),
  resourceProviders: page("azure/azure-resource-manager/management/azure-services-resource-providers"),
  billingManage: page("azure/cost-management-billing/manage/"),
  costManagement: page("azure/cost-management-billing/"),
  managementGroupsOverview: page("azure/governance/management-groups/overview"),
  rbacScope: page("azure/role-based-access-control/scope-overview"),

  // Compute and networking
  containerApps: page("azure/container-apps/overview"),
  vmAvailability: page("azure/virtual-machines/availability"),
  vmScaleSets: page("azure/virtual-machine-scale-sets/overview"),
  vmSizes: page("azure/virtual-machines/sizes/overview"),
  availabilitySets: page("azure/virtual-machines/availability-set-overview"),
  virtualDesktop: page("azure/virtual-desktop/overview"),
  vnets: page("azure/virtual-network/virtual-networks-overview"),
  vnetSubnets: page("azure/networking/design-guide/vnets-subnets"),
  vnetPeering: page("azure/virtual-network/virtual-network-peering-overview"),
  azureDns: page("azure/dns/dns-overview"),
  vpnGateway: page("azure/vpn-gateway/"),
  expressRoute: page("azure/expressroute/"),
  privateEndpoint: page("azure/private-link/private-endpoint-overview"),
  privateLink: page("azure/private-link/private-link-overview"),
  storagePrivateEndpoints: page("azure/storage/common/storage-private-endpoints"),
  hubSpoke: page("azure/architecture/networking/architecture/hub-spoke"),

  // Storage
  storageAccount: page("azure/storage/common/storage-account-overview"),
  blobs: page("azure/storage/blobs/storage-blobs-introduction"),
  files: page("azure/storage/files/storage-files-introduction"),
  filesSmb: page("azure/storage/files/files-smb-protocol"),
  queues: page("azure/storage/queues/storage-queues-introduction"),
  tables: page("azure/storage/tables/table-storage-overview"),
  accessTiers: page("azure/storage/blobs/access-tiers-overview"),
  redundancy: page("azure/storage/common/storage-redundancy"),
  azCopy: page("azure/storage/common/storage-use-azcopy-blobs-copy"),
  storageExplorer: page("azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer"),
  fileSync: page("azure/storage/file-sync/file-sync-introduction"),
  migrate: page("azure/migrate/migrate-services-overview"),
  migrateAssessment: page("azure/migrate/concepts-assessment-overview"),
  dataBox: page("azure/databox-online/"),

  // Identity, access, security
  domainServices: page("entra/identity/domain-services/overview"),
  singleSignOn: page("entra/identity/enterprise-apps/what-is-single-sign-on"),
  mfaConcept: page("entra/identity/authentication/concept-mfa-howitworks"),
  mfaGetStarted: page("entra/identity/authentication/howto-mfa-getstarted"),
  passwordless: page("entra/identity/authentication/howto-authentication-passwordless-security-key-on-premises"),
  authenticationStrengths: page("entra/identity/authentication/concept-authentication-strengths"),
  authenticatorApp: page("entra/identity/authentication/concept-authentication-authenticator-app"),
  externalIdentities: page("entra/external-id/external-identities-overview"),
  conditionalAccess: page("entra/identity/conditional-access/overview"),
  rbac: page("azure/role-based-access-control/overview"),
  zeroTrust: page("azure/security/fundamentals/zero-trust"),
  managedIdentities: page("entra/identity/managed-identities-azure-resources/overview"),

  // Cost management
  costOptimization: page("azure/well-architected/cost-optimization"),
  costManagementFaq: page("azure/cost-management-billing/cost-management-billing-faq"),
  budgets: page("azure/cost-management-billing/costs/tutorial-acm-create-budgets"),
  tags: page("azure/azure-resource-manager/management/tag-resources"),

  // Governance and compliance
  purview: page("purview/"),
  purviewPortal: page("purview/purview-portal"),
  policyInitiatives: page("azure/governance/policy/concepts/initiative-definition-structure"),
  locks: page("azure/azure-resource-manager/management/lock-resources"),

  // Management and deployment
  portal: page("azure/azure-portal/azure-portal-overview"),
  cli: page("cli/azure/"),
  azurePowerShell: page("powershell/azure/"),
  azureArc: page("azure/azure-arc/overview"),
  azureArcServers: page("azure/azure-arc/servers/overview"),
  bicep: page("azure/azure-resource-manager/bicep/overview"),
  armSyntax: page("azure/azure-resource-manager/templates/syntax"),

  // Monitoring
  advisor: page("azure/advisor/advisor-overview"),
  advisorGetStarted: page("azure/advisor/advisor-get-started"),
  monitorOverview: page("azure/azure-monitor/fundamentals/overview"),
  logAnalytics: page("azure/azure-monitor/logs/log-analytics-overview"),
  monitorAlerts: page("azure/azure-monitor/alerts/alerts-overview"),
  appInsights: page("azure/azure-monitor/app/app-insights-overview"),
} as const;

export type Az900SourceKey = keyof typeof az900Sources;

export function az900Source(key: Az900SourceKey) {
  return az900Sources[key];
}