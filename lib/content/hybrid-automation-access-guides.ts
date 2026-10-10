import type { AdVisualBinding, AdVisualGuideData } from "./ad-visual-guide-types";

const schedules = "https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules";
const runbooks = "https://learn.microsoft.com/en-us/azure/automation/manage-runbooks";
const workflow = "https://learn.microsoft.com/en-us/azure/automation/learn/automation-tutorial-runbook-textual";
const identity = "https://learn.microsoft.com/en-us/azure/automation/quickstarts/enable-managed-identity";
const identityRunbook = "https://learn.microsoft.com/en-us/azure/automation/learn/powershell-runbook-managed-identity";
const execution = "https://learn.microsoft.com/en-us/azure/automation/automation-runbook-execution";
const bastion = "https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-rdp-windows";
const bastionCapture = "https://learn.microsoft.com/en-us/azure/azure-sql/virtual-machines/windows/sql-vm-create-portal-quickstart?view=azuresql";
const automationMedia = "https://learn.microsoft.com/en-us/azure/automation/media/automation-tutorial-runbook-textual/";
const bastionMedia = "https://learn.microsoft.com/en-us/azure/azure-sql/includes/media/virtual-machines-sql-server-remote-desktop-connect/";
const screenshotCredit = "Microsoft Learn · original documentation screenshot";
const screenshotLabel = "Microsoft Azure portal reference · interface varies by release";
const versionNote = "Original Microsoft documentation screenshots, visually reviewed against these steps. Some captures retain older portal labels and 2021 sample dates. Azure portal is a cloud interface, not a Windows Server 2025 capture; menus and available options vary by release, permissions and service configuration.";
const prerequisites = "Explanatory walkthrough only; no Azure operation has been performed. Use an approved test Automation account and reviewed runbook, a supported runtime with required modules, and appropriate delegated access. Publication, schedule creation and role assignment change Azure state; review their effect in your own environment.";

const automationSchedule: AdVisualGuideData = {
  id: "hybrid-automation-schedule-jobs",
  category: "Hybrid management",
  title: "Azure Automation · scheduled runs and job evidence",
  source: schedules, kind: "screenshot", versionNote, prerequisites,
  steps: [
    {
      id: "published-runbook", title: "Locate the published runbook",
      path: ["Azure portal", "Automation Accounts", "Your account", "Process Automation → Runbooks", "Your runbook → Overview"],
      instruction: "Review the published version before scheduling it. Locate Start, Link to schedule and Jobs. Automation supports PowerShell and Python runbooks; the capture is a PowerShell Workflow example, not a recommendation to choose that legacy runbook type.",
      image: `${automationMedia}workflow-runbook-overview.png`,
      alt: "Automation runbook Overview showing Published status, Start, Link to schedule, Jobs and Schedules.",
      source: runbooks, screenshotSource: workflow, screenshotCredit, screenshotLabel,
      imageNote: "The source's MyFirstRunbook-Workflow uses Windows PowerShell Workflow 5.1 and shows a 2021 date. Locate the scheduling controls; use a currently supported runtime suitable for your own PowerShell or Python code.",
    },
    {
      id: "schedule", title: "Link a schedule and review recurrence",
      path: ["Your runbook", "Resources → Schedules", "Add a schedule", "Link a schedule to your runbook", "Create a new schedule", "New schedule → Recurrence"],
      instruction: "Review start time, time zone and Once or Recurring. For weekly runs, select the required weekdays. Link the reviewed schedule and supply required nonsecret runbook parameters; creating a schedule alone does not associate it with a runbook. Creation and linking enable future executions.",
      image: "https://learn.microsoft.com/en-us/azure/automation/media/schedules/week-end-weekly-recurrence.png",
      alt: "Automation schedule Recurrence set to Recurring every one week with Saturday and Sunday selected.",
      source: schedules, screenshotSource: schedules, screenshotCredit, screenshotLabel,
      imageNote: "This original crop shows recurrence controls only. Weekend selections are examples, not the operations team's required schedule; start time, time zone and the runbook association are outside this crop.",
    },
    {
      id: "jobs", title: "Inspect the recorded execution",
      path: ["Azure portal", "Automation Accounts", "Your account", "Process Automation → Runbooks", "Your runbook → Resources → Jobs", "Select a job", "Output / Errors / Warnings / All Logs"],
      instruction: "Compare the job ID, timestamps, status, inputs and output/error streams for a recorded published run. A completed status does not replace checking the intended resource outcome. The Test pane runs draft code and does not create retained job history. Automation retains job logs for up to 30 days; use configured log forwarding when longer audit retention is required.",
      image: `${automationMedia}job-page-overview.png`,
      alt: "Automation Job page with a job ID, timestamps, Completed status and Input, Output, Errors, Warnings, All Logs and Exception tabs.",
      source: execution, screenshotSource: workflow, screenshotCredit, screenshotLabel,
      imageNote: "The original 2021 Workflow job illustrates the recorded job interface. Its parallel sample output and Completed status describe only that example, not this environment's results. This is a Job page, not Test output.",
    },
  ],
};

