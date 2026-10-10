import type { AdVisualBinding, AdVisualDiagram, AdVisualGuideData, AdVisualStep } from "./ad-visual-guide-types";
import { hybridArcBindings } from "./hybrid-arc-guides";

const security = "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/winrm-security";
const test = "https://learn.microsoft.com/en-us/powershell/module/microsoft.wsman.management/test-wsman";
const hop = "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/ps-remoting-second-hop";
const jeaSource = "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/session-configurations";
const jeaAudit = "https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/jea/audit-and-report";
const sshSource = "https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse";
const keys = "https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement";
const firewall = "https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure";
const sshCapture = "https://techcommunity.microsoft.com/blog/itopstalkblog/configure-ssh-server-on-windows-server-2025/4419325";
const hybridSource = "https://learn.microsoft.com/en-us/azure/architecture/hybrid/hybrid-start-here";
const versionNote = "Commands and authored diagrams are teaching references, not captured output or a live terminal. The two original Microsoft SSH pictures are identified by their Windows Server 2025 source article. No server, firewall, credential or Azure setting has been changed.";
const prerequisites = "Use only an authorized isolated management lab with the required identity, endpoint and networking. Read-only examples query status; connection commands create sessions. Do not publish management ports, disable authentication or delegate credentials merely to answer a question. Replace sample server and endpoint names.";

function chain(title: string, labels: string[]): AdVisualDiagram {
  return { title: `Authored teaching diagram · ${title}`, nodes: labels.map((label, i) => ({ id: `n${i}`, label })), edges: labels.slice(1).map((_, i) => ({ from: `n${i}`, to: `n${i + 1}` })) };
}
function step(id: string, title: string, path: string[], instruction: string, source: string, labels: string[], command?: string): AdVisualStep {
  return { id, title, path, instruction, source, command, diagram: chain(title, labels), alt: `Authored explanatory diagram: ${labels.join(" → ")}.`, imageNote: "Authored diagram and documented command example; not a screenshot or an observed success result." };
}
function guide(id: string, title: string, source: string, steps: AdVisualStep[]): AdVisualGuideData {
  return { id, title, source, category: "Hybrid management", kind: "concept", versionNote, prerequisites, steps };
}

