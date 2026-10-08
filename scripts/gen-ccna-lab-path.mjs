/**
 * Generates the audited, leveled CCNA lab path from the lab data this project already publishes.
 *
 * Inputs (both committed, so this file is reproducible from a clean clone):
 *   lib/content/ccna-topologies.ts  the 101 catalog labs, already leveled on the six official domains
 *   lib/content/ccna.ts             the eight hands-on build stages with their steps, tests and quizzes
 *
 * Outputs:
 *   lib/content/ccna-lab-path.ts        data module consumed by the page and the validators
 *   content/ccna-lab-manifest.json      the audited manifest as plain JSON
 *   docs/ccna-lab-audit.md              the human-readable audit report
 *
 * Rules this generator obeys:
 *   - every existing lab ID is preserved, in its original form, and appears exactly once
 *   - no lab is deleted and no progress key is renamed; progress lives outside this file
 *   - band membership, review status and every exception are declared literally below, never guessed
 *   - source URLs are only the ones that were fetched and answered 200 when this file was written;
 *     scripts/verify-ccna-lab-sources.mjs re-fetches them, and scripts/validate-ccna-labs.mjs
 *     fails the build if a lab has no verified source
 *
 * Run: node --experimental-strip-types scripts/gen-ccna-lab-path.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ccnaLabs } from "../lib/content/ccna.ts";
import { ccnaTopologyLabs, ccnaTopologyLevels } from "../lib/content/ccna-topologies.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKED = "2026-10-08";

/** Every URL below was fetched on CHECKED and answered HTTP 200 with the expected content type.
 * Nothing is listed here that was not fetched; four initially guessed Cisco deep links returned 404
 * and were removed rather than published. */
const SOURCES = {
  blueprint: { title: "Cisco · CCNA Exam v1.1 (200-301) exam topics", url: "https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf", covers: "The official topic list every objective label in this file is read from", confidence: "reviewed" },
  exam: { title: "Cisco · CCNA certification and exam information", url: "https://www.cisco.com/site/us/en/learn/training-certifications/exams/ccna.html", covers: "Exam format, duration and the current blueprint edition", confidence: "reviewed" },
  packetTracer: { title: "Cisco Networking Academy · Getting started with Packet Tracer", url: "https://www.netacad.com/courses/getting-started-cisco-packet-tracer/1000", covers: "The simulator the build stages are written for", confidence: "reviewed" },
  ipv4: { title: "Cisco · IP addressing and subnetting (document 13788)", url: "https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html", covers: "IPv4 address classes, masks and subnet arithmetic", section: "Subnetting and mask reference", confidence: "reviewed" },
  ipv6: { title: "Cisco IOS · Implementing IPv6 addressing and basic connectivity", url: "https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/15-2mt/ip6-15-2mt-book/ip6-uni-routing.html", covers: "IPv6 unicast addressing and interface configuration", section: "IPv6 addressing and unicast routing", confidence: "reviewed" },
  vlan: { title: "Cisco · Configure VLAN trunks (Catalyst 9000 configuration guide)", url: "https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide/configure-vlan-trunks.html", covers: "802.1Q trunk ports, allowed VLAN lists and the native VLAN", section: "Configuring VLAN trunks", confidence: "reviewed" },
  vlanGuide: { title: "Cisco · VLAN configuration guide (Catalyst 9000)", url: "https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/vlan/vlan-configuration-guide.html", covers: "VLAN creation, access ports and VLAN database behaviour", section: "VLAN configuration overview", confidence: "reviewed" },
  stp: { title: "Cisco IOS · Configuring optional spanning-tree features", url: "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/16-11/configuration_guide/lyr2/b_1611_lyr2_9600_cg/configuring_optional___spanning_tree_features.html", covers: "PortFast, BPDU guard, BPDU filter, root guard and loop guard", section: "Optional spanning-tree features", confidence: "reviewed" },
  channel: { title: "Cisco IOS · EtherChannel configuration guide (Catalyst 9000)", url: "https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/lyr2-fwd/etherchannel/etherchannel-configuration-guide/m_ethernetchannel.html", covers: "channel-group, port-channel and LACP negotiation modes", section: "Configuring EtherChannels", confidence: "reviewed" },
  channelPdf: { title: "Cisco IOS · EtherChannel configuration (Catalyst 3750 guide)", url: "https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3750/software/release/12-2_25_sea/configuration/guide/3750scg/swethchl.pdf", covers: "Layer 2 and Layer 3 EtherChannel member consistency", confidence: "reviewed" },
  ospf: { title: "Cisco IOS · Configuring OSPF", url: "https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/15-mt/iro-15-mt-book/iro-cfg.html", covers: "OSPFv2 neighbours, areas, router ID and DR/BDR election", section: "Configuring OSPF", confidence: "reviewed" },
  dhcp: { title: "Cisco IOS · Configuring the Cisco IOS DHCP server", url: "https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/12-4/dhcp-12-4-book/config-dhcp-server.html", covers: "DHCP pools, exclusions metadata, manual bindings and relay", confidence: "reviewed" },
  dhcpXe: { title: "Cisco IOS XE · Configuring the DHCP server (IP addressing 17.x)", url: "https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_config-dhcp-server-xe.html", covers: "Current IOS XE DHCP server syntax for the same tasks", section: "DHCP server configuration", confidence: "reviewed" },
  nat: { title: "Cisco · How NAT works (document 13772)", url: "https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/13772-12.html", covers: "Static, dynamic and overload translations and inside/outside roles", confidence: "reviewed" },
  acl: { title: "Cisco · Configure IP access lists (document 23602)", url: "https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html", covers: "Standard and extended ACLs, ordering, direction and the implicit deny", confidence: "reviewed" },
  ssh: { title: "Cisco · Configure SSH on IOS devices (document 4145)", url: "https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html", covers: "RSA key generation, SSHv2 and VTY transport restrictions", confidence: "reviewed" },
  aaa: { title: "Cisco IOS · Authentication, authorization and accounting configuration guide", url: "https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_aaa/configuration/15-mt/sec-usr-aaa-15-mt-book.html", covers: "AAA concepts and local versus server-based authentication (objective 5.8)", confidence: "reviewed" },
  wifi: { title: "Cisco · Configure WPA-PSK on a wireless LAN (document 116599)", url: "https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/116599-config-wpa-psk-00.html", covers: "WLAN security settings and a shared pre-shared key", confidence: "reviewed" },
  rest: { title: "Cisco DevNet · NX-OS representational state transfer (REST) API", url: "https://developer.cisco.com/docs/nx-os/representational-state-transfer-rest/", covers: "REST-based northbound APIs, authentication and HTTP verbs", confidence: "reviewed" },
  rfc1918: { title: "IETF RFC 1918 · Address allocation for private internets", url: "https://www.rfc-editor.org/rfc/rfc1918", covers: "The private IPv4 ranges of objective 1.7", confidence: "reviewed" },
  rfc2131: { title: "IETF RFC 2131 · Dynamic host configuration protocol", url: "https://www.rfc-editor.org/rfc/rfc2131", covers: "DHCP client, server and relay message flows", confidence: "reviewed" },
  rfc3022: { title: "IETF RFC 3022 · Traditional IP network address translator", url: "https://www.rfc-editor.org/rfc/rfc3022", covers: "NAT terminology and address translation behaviour", confidence: "reviewed" },
  rfc2328: { title: "IETF RFC 2328 · OSPF version 2", url: "https://www.rfc-editor.org/rfc/rfc2328", covers: "OSPFv2 neighbour state machine and DR/BDR election", confidence: "reviewed" },
  rfc3768: { title: "IETF RFC 3768 · Virtual router redundancy protocol", url: "https://www.rfc-editor.org/rfc/rfc3768", covers: "The first-hop redundancy protocol behind VRRP (objective 3.5)", confidence: "reviewed" },
  rfc1035: { title: "IETF RFC 1035 · Domain names and implementation", url: "https://www.rfc-editor.org/rfc/rfc1035", covers: "DNS name resolution, the service behind objective 4.3", confidence: "reviewed" },
  rfc5905: { title: "IETF RFC 5905 · Network time protocol version 4", url: "https://www.rfc-editor.org/rfc/rfc5905", covers: "NTP client and server operation (objective 4.2)", confidence: "reviewed" },
  rfc5424: { title: "IETF RFC 5424 · The syslog protocol", url: "https://www.rfc-editor.org/rfc/rfc5424", covers: "Syslog message format, facilities and severity levels (objective 4.5)", confidence: "reviewed" },
  rfc8200: { title: "IETF RFC 8200 · Internet protocol version 6 specification", url: "https://www.rfc-editor.org/rfc/rfc8200", covers: "The IPv6 packet format and address behaviour", confidence: "reviewed" },
  rfc4291: { title: "IETF RFC 4291 · IP version 6 addressing architecture", url: "https://www.rfc-editor.org/rfc/rfc4291", covers: "Global, unique-local and link-local unicast, anycast and multicast types (objective 1.9)", confidence: "reviewed" },
  rfc3927: { title: "IETF RFC 3927 · Dynamic configuration of IPv4 link-local addresses", url: "https://www.rfc-editor.org/rfc/rfc3927", covers: "Link-local IPv4 behaviour and address conflicts", confidence: "reviewed" },
  rfc4861: { title: "IETF RFC 4861 · Neighbor discovery for IP version 6", url: "https://www.rfc-editor.org/rfc/rfc4861", covers: "IPv6 neighbour discovery, router advertisement and gateway behaviour", confidence: "reviewed" },
  rfc6241: { title: "IETF RFC 6241 · Network configuration protocol (NETCONF)", url: "https://www.rfc-editor.org/rfc/rfc6241", covers: "Programmatic configuration management, the family objective 6.1 describes", confidence: "reviewed" },
  rfc8259: { title: "IETF RFC 8259 · The JSON data interchange format", url: "https://www.rfc-editor.org/rfc/rfc8259", covers: "JSON grammar and value types (objective 6.7)", confidence: "reviewed" },
  rfc7231: { title: "IETF RFC 7231 · HTTP/1.1 semantics and content", url: "https://www.rfc-editor.org/rfc/rfc7231", covers: "HTTP methods and status semantics behind objective 6.5", confidence: "reviewed" },
};