const automationIdentity: AdVisualGuideData = {
  id: "hybrid-automation-managed-identity",
  category: "Hybrid management",
  title: "Azure Automation · managed identity and scoped permissions",
  source: identityRunbook, kind: "screenshot", versionNote, prerequisites,
  steps: [
    {
      id: "identity", title: "Inspect the account's managed identity",
      path: ["Azure portal", "Automation Accounts", "Your account", "Account Settings → Identity", "System assigned"],
      instruction: "Inspect Status and the object (principal) ID. Enabling On and saving creates the account's system-assigned identity; it does not grant permissions to other resources. A user-assigned identity is a separate option with an independent lifecycle.",
      image: "https://learn.microsoft.com/en-us/azure/automation/quickstarts/media/enable-managed-identity/system-assigned-object-id.png",
      alt: "Automation managed identity status On with Object (principal) ID and Azure role assignments button.",
      source: identity, screenshotSource: identity, screenshotCredit, screenshotLabel,
      imageNote: "The documentation uses Identity (Preview) and the older Azure Active Directory name. Test-abc-123456 is the source's example principal identifier; use the actual identity in your account.",
    },
    {
      id: "role", title: "Match the role and scope to the operations",
      path: ["Your Automation account", "Identity → System assigned", "Azure role assignments", "Add role assignment", "Scope / target resource / Role"],
      instruction: "Determine the Azure actions the runbook needs, then review the identity's role at the narrowest suitable resource scope. The example shows a resource group and DevTest Labs User for its VM tutorial; choose permissions for your actual operations. Authentication succeeds independently of authorization to change a resource.",
      image: `${automationMedia}system-assigned-add-role-assignment-portal.png`,
      alt: "Azure role assignment form with Scope Resource group, a sample subscription/resource group, Role DevTest Labs User and Save.",
      source: workflow, screenshotSource: workflow, screenshotCredit, screenshotLabel,
      imageNote: "The Preview form and Contoso values belong to Microsoft's tutorial. The pictured group scope and role are not a blanket least-privilege recommendation; resource-specific IAM may provide a narrower scope for the intended task.",
    },
    {
      id: "authenticate", title: "Use the identity inside the runbook",
      path: ["Azure portal", "Automation Accounts", "Your account", "Process Automation → Runbooks", "Your PowerShell runbook → Edit"],
      instruction: "In reviewed PowerShell runbook code, disable inherited context and authenticate with the managed identity. Keep later resource operations tied to the selected subscription/context. This excerpt authenticates; it neither grants a role nor changes a resource. A user-assigned identity requires its explicit client ID.",
      command: "Disable-AzContextAutosave -Scope Process\nConnect-AzAccount -Identity",
      diagram: {
        title: "Managed identity authentication and authorization",
        nodes: [{ id: "runbook", label: "Runbook → managed identity" }, { id: "token", label: "Authenticate → access token" }, { id: "resource", label: "Target resource → scoped role check" }],
        edges: [{ from: "runbook", to: "token" }, { from: "token", to: "resource" }],
      },
      imageNote: "Authored explanatory diagram, not a portal screenshot. Authentication does not grant resource permissions.",
      source: identityRunbook,
      alt: "PowerShell runbook authentication with Disable-AzContextAutosave and Connect-AzAccount -Identity; no screenshot for this code excerpt.",
    },
  ],
};