const remoting = guide("hybrid-winrm-diagnostics", "PowerShell Remoting · transport, execution and name checks", security, [
  step("execute", "Run a command on the intended remote computer", ["Authorized management computer", "PowerShell", "Invoke-Command → target"], "Invoke-Command executes the script block on the remote host. Inspect the returned service and PSComputerName rather than treating a local command as remote evidence. This example reads status; it does not enable remoting.", security, ["Management client", "Authenticated WinRM session", "Get-Service on SRV01"], "Invoke-Command -ComputerName SRV01 -ScriptBlock { Get-Service -Name WinRM }"),
  step("test", "Test WS-Management before diagnosing session permissions", ["Management client", "Test-WSMan", "Target service / listener / network", "Then test session authorization"], "Test-WSMan sends an identification request. A response proves a WS-Management endpoint answered, not that this user can run commands there. Compare listener, service and firewall evidence if it fails.", test, ["Identification request", "WS-Management endpoint response", "Separate session permission check"], "Test-WSMan -ComputerName SRV01"),
  step("transport", "Distinguish WinRM transport from authentication", ["Windows PowerShell remoting design", "WinRM / WS-Management", "HTTP 5985 or HTTPS 5986", "Validate identity and permissions"], "These are WinRM's default ports. Domain hostname connections normally use Kerberos; HTTPS provides TLS. Kerberos/NTLM also protect ongoing remoting messages over HTTP. Basic authentication has no such message encryption. PowerShell over SSH is a separate supported transport, not this WinRM example.", security, ["Client identity", "WinRM: HTTP 5985 / HTTPS 5986", "Authorized endpoint"]),
  step("dns", "Check the hostname before changing the trust model", ["Management client", "Resolve-DnsName", "Compare expected address", "Check endpoint name / SPN and session error"], "Confirm the name resolves to the intended server. DNS success alone does not prove Kerberos or endpoint access. Do not add wildcard TrustedHosts to hide a name or identity problem.", security, ["Hostname → expected IP", "Server identity / SPN", "Authenticated session"], "Resolve-DnsName SRV01.contoso.com\nTest-WSMan -ComputerName SRV01.contoso.com"),
]);
const secondHop = guide("hybrid-remoting-second-hop", "Remoting · diagnose a denied second hop", hop, [
  step("route", "Identify where the second connection fails", ["Client A → session on B", "Command on B → resource on C", "Access denied on C"], "Reaching B does not automatically pass the original user's credentials to C. Confirm the accessed service and identity before choosing a supported delegation design. This is an access flow, not a failed DNS diagnosis.", hop, ["A: operator", "B: remote session", "C: resource / separate authentication"]),
  step("design", "Choose a service-compatible scoped solution", ["Identify C's protocol", "Review approved JEA / run-as / delegation design", "Test the exact resource operation", "Correlate logs"], "Microsoft notes that Kerberos constrained delegation and resource-based constrained delegation do not solve a second WinRM hop. A file-share hop and a WinRM hop are not interchangeable. CredSSP forwards credentials and increases risk; never enable it automatically as a generic fix.", hop, ["Exact destination service", "Supported constrained identity design", "Verify real operation + logs"]),
]);
const jea = guide("hybrid-jea-scope-audit", "JEA · constrained capability and traceable administration", jeaSource, [
  step("capability", "Inspect the commands a delegated operator may use", ["Authorized target", "Registered JEA endpoint", "Get-PSSessionCapability", "Role capability and parameter restrictions"], "A JEA endpoint limits exposed commands and parameters. Inspect the operator's effective capabilities; broad administrator membership is not a replacement for a constrained role. The endpoint name and account below are samples.", jeaAudit, ["Operator identity", "Role capability / parameter allow-list", "Only approved function"], "Get-PSSessionCapability -ConfigurationName JEAMaintenance -Username 'CONTOSO\\Alice'"),
  step("endpoint", "Separate endpoint access from the execution identity", ["PowerShell target", "Get-PSSessionConfiguration", "Endpoint ACL → RoleDefinitions", "Run-as identity and limits"], "The endpoint ACL decides who may connect; RoleDefinitions maps allowed roles. Virtual accounts or gMSAs execute approved actions. On a domain controller the default virtual account can be highly privileged, so explicitly review its group scope and command exposure.", jeaSource, ["Connection permission", "Restricted role mapping", "Reviewed run-as rights"], "Get-PSSessionConfiguration -Name JEAMaintenance | Format-List Name, Permission, RoleDefinitions, RunAsUser"),
  step("audit", "Correlate who connected with what actually ran", ["Event Viewer", "Applications and Services Logs → Microsoft → Windows → PowerShell → Operational", "Configured script-block logs / JEA transcripts", "Central collection and retention"], "When enabled, script-block logging records event 4104; JEA evidence distinguishes ConnectedUser from RunAsUser. Review transcript retention and protected central collection. Application logs alone can show only the run-as identity, not the human operator.", jeaAudit, ["Connected user + run-as identity", "Commands / parameters + timestamps", "Protected audit collection"]),
]);
const ssh = guide("hybrid-windows-ssh-access", "Windows Server SSH · service, firewall and public keys", sshSource, [
  {
    id: "service", title: "Locate SSH remote access on Server 2025", path: ["Server Manager", "Local Server → Remote SSH Access", "Review enablement prompt", "Verify sshd status"],
    instruction: "Server 2025 includes OpenSSH by default; installed is not the same as running. Read the enablement prompt before changing access. This reference does not enable SSH on your machine.", source: sshSource, command: "Get-Service sshd | Select-Object Status, StartType",
    image: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/images/bS00NDE5MzI1LWU5ZXM4Wg?image-dimensions=999x145&revision=1",
    alt: "Windows Server 2025 SSH remote access enablement prompt in Administrator Windows PowerShell, awaiting Yes or No.",
    screenshotSource: sshCapture, screenshotCredit: "Microsoft ITOps Talk · Orin Thomas · May 30, 2025", screenshotLabel: "Windows Server 2025 · original Microsoft article capture",
    imageNote: "Shows an enablement confirmation, not a running service or key authentication. Its network and account messages are example defaults; review actual policy before enabling access.",
  },
  {
    id: "firewall", title: "Review the management rule's profile and source scope", path: ["Windows Defender Firewall with Advanced Security", "Inbound Rules → intended management rule → Properties", "Advanced → Profiles", "Scope → approved source addresses"],
    instruction: "Allow only the protocol, profiles and management hosts your design needs. This SSH rule illustrates profile selection; WinRM uses its own rules and listener ports. Review Scope separately rather than allowing every inbound management rule.", source: firewall,
    image: "https://techcommunity.microsoft.com/t5/s/gxcuf89792/images/bS00NDE5MzI1LTNFZjd2Zw?image-dimensions=543x733&revision=1",
    alt: "OpenSSH SSH Server sshd Properties Advanced tab: Domain and Private checked, Public unchecked, Block edge traversal selected.",
    screenshotSource: sshCapture, screenshotCredit: "Microsoft ITOps Talk · Orin Thomas · May 30, 2025", screenshotLabel: "Windows Server 2025 · original Microsoft article capture",
    imageNote: "The crop shows Advanced profiles, not the source-address Scope or port setting. These selections are not instructions to weaken firewall protection or change your network profile.",
  },
  step("keys", "Understand public-key authentication and key protection", ["Client → protected private key", "Server → authorized public key", "Authentication proof", "Scoped account permissions"], "Only the public key belongs on the server. Use a passphrase and protect the private key; theft or unsafe reuse still creates risk. Standard accounts use .ssh/authorized_keys; default administrator matching uses ProgramData/ssh/administrators_authorized_keys with restricted SYSTEM/Administrators ACLs. Installing OpenSSH is not deploying a public key.", keys, ["Client: private key stays local", "Server: authorized public key", "Proof of possession → permitted account"]),
  step("connect", "Verify the server identity before opening a shell", ["Authorized client", "Compare host-key fingerprint through a trusted channel", "SSH → intended server", "Confirm remote hostname"], "Review host-key verification instead of blindly accepting a changed key. After an approved connection, confirm the remote identity. SSH shell access is different from RDP desktop access; authorization still applies after authentication.", sshSource, ["Trusted server fingerprint", "Encrypted SSH session", "Remote shell"], "ssh labuser@SRV01.contoso.com"),
]);
const hybridDesign = guide("hybrid-operational-design", "Hybrid workload · connected operations, not just location", hybridSource, [
  step("workload", "Trace the cloud front end and on-premises dependency", ["Azure web front end", "Approved private connectivity", "On-premises database", "Shared operational design"], "In this question's example, the application spans cloud and on-premises services. Trace the actual data path, identity, monitoring and recovery dependencies. This is an authored example, not an Azure deployment screenshot.", hybridSource, ["Azure: web front end", "Private connection + application identity", "On-premises: database"]),
  step("operations", "Validate connectivity, identity and recovery together", ["Map workload dependencies", "DNS / network access", "Identity and least privilege", "Monitoring / recovery ownership"], "A hybrid design must operate end to end. Coexisting servers alone do not establish an integrated workload. For Arc management specifically, use agent endpoint checks; a working application data path does not prove the management path is healthy.", hybridSource, ["Connected services", "Consistent identity + permissions", "Joint monitoring / recovery"]),
]);

