import type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

const sources = {
  arc: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/overview",
  initiative: "https://learn.microsoft.com/en-us/azure/governance/policy/concepts/initiative-definition-structure",
  initiativePortal: "https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage",
  machine: "https://learn.microsoft.com/en-us/azure/governance/machine-configuration/overview/01-overview-concepts",
  builtIns: "https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/assign-built-in-policies",
  results: "https://learn.microsoft.com/en-us/azure/governance/machine-configuration/how-to/view-compliance",
  historicalResults: "https://learn.microsoft.com/en-us/azure/governance/policy/how-to/determine-non-compliance",
  remediation: "https://learn.microsoft.com/en-us/azure/governance/policy/how-to/remediate-resources",
  extensions: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/manage-vm-extensions-portal",
  security: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/security-overview",
  access: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/cloud-native/identity-access",
};
const policyMedia = "https://learn.microsoft.com/en-us/azure/governance/policy/media/";
const versionNote = "Official Microsoft Learn reference images, visually reviewed against their source articles. Portal capture versions are unspecified unless a historical date is stated. These are Azure cloud interfaces, not Windows Server 2025 desktop captures. Example names and results are not your environment; this guide has not changed any Azure resources.";

function screenshot(step: Omit<AdVisualStep, "screenshotSource" | "screenshotCredit">): AdVisualStep {
  return { ...step, screenshotSource: step.source, screenshotCredit: "Microsoft Learn · Microsoft Azure documentation" };
}

const arcPolicy: AdVisualGuideData = {
  id: "hybrid-arc-policy-configuration",
  title: "Azure Arc + Azure Policy · inventory and desired configuration",
  category: "Hybrid management", kind: "concept", source: sources.arc, versionNote,
  prerequisites: "Use a supported, connected Arc-enabled lab server and authorized read access. Assignments, guest configuration changes and remediation require separate approval and appropriate permissions. Confirm the selected definition supports Arc and the server OS before any deployment.",
  steps: [
    {
      id: "arc-policy-inventory", title: "Connect inventory to policy scope",
      path: ["Azure Arc", "Machines → select the server", "Overview → status and resource ID", "Azure Policy → assignment scope"],
      instruction: "Arc gives a non-Azure server an Azure resource identity and inventory representation. Policy supplies governance for resources in the chosen scope. Arc connection alone does not prove compliance or configure every OS setting.",
      source: sources.arc,
      alt: "Self-authored diagram connecting an outside-Azure server through the Connected Machine agent to an Arc resource and a scoped Azure Policy assignment.",
      imageNote: "Authored explanatory diagram, not a Microsoft screenshot. Arc represents the server in Azure; it does not move the server into Azure.",
      diagram: {
        title: "Authored diagram · inventory plus governance",
        nodes: [
          { id: "server", label: "Non-Azure server", detail: "On-premises or another cloud" },
          { id: "agent", label: "Connected Machine agent", detail: "Connection and metadata" },
          { id: "arc", label: "Arc resource", detail: "Resource ID, status and inventory" },
          { id: "policy", label: "Azure Policy assignment", detail: "Applicable definitions at a chosen scope" },
        ],
        edges: [{ from: "server", to: "agent" }, { from: "agent", to: "arc" }, { from: "policy", to: "arc", label: "Governance" }],
      },
    },
    {
      id: "configuration-effects", title: "Separate auditing from configuration enforcement",
      path: ["Azure Policy → Definitions", "Category → Guest Configuration", "Inspect effect, parameters and Arc applicability", "Assignment → scope, prerequisites and remediation identity"],
      instruction: "Choose a definition that includes Arc servers. Audit reports state without correcting it. Machine Configuration can apply settings; Apply and Autocorrect also corrects drift. DeployIfNotExists deploys the defined resources, not an arbitrary OS fix; remediation uses the assignment's managed identity with required least-privilege roles.",
      source: sources.machine,
      alt: "Self-authored diagram separating an Azure Policy assignment, audit-only results, authorized deployment and Machine Configuration enforcement modes.",
      imageNote: `Authored diagram, not portal UI. The Guest Configuration category remains in the portal. Definition-specific assignment parameters: ${sources.builtIns}. Managed identity and remediation: ${sources.remediation}.`,
      diagram: {
        title: "Authored diagram · select the intended effect and guest mode",
        nodes: [
          { id: "assignment", label: "Scoped Policy assignment", detail: "Definition, parameters and Arc support" },
          { id: "audit", label: "Audit", detail: "Report; no automatic correction" },
          { id: "deployment", label: "DeployIfNotExists", detail: "Defined deployment; remediation identity + roles" },
          { id: "guest", label: "Machine Configuration", detail: "Audit / Apply and Monitor / Apply and Autocorrect" },
        ],
        edges: [{ from: "assignment", to: "audit" }, { from: "assignment", to: "deployment" }, { from: "deployment", to: "guest", label: "When defined by the policy" }],
      },
    },
    screenshot({
      id: "guest-configuration-results", title: "Read machine-level configuration evidence",
      path: ["Azure Policy → Compliance", "Assignment → Resource compliance → Details", "Last evaluated resource → Guest Assignment", "Configuration item → compliance state and reason"],
      instruction: "Follow policy compliance to its Guest Assignment and inspect individual failed settings and the last evaluation time. Distinguish reported non-compliance from an authorized correction. An audit report does not prove that settings were changed.",
      source: sources.historicalResults,
      image: `${policyMedia}determine-non-compliance/guestconfig-compliance-details.png`,
      screenshotLabel: "Official Microsoft reference · historical Guest Assignment report (2019)",
      alt: "Historical Guest Assignment report dated August 29, 2019, showing an Azure VM named windows, configuration item compliance states and expected versus actual reasons.",
      imageNote: `This is a 2019 Azure VM report, not a current Arc server capture. It illustrates the shared guest-results structure only; the displayed preview-era baseline, counts and password values are not recommendations. Current navigation and evidence workflow: ${sources.results}.`,
    }),
  ],
};