/** Topics of the fetched 200-301 v1.1 list that no lab in this library exercises. Listed explicitly
 * so a coverage gap is reported instead of being hidden by a green build. */
const NO_LAB_OBJECTIVES = [
  { objective: "1.5", label: "Compare TCP to UDP", reason: "No lab in this library, and none of the eight build stages, exercises TCP versus UDP behaviour; the question bank covers it, no lab does." },
  { objective: "1.12", label: "Explain virtualization fundamentals (server virtualization, containers, and VRFs)", reason: "No lab covers server virtualization, containers or VRFs. This site teaches containers as a separate Docker track, which is not part of the CCNA path." },
  { objective: "4.4", label: "Explain the function of SNMP in network operations", reason: "The library has syslog and NTP labs but no SNMP lab." },
  { objective: "4.7", label: "Explain the forwarding per-hop behavior (PHB) for QoS", reason: "No lab covers classification, marking, queuing, congestion, policing or shaping." },
  { objective: "5.5", label: "Describe IPsec remote access and site-to-site VPNs", reason: "No lab covers IPsec remote access or site-to-site VPNs." },
];

/** The twelve category bands, in learning order. Objectives are transcribed from the fetched
 * 200-301 v1.1 topic list; no objective number is used that is not in that document. */
const BANDS = [
  {
    id: "ccna-band-01", order: 1, tier: "beginner", domain: "1.0",
    title: "Network fundamentals and device access",
    objectives: ["1.1", "1.2", "1.3", "1.4", "1.13", "2.3"],
    summary: "Start with the parts and the CLI: what each device does, how interfaces and cables are read, how to configure a Cisco device from an unconfigured state and how to see the neighbours it discovers.",
    prerequisiteBands: [],
    sourceKeys: ["blueprint", "packetTracer", "ipv4", "rfc3927"],
    minutes: "20–35",
    verification: ["show version", "show ip interface brief", "show interfaces status", "show cdp neighbors detail", "show lldp neighbors detail"],
    failure: "Shut one access port, then force half duplex on one end of a second link while the other end stays auto or full duplex.",
    recovery: "Bring the port back with no shutdown, return both ends of the mismatched link to agreeing duplex and speed settings, then confirm with show interfaces that the error counters stop climbing.",
    scenarioType: "small-business-deployment",
  },
  {
    id: "ccna-band-02", order: 2, tier: "beginner", domain: "1.0",
    title: "IPv4 addressing, subnetting and IPv6",
    objectives: ["1.6", "1.7", "1.8", "1.9", "1.10"],
    summary: "Give the network addresses: private and global IPv4, mask and prefix arithmetic, VLSM planning, IPv6 address types, EUI-64 and the client settings that must match the plan.",
    prerequisiteBands: ["ccna-band-01"],
    sourceKeys: ["blueprint", "ipv4", "ipv6", "rfc1918", "rfc8200", "rfc4291"],
    minutes: "25–40",
    verification: ["show ip interface brief", "show ipv6 interface brief", "show ip route connected", "show ipv6 route connected"],
    failure: "Place one host on the wrong side of a subnet boundary — for example .64 on a /26 LAN — while leaving the gateway correct.",
    recovery: "Move the host back inside its own block, keep host and gateway in the same subnet, then re-test the local ping and the off-subnet ping separately.",
    scenarioType: "small-business-deployment",
  },
  {
    id: "ccna-band-03", order: 3, tier: "intermediate", domain: "2.0",
    title: "VLANs, trunks and inter-VLAN routing",
    objectives: ["2.1", "2.2"],
    summary: "Separate departments on shared switches: access ports, the default VLAN, 802.1Q trunks, the native VLAN and the Layer 3 leg that carries traffic between the VLANs.",
    prerequisiteBands: ["ccna-band-01", "ccna-band-02"],
    sourceKeys: ["blueprint", "vlan", "vlanGuide"],
    minutes: "35–55",
    verification: ["show vlan brief", "show interfaces switchport", "show interfaces trunk", "show ip interface brief"],
    failure: "Remove one department's VLAN from a trunk's allowed list, or set the native VLAN on one side of the trunk only.",
    recovery: "Restore the allowed VLAN list and make the native VLAN agree on both ends, then re-test each department's gateway before testing the cross-VLAN path.",
    scenarioType: "vlan-migration",
  },
  {
    id: "ccna-band-04", order: 4, tier: "intermediate", domain: "2.0",
    title: "Ethernet switching, MAC tables and spanning tree",
    objectives: ["1.13", "2.5"],
    summary: "Follow a frame: MAC learning and aging, the address table, flooding, and the Rapid PVST+ behaviour that keeps redundant links usable without a loop — root bridge, port roles, port states and PortFast.",
    prerequisiteBands: ["ccna-band-01"],
    sourceKeys: ["blueprint", "stp", "vlanGuide"],
    minutes: "30–45",
    verification: ["show mac address-table", "show spanning-tree", "show spanning-tree vlan 30", "show interfaces status"],
    failure: "Add a redundant link and let two switches disagree about which one should be root, or enable PortFast on a port that faces another switch.",
    recovery: "Set one root bridge per VLAN deliberately, keep exactly one blocking port on the redundant path, and restrict PortFast plus BPDU guard to ports that face end devices.",
    scenarioType: "stp-loop-prevention",
  },
  {
    id: "ccna-band-05", order: 5, tier: "intermediate", domain: "2.0",
    title: "EtherChannel and LACP",
    objectives: ["2.4"],
    summary: "Bundle parallel links into one logical path: Layer 2 and Layer 3 channels, LACP negotiation modes, member consistency and what happens when a single member fails.",
    prerequisiteBands: ["ccna-band-04"],
    sourceKeys: ["blueprint", "channel", "channelPdf"],
    minutes: "20–35",
    verification: ["show etherchannel summary", "show etherchannel port-channel", "show interfaces port-channel 1", "show spanning-tree vlan 30"],
    failure: "Leave both ends of the bundle in LACP passive so nothing initiates negotiation, or change one member's allowed VLAN list so it becomes individual or suspended.",
    recovery: "Make at least one end LACP active and make member and port-channel settings identical on both switches, then shut one member and confirm the surviving member keeps the logical path up.",
    scenarioType: "etherchannel-negotiation-mismatch",
  },
  {
    id: "ccna-band-06", order: 6, tier: "intermediate", domain: "3.0",
    title: "Static routing and OSPF",
    objectives: ["3.1", "3.2", "3.3", "3.4", "3.5"],
    summary: "Carry traffic between networks: read the routing table, understand longest-prefix and administrative distance, configure default, network, host and floating static routes, run single-area OSPFv2, and see first-hop redundancy.",
    prerequisiteBands: ["ccna-band-02"],
    sourceKeys: ["blueprint", "ospf", "ipv4", "rfc2328", "rfc3768"],
    minutes: "35–60",
    verification: ["show ip route", "show ip route ospf", "show ip ospf neighbor", "show ip ospf interface brief", "show standby brief", "show vrrp brief"],
    failure: "Put the transit interface of one router in a different OSPF area, or remove the return route that the remote LAN needs.",
    recovery: "Return both transit statements to the same area, wait for the neighbour to reach FULL and the remote prefix to appear as an O route, then re-test end to end.",
    scenarioType: "branch-office-connectivity",
  },
  {
    id: "ccna-band-07", order: 7, tier: "intermediate", domain: "4.0",
    title: "DHCP, DNS, NAT and IP services",
    objectives: ["4.1", "4.2", "4.3", "4.5", "4.6", "4.9"],
    summary: "Run the services a live network depends on: address leases and relay, name resolution, inside source NAT with static and pooled mappings, time synchronisation, logging and file transfer.",
    prerequisiteBands: ["ccna-band-02", "ccna-band-06"],
    sourceKeys: ["blueprint", "dhcp", "dhcpXe", "nat", "rfc2131", "rfc3022", "rfc1035", "rfc5905", "rfc5424"],
    minutes: "30–50",
    verification: ["show ip dhcp binding", "show ip dhcp pool", "show ip nat translations", "show ip nat statistics", "show ntp status", "show logging", "show ip interface brief"],
    failure: "Leave fixed device addresses inside the lease pool, or apply the NAT inside and outside roles to the wrong interfaces.",
    recovery: "Exclude the fixed addresses from the pool and put the correct interface roles back, then verify the lease and the translation table as two separate observations.",
    scenarioType: "dhcp-relay-or-exhaustion",
  },
  {
    id: "ccna-band-08", order: 8, tier: "intermediate", domain: "2.0",
    title: "Wireless and WPA2/WPA3 fundamentals",
    objectives: ["1.11", "2.6", "2.7", "2.9", "5.9", "5.10"],
    summary: "Connect clients without wires: wireless principles and non-overlapping channels, SSID and RF, architectural choices and AP modes, WLAN components and their physical connections, plus WPA2-PSK in the controller GUI.",
    prerequisiteBands: ["ccna-band-01"],
    sourceKeys: ["blueprint", "wifi"],
    minutes: "25–40",
    verification: ["WLAN security settings and client association state in the controller GUI", "show wlan summary", "show ap summary", "the client's IP configuration after association"],
    failure: "Mismatch the security mode or pre-shared key between the WLAN and the client, or leave the client outside the addressing the WLAN hands out.",
    recovery: "Make the SSID, security mode and key agree on both sides, then treat successful association and a valid lease as two separate successes to confirm.",
    scenarioType: "wireless-client-auth-failure",
  },
  {
    id: "ccna-band-09", order: 9, tier: "advanced", domain: "5.0",
    title: "Security fundamentals, SSH and ACLs",
    objectives: ["2.8", "4.8", "5.1", "5.2", "5.3", "5.4", "5.6", "5.7", "5.8"],
    summary: "Protect the devices and the traffic: password and secret handling, password policy, console and VTY hardening, remote access over SSH, ordered access control lists, port security, and the authentication, authorisation and accounting concepts behind them.",
    prerequisiteBands: ["ccna-band-03", "ccna-band-06"],
    sourceKeys: ["blueprint", "ssh", "acl", "aaa"],
    minutes: "30–50",
    verification: ["show ip ssh", "show access-lists", "show ip interface gigabitEthernet0/0", "show port-security interface fastEthernet0/1", "show running-config | include enable secret", "show users"],
    failure: "Put a broad permit ip any any above the specific deny, or apply a standard ACL far from the destination where it filters traffic it was never meant to see.",
    recovery: "Order specific entries before broad permits, apply a standard ACL as close to the destination as the design allows, then re-test both the denied flow and a permitted control flow so a total outage is not mistaken for success.",
    scenarioType: "ssh-access-hardening",
  },
  {
    id: "ccna-band-10", order: 10, tier: "advanced", domain: "6.0",
    title: "Network automation, JSON, REST and controllers",
    objectives: ["6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7"],
    summary: "Describe and use the programmable side: how automation changes management, traditional versus controller-based networks, overlay and underlay with northbound and southbound APIs, REST characteristics, configuration management tooling and JSON components.",
    prerequisiteBands: ["ccna-band-01"],
    sourceKeys: ["blueprint", "rest", "rfc8259", "rfc7231", "rfc6241"],
    minutes: "20–35",
    verification: ["parse the inventory document with a strict JSON parser and confirm value types", "an authorised read request against the documented controller endpoint", "compare the intended configuration with the device state before writing anything"],
    failure: "Treat the quoted string \"false\" as the JSON boolean false, or act on an endpoint or a generated recommendation that was never validated.",
    recovery: "Confirm value types with a real parser, use only the controller's documented endpoints and credentials, and require evidence and authorisation before any change reaches a device.",
    scenarioType: "automation-plan-and-review",
  },
  {
    id: "ccna-band-11", order: 11, tier: "troubleshooting", domain: "mixed",
    title: "Troubleshooting track",
    objectives: ["3.4", "5.6", "5.7", "2.5"],
    summary: "Labs whose purpose is repair, not construction. Each one starts from a working baseline that has been broken on purpose, and every one is listed with the failure condition to reproduce and the recovery path to prove.",
    prerequisiteBands: ["ccna-band-01"],
    sourceKeys: ["blueprint", "ospf", "acl", "stp"],
    minutes: "30–50",
    verification: ["show ip ospf neighbor", "show access-lists", "show port-security interface fastEthernet0/1", "show ip route"],
    failure: "See the per-lab failure condition below; these labs each publish the exact fault to reproduce.",
    recovery: "Repair the specific fault, then prove the original requirement works again instead of only proving that the error message disappeared.",
    scenarioType: "monitoring-and-incident-investigation",
  },
  {
    id: "ccna-band-12", order: 12, tier: "advanced", domain: "mixed",
    title: "Integrated capstone scenarios",
    objectives: ["1.6", "2.1", "2.2", "3.3", "3.4", "4.1", "4.6", "5.3", "5.6", "5.10"],
    summary: "Whole networks configured from an unconfigured state. These are the only labs that ask for several domains at once, and they are deliberately last: each depends on the bands above it actually being finished.",
    prerequisiteBands: ["ccna-band-03", "ccna-band-06", "ccna-band-07", "ccna-band-09"],
    sourceKeys: ["blueprint", "packetTracer"],
    minutes: "60–90",
    verification: ["an end-to-end ping from each client to every required destination", "show ip route and show ip interface brief on every Layer 3 device", "show vlan brief and show interfaces trunk on every switch"],
    failure: "A single misconfiguration is introduced across one service — a missing VLAN on a trunk, a missing return route, a lease pool that overlaps a fixed address, or a broad deny above an intended permit.",
    recovery: "Work from the client outward, fix the one fault, and re-run the full end-to-end matrix rather than only the check that failed.",
    scenarioType: "small-business-deployment",
  },
];

