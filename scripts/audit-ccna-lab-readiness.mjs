import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ccnaLabBands, ccnaLabPath } from "../lib/content/ccna-lab-path.ts";
import { ccnaTopologyLabs } from "../lib/content/ccna-topologies.ts";
import { ccnaSimulationPacks } from "../lib/content/ccna-simulation-packs.ts";
import { listAuthoredLabPacks } from "../lib/content/ccna-sim/index.ts";
import { simCommands } from "../lib/ccna-sim/commands.ts";

/**
 * Per-lab readiness audit for the CCNA simulator (109 labs).
 *
 * It reports, for every published lab, what the simulator can actually prove about it today:
 * whether an authored pack grades it from device state, how many graded objectives it has, which
 * capabilities its own scenario/scenario/fault/verification text asks for, whether the engine
 * implements each of those, and the commit that shipped its pack. Labs the engine cannot prove yet
 * are listed as blocked with the exact missing capability, never as complete.
 *
 * `--check` additionally fails when a lab is claimed as graded but has no graded step, so the table
 * cannot drift from the code. The markdown table is written to content/ccna-lab-readiness.md.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const writeTable = !process.argv.includes("--no-write");
const check = process.argv.includes("--check");

/**
 * The engine's capability matrix. `supported` means the simulator can produce the state and answer
 * for it from the live model; it is not a claim about a real device image.
 */
const CAPABILITIES = [
  { id: "addressing-ipv4", label: "IPv4 addressing, masks and subnet boundaries", supported: true, evidence: "ip address with a contiguous mask, derived show ip route connected, and a ping computed from the mask" },
  { id: "addressing-ipv6", label: "IPv6 addressing and prefixes", supported: true, evidence: "ipv6 address <addr>/<prefix>, show ipv6 interface brief, show ipv6 route connected, IPv6 ping" },
  { id: "subnetting", label: "Subnetting and VLSM arithmetic", supported: true, evidence: "the ping and the interface table use the real dotted mask, so /26 and /30 boundaries are enforced" },
  { id: "vlan-trunk", label: "VLANs, access ports and 802.1Q trunks", supported: true, evidence: "vlan, switchport mode/access vlan, trunk native and allowed lists, verified by state and by the L2 walk" },
  { id: "inter-vlan", label: "Router-on-a-stick / inter-VLAN routing", supported: true, evidence: "router subinterfaces with encapsulation dot1Q and reachability through the trunk" },
  { id: "endpoint-config", label: "Endpoint address and gateway configuration", supported: true, evidence: "host consoles set the address, mask and gateway, and ipconfig reports them" },
  { id: "reachability", label: "Reachability proof and interface state", supported: true, evidence: "ping from the model with a stated reason, show interfaces status / show ip interface brief" },
  { id: "persistence", label: "Save and compare startup configuration", supported: true, evidence: "copy running-config startup-config and an exact running/startup comparison" },
  { id: "static-routing", label: "Static, default and host routes", supported: true, evidence: "ip route on a router, read back by show ip route and used by the packet walk's longest-prefix lookup" },
  { id: "dynamic-routing", label: "OSPFv2/OSPFv3, adjacencies, metrics and AD", supported: false, evidence: "no routing protocol engine; a lab that needs one is reported as no-route" },
  { id: "etherchannel", label: "EtherChannel / LACP", supported: false, evidence: "no port-channel model" },
  { id: "spanning-tree", label: "Spanning tree (PVST+) and port roles", supported: false, evidence: "no STP computation" },
  { id: "fhrp", label: "HSRP / VRRP first-hop redundancy", supported: false, evidence: "no virtual gateway address or election model" },
  { id: "ip-services", label: "DHCP, DNS, NTP, syslog, TFTP/FTP", supported: false, evidence: "no service processes" },
  { id: "nat", label: "NAT / PAT", supported: false, evidence: "no address translation model" },
  { id: "security", label: "SSH management, local users, enable/VTY passwords", supported: true, evidence: "ip domain-name, username ... secret, crypto key generate rsa, line vty with login local and transport input ssh, read back by show ip ssh and by the SSH login the console performs" },
  { id: "acl", label: "ACL matching and access groups", supported: false, evidence: "no packet filter, so a denial cannot be produced or graded" },
  { id: "port-security", label: "Port security", supported: false, evidence: "no MAC learning or violation model" },
  { id: "wireless", label: "Wireless LAN / WLC GUI", supported: false, evidence: "the device has no IOS console; the lab runs in the vendor GUI" },
  { id: "discovery", label: "CDP / LLDP / VTP / MAC table", supported: false, evidence: "no neighbour discovery or VLAN propagation model" },
  { id: "automation", label: "Controller, REST API, JSON, Ansible/Chef/Puppet", supported: false, evidence: "conceptual lab; no API surface" },
];

