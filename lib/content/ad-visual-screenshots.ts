import type { AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

// Reviewed original captures, not generated UI. Names/settings belong to the source lab.
// Pinned documentation + local unchanged PNGs avoid expiring attachment redirects.
const revision = "7fe4c1f9f6ff6871b2944f1d9fd18f8e8076e247";
const repository = `https://github.com/Hugh-Kumbi/Hugh-Kumbi-Active-Directory-Lab/blob/${revision}/`;
const setup = "02-Environment-Setup/I.%20Windows-Server-Setup.md";
const accounts = "03-Configuration/I.%20Active-Directory-Setup.md";
const dns = "03-Configuration/II.%20DNS-Setup.md";
const gpo = "03-Configuration/VII.%20GPO-Configurations.md";
const files = {
  "server-role": ["5cd38039-3f07-4bac-bfa1-e13427d5474f", setup, "Add Roles and Features showing AD DS and the required management tools."],
  "promotion-review": ["5d1fce70-9210-4f4f-be7a-61bb0dd29ca4", setup, "Server 2025 Review Options showing forest levels, DNS, global catalog and database, log and SYSVOL paths."],
  "promotion-checks": ["f339e91d-6469-4db4-8589-047feb46958e", setup, "Completed domain-controller promotion with warnings and the restart notification."],
  "dns-adapter": ["9dbc64e7-e854-4573-a383-d46e458b3c18", setup, "IPv4 Properties with static IP and the internal preferred DNS address."],
  "aduc-ous": ["5d0ed0ed-c889-4dd1-8823-736d404f4b75", accounts, "AD Users and Computers showing departmental OUs and built-in containers."],
  "aduc-ou-hierarchy": ["3ff7c471-fba8-49c1-9438-7c0aaa92fa3a", gpo, "Group Policy Management domain Status view, with Modeling and Results nodes in the tree."],
  "group-members": ["d025394d-6424-4d76-a8e0-ebea532e36cb", accounts, "Global security group's Members tab containing same-domain user accounts."],
  "user-memberships": ["0288b1fa-d90a-4ed9-a598-70d248caee3e", "06-Screenshots/IV.%20Active-Directory-Setup/README.md", "User Properties Member Of tab showing the selected account's group memberships."],
  "dns-zone": ["c51b04af-24b8-40e5-858e-547e8d207033", dns, "DNS Manager listing the domain and _msdcs forward lookup zones."],
  "dns-srv": ["6fe3186d-56b2-44b1-987e-d332d97b837c", dns, "DNS Manager and LDAP SRV Properties showing service, port and target host."],
  "dns-test": ["506cd97a-d99f-4ea0-ba4d-24cba15e9648", dns, "PowerShell nslookup LDAP/Kerberos SRV results followed by dcdiag DNS diagnostics."],
  "dcdiag": ["b0b55f72-0cbd-4034-ab04-dd87a585fee8", setup, "Real dcdiag /v output starting directory-server connectivity checks."],
  "gpmc-gpos": ["3e4e5d94-0192-4e77-b2fe-eeed535764d3", gpo, "Group Policy Objects list showing GPO Status and WMI Filter columns."],
  "gpmc-domain-link": ["0beb3f76-8455-4979-a7e9-df1096964e67", gpo, "Domain-root Linked Group Policy Objects tab showing link order, Enforced and Link Enabled."],
  "gpmc-ou-link": ["938e7fc0-b2fd-4eca-89ff-bb323f0e3d07", gpo, "Employees OU Linked Group Policy Objects tab with its own ordered links."],
  "gpmc-inheritance": ["2b5316bf-278c-43b2-aa4c-05c408220021", gpo, "Group Policy Inheritance tab with enforced policies at the top of the precedence list."],
  "repadmin": ["636556ea-0c17-44d8-ac34-1151c18b3ec6", gpo, "repadmin /syncall output listing schema, configuration, domain and DNS naming contexts."],
  "gpo-events": ["ade41b66-6fff-404d-b14d-51b15f670754", gpo, "Event Viewer GroupPolicy Operational log and event 4016 on WinServer2025."],
  "client-gpresult": ["18ddef13-7d98-464b-a832-1368df0658b5", gpo, "Windows 11 client's gpresult /r showing its computer OU and applied domain GPOs."],
} as const;
type Capture = keyof typeof files;
type Placement = [Capture, string];
const placements: Record<string, Record<string, Placement>> = {
  "ad-first-domain-controller": {
    role: ["server-role", "Accept the required tools in Add Features. This is role installation, not promotion."],
    paths: ["promotion-review", "The 2025 Review Options summary displays all three paths. Use Paths to edit them; this image is the later review screen."],
    review: ["promotion-review", "A real NEW-forest example using 2025 functional levels. Choose levels and names for your own environment."],
    checks: ["promotion-checks", "This is the final Results/restart screen, not Prerequisites Check. Its static-IP and DNS-delegation warnings must be reviewed, not copied as a recommended setup."],
  },
  "ad-internal-dns-client": {
    "dns-client": ["dns-adapter", "The source's first DC uses its own internal DNS address. Existing-domain servers need their existing internal DNS. The unchecked IPv6 box is not a recommendation to disable IPv6."],
    "dns-check": ["dns-test", "The source runs nslookup, whereas this guide uses Resolve-DnsName for the same SRV lookup. Read target host/port; your domain and result will differ."],
  },
  "ad-group-based-resource-access": {
    chain: ["group-members", "The screenshot shows the accounts → Global-group part of the chain only, not a Domain-local ACL or complete AGDLP deployment."],
    nest: ["user-memberships", "Member Of is shown for a USER, not a group. It locates the membership tab; inspect the actual GROUP's parent memberships for nesting. The pictured privileged memberships are not a least-privilege recommendation."],
  },
  "ad-member-secure-channel": {
    account: ["aduc-ous", "Locate the directory domain and computer containers in ADUC. This overview does not show secure-channel test results."],
  },
  "ad-directory-partition-scope": {
    application: ["repadmin", "Naming contexts include DomainDnsZones and ForestDnsZones. The pictured /syncall CHANGES replication activity; this guide's commands are read-only. A single-DC example is not proof of healthy inter-DC replication."],
  },
  "ad-global-catalog-network": {
    contents: ["dns-srv", "The _gc locator record advertises port 3268. The screenshot shows DNS discovery, not the GC's partial-replica attribute contents; those are explained below."],
  },
  "ad-replication-health-commands": {
    health: ["dcdiag", "This capture shows the beginning of dcdiag /v. Read the entire output; starting a test does not establish that every test passed."],
  },
  "ad-gpo-scope-precedence": {
    "gpo-domain": ["gpmc-domain-link", "These are the source lab's domain-root links. Review scope; do not reproduce its large set of links in production."],
    "gpo-order": ["gpmc-ou-link", "This shows link order within the Employees OU. Normal Local → Site → Domain → OU processing is a separate ordering rule."],
    "gpo-block": ["gpmc-inheritance", "An inheritance/precedence list is shown, not the Block Inheritance context menu. Enforced ancestors are the exception to an OU's inheritance block."],
    "gpo-enforced": ["gpmc-domain-link", "Look at Enforced = Yes on a link. Enforcement belongs to the link, not every setting or every GPO in the list."],
  },
  "ad-gpo-result-diagnostics": {
    "gpo-report": ["client-gpresult", "This is gpresult /r on the Windows 11 CLIENT, not the server or the HTML report. It shows actual applied computer policies in that lab session."],
    "gpo-model": ["aduc-ou-hierarchy", "Modeling and Results are visible near the bottom of GPMC's tree. This is the domain Status tab, not a completed modeling/result report."],
    "gpo-filter": ["gpmc-gpos", "Start with the intended GPO. WMI Filter and status are visible here; open its Scope/Delegation tabs for Security Filtering and Read/Apply permissions."],
  },
};

function attach(step: AdVisualStep, [name, note]: Placement): AdVisualStep {
  const [original, document, alt] = files[name];
  return {
    ...step, image: `/images/ad-server-2025/${name}.png`, alt,
    imageReference: {
      source: repository + document, original: `https://github.com/user-attachments/assets/${original}`,
      version: name === "client-gpresult" ? "Windows 11 client" : "Windows Server 2025",
      credit: "Hugh Chanetsa · MIT · Used with permission from Microsoft.",
      license: "/images/ad-server-2025/LICENSE.txt", width: 1920, height: 909, note,
    },
  };
}

// Preserve shared guide identity across renders; never mutate the original workflows.
const cached = new WeakMap<AdVisualGuideData, AdVisualGuideData>();
export function withAdScreenshots(guide: AdVisualGuideData): AdVisualGuideData {
  const found = cached.get(guide);
  if (found) return found;
  const mapping = placements[guide.id];
  if (!mapping) return guide;
  const steps = guide.steps.map(step => mapping[step.id] ? attach(step, mapping[step.id]) : step);
  if (guide.id === "ad-internal-dns-client") {
    steps.push(attach({ id: "dns-zone-view", title: "Locate the domain's DNS zones", path: ["Server Manager → Tools → DNS", "Server → Forward Lookup Zones"], instruction: "Locate your internal domain zone and its _msdcs records. AD-integrated zone storage and DNS client addresses are different settings. Do not create duplicates merely to match the source lab.", alt: "" }, ["dns-zone", "A real DNS Manager overview; hughdomain.local and WinServer2025 are example lab names."]));
    steps.push(attach({ id: "dns-srv-view", title: "Inspect the LDAP service locator record", path: ["Domain DNS zone", "_tcp", "_ldap → Properties"], instruction: "Inspect Service, Protocol, Port number and Host offering this service. The ordinary LDAP record uses TCP port 389. Different SRV paths serve different locator purposes; inspect the record returned by your own query rather than copying this sample.", alt: "" }, ["dns-srv", "This is the source's ordinary _ldap._tcp SRV Properties, not specifically the _ldap._tcp.dc._msdcs query result."]));
  }
  if (guide.id === "ad-gpo-result-diagnostics") {
    steps.push(attach({ id: "gpo-event-log", title: "Read Group Policy processing events", path: ["Event Viewer", "Applications and Services Logs", "Microsoft → Windows → GroupPolicy → Operational"], instruction: "Correlate timestamps and processing messages with the target session. Event 4016 starts extension processing; it does not by itself prove that every policy applied successfully. Compare with gpresult and subsequent completion/error events.", alt: "" }, ["gpo-events", "The event's Computer field identifies the source's Server 2025 DC. Inspect the CLIENT's log when diagnosing that client's policy."]));
  }
  const result = { ...guide, steps, versionNote: "Images labeled Windows Server 2025 are original, unchanged captures from Hugh Chanetsa's MIT-licensed lab. One gpresult capture is explicitly a Windows 11 client. Any remaining older Microsoft images retain their own warning. Sample lab names, values and configurations are not recommendations. Authored concept diagrams remain available separately." };
  cached.set(guide, result);
  return result;
}