/** Catalog labs that are troubleshooting labs, with the fault they are about. */
const LAB_FAULTS = {
  53: { failure: "The OSPF transit interfaces on two routers sit in different areas, so the adjacency never reaches FULL and the remote LAN is missing from the routing table.", recovery: "Correct the area statement on the wrong router, confirm the neighbour reaches FULL and the remote prefix appears as an O route, then re-test end to end." },
  92: { failure: "Port security is armed with a maximum of one address while a small switch or access point is attached, so the port errs out and the clients behind it lose access.", recovery: "Clear the violation, raise the maximum or restrict the port to a single known device, and confirm the port is back in the forwarding state with the expected address counted." },
  93: { failure: "Access list entries filter the return traffic or the wrong direction, so some VLANs reach the servers and others do not.", recovery: "Check the direction and interface of each list against the requirement, allow only what the requirement names, and prove every VLAN can reach its permitted destinations." },
  94: { failure: "A broad permit in an extended ACL is placed above the specific deny, so the intended restriction never takes effect.", recovery: "Reorder the entries so the specific deny is evaluated first, keep an explicit permit for the remaining traffic and verify the denied flow plus a permitted control flow." },
  95: { failure: "A standard ACL is applied close to the source, so it blocks traffic to destinations the requirement never mentioned.", recovery: "Place the standard ACL as close to the destination as the design allows, re-apply it in the correct direction and confirm only the intended source is restricted." },
  96: { failure: "A named ACL is edited or referenced by a different name than the one applied to the interface, so the device filters with the old entries.", recovery: "Confirm the applied name matches the intended list, reload or re-apply the list, and verify with show access-lists that the interface uses the entries you expect." },
};