/** Which capabilities each lab's own text asks for, matched on its scenario, fault and evidence. */
const CAPABILITY_PATTERNS = [
  // Word boundaries matter here: a lab that says "Restore the allowed VLAN list" is not an
  // automation lab, and "native VLAN" is a trunk topic rather than neighbour discovery.
  { id: "automation", pattern: /\brest\b|\bapi\b|\bjson\b|\bansible\b|\bchef\b|\bpuppet\b|\bcontroller\b|\bsdn\b|\bautomation\b/i },
  { id: "wireless", pattern: /wireless|wlan|wpa|wlc|ssid|laptop/i },
  { id: "port-security", pattern: /port security|mac address violation|sticky/i },
  // An access list is its own capability: this engine hardens management but implements no packet
  // filter, so a lab that asks for a denial is reported with that gap instead of being called graded.
  { id: "acl", pattern: /\bacl\b|\bacls\b|access control list|access-list|access-list number|ip access-group|standard acl|extended acl|named acl|traffic filter/i },
  { id: "security", pattern: /\bssh\b|telnet|\baaa\b|password|secret|console port|\bvty\b|login local/i },
  { id: "nat", pattern: /\bnat\b|pat\b|translation/i },
  { id: "ip-services", pattern: /\bdhcp\b|\bdns\b|\bntp\b|syslog|tftp|\bftp\b|\bhttp\b|\bqos\b/i },
  { id: "fhrp", pattern: /hsrp|vrrp|first hop|redundant gateway/i },
  { id: "dynamic-routing", pattern: /ospf|adjacenc|routing protocol|administrative distance|metric|route selection/i },
  { id: "static-routing", pattern: /static route|default route|network route|host route|routing table/i },
  { id: "etherchannel", pattern: /etherchannel|lacp|port-channel|port channel|load balanc/i },
  { id: "spanning-tree", pattern: /spanning tree|pvst|root bridge|portfast|stp\b/i },
  { id: "discovery", pattern: /\bcdp\b|\blldp\b|\bvtp\b|mac address table|mac address/i },
  { id: "inter-vlan", pattern: /inter-?vlan|router-on-a-stick|dot1q|subinterface/i },
  { id: "vlan-trunk", pattern: /\bvlan\b|trunk|switchport|access port|native vlan/i },
  { id: "addressing-ipv6", pattern: /\bipv6\b|dual-stack|eui-?64/i },
  // A subnetting lab says so in words, or it names an address with a prefix (/26, /30). A port label
  // such as Fa0/11 must not read as a prefix length.
  { id: "subnetting", pattern: /\bsubnet\b|\bvlsm\b|\bcidr\b|subnet mask|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}\b/i },
  { id: "addressing-ipv4", pattern: /ipv4|ip address|addressing|rfc 1918|global unicast/i },
];

const capability = (id) => CAPABILITIES.find((entry) => entry.id === id);
const packByLabId = new Map(ccnaSimulationPacks.map((pack) => [pack.labId, pack]));
const authoredByLabId = new Map(listAuthoredLabPacks().map((pack) => [pack.labId, pack]));
const topologyByLabId = new Map(ccnaTopologyLabs.map((lab) => [lab.id, lab]));
const bandTitle = new Map(ccnaLabBands.map((band) => [band.id, band.title]));

const lastCommitFor = (relativePath) => {
  try {
    return execFileSync("git", ["log", "-1", "--format=%h %ad", "--date=short", "--", relativePath], { cwd: projectRoot, encoding: "utf8" }).trim() || "uncommitted";
  } catch {
    return "unknown";
  }
};

const labs = ccnaLabPath.map((lab) => {
  const pack = packByLabId.get(lab.id);
  if (!pack) throw new Error(`${lab.id}: the simulation adapter has no pack for this lab`);
  const authored = authoredByLabId.get(lab.id) ?? null;
  const catalog = topologyByLabId.get(lab.id) ?? null;
  const text = [lab.title, lab.scenario.context, lab.scenario.requirement, lab.fault.failure, lab.fault.recovery, lab.verification.join(" "), lab.catalogSummary ?? ""].join(" ");
  const required = CAPABILITY_PATTERNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.id);
  if (!required.length) required.push("reachability");
  const missing = required.filter((id) => !capability(id)?.supported);
  const gradedStages = (authored ? pack.stages ?? [] : []).filter((stage) => !stage.ungraded);
  const ungradedStages = (authored ? pack.stages ?? [] : []).filter((stage) => stage.ungraded);
  const authoredPackPath = `lib/content/ccna-sim/${lab.id}.ts`;
  const status = gradedStages.length && !missing.length
    ? "graded"
    : gradedStages.length && missing.length
      ? "graded-with-engine-gaps"
      : authored
        ? "pack-without-graded-step"
        : "not-authored";
  return {
    id: lab.id,
    title: lab.title,
    band: bandTitle.get(lab.bandId) ?? lab.bandId,
    kind: lab.kind,
    reviewStatus: lab.reviewStatus,
    diagram: lab.diagram?.src ?? (catalog?.diagram?.src ?? null),
    devices: pack.devices.map((node) => node.label).join(", "),
    deviceCount: pack.devices.length,
    consolelessDevices: pack.devices.filter((node) => !node.role).map((node) => node.label),
    inPack: Boolean(authored),
    gradedSteps: gradedStages.length,
    ungradedSteps: ungradedStages.length,
    observations: (pack.checklist ?? []).filter((item) => item.required !== true).length,
    requiredCapabilities: required,
    missingCapabilities: missing,
    status,
    commit: authored && existsSync(path.join(projectRoot, authoredPackPath)) ? lastCommitFor(authoredPackPath) : "—",
  };
});

