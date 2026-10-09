/** Shared, reviewed workflows; media is separate from the question bank. */
import type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";
import { rodcGuideBindings } from "./ad-visual-guides-rodc";
import { accountsGuideBindings } from "./ad-visual-guides-accounts";
import { policyGuideBindings } from "./ad-visual-guides-policy";
import { identityGuideBindings } from "./ad-visual-guides-identity";
import { networkGuideBindings } from "./ad-visual-guides-network";
import { operationsGuideBindings } from "./ad-visual-guides-operations";
import { withAdScreenshots } from "./ad-visual-screenshots";
import { getHybridVisualGuide } from "./hybrid-visual-guides";
export type { AdVisualBinding, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

const source = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-a-new-windows-server-2012-active-directory-forest--level-200-";
const media = "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/media/install-a-new-windows-server-2012-active-directory-forest--level-200-/";

export const adForestGuide: AdVisualGuideData = {
  id: "ad-first-domain-controller",
  title: "AD DS · first domain controller",
  source,
  walkthroughs: [{ title: "Install AD DS and create a new forest · MSSQLTips", url: "https://www.mssqltips.com/sqlservertip/11654/install-active-directory-on-windows-server-2025/", version: "Windows Server 2025" }],
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

const adDnsClientGuide: AdVisualGuideData = {
  id: "ad-internal-dns-client",
  title: "AD DS · configure the DNS client before promotion",
  kind: "concept",
  source: "https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/best-practices-for-dns-client-settings",
  versionNote: "Navigation applies to Windows Server 2025 Desktop Experience. These are authored diagrams, not screenshots. The external 2025 walkthrough covers first-forest setup; an additional controller must instead use existing internal AD DNS.",
  walkthroughs: [{ title: "IP and DNS setup for a new forest · MSSQLTips", url: "https://www.mssqltips.com/sqlservertip/11654/install-active-directory-on-windows-server-2025/", version: "Windows Server 2025" }],
  prerequisites: "Use an isolated AD lab and identify whether this is the first controller of a NEW forest or an additional controller of an EXISTING domain. Obtain the correct internal DNS addresses before changing adapter settings.",
  steps: [
    { id: "dns-client", title: "Point the adapter at internal AD DNS", path: ["Run → ncpa.cpl", "Target adapter → Properties", "Internet Protocol Version 4 → Properties", "Preferred DNS server"], instruction: "For an existing domain, enter its internal AD DNS address, not a public resolver. For the first and only controller running DNS in a new forest, use the planned local DNS address. External name resolution belongs on internal DNS forwarders or root hints; public DNS is not an AD-client fallback.", alt: "Client resolves directory records through internal AD DNS; external requests can be forwarded by that DNS server.", diagram: { title: "DNS client and server have different jobs", nodes: [{ id: "client", label: "Server adapter DNS", detail: "Points to internal AD DNS" }, { id: "dns", label: "Internal AD DNS", detail: "Answers AD records; forwards external names" }, { id: "public", label: "External resolver", detail: "Not the client's AD DNS backup" }], edges: [{ from: "client", to: "dns", label: "AD domain and locator queries" }, { from: "dns", to: "public", label: "Optional external forwarding" }] } },
    { id: "dns-check", title: "Verify the existing domain's locator records", path: ["PowerShell", "Resolve-DnsName", "Review the returned SRV targets"], instruction: "Before adding a controller to an existing domain, query its domain-controller locator records. Replace corp.contoso.com with your actual lab domain. For the first controller of a new forest these records do not exist before deployment; verify them after promotion instead.", command: "Resolve-DnsName -Type SRV _ldap._tcp.dc._msdcs.corp.contoso.com", alt: "Existing domain has locator records before promotion; a new forest creates them during promotion.", diagram: { title: "Choose the correct verification moment", nodes: [{ id: "existing", label: "Existing domain", detail: "Internal DNS already hosts DC locator records" }, { id: "new", label: "New forest", detail: "Verify DC locator records after promotion" }], edges: [] } },
  ],
};

// Explicit question identity avoids guessing from a broad AD domain or an answer option.
// New workflows can be attached to other questions without duplicating image sets.
const guideBindings: Record<string, Omit<AdVisualBinding, "guide"> & { guide?: AdVisualGuideData }> = {
  ...rodcGuideBindings,
  ...accountsGuideBindings,
  ...policyGuideBindings,
  ...identityGuideBindings,
  ...networkGuideBindings,
  ...operationsGuideBindings,
  "az802-q-010": { startStep: "paths", context: "Locate the AD DS database in the Paths screen. This is the deployment workflow behind the database-file question." },
  "az802-q-011": { startStep: "paths", context: "Compare SYSVOL with the separate database and log folders. This screen shows where the domain policy files are stored." },
  "az802-q-044": { guide: adDnsClientGuide, startStep: "dns-check", context: "Check the DNS prerequisites for the actual deployment: existing domain and new forest are different scenarios. This guide shows adapter configuration and the correct verification point." },
  "az802-q-045": { guide: adDnsClientGuide, startStep: "dns-client", context: "Use internal DNS that can resolve your AD namespace. Installing a DNS server role is different from configuring an adapter's DNS client." },
  "az802-q-046": { guide: adDemotionGuide, startStep: "remove-wizard", context: "This is the GUI path for gracefully removing a healthy, reachable extra domain controller. It is different from forced removal or deleting a computer account." },
};

export function getAdVisualGuide(question: { id: string; domain: string }) {
  const binding = question.domain === "Deploy and manage AD DS" ? guideBindings[question.id] : undefined;
  return binding ? { ...binding, guide: withAdScreenshots(binding.guide ?? adForestGuide) } : null;
}

export function adStepImage(step: AdVisualStep) { return step.image ? (step.image.startsWith("https://") || step.image.startsWith("/images/") ? step.image : `${media}${step.image}`) : ""; }

export function getQuestionVisualGuide(question: { id: string; domain: string }) {
  return getAdVisualGuide(question) ?? getHybridVisualGuide(question);
}