/** Capstone faults, written per challenge lab because each integrates a different service. */
const CAPSTONE_FAULTS = {
  15: { failure: "Two hosts on the freshly configured network cannot reach their gateway: one holds a duplicate address and another has a mask that puts its gateway outside its own subnet.", recovery: "Give each host a unique address inside the planned block with the correct mask and gateway, then re-test both the local and the off-subnet path." },
  31: { failure: "Inter-VLAN routing is configured but one VLAN's gateway never answers because that VLAN is missing from the trunk's allowed list.", recovery: "Add the missing VLAN to the trunk, confirm the router subinterface for it is up, and prove each VLAN's gateway answers before testing cross-VLAN traffic." },
  54: { failure: "Routing inside each site works but traffic between sites fails because one router has no return route to the remote VLAN.", recovery: "Add the missing route, confirm both directions appear in the routing tables, and re-test from a client rather than from the router." },
  73: { failure: "Clients receive no lease and the published address never translates, because the relay target points at the wrong server and the NAT inside role sits on the outside interface.", recovery: "Correct the relay target and the inside/outside NAT roles, then verify the lease and the translation table as separate results before claiming the services work." },
  97: { failure: "Device hardening is in place but one management flow is blocked, because a broad deny sits above the permit that was meant to allow it.", recovery: "Reorder the list so the specific permits are evaluated first, restore the intended management path and confirm both the denied flow and the permitted one." },
};

/** Removed from the catalog levels: labs that need human review, with the reason each one does. */
const REVIEW_NOTES = {
  20: "The lab configures and verifies VTP, which does not appear anywhere in the published 200-301 v1.1 topic list, so its objective mapping cannot be verified.",
  45: "The catalog summary names Frame Relay; that technology is not part of the published v1.1 topics, so the objective coverage cannot be verified from the catalog alone.",
  63: "The source catalog publishes another lab's summary for this entry, so the actual scope of this lab cannot be confirmed.",
  67: "Objective 4.9 asks candidates to describe the capabilities of TFTP and FTP; a hands-on FTP server configuration may exceed that wording, and the catalog publishes no topology diagram for this lab.",
  92: "The catalog summary describes configuring and verifying port security rather than diagnosing a fault, so the troubleshooting role of this lab is inferred rather than documented.",
  95: "The catalog summary repeats the wording of the two neighbouring ACL troubleshooting labs and contains a typo, so this lab's distinct scope cannot be confirmed.",
  100: "Objective 6.6 of the published v1.1 blueprint names Ansible and Terraform; this lab focuses on Ansible, Chef and Puppet, so the mapping is partial.",
};
const CAPSTONE_REVIEW = "Integrated scenario: the catalog does not enumerate which objectives this lab covers, so per-objective coverage cannot be verified. The prerequisites below are this project's recommendation, not the vendor's.";

/** Explicit band membership by catalog number. Written out in full so that a data change in the
 * source catalog cannot silently move a lab into a different band. */