const counts = {
  labs: labs.length,
  graded: labs.filter((lab) => lab.status === "graded").length,
  gradedWithEngineGaps: labs.filter((lab) => lab.status === "graded-with-engine-gaps").length,
  notAuthored: labs.filter((lab) => lab.status === "not-authored").length,
  packWithoutGradedStep: labs.filter((lab) => lab.status === "pack-without-graded-step").length,
  gradedSteps: labs.reduce((total, lab) => total + lab.gradedSteps, 0),
  blockedLabs: labs.filter((lab) => lab.missingCapabilities.length && !lab.inPack).length,
};
const unsupportedDemand = CAPABILITIES
  .map((entry) => ({ id: entry.id, supported: entry.supported, labs: labs.filter((lab) => lab.requiredCapabilities.includes(entry.id)).length }))
  .filter((entry) => !entry.supported)
  .sort((left, right) => right.labs - left.labs);

if (check) {
  const contradictions = labs.filter((lab) => (lab.status === "graded" || lab.status === "graded-with-engine-gaps") && lab.gradedSteps === 0);
  if (contradictions.length) {
    console.error(`These labs are claimed as graded without a graded step: ${contradictions.map((lab) => lab.id).join(", ")}`);
    process.exitCode = 1;
  }
  const unsupportedButGraded = labs.filter((lab) => lab.status === "graded" && lab.missingCapabilities.length);
  if (unsupportedButGraded.length) {
    console.error(`These labs are graded although the engine cannot prove what they ask for: ${unsupportedButGraded.map((lab) => lab.id).join(", ")}`);
    process.exitCode = 1;
  }
}

if (writeTable) {
  const rows = labs.map((lab) => [
    lab.id,
    lab.title.replace(/\|/g, "\\|"),
    lab.band,
    lab.kind,
    lab.diagram ? "yes" : "none",
    String(lab.deviceCount),
    lab.inPack ? `${lab.gradedSteps}/${lab.gradedSteps + lab.ungradedSteps}` : "0/0",
    lab.missingCapabilities.length ? lab.missingCapabilities.join(", ") : "—",
    lab.status,
    lab.commit,
  ].join(" | "));
  const header = ["Lab", "Title", "Band", "Kind", "Diagram", "Devices", "Graded/Steps", "Missing engine capability", "Status", "Pack commit"].join(" | ");
  const divider = ["---", "---", "---", "---", "---", "---", "---", "---", "---", "---"].join(" | ");
  const note = [
    "# CCNA simulator: per-lab readiness",
    "",
    `Generated by \`scripts/audit-ccna-lab-readiness.mjs\` on ${new Date().toISOString().slice(0, 10)}.`,
    "",
    `- ${counts.labs} labs published; ${counts.graded} graded from device state, ${counts.packWithoutGradedStep} with a pack and no graded step, ${counts.notAuthored} not authored yet.`,
    `- ${counts.gradedSteps} graded steps in total. A lab is only "graded" when every capability its own text asks for is implemented by the engine.`,
    "- `Missing engine capability` names what the engine cannot prove yet; those labs are deliberately not credited, and no lab is marked complete on the strength of another lab's work.",
    "",
    `| ${header} |`,
    `| ${divider} |`,
    ...rows.map((row) => `| ${row} |`),
    "",
    "## Engine capability demand",
    "",
    "| Capability | Implemented | Labs asking for it |",
    "| --- | --- | --- |",
    ...CAPABILITIES.map((entry) => `| ${entry.label} | ${entry.supported ? "yes" : "no"} | ${labs.filter((lab) => lab.requiredCapabilities.includes(entry.id)).length} |`),
    "",
    "## What a graded lab proves",
    "",
    // Counted from the objectives, which is the same list the table above is built from: a step counts
    // only when it carries the predicate that grades it, so this line can never claim work a lab does
    // not prove. It used to read `pack.stages`, a field an authored lab does not have, and printed
    // "0 graded steps" for labs the table above showed with eleven.
    ...listAuthoredLabPacks().map((pack) => {
      const steps = pack.objectives.flatMap((objective) => objective.steps);
      const graded = steps.filter((step) => step.check).length;
      const ungraded = steps.length - graded;
      return `- \`${pack.labId}\`: ${graded} graded step${graded === 1 ? "" : "s"} of ${steps.length}, ${pack.objectives.length} objectives${ungraded ? `; ${ungraded} step${ungraded === 1 ? " is" : "s are"} declared ungraded and never counted` : ""}.`;
    }),
    "",
  ].join("\n");
  writeFileSync(path.join(projectRoot, "content/ccna-lab-readiness.md"), note);
}

console.log(JSON.stringify({
  counts,
  engineCommands: simCommands.length,
  unsupportedDemand,
  gradedLabs: labs.filter((lab) => lab.status !== "not-authored").map((lab) => ({ id: lab.id, gradedSteps: lab.gradedSteps, commit: lab.commit })),
}));