export const hybridRemotingBindings: Record<string, AdVisualBinding> = {
  "az802-q-075": { guide: remoting, startStep: "execute", context: "Distinguish a command executed on SRV01 from one executed on your local client." },
  "az802-q-076": { guide: remoting, startStep: "test", context: "Test-WSMan checks the WS-Management endpoint, not every session permission." },
  "az802-q-324": { guide: remoting, startStep: "transport", context: "Inspect the WinRM/WS-Management path; SSH-based remoting is a separate option." },
  "az802-q-091": { guide: remoting, startStep: "dns", context: "Start with name resolution and intended server identity when IP and hostname results differ." },
  "az802-q-077": { guide: secondHop, startStep: "route", context: "A→B success does not automatically authorize B→C access." },
  "az802-q-325": { guide: secondHop, startStep: "route", context: "Locate the second hop to the file share, then choose a solution for that exact service." },
  "az802-q-078": { guide: jea, startStep: "capability", context: "Inspect a JEA role's command and parameter restrictions." },
  "az802-q-097": { guide: jea, startStep: "capability", context: "A help-desk function needs narrowly scoped capabilities, not general administrator rights." },
  "az802-q-099": { guide: jea, startStep: "audit", context: "Combine scoped roles, secure transport and evidence that attributes actions to the operator." },
  "az802-q-079": { guide: ssh, startStep: "service", context: "See the SSH service path, not an RDP desktop or a simulated terminal." },
  "az802-q-080": { guide: ssh, startStep: "keys", context: "Authentication proves possession of a protected private key without sending that private key." },
  "az802-q-090": { guide: ssh, startStep: "firewall", context: "An actual SSH rule illustrates management profiles; choose the correct protocol and source scope for each service." },
  "az802-q-327": { guide: ssh, startStep: "keys", context: "Keys avoid guessable password authentication, but still require protection and controlled use." },
  "az802-q-092": { guide: hybridDesign, startStep: "operations", context: "Hybrid means integrated on-premises and cloud operations, not merely two locations." },
  "az802-q-316": { guide: hybridDesign, startStep: "workload", context: "Follow this question's cloud-front-end / on-premises-database dependency." },
  "az802-q-328": { guide: hybridArcBindings["az802-q-095"].guide, startStep: "connectivity", context: "Check Arc's DNS, proxy and required outbound endpoints before changing agent configuration." },
};
