/** Shared, reviewed workflows. Images stay on Microsoft Learn (not copied into the bank). */
import type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";
import { rodcGuideBindings } from "./ad-visual-guides-rodc";
import { accountsGuideBindings } from "./ad-visual-guides-accounts";
import { policyGuideBindings } from "./ad-visual-guides-policy";
export type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

const source = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-";
const media = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/media/install-a-new-windows-server-2012-active-directory-forest--level-200-/";

export const adForestGuide: AdVisualGuideData = {
  id: "ad-first-domain-controller",
  title: "AD DS · first domain controller",
  source,
  versionNote: "Microsoft screenshots show Windows Server 2012. The Server Manager workflow also applies to newer Windows Server releases; appearance and available functional levels differ. This example creates a NEW forest, not an additional controller in an existing domain.",
  prerequisites: "Use an isolated lab VM with Desktop Experience, a planned server name, stable IP configuration and administrator access. For an existing domain, use its internal DNS and the appropriate deployment option instead.",
  steps: [
    { id: "open", title: "Open the role wizard", path: ["Server Manager", "Manage", "Add Roles and Features"], instruction: "Open the role wizard on the intended lab server.", image: "adds_smi_tr_manageaddroles.png", alt: "Server Manager Manage menu with Add Roles and Features." },
    { id: "type", title: "Choose the installation type", path: ["Before you begin", "Next", "Installation Type"], instruction: "Choose the role-based option. On Server Selection, select the target server; do not use the Remote Desktop Services installation option.", image: "adds_smi_tr_selectinstallationtype.png", alt: "Add Roles and Features wizard showing installation type choices." },
    { id: "role", title: "Install AD DS and its tools", path: ["Server Roles", "Active Directory Domain Services", "Add Features"], instruction: "Accept the required management tools, continue through the information pages and confirm installation. Installing the role alone does NOT promote the server.", image: "adds_smi_tr_selectserverroles.png", alt: "Server Roles page containing the Active Directory Domain Services checkbox." },
    { id: "promote", title: "Start domain controller promotion", path: ["Installation Results", "Promote this server to a domain controller"], instruction: "After installation succeeds, start the separate configuration wizard. If you closed Results, use the Server Manager notification flag.", image: "adds_smi_tr_promote.png", alt: "Installation Results page with the domain controller promotion link." },
    { id: "forest", title: "Create the lab forest", path: ["Deployment Configuration", "Add a new forest", "Root domain name"], instruction: "For this NEW lab forest, enter corp.contoso.com as an example DNS domain. To extend an existing domain, choose the additional-domain-controller option instead.", image: "adds_smi_tr_addnewforest.png", alt: "Deployment Configuration with Add a new forest selected and a root domain name field." },
    { id: "options", title: "Set domain controller options", path: ["Domain Controller Options", "DNS server", "DSRM password"], instruction: "Choose functional levels supported by your environment and set a DSRM recovery password. Continue through DNS and NetBIOS options; do not copy the old screenshot's functional levels blindly.", image: "adds_smi_dcoptions_forest.gif", alt: "Domain Controller Options showing functional levels, DNS and DSRM password fields." },
    { id: "paths", title: "Review the database and SYSVOL paths", path: ["Paths", "Database folder / Log files folder / SYSVOL folder"], instruction: "Check the three locations. Default database and log storage is C:\\Windows\\NTDS; SYSVOL is C:\\Windows\\SYSVOL. The directory database file is ntds.dit; SYSVOL holds domain policy and script files.", image: "adds_smi_tr_forestpaths.png", alt: "Paths page with separate AD database, log and SYSVOL folder fields." },
    { id: "review", title: "Review the planned changes", path: ["Review Options", "View Script", "Next"], instruction: "Review the domain and options. View Script shows the PowerShell equivalent before promotion; this is a review step, not proof that deployment succeeded.", image: "adds_smi_tr_forestreviewoptions.png", alt: "Review Options page with a summary and View Script button." },
    { id: "checks", title: "Validate, install and verify", path: ["Prerequisites Check", "Install", "Restart"], instruction: "Resolve blocking prerequisite errors before installing. Promotion restarts the server. Afterwards open AD Users and Computers and verify the new domain and DNS; a successful role install alone is not sufficient.", image: "adds_smi_tr_forestprereqcheck.png", alt: "Prerequisites Check page showing validation results before Install." },
  ] satisfies AdVisualStep[],
};