const initiatives: AdVisualGuideData = {
  id: "hybrid-policy-initiatives", title: "Azure Policy · group definitions in an initiative",
  category: "Hybrid management", kind: "screenshot", source: sources.initiative, versionNote,
  prerequisites: "Read-only review needs access to the definition and its assignment. Create or assign initiatives only in an authorized lab scope; definition storage and assignment scope are different choices. Choose Arc-compatible definitions when governing Arc servers.",
  steps: [
    screenshot({
      id: "initiative-definitions", title: "Recognize the collection of policy definitions",
      path: ["Azure Policy", "Authoring → Definitions", "Initiative definition → Policies", "Policy definition and Reference ID"],
      instruction: "An initiative contains related policy definitions so the collection can be assigned together. Review each definition reference and its parameter mapping; an initiative is not a resource deployment or a diagnostic setting.",
      source: sources.initiativePortal,
      image: `${policyMedia}create-and-manage/initiative-definition-2.png`,
      screenshotLabel: "Official Microsoft portal reference · capture version unspecified",
      alt: "Initiative definition Policies table with multiple policy definitions, Reference ID and Group columns, including two separate references to a tagging policy.",
      imageNote: "Microsoft's example includes Azure VM and tagging policies. The table illustrates initiative membership, not a recommended Arc baseline; inspect each definition's supported resource types before using it for Arc servers.",
    }),
    screenshot({
      id: "initiative-assignment", title: "Assign the collection, then review individual results",
      path: ["Azure Policy → Definitions", "Select an initiative", "Assign → Scope and Parameters", "Compliance → initiative → included policies"],
      instruction: "Assign the initiative to the intended management group, subscription or resource group, with reviewed parameters and exclusions. After evaluation, inspect compliance for each included policy; grouping does not replace the policies' individual effects.",
      source: sources.initiativePortal,
      image: `${policyMedia}create-and-manage/assign-definition.png`,
      screenshotLabel: "Official Microsoft portal reference · capture version unspecified",
      alt: "Get Secure initiative definition with its Assign button highlighted and Edit initiative and Delete initiative beside it.",
      imageNote: "This image shows only the Assign entry point, not completed scope selection or a deployed assignment. Get Secure is Microsoft's example initiative; its name is not a required built-in.",
    }),
  ],
};

