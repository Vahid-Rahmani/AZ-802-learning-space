import type { AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";

// Reviewed original captures, not generated UI. Names/settings belong to the source lab.
// Pinned documentation + local unchanged PNGs avoid expiring attachment redirects.
const revision = "7fe4c1f9f6ff6871b2944f1d9fd18f8e8076e247";
const repository = `https://github.com/Hugh-Kumbi/Hugh-Kumbi-Active-Directory-Lab/blob/${revision}/`;
const setup = "02-Environment-Setup/I.%20Windows-Server-Setup.md";
const accounts = "03-Configuration/I.%20Active-Directory-Setup.md";
const dns = "03-Configuration/II.%20DNS-Setup.md";
const gpo = "03-Configuration/VII.%20GPO-Configurations.md";
const drives = "08-User-Environment-Management/IV.%20Drive-Mappings-Config.md";
export const adScreenshotCaptures = {
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
  "ad-user-name": ["40bcfe3d-53fc-4a3a-8228-9de1d2a50301", accounts, "New Object - User confirmation showing an example display name and user principal name in ADUC."],
  "drive-map-properties": ["e0d2097b-5fcc-4301-9866-52747f64f014", drives, "Drive Maps General tab showing Update action, UNC location, reconnect and drive letter S."],
  "drive-map-targeting": ["7bd01cd7-6f9b-4fb9-9d03-7a18fa1fa37b", drives, "Drive Maps Common tab with Item-level targeting selected and the Targeting button."],
  "drive-map-target-editor": ["cb8e0af6-dd74-4db3-ba4d-0334ab82912a", drives, "Targeting Editor showing a Security Group condition and the group's resolved SID."],
  "drive-map-list": ["ba62deeb-5cc5-452c-a6d0-39d53b2a3ed5", drives, "Group Policy Preferences Drive Maps list containing a saved Update item for drive S."],
  "folder-security": ["d09840f9-d778-4c99-a859-6a0e14444bef", drives, "NTFS Permission Entry dialog showing principal, Allow type, applies-to scope and permission checkboxes."],
  "folder-acl": ["3baa037e-d85b-4841-a006-d0565c9b84d1", drives, "Folder Properties Security tab and Advanced Security Settings showing explicit NTFS permission entries."],
} as const;
type Capture = keyof typeof adScreenshotCaptures;
type Placement = [Capture, string];
export const adScreenshotPlacements: Record<string, Record<string, Placement>> = {
  "ad-first-domain-controller": {
    role: ["server-role", "Accept the required tools in Add Features. This is role installation, not promotion."],
    review: ["promotion-review", "A real NEW-forest example using 2025 functional levels. Choose levels and names for your own environment."],
  },
  // The group-scope guide receives the relevant optional membership example below.
  "ad-create-security-group-scope": {},
  "ad-internal-dns-client": {
    "dns-client": ["dns-adapter", "The source's first DC uses its own internal DNS address. Existing-domain servers need their existing internal DNS. The unchecked IPv6 box is not a recommendation to disable IPv6."],
    "dns-check": ["dns-test", "The source runs nslookup, whereas this guide uses Resolve-DnsName for the same SRV lookup. Read target host/port; your domain and result will differ."],
  },
  "ad-group-based-resource-access": {
    acl: ["folder-acl", "Locate Principal, Access, Inherited from and Applies to. The source grants Domain Users Modify; for this AGDLP exercise use the intended Domain Local resource group instead. This is NTFS, not the separate share ACL."],
  },
  "ad-security-and-logon-identifiers": {
    sid: ["drive-map-target-editor", "The resolved Security Group SID is visible below the group name. This targeting condition is not a folder ACL; it illustrates a security principal's stable identifier rather than its display name."],
  },
  "ad-loopback-preference-targeting": {
    "preference-registry": ["drive-map-targeting", "The Common tab's Item-level targeting checkbox and Targeting button are shared by preference items. This capture is a Drive Map, not a Registry Match condition. Open Targeting Editor and choose Registry Match for the question's registry-existence check."],
  },
  "ad-replication-health-commands": {
    health: ["dcdiag", "This capture shows the beginning of dcdiag /v. Read the entire output; starting a test does not establish that every test passed."],
  },
  "ad-gpo-scope-precedence": {
    "gpo-domain": ["gpmc-domain-link", "These are the source lab's domain-root links. Review scope; do not reproduce its large set of links in production."],
    "gpo-enforced": ["gpmc-domain-link", "Look at Enforced = Yes on a link. Enforcement belongs to the link, not every setting or every GPO in the list."],
  },
  "ad-gpo-result-diagnostics": {
    "gpo-report": ["client-gpresult", "This is gpresult /r on the Windows 11 CLIENT, not the server or the HTML report. It shows actual applied computer policies in that lab session."],
  },
};

function attach(step: AdVisualStep, [name, note]: Placement): AdVisualStep {
  const [original, document, alt] = adScreenshotCaptures[name];
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
  const mapping = adScreenshotPlacements[guide.id];
  if (!mapping) return guide;
  const steps = guide.steps.map(step => mapping[step.id] ? attach(step, mapping[step.id]) : step);
  if (guide.id === "ad-internal-dns-client") {
    steps.push(attach({ id: "dns-zone-view", title: "Locate the domain's DNS zones", path: ["Server Manager → Tools → DNS", "Server → Forward Lookup Zones"], instruction: "Locate your internal domain zone and its _msdcs records. AD-integrated zone storage and DNS client addresses are different settings. Do not create duplicates merely to match the source lab.", alt: "" }, ["dns-zone", "A real DNS Manager overview; hughdomain.local and WinServer2025 are example lab names."]));
    steps.push(attach({ id: "dns-srv-view", title: "Inspect the LDAP service locator record", path: ["Domain DNS zone", "_tcp", "_ldap → Properties"], instruction: "Inspect Service, Protocol, Port number and Host offering this service. The ordinary LDAP record uses TCP port 389. Different SRV paths serve different locator purposes; inspect the record returned by your own query rather than copying this sample.", alt: "" }, ["dns-srv", "This is the source's ordinary _ldap._tcp SRV Properties, not specifically the _ldap._tcp.dc._msdcs query result."]));
  }
  if (guide.id === "ad-gpo-result-diagnostics") {
    steps.push(attach({ id: "gpo-event-log", title: "Read Group Policy processing events", path: ["Event Viewer", "Applications and Services Logs", "Microsoft → Windows → GroupPolicy → Operational"], instruction: "Correlate timestamps and processing messages with the target session. Event 4016 starts extension processing; it does not by itself prove that every policy applied successfully. Compare with gpresult and subsequent completion/error events.", alt: "" }, ["gpo-events", "The event's Computer field identifies the source's Server 2025 DC. Inspect the CLIENT's log when diagnosing that client's policy."]));
  }
  if (guide.id === "ad-create-security-group-scope") {
    steps.push(attach({ id: "global-role-members", title: "Inspect same-domain members of a Global role group", path: ["Active Directory Users and Computers", "Existing Global security group → Properties", "Members"], instruction: "This optional example shows Accounting users collected into the Accounting-Managers Global security group. The ADUC list identifies its Global scope; the Members tab shows accounts from the same domain. Inspect your own role group's General and Members tabs. This is a Global membership example, not a Domain Local or Universal membership example, and it does not grant resource permissions.", alt: "" }, ["group-members", "The source's Accounting-Managers Global group contains same-domain Accounting users. This shows role-based membership; use New Group or General to choose scope. The department, group and user names are lab examples."]));
  }
  const result = { ...guide, steps, versionNote: "Images labeled Windows Server 2025 are original, unchanged captures from Hugh Chanetsa's MIT-licensed lab. One gpresult capture is explicitly a Windows 11 client. Any remaining older Microsoft images retain their own warning. Sample lab names, values and configurations are not recommendations. Authored concept diagrams remain available separately." };
  cached.set(guide, result);
  return result;
}
