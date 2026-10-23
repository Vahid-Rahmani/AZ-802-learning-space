/**
 * Browser-only Windows Server PowerShell training engine.
 * This is deliberately an allowlisted interpreter, NOT a shell, API proxy or remote executor.
 * All changes are to a fictional state; never pass student input to a real operating system.
 */
export type VirtualUser = { name: string; login: string; path: string; department: string; enabled: boolean };
export type VirtualServer = {
  hostname: string; pendingHostname: string | null; ipv4: string; gateway: string; dns: string;
  features: string[]; domain: string | null; ous: string[]; groups: string[];
  users: VirtualUser[]; memberships: Record<string, string[]>;
  records: Record<string, string>; scope: string | null; authorizedDhcp: boolean;
  folders: string[]; shares: { name: string; path: string; access: string }[];
  permissions: string[]; firewallRules: string[]; services: Record<string, string>;
  backups: number; events: string[]; completed: string[];
  gpos: string[]; gpoLinks: Record<string, string[]>; smb1Enabled: boolean;
};
export type PowerShellStep = { id: string; title: string; command: string; explanation: string; result: string; docs: string };
export type PowerShellUnit = { id: string; name: string; goal: string; steps: PowerShellStep[] };
const docs = {
  core: "https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/01-getting-started",
  help: "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/get-help",
  network: "https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress",
  features: "https://learn.microsoft.com/en-us/powershell/module/servermanager/install-windowsfeature",
  ad: "https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-aduser",
  adds: "https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsforest",
  dns: "https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecorda",
  dhcp: "https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv4scope",
  smb: "https://learn.microsoft.com/en-us/powershell/module/smbshare/new-smbshare",
  firewall: "https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule",
  backup: "https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wbadmin-start-backup",
  ntlm: "https://learn.microsoft.com/en-us/windows-server/security/kerberos/passwords-technical-overview",
  groupPolicy: "https://learn.microsoft.com/en-us/powershell/module/grouppolicy/new-gpo",
  smbHardening: "https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3",
  securityLogs: "https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/plan/appendix-l--events-to-monitor",
  patches: "https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-hotfix",
};
const step = (id: string, title: string, command: string, explanation: string, result: string, doc: string): PowerShellStep =>
  ({ id, title, command, explanation, result, docs: doc });