const extensionAccess: AdVisualGuideData = {
  id: "hybrid-arc-extension-least-privilege", title: "Azure Arc extensions · only needed capabilities and access",
  category: "Hybrid management", kind: "screenshot", source: sources.security, versionNote,
  prerequisites: "Use authorized read access to inspect the Arc server. Extension deployment, upgrade, removal, role changes and agent allowlists can change server behavior and require approved administration; this guide performs none of them.",
  steps: [
    screenshot({
      id: "needed-extensions", title: "Review the installed extension inventory",
      path: ["Azure Arc → Machines", "Select the server", "Settings → Extensions", "Name, Type, Version, Status and Update available"],
      instruction: "Inventory extensions and connect each one to an actual monitoring, security or management need. Do not install every available extension. Review supported versions and health before proposing an approved change.",
      source: sources.extensions,
      image: "https://learn.microsoft.com/en-us/azure/azure-arc/servers/media/manage-vm-extensions-portal/vm-extensions-update-selected.png",
      screenshotLabel: "Official Microsoft Arc portal reference · capture version unspecified",
      alt: "Arc server svr01 Extensions pane with LinuxPatchExtension selected, its version, Succeeded status and an available update; Access control (IAM) is also visible.",
      imageNote: "Microsoft's image is a Linux server example with Update highlighted. Use it to recognize the inventory columns; it is not a Windows extension recommendation, least-privilege role screen or instruction to click Update.",
    }),
    {
      id: "extension-rbac", title: "Restrict who can manage extensions",
      path: ["Arc server → Access control (IAM)", "Review role assignments and inherited scope", "Required extension-management permissions only", "Approved extension allowlist where appropriate"],
      instruction: "Limit extension management to authorized identities at the smallest practical scope. Onboarding permission is not a reason to grant ongoing administration. The extension manager runs as Local System on Windows or root on Linux, so broad deployment access can affect the OS; consider just-in-time elevation and approved allowlists.",
      source: sources.access,
      alt: "Self-authored diagram of an authorized identity, narrowly scoped extension-management permissions, approved extensions and the privileged extension manager on the server.",
      imageNote: `Authored security model, not an IAM screenshot. Local service privileges and extension restrictions: ${sources.security}. No universal role is prescribed; select permissions for the actual task.`,
      diagram: {
        title: "Authored diagram · least privilege across two boundaries",
        nodes: [
          { id: "identity", label: "Authorized identity", detail: "Named access; optional just-in-time elevation" },
          { id: "rbac", label: "Scoped Azure RBAC", detail: "Only required extension-management operations" },
          { id: "needed", label: "Approved extensions", detail: "Needed capabilities; optional agent allowlist" },
          { id: "manager", label: "Extension manager", detail: "Windows: Local System / Linux: root" },
        ],
        edges: [{ from: "identity", to: "rbac" }, { from: "rbac", to: "needed" }, { from: "needed", to: "manager" }],
      },
    },
  ],
};

export const hybridPolicyConfigBindings: Record<string, AdVisualBinding> = {
  "az802-q-084": { guide: arcPolicy, startStep: "arc-policy-inventory", context: "Arc provides outside-Azure server inventory; Azure Policy governs applicable configuration at a scope." },
  "az802-q-085": { guide: initiatives, startStep: "initiative-definitions", context: "An initiative is a collection of related policy definitions, not a VM artifact or networking object." },
  "az802-q-089": { guide: extensionAccess, startStep: "needed-extensions", context: "Deploy only needed Arc extensions and restrict management to least-privilege authorized identities." },
  "az802-q-096": { guide: arcPolicy, startStep: "configuration-effects", context: "Azure Policy orchestrates desired configuration for Arc servers; auditing and enforcement depend on the selected policy and Machine Configuration mode." },
  "az802-q-319": { guide: initiatives, startStep: "initiative-definitions", context: "Related policy definitions are grouped into an initiative and can be assigned together." },
};