const demotionMedia = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/media/demoting-domain-controllers-and-domains--level-200-/";
export const adDemotionGuide: AdVisualGuideData = {
  id: "ad-graceful-demotion",
  title: "AD DS · gracefully demote a controller",
  source: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/demoting-domain-controllers-and-domains--level-200-",
  versionNote: "Official screenshots use the older Server Manager interface. The workflow applies to newer Windows Server releases, but some pages depend on DNS, global catalog and last-controller conditions.",
  prerequisites: "Lab reference only: demotion changes a real domain. Check backups, replication and remaining DNS/GC service first; transfer FSMO roles from a healthy controller. This example removes an EXTRA reachable controller, not the last controller or the domain.",
  steps: [
    { id: "remove-wizard", title: "Open the removal wizard", path: ["Server Manager", "Manage", "Remove Roles and Features"], instruction: "Start the wizard and select the intended server. Confirm another healthy controller remains.", image: `${demotionMedia}adds_rrw_tr_manage.png`, alt: "Server Manager Manage menu showing Remove Roles and Features." },
    { id: "uncheck-role", title: "Clear the AD DS role checkbox", path: ["Server Roles", "Active Directory Domain Services"], instruction: "Clear the role checkbox. A running domain controller must be demoted before its role binaries can be removed.", image: `${demotionMedia}adds_rrw_tr_serverroles.png`, alt: "Remove Roles and Features wizard with the AD DS role checkbox." },
    { id: "demote-link", title: "Follow the demotion link", path: ["Validation Results", "Demote this domain controller"], instruction: "Follow the validation dialog's demotion link. Do not bypass this safeguard with DISM or merely delete the computer object.", image: `${demotionMedia}adds_rrw_tr_demote.png`, alt: "Validation dialog providing the Demote this domain controller link." },
    { id: "credentials", title: "Use normal, graceful removal", path: ["Credentials", "Domain Admin credentials", "Next"], instruction: "For a reachable extra controller, leave forced removal and last-controller options unchecked. Forced removal leaves metadata behind; removing the last controller deletes the domain.", image: `${demotionMedia}adds_rrw_tr_credentials.png`, alt: "Demotion credentials page with force removal and last domain controller choices.", imageNote: "Do not copy the checked last-controller box in this reference image: our scenario removes an EXTRA healthy controller. Leave that box and forced removal unchecked." },
    { id: "warnings", title: "Read the service-impact warnings", path: ["Warnings", "Proceed with removal"], instruction: "Review DNS and global catalog impact. Continue only when the remaining controllers can provide the required services.", image: `${demotionMedia}adds_rrw_tr_warnings.png`, alt: "Demotion Warnings page explaining removal impact." },
    { id: "local-password", title: "Set the local administrator password", path: ["New Administrator Password", "Password", "Confirm password"], instruction: "Set a recovery password for the local Administrator account that becomes available after demotion.", image: `${demotionMedia}adds_rrw_tr_newadminpwd.png`, alt: "New Administrator Password page with masked password and confirmation fields." },
    { id: "demote-review", title: "Review, demote and restart", path: ["Review Options", "Demote", "Restart"], instruction: "Check the final plan, then demote and restart. Verify replication and DNS on the remaining controllers before optionally removing role binaries.", image: `${demotionMedia}adds_rrw_tr_confirmation.png`, alt: "Final Review Options page before domain controller demotion." },
  ],
};

// Explicit question identity avoids guessing from a broad AD domain or an answer option.
// New workflows can be attached to other questions without duplicating image sets.
const guideBindings: Record<string, Omit<AdVisualBinding, "guide"> & { guide?: AdVisualGuideData }> = {
  ...rodcGuideBindings,
  ...accountsGuideBindings,
  ...policyGuideBindings,
  "az802-q-010": { startStep: "paths", context: "Locate the AD DS database in the Paths screen. This is the deployment workflow behind the database-file question." },
  "az802-q-011": { startStep: "paths", context: "Compare SYSVOL with the separate database and log folders. This screen shows where the domain policy files are stored." },
  "az802-q-044": { startStep: "checks", context: "Before adding a controller to an existing domain: Network Connections (ncpa.cpl) → adapter Properties → IPv4 Properties → set internal AD DNS. Verify domain resolution. The images below show the RELATED new-forest deployment wizard, not the DNS client settings screen." },
  "az802-q-045": { startStep: "options", context: "DNS client path: Network Connections (ncpa.cpl) → adapter Properties → IPv4 Properties → Preferred DNS server. Use your internal AD DNS address, not a public resolver. Below is the RELATED new-forest DNS role screen; installing DNS and setting the DNS client are different operations." },
  "az802-q-046": { guide: adDemotionGuide, startStep: "remove-wizard", context: "This is the GUI path for gracefully removing a healthy, reachable extra domain controller. It is different from forced removal or deleting a computer account." },
};

export function getAdVisualGuide(question: { id: string; domain: string }) {
  const binding = question.domain === "Deploy and manage AD DS" ? guideBindings[question.id] : undefined;
  return binding ? { ...binding, guide: binding.guide ?? adForestGuide } : null;
}

export function adStepImage(step: AdVisualStep) { return step.image.startsWith("https://") ? step.image : `${media}${step.image}`; }