export const powerShellUnits: PowerShellUnit[] = [
  { id: "discover", name: "01 · PowerShell fundamentals", goal: "Discover commands, inspect system information and read real cmdlet help.", steps: [
    step("help","Read cmdlet help","Get-Help Get-Service","Get-Help explains syntax, parameters and use cases. In a real console add -Examples or -Full for more.","Help details appear in the terminal.",docs.help),
    step("commands","Discover commands","Get-Command -Name Get-*","Get-Command lists commands. The -Name wildcard searches cmdlet names. Our simulator lists supported commands.","Available command inventory appears.",docs.core),
    step("system","Inspect the server","Get-ComputerInfo","Read the Windows Server version, computer name and domain membership before making changes.","Server inventory is displayed.",docs.core),
    step("services","Check a service","Get-Service -Name WinRM","Get-Service reports service status. WinRM is the Windows Remote Management service and can be inspected before installing IIS.","WinRM status is shown.",docs.core)
  ] },
  { id: "network", name: "02 · Hostname and networking", goal: "Configure an isolated server's name, static IPv4 address and DNS client.", steps: [
    step("hostname","Queue a computer rename","Rename-Computer -NewName TW-DC01","Rename-Computer changes the Windows hostname, not the Hyper-V VM name. A restart is normally needed.","Rename is scheduled.",docs.core),
    step("restart","Apply hostname change","Restart-Computer","The simulated reboot applies the pending hostname. No physical machine restarts.","Hostname becomes TW-DC01.",docs.core),
    step("ip","Configure static IPv4","New-NetIPAddress -InterfaceAlias Ethernet -IPAddress 192.168.10.10 -PrefixLength 24 -DefaultGateway 192.168.10.1","New-NetIPAddress assigns a static IP; /24 is the subnet prefix, and the gateway routes outside the subnet.","IP is 192.168.10.10/24.",docs.network),
    step("dnsclient","Set DNS client","Set-DnsClientServerAddress -InterfaceAlias Ethernet -ServerAddresses 192.168.10.10","Domain controllers typically point DNS to a valid AD DNS service. Here DNS points at the planned domain controller.","DNS client points to the server.",docs.network),
    step("networkcheck","Inspect IPv4","Get-NetIPAddress -AddressFamily IPv4","Get-NetIPAddress verifies the saved simulated interface address.","Interface address is shown.",docs.network)
  ] },
  { id: "roles", name: "03 · Server roles and AD DS", goal: "Install Windows Server features and promote the fictional server to a domain controller.", steps: [
    step("features","Inspect available server roles","Get-WindowsFeature -Name AD-Domain-Services","Get-WindowsFeature distinguishes installed from available features.","AD DS role state is visible.",docs.features),
    step("adds-role","Install AD DS binaries","Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools","Installs the AD DS role and management tools; does NOT yet promote a domain controller.","Role is installed in the virtual server.",docs.features),
    step("forest","Create a training forest","Install-ADDSForest -DomainName techwork.local","Creates a simulated AD forest and integrated DNS. Real deployment requires secure DSRM credentials, checks and restart.","Domain techwork.local exists.",docs.adds),
    step("domain","Inspect the domain","Get-ADDomain","Get-ADDomain verifies AD DS connectivity and domain naming.","Domain details appear.",docs.ad)
  ] },
  { id: "identities", name: "04 · AD users, OUs and groups", goal: "Create a departmental OU, group and account; then apply group membership.", steps: [
    step("ou","Create a department OU","New-ADOrganizationalUnit -Name Staff -Path DC=techwork,DC=local","An Organizational Unit (OU) organizes AD objects and can receive delegated administration and GPOs.","Staff OU is created.",docs.ad),
    step("group","Create a security group","New-ADGroup -Name GG_Buchhaltung -GroupScope Global -GroupCategory Security -Path OU=Staff,DC=techwork,DC=local","Global security groups collect user identities and can be granted resource permissions.","GG_Buchhaltung group is created.",docs.ad),
    step("user","Create a disabled training account","New-ADUser -Name 'Sara Wagner' -SamAccountName s.wagner -Path OU=Staff,DC=techwork,DC=local","New-ADUser creates a disabled account here. In real systems set a secure initial password and enable it separately.","User s.wagner is created.",docs.ad),
    step("membership","Add user to group","Add-ADGroupMember -Identity GG_Buchhaltung -Members s.wagner","Add-ADGroupMember changes group membership; membership governs access only when permissions refer to the group.","Sara is in GG_Buchhaltung.",docs.ad),
    step("verifyuser","Verify the account","Get-ADUser -Identity s.wagner","Get-ADUser confirms the account exists and displays selected attributes.","Account details appear.",docs.ad)
  ] },
  { id: "dns", name: "05 · DNS troubleshooting", goal: "Inspect an AD-integrated zone and publish an A record.", steps: [
    step("dnszone","Check DNS zone","Get-DnsServerZone","DNS zones define the names managed by the DNS server. AD promotion creates the training zone.","techwork.local zone appears.",docs.dns),
    step("dnsrecord","Publish an intranet A record","Add-DnsServerResourceRecordA -ZoneName techwork.local -Name intranet -IPv4Address 192.168.10.10","An A record maps a hostname to an IPv4 address.","intranet.techwork.local is published.",docs.dns),
    step("resolve","Resolve the new name","Resolve-DnsName intranet.techwork.local","Resolve-DnsName tests DNS resolution; name resolution does not prove the website itself is online.","Record resolves to 192.168.10.10.",docs.dns)
  ] },
  { id: "dhcp", name: "06 · DHCP administration", goal: "Install DHCP, authorize it in the simulated domain and create an IPv4 scope.", steps: [
    step("dhcprole","Install DHCP role","Install-WindowsFeature -Name DHCP -IncludeManagementTools","Installs the DHCP service and administrative tools, without creating scopes.","DHCP server role is installed.",docs.features),
    step("dhcpauth","Authorize domain DHCP","Add-DhcpServerInDC -DnsName TW-DC01.techwork.local -IPAddress 192.168.10.10","An AD-authorized DHCP server is allowed to serve addresses in a domain environment.","DHCP server is authorized.",docs.dhcp),
    step("dhcpscope","Create a DHCP scope","Add-DhcpServerv4Scope -Name LAN -StartRange 192.168.10.100 -EndRange 192.168.10.200 -SubnetMask 255.255.255.0","DHCP scopes define an assignable address range; production setups also configure exclusions and option values.","LAN scope has been created.",docs.dhcp),
    step("dhcpverify","Inspect the scope","Get-DhcpServerv4Scope","Lists configured DHCP IPv4 scopes for validation and troubleshooting.","The LAN scope is visible.",docs.dhcp)
  ] },
  { id: "storage", name: "07 · Folders, SMB and NTFS", goal: "Provision a departmental file share and understand share versus NTFS permissions.", steps: [
    step("folder","Create a department folder","New-Item -Path D:\\Freigaben\\Buchhaltung -ItemType Directory","New-Item creates a directory. A share also requires NTFS access, not merely SMB permissions.","Department folder is created.",docs.smb),
    step("share","Share the folder","New-SmbShare -Name Buchhaltung -Path D:\\Freigaben\\Buchhaltung -ChangeAccess GG_Buchhaltung","New-SmbShare creates a network share. Effective access is constrained by both share and NTFS permissions.","SMB share is created.",docs.smb),
    step("acl","Set NTFS permissions","icacls D:\\Freigaben\\Buchhaltung /grant 'TECHWORK\\GG_Buchhaltung:(OI)(CI)M'","icacls grants Modify inherited by files (OI) and child directories (CI). Apply least-privilege rights.","NTFS Modify permission is granted.",docs.smb),
    step("shares","Verify the share","Get-SmbShare","Get-SmbShare lists SMB shares and their backing paths.","Buchhaltung is listed.",docs.smb)
  ] },
  { id: "security", name: "08 · Firewall and security checks", goal: "Audit firewall, add one scoped lab rule and inspect malware protection.", steps: [
    step("firewall","Review firewall profiles","Get-NetFirewallProfile","Domain, Private and Public profiles may differ; keep firewall enabled unless there is a specific controlled exception.","Firewall profiles are listed.",docs.firewall),
    step("rule","Create a lab IIS rule","New-NetFirewallRule -DisplayName Intranet-8080 -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Domain","Allow only TCP 8080 on the Domain profile; in production also restrict RemoteAddress to approved clients.","Rule Intranet-8080 is added.",docs.firewall),
    step("verifyrule","Verify the rule","Get-NetFirewallRule -DisplayName Intranet-8080","Verify rule exists and is enabled. Checking the associated port filter is also important in production.","The named rule appears.",docs.firewall),
    step("defender","Review Defender health","Get-MpComputerStatus","Read antivirus state and real-time monitoring status; do not assume protection just because a service exists.","Simulated protection status appears.",docs.core)
  ] },
  { id: "operate", name: "09 · IIS, backup and incidents", goal: "Install IIS, inspect events and create a fictional Windows Server Backup.", steps: [
    step("iis","Install IIS web server","Install-WindowsFeature -Name Web-Server -IncludeManagementTools","IIS adds the Web Server role. Firewall and website bindings still need separate verification.","IIS is installed.",docs.features),
    step("startiis","Start IIS web service","Start-Service -Name W3SVC","Starts the simulated World Wide Web Publishing Service after IIS is installed.","W3SVC is running.",docs.core),
    step("events","Inspect recent system events","Get-WinEvent -LogName System -MaxEvents 5","Event logs help investigate service failures, role installation and reboot activity.","Recent lab events appear.",docs.core),
    step("backupfeature","Install backup feature","Install-WindowsFeature -Name Windows-Server-Backup","Windows Server Backup is installed. Backup jobs, target capacity and restores must be tested separately.","Backup feature is installed.",docs.features),
    step("backup","Run a virtual backup","wbadmin start backup -backupTarget:E: -include:D: -quiet","wbadmin can create backups in real Windows Server. This simulation records a fictional success only.","One simulated backup version is saved.",docs.backup),
    step("versions","Check backup history","wbadmin get versions","Lists available backup versions. A successful backup alone does not guarantee recovery.","Backup history appears.",docs.backup)
  ] },
  { id: "authentication", name: "10 · Domain authentication & GPO", goal: "Understand NTLM challenge-response versus Kerberos and manage Group Policy safely; no secrets or hashes are transmitted by this simulator.", steps: [
    step("adpasswordpolicy","Inspect domain password policy","Get-ADDefaultDomainPasswordPolicy","Check password length, lockout and complexity configuration. An NTLM challenge-response is not a raw password or raw NT hash; Kerberos uses a different ticket-based protocol.","Read the virtual domain policy.",docs.ntlm),
    step("adcontroller","Discover the domain controller","Get-ADDomainController -Discover","Find a domain controller. Kerberos ticket exchange and NTLM challenge-response are different authentication paths, so the screenshot is only a teaching analogy.","Find TW-DC01.",docs.ntlm),
    step("netlogon","Check Netlogon","Get-Service -Name Netlogon","Netlogon manages secure-channel operations; its status alone does not show whether the CVE-2020-1472 fix is installed.","Netlogon is running.",docs.securityLogs),
    step("listgpo","Review Group Policy Objects","Get-GPO -All","List Group Policy Objects in the domain, including default policies. Group Policy centrally configures domain-joined machines.","List available GPOs.",docs.groupPolicy),
    step("creategpo","Create a security baseline GPO","New-GPO -Name Baseline-Server","Create a GPO object; it has no effect until linked to a site, domain or OU and configured.","Baseline-Server is created.",docs.groupPolicy),
    step("linkgpo","Link GPO to department OU","New-GPLink -Name Baseline-Server -Target OU=Staff,DC=techwork,DC=local","Linking the policy to an OU creates a scope of application. The simulation does not process real registry settings.","Link the baseline to Staff OU.",docs.groupPolicy),
    step("gporesult","Inspect inherited GPOs","Get-GPInheritance -Target OU=Staff,DC=techwork,DC=local","Check linked GPOs for an OU. This training result is not a client-side gpresult or proof of applied settings.","View the training GPO link.",docs.groupPolicy),
    step("securityevents","Review security sign-in events","Get-WinEvent -LogName Security -MaxEvents 5","Windows Security logs can show events such as 4624 and 4625; these example entries are simulated, not evidence of an actual sign-in.","Inspect sample security events.",docs.securityLogs)
  ] },
  { id: "smbdefense", name: "11 · SMB & WannaCry defense", goal: "Audit SMB configuration, exposed file services and protection indicators without executing exploits.", steps: [
    step("smbconfig","Audit SMB protocol configuration","Get-SmbServerConfiguration","SMB1 is an old protocol linked to legacy exposure. SMB1 is not installed by default on Windows Server 2019 and later. Microsoft issued MS17-010 in March 2017 for vulnerable products.","Review SMB1, SMB2 and signing flags.",docs.smbHardening),
    step("optionalfeature","Check SMB1 Windows feature","Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol","Review whether the optional SMB1 feature exists or is disabled. On a real host verify both server and client configuration.","SMB1 is disabled in the Windows Server 2025 training baseline.",docs.smbHardening),
    step("port445","Inspect SMB TCP listener","Get-NetTCPConnection -LocalPort 445","SMB commonly listens on TCP 445. An open port does not by itself prove the system is vulnerable to WannaCry.","View the simulated local port state.",docs.smbHardening),
    step("smbsessions","Inspect file share sessions","Get-SmbSession","Review active SMB sessions. The browser simulation has no real remote clients or network packets.","No remote SMB sessions in this isolated browser lab.",docs.smbHardening),
    step("smblockdown","Reinforce disabled SMB1","Set-SmbServerConfiguration -EnableSMB1Protocol $false -Confirm:$false","Disables SMB1 server protocol in Windows. Here it is already disabled and the simulator only reinforces its virtual setting.","SMB1 server protocol stays disabled.",docs.smbHardening),
    step("defenderthreats","Review Defender detections","Get-MpThreatDetection","Review historical Microsoft Defender detections. No detection is not proof of no compromise; also verify protection, patches and backups.","Read the simulated detection inventory.",docs.securityLogs)
  ] },
  { id: "zerologon", name: "12 · Netlogon & patch verification", goal: "Learn ZeroLogon defensive checks, security patch review and safe incident triage; never attempt credential bypass.", steps: [
    step("replicationaudit","Check AD replication health","Get-ADReplicationFailure -Target TW-DC01","Check replication failures. A single-DC lab cannot demonstrate actual replication and a clean result does NOT validate a ZeroLogon fix.","Inspect virtual AD replication status.",docs.securityLogs),
    step("hotfixes","Inspect installed update inventory","Get-HotFix","Get-HotFix is one inventory source for installed updates; verify the actual OS build and Microsoft's current CVE advisories. Synthetic data cannot prove patch compliance.","Review clearly marked training-only patch information.",docs.patches),
    step("netlogonlogs","Inspect system events","Get-WinEvent -LogName System -MaxEvents 20","Monitor Windows Netlogon event IDs 5827/5828 when available. These can signal denied vulnerable secure-channel connections; absence does not prove safety.","Read the simulated system event log.",docs.securityLogs)
  ] }
];
export const allPowerShellSteps = powerShellUnits.flatMap(unit => unit.steps);
export const supportedPowerShellCommands = [
  "Get-Help","Get-Command","Get-ComputerInfo","Get-Service","Start-Service","Get-NetIPAddress","New-NetIPAddress",
  "Set-DnsClientServerAddress","Get-DnsClientServerAddress","Test-NetConnection","Rename-Computer","Restart-Computer",
  "Get-WindowsFeature","Install-WindowsFeature","Install-ADDSForest","Get-ADDomain",
  "New-ADOrganizationalUnit","Get-ADOrganizationalUnit","New-ADGroup","Get-ADGroup","New-ADUser","Get-ADUser",
  "Add-ADGroupMember","Get-ADGroupMember","Get-DnsServerZone","Add-DnsServerResourceRecordA","Resolve-DnsName",
  "Add-DhcpServerInDC","Add-DhcpServerv4Scope","Get-DhcpServerv4Scope","New-Item","Get-ChildItem",
  "New-SmbShare","Get-SmbShare","icacls","Get-NetFirewallProfile","New-NetFirewallRule","Get-NetFirewallRule",
  "Get-MpComputerStatus","Get-MpThreatDetection","Get-WinEvent","wbadmin","Clear-Host",
  "Get-ADDefaultDomainPasswordPolicy","Get-ADDomainController","Get-GPO","New-GPO","New-GPLink","Get-GPInheritance",
  "Get-SmbServerConfiguration","Get-WindowsOptionalFeature","Get-NetTCPConnection","Get-SmbSession","Set-SmbServerConfiguration",
  "Get-ADReplicationFailure","Get-HotFix"
];
export const createVirtualServer = (): VirtualServer => ({
  hostname:"WIN-SERVER",pendingHostname:null,ipv4:"192.168.10.50",gateway:"192.168.10.1",dns:"192.168.10.1",
  features:[],domain:null,ous:[],groups:[],users:[],memberships:{},records:{},scope:null,authorizedDhcp:false,
  folders:[],shares:[],permissions:[],firewallRules:[],services:{WinRM:"Running"},
  backups:0,events:["Windows Server 2025 training machine started."],completed:[],
  gpos:["Default Domain Policy","Default Domain Controllers Policy"],gpoLinks:{},smb1Enabled:false
});
export type Execution = { state: VirtualServer; output: string; error?: string };
const tokenize = (input: string): string[] => (input.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(item => item.replace(/^["']|["']$/g, ""));
const get = (tokens: string[], name: string): string => {
  const at = tokens.findIndex(t => t.toLowerCase() === "-" + name.toLowerCase());
  return at >= 0 ? tokens[at+1] ?? "" : "";
};
const has = (state: VirtualServer, feature: string): boolean => state.features.some(x=>x.toLowerCase()===feature.toLowerCase());
const requireDomain = (state: VirtualServer): string | null => state.domain ? null : "ActiveDirectoryServerDownException: Create a training AD forest first.";
const textRows = (rows: string[]) => rows.length ? rows.join("\n") : "(none)";
export function executePowerShell(current: VirtualServer, raw: string): Execution {
  const input = raw.trim();
  if(!input) return {state:current,output:""};
  if(input.length>400 || /[;|&<>]/.test(input)) return {state:current,output:"",error:"This safe simulator accepts one supported command at a time; piping, scripts and redirection are not executed."};
  const tokens = tokenize(input);
  const cmd = tokens[0]?.toLowerCase() ?? "";
  const state: VirtualServer = JSON.parse(JSON.stringify(current)) as VirtualServer;
  const ok = (message: string, event?: string): Execution => {
    if(event) state.events.unshift(event);
    const matched = allPowerShellSteps.find(x => x.command.toLowerCase().replace(/\s+/g," ").trim() === input.toLowerCase().replace(/\s+/g," ").trim());
    if(matched && !state.completed.includes(matched.id)) state.completed.push(matched.id);
    return {state,output:message};
  };
  const fail = (message: string): Execution => ({state:current,output:"",error:message});
  const domainError = requireDomain(state);
  switch(cmd){
    case "clear-host": return ok("[Console cleared — use the Clear button to erase visual history.]");
    case "get-help": {const name=tokens[1] || "Get-Help";return ok(name+"\nSYNOPSIS\n  "+(allPowerShellSteps.find(s=>s.command.toLowerCase().startsWith(name.toLowerCase()))?.explanation||"Displays PowerShell command guidance.")+"\n\nTry: Get-Command -Name Get-*");}
    case "get-command": {const filter=get(tokens,"Name").replace(/\*/g,"").toLowerCase();return ok(textRows(supportedPowerShellCommands.filter(s=>s.toLowerCase().includes(filter)).map(s=>"Cmdlet  "+s)));}
    case "get-computerinfo": return ok("WindowsProductName : Windows Server 2025 (simulated)\nCsName             : "+state.hostname+"\nCsDomain           : "+(state.domain||"WORKGROUP")+"\nOsArchitecture     : 64-bit\nTotalPhysicalMemory: 8192 MB (virtual)");
    case "get-service": {const name=get(tokens,"Name");if(name && !Object.hasOwn(state.services,name)) return fail("Cannot find any service with service name '" + name + "'.");return ok(name ? "Status   Name\n"+state.services[name]+"   "+name : textRows(Object.entries(state.services).map(([item,status])=>status+"   "+item)));}
    case "start-service": {const name=get(tokens,"Name");if(name.toLowerCase()!=="w3svc"||!has(state,"Web-Server"))return fail("Service not found or IIS not installed."); state.services.W3SVC="Running";return ok("Status  Name\nRunning W3SVC","IIS service started.");}
    case "rename-computer": {const name=get(tokens,"NewName");if(!/^[A-Za-z][A-Za-z0-9-]{1,14}$/.test(name))return fail("Specify a valid -NewName (2–15 characters, letters/numbers/hyphen).");state.pendingHostname=name;return ok("WARNING: Changes will take effect after Restart-Computer.","Computer rename queued: "+name);}
    case "restart-computer": {if(state.pendingHostname){state.hostname=state.pendingHostname;state.pendingHostname=null;}return ok("Virtual restart complete. ComputerName: "+state.hostname,"Server restarted (virtual).");}
    case "new-netipaddress": {const ip=get(tokens,"IPAddress"),prefix=get(tokens,"PrefixLength"),iface=get(tokens,"InterfaceAlias"),gw=get(tokens,"DefaultGateway");if(iface.toLowerCase()!=="ethernet"||!/^192\.168\.10\.\d+$/.test(ip)||prefix!=="24"||!gw)return fail("Lab Ethernet requires a 192.168.10.x IPv4 address, PrefixLength 24 and DefaultGateway.");state.ipv4=ip;state.gateway=gw;return ok("InterfaceAlias Ethernet\nIPAddress      "+ip+"\nPrefixLength   24\nDefaultGateway "+gw,"Static IPv4 configured.");}
    case "get-netipaddress": return ok("InterfaceAlias Ethernet\nAddressFamily IPv4\nIPAddress      "+state.ipv4+"\nPrefixLength   24");
    case "set-dnsclientserveraddress": {const ip=get(tokens,"ServerAddresses");if(get(tokens,"InterfaceAlias").toLowerCase()!=="ethernet"||!ip)return fail("Use -InterfaceAlias Ethernet and -ServerAddresses.");state.dns=ip;return ok("Ethernet DNS server: "+ip,"DNS client updated.");}
    case "get-dnsclientserveraddress": return ok("InterfaceAlias Ethernet\nServerAddresses {"+state.dns+"}");
    case "test-netconnection": return ok("ComputerName     : "+(tokens[1]||state.ipv4)+"\nRemoteAddress    : "+state.ipv4+"\nPingSucceeded    : True (virtual lab only)");
    case "get-windowsfeature": {const name=get(tokens,"Name");const list=name?[name]:["AD-Domain-Services","DNS","DHCP","Web-Server","Windows-Server-Backup"];return ok("Display Name                       Name                    Install State\n"+list.map(x=>x.padEnd(33)+x.padEnd(24)+(has(state,x)?"Installed":"Available")).join("\n"));}
    case "install-windowsfeature": {const name=get(tokens,"Name");if(!["ad-domain-services","dhcp","web-server","windows-server-backup"].includes(name.toLowerCase()))return fail("This lab supports AD-Domain-Services, DHCP, Web-Server and Windows-Server-Backup.");if(!has(state,name)) state.features.push(name);if(name.toLowerCase()==="web-server") state.services.W3SVC="Stopped";return ok("Success : True\nRestart Needed : No\nFeature Result : "+name,"Role installed: "+name);}
    case "install-addsforest": {const domain=get(tokens,"DomainName");if(!has(state,"AD-Domain-Services"))return fail("Prerequisite not met: Install AD-Domain-Services first.");if(state.dns!==state.ipv4)return fail("DNS client must target the domain controller IP in this isolated lab.");if(!/^[a-z0-9-]+\.[a-z0-9.-]+$/i.test(domain))return fail("Use -DomainName with a valid DNS name.");state.domain=domain.toLowerCase();state.records["tw-dc01."+state.domain]=state.ipv4;if(!has(state,"DNS"))state.features.push("DNS");state.services.Netlogon="Running";return ok("ADDSDeployment: Success (simulated)\nForest : "+state.domain+"\nDNS    : Integrated\nNOTE: No real credential/restart has been performed.","New AD forest: "+domain);}
    case "get-addomain": return domainError?fail(domainError):ok("DNSRoot       : "+state.domain+"\nNetBIOSName   : "+state.domain!.split(".")[0].toUpperCase()+"\nDomainMode    : Windows2016Domain (simulated)");
    case "new-adorganizationalunit": {if(domainError)return fail(domainError);const name=get(tokens,"Name");if(!name)return fail("Missing -Name.");if(!state.ous.includes(name))state.ous.push(name);return ok("OU="+name+",DC="+state.domain!.split(".").join(",DC="),"OU created: "+name);}
    case "get-adorganizationalunit": return domainError?fail(domainError):ok(textRows(state.ous.map(ou=>"OU="+ou+",DC="+state.domain!.split(".").join(",DC="))));
    case "new-adgroup": {if(domainError)return fail(domainError);const name=get(tokens,"Name"),path=get(tokens,"Path");if(!name||!state.ous.some(x=>path.toLowerCase().startsWith("ou="+x.toLowerCase()+",")))return fail("Create the destination OU and pass -Name and valid -Path.");if(!state.groups.includes(name))state.groups.push(name);return ok("Name : "+name+"\nGroupScope: "+(get(tokens,"GroupScope")||"Global"),"AD group created: "+name);}
    case "get-adgroup": return domainError?fail(domainError):ok(textRows(state.groups.map(x=>"Name : "+x)));
    case "new-aduser": {if(domainError)return fail(domainError);const name=get(tokens,"Name"),login=get(tokens,"SamAccountName"),path=get(tokens,"Path");if(!name||!login||!state.ous.some(x=>path.toLowerCase().startsWith("ou="+x.toLowerCase()+",")))return fail("Specify -Name, -SamAccountName and an existing OU -Path.");if(state.users.some(x=>x.login.toLowerCase()===login.toLowerCase()))return fail("The sAMAccountName must be unique in a domain.");state.users.push({name,login,path,enabled:false,department:""});return ok("Name              : "+name+"\nSamAccountName    : "+login+"\nEnabled           : False\nDistinguishedName : CN="+name+","+path,"AD account created: "+login);}
    case "get-aduser": {if(domainError)return fail(domainError);const login=get(tokens,"Identity"),users=login?state.users.filter(x=>x.login.toLowerCase()===login.toLowerCase()):state.users;if(!users.length)return fail("Cannot find an object with identity '"+login+"'.");return ok(users.map(x=>"Name : "+x.name+"\nSamAccountName : "+x.login+"\nEnabled : "+x.enabled+"\nPath : "+x.path).join("\n\n"));}
    case "add-adgroupmember": {if(domainError)return fail(domainError);const group=get(tokens,"Identity"),login=get(tokens,"Members");if(!state.groups.includes(group)||!state.users.some(x=>x.login===login))return fail("Group or user not found; create both first.");state.memberships[group]=Array.from(new Set([...(state.memberships[group]||[]),login]));return ok("Added "+login+" to "+group,"Group membership changed.");}
    case "get-adgroupmember": {const group=get(tokens,"Identity");return ok(textRows(state.memberships[group]||[]));}
    case "get-dnsserverzone": return !state.domain?fail("No DNS zone exists. Promote the training domain first."):ok("ZoneName       ZoneType\n"+state.domain+" Primary (AD-integrated)");
    case "add-dnsserverresourcerecorda": {const zone=get(tokens,"ZoneName"),name=get(tokens,"Name"),ip=get(tokens,"IPv4Address");if(!state.domain||zone.toLowerCase()!==state.domain)return fail("DNS zone not found.");if(!name||!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip))return fail("Provide -Name and -IPv4Address.");state.records[name.toLowerCase()+"."+state.domain]=ip;return ok("A record: "+name+"."+zone+" -> "+ip,"DNS A record added.");}
    case "resolve-dnsname": {const host=(tokens[1]||"").toLowerCase();return state.records[host]?ok("Name : "+host+"\nType : A\nIPAddress : "+state.records[host]):fail("DNS name does not exist: "+host);}
    case "add-dhcpserverindc": {if(!state.domain||!has(state,"DHCP"))return fail("Requires an AD domain and installed DHCP role.");if(get(tokens,"IPAddress")!==state.ipv4)return fail("Use this lab server's current IPv4 in -IPAddress.");state.authorizedDhcp=true;return ok("DHCP server authorized in AD.","DHCP authorized.");}
    case "add-dhcpserverv4scope": {if(!has(state,"DHCP")||!state.authorizedDhcp)return fail("Install and authorize DHCP before creating the scope.");const start=get(tokens,"StartRange"),end=get(tokens,"EndRange"),mask=get(tokens,"SubnetMask");if(!start||!end||mask!=="255.255.255.0")return fail("Specify StartRange, EndRange and 255.255.255.0 SubnetMask.");state.scope=start+" - "+end;return ok("ScopeId : 192.168.10.0\nName : "+get(tokens,"Name")+"\nRange : "+state.scope,"DHCP scope created.");}
    case "get-dhcpserverv4scope": return state.scope?ok("ScopeId 192.168.10.0 | Name LAN | Range "+state.scope):fail("No IPv4 scope has been configured.");
    case "new-item": {const path=get(tokens,"Path");if(!path||get(tokens,"ItemType").toLowerCase()!=="directory")return fail("Use -Path and -ItemType Directory in this lab.");if(!state.folders.includes(path))state.folders.push(path);return ok("Directory: "+path,"Folder created: "+path);}
    case "get-childitem": return ok(textRows(state.folders));
    case "new-smbshare": {const name=get(tokens,"Name"),path=get(tokens,"Path"),access=get(tokens,"ChangeAccess");if(!state.folders.includes(path))return fail("Create the backing folder before sharing it.");if(!name||!access)return fail("Specify -Name and -ChangeAccess.");if(!state.shares.some(s=>s.name===name))state.shares.push({name,path,access});return ok("Name : "+name+"\nPath : "+path+"\nChangeAccess : "+access,"SMB share created.");}
    case "get-smbshare": return ok(textRows(state.shares.map(s=>s.name+"  "+s.path+"  Change: "+s.access)));
    case "icacls": {const path=tokens[1];if(!state.folders.includes(path)||!tokens.some(t=>t.toLowerCase()==="/grant"))return fail("Specify an existing folder and /grant identity:(OI)(CI)M.");const permission=tokens[tokens.findIndex(t=>t.toLowerCase()==="/grant")+1];if(!permission?.includes(":(OI)(CI)M"))return fail("Use a valid NTFS Modify grant with (OI)(CI)M.");state.permissions.push(path+" -> "+permission);return ok("processed file: "+path+"\nSuccessfully processed 1 files; Failed processing 0 files","NTFS ACL updated.");}
    case "get-netfirewallprofile": return ok("Name    Enabled  DefaultInboundAction\nDomain  True     Block\nPrivate True     Block\nPublic  True     Block");
    case "new-netfirewallrule": {const name=get(tokens,"DisplayName");if(!name||get(tokens,"LocalPort")!=="8080"||get(tokens,"Profile").toLowerCase()!=="domain"||get(tokens,"Action").toLowerCase()!=="allow")return fail("Training task expects a Domain-profile TCP 8080 Allow rule.");if(!state.firewallRules.includes(name))state.firewallRules.push(name);return ok("DisplayName : "+name+"\nEnabled : True\nProfile : Domain\nAction : Allow","Firewall rule created.");}
    case "get-netfirewallrule": {const name=get(tokens,"DisplayName");const rules=name?state.firewallRules.filter(r=>r===name):state.firewallRules;return rules.length?ok(textRows(rules.map(r=>"DisplayName : "+r+"\nEnabled : True"))):fail("No matching firewall rule found.");}
    case "get-addefaultdomainpasswordpolicy": return domainError?fail(domainError):ok("Domain : "+state.domain+"\nComplexityEnabled : True\nMinPasswordLength : 12 (training policy)\nLockoutThreshold : 5 (training policy)\nNOTE: These are simulated, not production security settings.");
    case "get-addomaincontroller": return domainError?fail(domainError):ok("HostName : "+state.hostname.toLowerCase()+"."+state.domain+"\nSite : Default-First-Site-Name\nIsGlobalCatalog : True\nNOTE: This lab has only one simulated DC.");
    case "get-gpo": return domainError?fail(domainError):ok(textRows(state.gpos.map(name=>"DisplayName : "+name+"\nGpoStatus : AllSettingsEnabled (simulated)")));
    case "new-gpo": {
      if(domainError)return fail(domainError);const name=get(tokens,"Name");
      if(!name)return fail("Specify -Name.");if(state.gpos.includes(name))return fail("GPO already exists: "+name);
      state.gpos.push(name);return ok("DisplayName : "+name+"\nDomainName : "+state.domain+"\nLinks : 0","GPO created: "+name);
    }
    case "new-gplink": {
      if(domainError)return fail(domainError);const name=get(tokens,"Name"),target=get(tokens,"Target");
      if(!state.gpos.includes(name))return fail("GPO not found; create it first.");
      if(!state.ous.some(ou=>target.toLowerCase().startsWith("ou="+ou.toLowerCase()+",")))return fail("Create the destination OU first.");
      state.gpoLinks[target]=Array.from(new Set([...(state.gpoLinks[target]||[]),name]));
      return ok("Target : "+target+"\nDisplayName : "+name+"\nLinkEnabled : Yes","GPO link created: "+name);
    }
    case "get-gpinheritance": {
      if(domainError)return fail(domainError);const target=get(tokens,"Target");
      if(!target)return fail("Specify -Target.");
      return ok("Target : "+target+"\nGpoLinks : "+textRows(state.gpoLinks[target]||[])+"\nNOTE: No client-side policy processing is simulated.");
    }
    case "get-smbserverconfiguration": return ok("EnableSMB1Protocol : "+state.smb1Enabled+"\nEnableSMB2Protocol : True\nEnableSecuritySignature : True\nRequireSecuritySignature : True\nTRAINING baseline — verify production separately.");
    case "get-windowsoptionalfeature": {
      if(get(tokens,"FeatureName").toLowerCase()!=="smb1protocol"||!tokens.some(t=>t.toLowerCase()==="-online"))return fail("Use -Online -FeatureName SMB1Protocol.");
      return ok("FeatureName : SMB1Protocol\nState : "+(state.smb1Enabled?"Enabled":"Disabled")+"\nNOTE: Virtual feature state only.");
    }
    case "get-nettcpconnection": {
      if(get(tokens,"LocalPort")!=="445")return fail("This lab supports -LocalPort 445.");
      return ok(state.shares.length?"LocalAddress : 0.0.0.0\nLocalPort : 445\nState : Listen (virtual SMB service)":"No TCP 445 listener recorded in virtual training state.");
    }
    case "get-smbsession": return ok("No SMB sessions: this browser simulation has no real remote clients.");
    case "set-smbserverconfiguration": {
      const value=get(tokens,"EnableSMB1Protocol");
      if(value.toLowerCase()!=="$false")return fail("Training-only safeguard: only disabling SMB1 (-EnableSMB1Protocol $false) is supported.");
      state.smb1Enabled=false;return ok("EnableSMB1Protocol : False\nNOTE: Simulated SMB1 server configuration updated.","SMB1 disabled in training state.");
    }
    case "get-mpthreatdetection": return ok("No detections in this fictitious training dataset; this is NOT proof the host is safe.");
    case "get-adreplicationfailure": {
      if(domainError)return fail(domainError);if(get(tokens,"Target").toLowerCase()!==state.hostname.toLowerCase())return fail("Target must match the training domain controller hostname.");
      return ok("0 failures in this single-domain-controller lab. NOT a ZeroLogon compliance check.");
    }
    case "get-hotfix": return ok("Source : SIMULATED TRAINING BASELINE\nPatch compliance cannot be established in this browser lab.\nIn production: inspect OS build and published security updates for MS17-010 and CVE-2020-1472.");
    case "get-mpcomputerstatus": return ok("AMServiceEnabled        : True\nAntivirusEnabled        : True\nRealTimeProtectionEnabled: True\nNOTE: simulated values; this does not inspect your device.");
    case "get-winevent": {
      const name=get(tokens,"LogName"),count=Math.max(1,Math.min(20,Number(get(tokens,"MaxEvents")||5)));
      if(name.toLowerCase()==="security")return ok(["SIMULATED SECURITY EVENT LOG — no real credentials were processed.",
        "Information Id 4624   Example: lab user successfully authenticated (demonstration only)",
        "Warning     Id 4625   Example: invalid logon credentials (demonstration only)"].slice(0,count+1).join("\n"));
      if(name.toLowerCase()!=="system")return fail("Training logs support -LogName System or Security.");
      return ok(textRows(state.events.slice(0,count).map((event,i)=>"Information  Id "+(1000+i)+"  "+event))+"\nNo Netlogon 5827/5828 events are present in this fictional log.");
    }
    case "wbadmin": {
      const action=(tokens[1]||"").toLowerCase();
      if(action==="start"&&(tokens[2]||"").toLowerCase()==="backup"){if(!has(state,"Windows-Server-Backup"))return fail("Install Windows-Server-Backup before creating a backup.");if(!tokens.some(t=>t.toLowerCase().startsWith("-backuptarget:"))||!tokens.some(t=>t.toLowerCase().startsWith("-include:")))return fail("Specify -backupTarget and -include.");state.backups+=1;return ok("Backup completed successfully (SIMULATED). Version: "+state.backups,"Virtual backup #"+state.backups+" recorded.");}
      if(action==="get"&&(tokens[2]||"").toLowerCase()==="versions")return ok(state.backups?"Backup versions: "+state.backups+" (SIMULATED — not restorable)":"No backups available.");
      return fail("Supported wbadmin syntax: wbadmin start backup -backupTarget:E: -include:D: -quiet / wbadmin get versions");
    }
    default: return fail("CommandNotFoundException: '"+tokens[0]+"' is not supported in this training simulator. Use Get-Command to see the supported subset.");
  }
}