const BAND_MEMBERS = {
  "ccna-band-01": [1, 2, 3, 4, 5, 21, 22, 29],
  "ccna-band-02": [6, 7, 8, 9, 10, 11, 13, 14],
  "ccna-band-03": [16, 17, 18, 19, 20, 28],
  "ccna-band-04": [12, 25, 26, 30],
  "ccna-band-05": [23, 24],
  "ccna-band-06": [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
  "ccna-band-07": [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 66, 67, 68, 69, 70, 71],
  "ccna-band-08": [27],
  "ccna-band-09": [65, 72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91],
  "ccna-band-10": [98, 99, 100, 101],
  "ccna-band-11": [53, 92, 93, 94, 95, 96],
  "ccna-band-12": [15, 31, 54, 73, 97],
};

/** Hands-on build stages, mapped onto the band that teaches the same material. */
const STAGE_BANDS = {
  "ccna-addressing": "ccna-band-02",
  "ccna-vlans": "ccna-band-03",
  "ccna-etherchannel": "ccna-band-05",
  "ccna-routing": "ccna-band-06",
  "ccna-services": "ccna-band-07",
  "ccna-security": "ccna-band-09",
  "ccna-wireless": "ccna-band-08",
  "ccna-automation": "ccna-band-10",
};

/** Scenario types, with the rotation of business contexts used to frame catalog labs. */
const SCENARIO_TYPES = {
  "small-business-deployment": { label: "Small business network deployment", detail: "A single site that has to come up correctly on the first attempt." },
  "branch-office-connectivity": { label: "Branch office connectivity", detail: "Two or more sites that must reach each other and a central service." },
  "vlan-migration": { label: "VLAN migration", detail: "Departments being separated or moved without losing access to shared services." },
  "trunk-native-vlan-failure": { label: "Trunk or native VLAN failure", detail: "A path that carries more than one VLAN and disagrees about how tagging works." },
  "ospf-adjacency-failure": { label: "OSPF adjacency failure", detail: "Routers that should be neighbours are not, or are neighbours without the routes." },
  "dhcp-relay-or-exhaustion": { label: "DHCP exhaustion or relay failure", detail: "Clients that cannot obtain or renew an address on the expected subnet." },
  "nat-translation-problem": { label: "NAT translation problem", detail: "A published address that does not map to the host it is meant to represent." },
  "acl-blocking-traffic": { label: "ACL blocking required traffic", detail: "A filter that is stopping traffic the requirement says must pass." },
  "wireless-client-auth-failure": { label: "Wireless client authentication failure", detail: "A client that cannot join, or joins without usable addressing." },
  "ssh-access-hardening": { label: "SSH access hardening", detail: "Management access being moved away from clear text and shared secrets." },
  "stp-loop-prevention": { label: "STP loop prevention", detail: "Redundant links that must stay redundant without flooding the network." },
  "etherchannel-negotiation-mismatch": { label: "EtherChannel negotiation mismatch", detail: "Links that should be one bundle behaving as separate or suspended ports." },
  "ipv6-gateway-or-neighbor-discovery": { label: "IPv6 gateway or neighbour-discovery issue", detail: "An IPv6 host that cannot resolve or reach its first hop." },
  "monitoring-and-incident-investigation": { label: "Monitoring and incident investigation", detail: "Reading device state to decide what actually happened." },
  "automation-plan-and-review": { label: "Automation plan and review", detail: "Deciding what an automated change should do before it is allowed to touch a device." },
};

/** Per-lab scenario overrides: catalog number to scenario type. Everything else inherits its band. */
const SCENARIO_OVERRIDES = {
  5: "monitoring-and-incident-investigation",
  7: "branch-office-connectivity", 9: "branch-office-connectivity",
  10: "ipv6-gateway-or-neighbor-discovery", 11: "ipv6-gateway-or-neighbor-discovery",
  13: "ipv6-gateway-or-neighbor-discovery", 14: "ipv6-gateway-or-neighbor-discovery",
  17: "trunk-native-vlan-failure", 19: "trunk-native-vlan-failure",
  12: "monitoring-and-incident-investigation",
  21: "monitoring-and-incident-investigation", 22: "monitoring-and-incident-investigation", 29: "monitoring-and-incident-investigation",
  32: "monitoring-and-incident-investigation",
  36: "ipv6-gateway-or-neighbor-discovery", 38: "ipv6-gateway-or-neighbor-discovery", 40: "ipv6-gateway-or-neighbor-discovery",
  41: "ospf-adjacency-failure", 42: "ospf-adjacency-failure", 43: "ospf-adjacency-failure", 44: "ospf-adjacency-failure", 45: "ospf-adjacency-failure", 50: "ospf-adjacency-failure", 53: "ospf-adjacency-failure",
  46: "branch-office-connectivity", 47: "branch-office-connectivity", 51: "branch-office-connectivity", 52: "branch-office-connectivity",
  55: "nat-translation-problem", 56: "nat-translation-problem", 57: "nat-translation-problem", 68: "nat-translation-problem",
  58: "monitoring-and-incident-investigation", 59: "monitoring-and-incident-investigation", 61: "monitoring-and-incident-investigation", 62: "monitoring-and-incident-investigation", 69: "monitoring-and-incident-investigation",
  60: "monitoring-and-incident-investigation", 70: "monitoring-and-incident-investigation",
  66: "monitoring-and-incident-investigation", 67: "monitoring-and-incident-investigation",
  74: "ssh-access-hardening", 75: "ssh-access-hardening", 76: "ssh-access-hardening", 77: "ssh-access-hardening", 78: "ssh-access-hardening", 86: "ssh-access-hardening", 87: "ssh-access-hardening", 88: "ssh-access-hardening",
  80: "acl-blocking-traffic", 81: "acl-blocking-traffic", 82: "acl-blocking-traffic", 83: "acl-blocking-traffic", 84: "acl-blocking-traffic", 89: "acl-blocking-traffic", 90: "acl-blocking-traffic",
  85: "monitoring-and-incident-investigation", 91: "monitoring-and-incident-investigation", 92: "monitoring-and-incident-investigation",
  93: "acl-blocking-traffic", 94: "acl-blocking-traffic", 95: "acl-blocking-traffic", 96: "acl-blocking-traffic",
};

/** Beginner labs inside otherwise advanced bands, so the progression stays honest. */
const TIER_OVERRIDES = {
  74: "beginner", 75: "beginner", 76: "beginner", 77: "beginner", 78: "beginner", 79: "beginner",
  98: "intermediate", 99: "intermediate", 100: "intermediate", 101: "intermediate",
  15: "advanced", 31: "advanced", 54: "advanced", 73: "advanced", 97: "advanced",
};

/** Scenario contexts, rotated per lab so the framing does not repeat. */
const CONTEXTS = [
  "a 40-person accounting firm that runs one floor of switching",
  "a two-site dental group whose branch must reach the practice-management server",
  "a regional distribution centre that ships orders from four docks",
  "a school district connecting a new classroom block to the existing campus",
  "a 12-room boutique hotel with a shared front-desk network",
  "a manufacturing plant with an office network beside the production floor",
  "a public library branch with public and staff networks on the same switches",
  "a veterinary clinic that shares its building with a small laboratory",
  "a logistics broker whose staff work from two adjacent offices",
  "a community college lab room that is rebuilt every semester",
];

const ROLES = [
  "You are the network engineer for",
  "You have inherited the network at",
  "You are the only network engineer at",
  "You are covering for the usual engineer at",
];

/** Business requirement for a lab whose title already states the task. The leading verb decides whether
 * the lab is a reading exercise, a build, a verification or a repair, so the requirement matches it. */
const LEAD_VERB = /^(Explore and Configure|Configure and Verify|Configure and Test|Submit and Explore|Obtain and Interpret|Route Selection by Using|Plan and Configure|Manually Configure|Troubleshooting|Troubleshoot|Explore|Configure|Implement|Interpret|Obtain|Compare|Apply|Verify)\s+/;
const requirement = (name) => {
  if (/Challenge Lab/.test(name)) return "The whole network must come up from an unconfigured state and pass every required end-to-end check, not only the ones that are easy to test.";
  const verb = name.match(LEAD_VERB)?.[1] ?? "";
  const subject = name.replace(LEAD_VERB, "").trim() || name;
  if (/^(Explore|Interpret|Obtain|Compare|Submit|Route Selection)/.test(verb)) return `Produce a reading of ${subject} that a colleague could follow, backed by the device output you saved.`;
  if (/^Verify/.test(verb)) return `Prove that ${subject} behaves as the requirement states, and keep the evidence that separates a real result from an assumed one.`;
  if (/^Troubleshoot/.test(verb)) return `Restore ${subject} to the required behaviour and prove the original requirement works again, not only that the error message disappeared.`;
  return `${subject} must be working on the lab network, with the device output that proves it.`;
};

const pad = (value, length = 3) => String(value).padStart(length, "0");

// ---------------------------------------------------------------- assemble the 109 labs

const bandById = new Map(BANDS.map((band) => [band.id, band]));
const catalogByNumber = new Map(ccnaTopologyLabs.map((lab) => [lab.number, lab]));
const levelOfNumber = new Map(ccnaTopologyLevels.flatMap((level) => level.labs.map((lab) => [lab.number, level])));

if (catalogByNumber.size !== 101) throw new Error(`expected 101 catalog labs, found ${catalogByNumber.size}`);

/** deterministic per-lab rotation of the business context */
const contextFor = (seed) => ({ role: ROLES[seed % ROLES.length], context: CONTEXTS[seed % CONTEXTS.length] });

const bandEntryLab = (bandId) => {
  const numbers = BAND_MEMBERS[bandId] ?? [];
  const stage = ccnaLabs.find((lab) => STAGE_BANDS[lab.id] === bandId);
  if (stage) return stage.id;
  if (numbers.length === 0) return undefined;
  return `ccna-topology-${pad(Math.min(...numbers))}`;
};

const relatedFor = (bandId, exclude) => {
  const numbers = BAND_MEMBERS[bandId] ?? [];
  const stage = ccnaLabs.find((lab) => STAGE_BANDS[lab.id] === bandId);
  const pool = [...(stage ? [stage.id] : []), ...numbers.map((number) => `ccna-topology-${pad(number)}`)];
  return pool.filter((id) => id !== exclude).slice(0, 4);
};

const catalogLabs = Object.entries(BAND_MEMBERS).flatMap(([bandId, numbers]) => numbers.map((number) => {
  const lab = catalogByNumber.get(number);
  if (!lab) throw new Error(`band ${bandId} references catalog lab ${number}, which does not exist`);
  const band = bandById.get(bandId);
  const level = levelOfNumber.get(number);
  const tier = TIER_OVERRIDES[number] ?? (/(^(Implement|Plan and|Apply|Manually Configure|Route Selection)|Challenge Lab)/.test(lab.name) ? "advanced" : band.tier);
  const scenarioType = SCENARIO_OVERRIDES[number] ?? band.scenarioType;
  const { role, context } = contextFor(number);
  const fault = LAB_FAULTS[number] ?? CAPSTONE_FAULTS[number] ?? { failure: band.failure, recovery: band.recovery };
  const prerequisiteBands = number === 15 ? ["ccna-band-01", "ccna-band-02"]
    : number === 31 ? ["ccna-band-03"]
    : number === 54 ? ["ccna-band-03", "ccna-band-06"]
    : number === 73 ? ["ccna-band-07"]
    : number === 97 ? ["ccna-band-09"]
    : band.prerequisiteBands;
  const reviewNote = REVIEW_NOTES[number] ?? (bandId === "ccna-band-12" ? CAPSTONE_REVIEW : undefined);
  return {
    id: lab.id,
    kind: "catalog",
    number: lab.number,
    title: lab.name,
    bandId,
    tier,
    domain: band.domain === "mixed" ? level.objective : band.domain,
    objectives: band.objectives,
    scenarioType,
    duration: minutesFor(band, lab.name),
    scenario: { role, context, requirement: requirement(lab.name), kind: bandId === "ccna-band-12" ? "integrated" : bandId === "ccna-band-11" ? "incident" : "implementation" },
    prerequisites: prerequisiteBands.map(bandEntryLab).filter(Boolean),
    prerequisiteBands,
    relatedLabIds: relatedFor(bandId, lab.id),
    troubleshootingFocus: bandId === "ccna-band-11" ? "primary" : "checkpoint",
    fault,
    verification: band.verification,
    sourceKeys: band.sourceKeys,
    diagram: lab.diagram ? { src: lab.diagram.src, width: lab.diagram.width, height: lab.diagram.height } : null,
    catalogSummary: lab.summary,
    catalogSummaryIssue: lab.summaryIssue,
    artifacts: { diagram: Boolean(lab.diagram), steps: 0, tests: 0, questions: 0, lessonId: null },
    reviewStatus: reviewNote ? "needs-review" : "reviewed",
    reviewNote,
  };
}));

const stageLabs = ccnaLabs.map((lab, index) => {
  const bandId = STAGE_BANDS[lab.id];
  if (!bandId) throw new Error(`build stage ${lab.id} has no band`);
  const band = bandById.get(bandId);
  const domainOfObjective = (lab.questions[0]?.objective ?? "1.1").split(".")[0];
  const { role, context } = contextFor(index + 101);
  return {
    id: lab.id,
    kind: "hands-on",
    number: null,
    title: lab.title,
    bandId,
    tier: band.tier === "troubleshooting" ? "advanced" : band.tier,
    domain: `${domainOfObjective}.0`,
    objectives: [...new Set(lab.questions.map((question) => question.objective).filter(Boolean))],
    scenarioType: `${domainOfObjective}.0` === "5.0" ? "ssh-access-hardening" : band.scenarioType,
    duration: lab.minutes,
    scenario: { role, context, requirement: lab.goal, kind: "build" },
    prerequisites: [...new Set([
      ...band.prerequisiteBands.map(bandEntryLab),
      // The previous build stage is only a prerequisite when it teaches a band this band depends on.
      ...(index > 0 && band.prerequisiteBands.includes(STAGE_BANDS[ccnaLabs[index - 1].id]) ? [ccnaLabs[index - 1].id] : []),
    ].filter((id) => Boolean(id) && id !== lab.id))],
    prerequisiteBands: band.prerequisiteBands,
    relatedLabIds: relatedFor(bandId, lab.id),
    troubleshootingFocus: /failure|fault|wrong key|denial|repair/i.test([lab.goal, ...lab.steps.map((step) => step.title), ...lab.tests.map((test) => test.title)].join(" ")) ? "primary" : "checkpoint",
    fault: { failure: band.failure, recovery: band.recovery },
    verification: band.verification,
    sourceKeys: [...new Set([...band.sourceKeys, ...lab.sources.map((source) => Object.keys(SOURCES).find((key) => SOURCES[key].url === source.url)).filter(Boolean)])],
    diagram: null,
    catalogSummary: null,
    catalogSummaryIssue: null,
    artifacts: { diagram: false, steps: lab.steps.length, tests: lab.tests.length, questions: lab.questions.length, lessonId: lab.lessonId },
    reviewStatus: "reviewed",
    reviewNote: undefined,
  };
});

function minutesFor(band, name) {
  const [low, high] = band.minutes.split("–").map(Number);
  const bump = /(^(Implement|Plan and|Apply|Route Selection)|Challenge Lab)/.test(name) ? 15 : 0;
  return `${low + bump}–${high + bump}`;
}

/** Bands ordered by learning order; labs inside a band keep the catalog's own order, with the
 * hands-on stage that teaches the same material placed first so the build comes before the index. */
const ordered = BANDS.flatMap((band) => {
  const members = [...stageLabs, ...catalogLabs].filter((lab) => lab.bandId === band.id);
  return members.sort((a, b) => (a.kind === b.kind ? (a.number ?? 0) - (b.number ?? 0) : a.kind === "hands-on" ? -1 : 1));
});

const ids = ordered.map((lab) => lab.id);
if (new Set(ids).size !== ids.length) throw new Error("duplicate lab id in the generated path");
if (ordered.length !== 109) throw new Error(`expected 109 labs, assembled ${ordered.length}`);

const levels = BANDS.map((band) => ({
  ...band,
  labIds: ordered.filter((lab) => lab.bandId === band.id).map((lab) => lab.id),
  tiers: [...new Set(ordered.filter((lab) => lab.bandId === band.id).map((lab) => lab.tier))],
}));

const sourceRefsFor = (lab) => [...new Set(["blueprint", ...lab.sourceKeys])].map((key) => {
  const source = SOURCES[key];
  if (!source) throw new Error(`unknown source key ${key}`);
  return { key, title: source.title, url: source.url, covers: source.covers, section: source.section ?? null, checked: CHECKED, confidence: source.confidence };
});

/** Emits objects with unquoted identifier keys so the generated module reads like the rest of the
 * repository instead of like pasted JSON. Values stay JSON-encoded, which keeps quoting correct. */
const serialize = (value, indent = 2) => {
  const pad = " ".repeat(indent);
  if (Array.isArray(value)) return `[${value.map((item) => serialize(item, indent + 2)).join(", ")}]`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  const entries = Object.entries(value).map(([key, item]) => `${/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? key : JSON.stringify(key)}: ${serialize(item, indent + 2)}`);
  return `{\n${entries.map((entry) => `${pad}  ${entry},`).join("\n")}\n${pad}}`;
};

const labLiteral = (lab) => `  {\n${[
  `id: ${JSON.stringify(lab.id)}, kind: ${JSON.stringify(lab.kind)}, number: ${lab.number ?? "null"}, title: ${JSON.stringify(lab.title)},`,
  `bandId: ${JSON.stringify(lab.bandId)}, tier: ${JSON.stringify(lab.tier)}, domain: ${JSON.stringify(lab.domain)}, objectives: ${JSON.stringify(lab.objectives)},`,
  `scenarioType: ${JSON.stringify(lab.scenarioType)}, duration: ${JSON.stringify(lab.duration)}, reviewStatus: ${JSON.stringify(lab.reviewStatus)},`,
  lab.reviewNote ? `reviewNote: ${JSON.stringify(lab.reviewNote)},` : null,
  `troubleshootingFocus: ${JSON.stringify(lab.troubleshootingFocus)},`,
  `scenario: ${serialize(lab.scenario, 2)},`,
  `prerequisites: ${JSON.stringify(lab.prerequisites)}, prerequisiteBands: ${JSON.stringify(lab.prerequisiteBands)},`,
  `relatedLabIds: ${JSON.stringify(lab.relatedLabIds)},`,
  `fault: ${serialize(lab.fault, 2)},`,
  `verification: [${lab.verification.map((item) => JSON.stringify(item)).join(", ")}],`,
  `sourceRefs: [\n${sourceRefsFor(lab).map((source) => `    ${serialize(source, 4)},`).join("\n")}\n  ],`,
  `artifacts: ${serialize(lab.artifacts, 2)},`,
  `diagram: ${lab.diagram ? serialize(lab.diagram, 2) : "null"},`,
  `catalogSummary: ${lab.catalogSummary ? JSON.stringify(lab.catalogSummary) : "null"},`,
  `catalogSummaryIssue: ${lab.catalogSummaryIssue ? JSON.stringify(lab.catalogSummaryIssue) : "null"},`,
].filter(Boolean).join("\n")}\n  }`;

const bandLiteral = (band) => `  {\n${[
  `id: ${JSON.stringify(band.id)}, order: ${band.order}, tier: ${JSON.stringify(band.tier)}, domain: ${JSON.stringify(band.domain)},`,
  `title: ${JSON.stringify(band.title)}, objectives: ${JSON.stringify(band.objectives)}, minutes: ${JSON.stringify(band.minutes)},`,
  `scenarioType: ${JSON.stringify(band.scenarioType)},`,
  `summary: ${JSON.stringify(band.summary)},`,
  `prerequisiteBands: ${JSON.stringify(band.prerequisiteBands)}, verification: ${JSON.stringify(band.verification)}, sourceKeys: ${JSON.stringify(band.sourceKeys)},`,
  `labIds: ${JSON.stringify(band.labIds)}, tiers: ${JSON.stringify(band.tiers)},`,
].join("\n")}\n  }`;

const moduleSource = `/** The CCNA 200-301 lab path: all ${ordered.length} labs this site publishes, organized into
 * ${BANDS.length} category bands in learning order and four difficulty tiers.
 *
 * Generated by scripts/gen-ccna-lab-path.mjs from lib/content/ccna-topologies.ts (the 101 catalog labs)
 * and lib/content/ccna.ts (the eight hands-on build stages). Edit the generator, not this file.
 *
 * What this module guarantees:
 *   - every lab ID that already existed is preserved exactly once; no progress key is renamed
 *   - every objective label is transcribed from the fetched 200-301 v1.1 topic list
 *   - every source URL was fetched and answered 200 on ${CHECKED}; scripts/validate-ccna-labs.mjs
 *     refuses to pass if a lab has no verified source, and scripts/verify-ccna-lab-sources.mjs
 *     re-fetches them over the network
 *   - scenario framing, prerequisites and the fault-and-recovery checkpoints are written by this
 *     project. They are not the vendor's lab instructions, which are not published here.
 *   - reviewStatus is "needs-review" wherever the catalog metadata does not support the mapping.
 *     Those entries stay visible on purpose instead of being quietly corrected.
 */

export type CcnaLabReviewStatus = "reviewed" | "needs-review";
export type CcnaLabTier = "beginner" | "intermediate" | "advanced" | "troubleshooting";
export type CcnaLabSourceRef = { key: string; title: string; url: string; covers: string; section: string | null; checked: string; confidence: CcnaLabReviewStatus };
export type CcnaLabScenario = { role: string; context: string; requirement: string; kind: "build" | "implementation" | "incident" | "integrated" };
export type CcnaLabArtifacts = { diagram: boolean; steps: number; tests: number; questions: number; lessonId: string | null };
/** The topology diagram that belongs to this exact lab, sized so the page does not reflow while it loads. */
export type CcnaLabDiagram = { src: string; width: number; height: number };
export type CcnaLabEntry = {
  id: string; kind: "hands-on" | "catalog"; number: number | null; title: string;
  bandId: string; tier: CcnaLabTier; domain: string; objectives: string[];
  scenarioType: string; duration: string; reviewStatus: CcnaLabReviewStatus; reviewNote?: string;
  troubleshootingFocus: "primary" | "checkpoint";
  scenario: CcnaLabScenario;
  prerequisites: string[]; prerequisiteBands: string[]; relatedLabIds: string[];
  fault: { failure: string; recovery: string };
  verification: string[]; sourceRefs: CcnaLabSourceRef[]; artifacts: CcnaLabArtifacts;
  diagram: CcnaLabDiagram | null; catalogSummaryIssue: string | null;
  /** The source catalog's own summary, reproduced unedited so a lab carries its own catalogue text. */
  catalogSummary: string | null;
};
export type CcnaLabBand = {
  id: string; order: number; tier: CcnaLabTier; domain: string; title: string; objectives: string[];
  minutes: string; scenarioType: string; summary: string; prerequisiteBands: string[];
  verification: string[]; sourceKeys: string[]; labIds: string[]; tiers: CcnaLabTier[];
};
export type CcnaScenarioType = { id: string; label: string; detail: string };

export const ccnaLabSourcesChecked = ${JSON.stringify(CHECKED)};

export const ccnaScenarioTypes: CcnaScenarioType[] = [
${Object.entries(SCENARIO_TYPES).map(([id, value]) => `  { id: ${JSON.stringify(id)}, label: ${JSON.stringify(value.label)}, detail: ${JSON.stringify(value.detail)} },`).join("\n")}
];

export const ccnaLabBands: CcnaLabBand[] = [
${levels.map(bandLiteral).join(",\n")}
];

export const ccnaLabPath: CcnaLabEntry[] = [
${ordered.map(labLiteral).join(",\n")}
];

export const ccnaLabPathStats = {
  total: ccnaLabPath.length,
  bands: ccnaLabBands.length,
  handsOn: ccnaLabPath.filter((lab) => lab.kind === "hands-on").length,
  catalog: ccnaLabPath.filter((lab) => lab.kind === "catalog").length,
  reviewed: ccnaLabPath.filter((lab) => lab.reviewStatus === "reviewed").length,
  needsReview: ccnaLabPath.filter((lab) => lab.reviewStatus === "needs-review").length,
  troubleshooting: ccnaLabPath.filter((lab) => lab.troubleshootingFocus === "primary").length,
  withDiagram: ccnaLabPath.filter((lab) => lab.diagram).length,
  scenarioTypes: ccnaScenarioTypes.length,
  perTier: {
    beginner: ccnaLabPath.filter((lab) => lab.tier === "beginner").length,
    intermediate: ccnaLabPath.filter((lab) => lab.tier === "intermediate").length,
    advanced: ccnaLabPath.filter((lab) => lab.tier === "advanced").length,
    troubleshooting: ccnaLabPath.filter((lab) => lab.tier === "troubleshooting").length,
  },
} as const;

/** Objective coverage read off the published v1.1 topic list this path is organized against. */
export type CcnaLabCoverageGap = { objective: string; label: string; reason: string };
export const ccnaLabObjectiveCoverage: { covered: string[]; noLabInLibrary: CcnaLabCoverageGap[] } = {
  covered: [...new Set(ccnaLabPath.flatMap((lab) => lab.objectives.map((objective) => objective.split(".").slice(0, 2).join("."))))].sort(),
  noLabInLibrary: [
${NO_LAB_OBJECTIVES.map((gap) => `    ${serialize(gap, 4)},`).join("\n")}
  ],
};

export const ccnaLabPathReview = {
  needsReview: ccnaLabPath.filter((lab) => lab.reviewStatus === "needs-review").map((lab) => ({ id: lab.id, title: lab.title, note: lab.reviewNote ?? "" })),
  summaryIssues: ccnaLabPath.filter((lab) => lab.catalogSummaryIssue).map((lab) => ({ id: lab.id, title: lab.title, note: lab.catalogSummaryIssue ?? "" })),
} as const;

export const ccnaLabById = new Map(ccnaLabPath.map((lab) => [lab.id, lab]));
export const ccnaLabBandById = new Map(ccnaLabBands.map((band) => [band.id, band]));

/** The lab or practice destination a band-level navigation node should open. */
export function ccnaLabBandEntry(bandId: string) {
  const band = ccnaLabBandById.get(bandId);
  return band ? ccnaLabById.get(band.labIds[0]) : undefined;
}
`;

const manifest = {
  generatedBy: "scripts/gen-ccna-lab-path.mjs",
  generatedAt: CHECKED,
  blueprint: SOURCES.blueprint.url,
  counts: {
    total: ordered.length,
    bands: BANDS.length,
    handsOn: stageLabs.length,
    catalog: catalogLabs.length,
    reviewed: ordered.filter((lab) => lab.reviewStatus === "reviewed").length,
    needsReview: ordered.filter((lab) => lab.reviewStatus === "needs-review").length,
    troubleshootingPrimary: ordered.filter((lab) => lab.troubleshootingFocus === "primary").length,
    withDiagram: ordered.filter((lab) => lab.diagram).length,
  },
  preservedIds: ids,
  bands: levels.map((band) => ({ id: band.id, order: band.order, tier: band.tier, domain: band.domain, title: band.title, objectives: band.objectives, minutes: band.minutes, labs: band.labIds.length, prerequisiteBands: band.prerequisiteBands, labIds: band.labIds })),
  labs: ordered.map((lab) => ({
    id: lab.id, kind: lab.kind, number: lab.number, title: lab.title, bandId: lab.bandId, tier: lab.tier,
    domain: lab.domain, objectives: lab.objectives, scenarioType: lab.scenarioType, duration: lab.duration,
    prerequisites: lab.prerequisites, prerequisiteBands: lab.prerequisiteBands, relatedLabIds: lab.relatedLabIds,
    troubleshootingFocus: lab.troubleshootingFocus, reviewStatus: lab.reviewStatus, reviewNote: lab.reviewNote ?? null,
    diagram: lab.diagram, catalogSummaryIssue: lab.catalogSummaryIssue,
    sources: sourceRefsFor(lab).map((source) => ({ url: source.url, title: source.title, covers: source.covers, checked: source.checked, confidence: source.confidence })),
  })),
  sources: Object.entries(SOURCES).map(([key, source]) => ({ key, ...source, checked: CHECKED })),
  review: [...Object.entries(REVIEW_NOTES).map(([number, note]) => ({ id: `ccna-topology-${pad(Number(number))}`, note })), ...BAND_MEMBERS["ccna-band-12"].map((number) => ({ id: `ccna-topology-${pad(number)}`, note: CAPSTONE_REVIEW }))],
  coverageGaps: NO_LAB_OBJECTIVES,
};

writeFileSync(path.join(projectRoot, "lib/content/ccna-lab-path.ts"), moduleSource);
mkdirSync(path.join(projectRoot, "content"), { recursive: true });
writeFileSync(path.join(projectRoot, "content/ccna-lab-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ status: "ok", ...manifest.counts, bands: BANDS.length, sources: Object.keys(SOURCES).length, needsReview: manifest.review.length }, null, 0));