const bastionBrowser: AdVisualGuideData = {
  id: "hybrid-bastion-browser-connect",
  category: "Hybrid management",
  title: "Azure Bastion · browser connection to a private VM",
  source: bastion, kind: "screenshot", versionNote,
  prerequisites: "Explanatory walkthrough only; no connection or deployment has been performed. Use an authorized Windows VM with a reachable private address, an existing suitable Bastion deployment and the required resource Reader and guest sign-in permissions. Basic or higher supports this dedicated browser RDP flow; custom ports require Standard or higher. The target VM needs no public IP, but must permit the relevant private RDP traffic from Bastion.",
  steps: [
    {
      id: "bastion", title: "Open the VM's Bastion connection page",
      path: ["Azure portal", "Virtual machines", "Your VM", "Connect", "Bastion / Connect via Bastion"],
      instruction: "Select the intended VM and open Bastion. Verify the existing host and private network reachability; Bastion brokers access to the guest over the virtual network. The VM does not need an Internet-facing RDP port or a public IP to accept this connection.",
      image: `${bastionMedia}azure-virtual-machine-connect.png?view=azuresql`,
      alt: "Azure VM Overview toolbar Connect menu with Connect via Bastion highlighted for sample Contoso-sqlvm.",
      source: bastion, screenshotSource: bastionCapture, screenshotCredit, screenshotLabel,
      imageNote: "The original comes from Microsoft's SQL VM tutorial and shows the general VM Bastion menu. Contoso-sqlvm is a sample name; SQL Server is not required. This crop does not establish the VM's IP configuration. Current portal versions may put Connect → Bastion in the left menu.",
    },
    {
      id: "connect", title: "Review authentication and open the browser session",
      path: ["Your VM", "Connect → Bastion", "Connection settings → RDP", "Authentication type", "Open in new browser tab", "Connect"],
      instruction: "Review protocol, port and the supported authentication method for this guest. Connect opens the remote session in a browser tab; allow the Bastion session popup if necessary. Azure resource access and guest sign-in rights are separate. SSH uses its corresponding connection flow for a compatible target.",
      image: `${bastionMedia}remote-desktop-connect.png?view=azuresql`,
      alt: "VM Bastion page showing Authentication Type, Open in new browser tab selected, and the highlighted Connect button.",
      source: bastion, screenshotSource: bastionCapture, screenshotCredit, screenshotLabel,
      imageNote: "The original source selected VM Password with masked input; that is an example authentication choice, not a required method. Current docs also describe Microsoft Entra ID (Preview), subject to prerequisites. The crop locates Connect and browser-tab selection, not a completed RDP session or a specific Windows Server version.",
    },
  ],
};

// Exact reviewed question identities; no matching by answer text or keywords.
export const hybridAutomationAccessBindings: Record<string, AdVisualBinding> = {
  "az802-q-073": { guide: automationSchedule, startStep: "schedule", context: "Azure Automation links published PowerShell or Python runbooks to schedules." },
  "az802-q-074": { guide: automationIdentity, startStep: "identity", context: "Use a managed identity and grant only the permissions required by the runbook." },
  "az802-q-320": { guide: automationIdentity, startStep: "role", context: "An identity authenticates the runbook; narrowly scoped role assignments authorize its operations." },
  "az802-q-326": { guide: automationSchedule, startStep: "jobs", context: "Recorded jobs expose status, inputs and output/error streams for operational review." },
  "az802-q-083": { guide: bastionBrowser, startStep: "bastion", context: "Bastion brokers browser RDP/SSH access over private networking without a public IP on each VM." },
  "az802-q-318": { guide: bastionBrowser, startStep: "connect", context: "Use the Bastion Connect page to open a browser RDP session to the privately reachable guest." },
};
