import { ccnaLabs } from "./ccna.ts";
import { ccnaLabBands, ccnaLabPath, ccnaLabPathStats, type CcnaLabEntry } from "./ccna-lab-path.ts";
import type { SimulationPack, SimulationNode, SimulationPort, SimulationLink, SimulationChecklistItem, SimulationStage } from "@/lib/ccna-sim/topology";
import type { SimLabPack } from "@/lib/ccna-sim/lab.ts";
import { getAuthoredLabPack } from "./ccna-sim/index.ts";
import type { ServerLab } from "./server-labs.ts";

/**
 * Interactive starter packs for every published CCNA lab.
 *
 * The learning path is the source of truth for titles, objectives, scenarios,
 * faults and verified sources. This adapter deliberately keeps the simulator
 * contract small: the UI can render any pack, while richer per-device grading
 * can be added later without changing lab IDs or saved progress keys.
 */
export type CcnaSimulationPack = SimulationPack & {
  labId: string;
  bandId: string;
  reviewStatus: CcnaLabEntry["reviewStatus"];
  sourceSummary: string;
  fallback: boolean;
  topologyOutline?: NonNullable<ServerLab["topology"]>;
};

export type CcnaSimulationPackSummary = Pick<CcnaSimulationPack, "id" | "labId" | "bandId" | "title" | "domain" | "difficulty" | "duration" | "reviewStatus" | "fallback">;

const handsOnById = new Map(ccnaLabs.map((lab) => [lab.id, lab]));

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52) || "lab";

function kindFor(label: string, context: string): SimulationNode["kind"] {
  // Classify from the device label first.  A scenario often mentions a
  // server, switch or client even when the current node is a router; looking
  // at the whole scenario first made every device in those labs inherit the
  // same kind (for example, R1/SW1/PC-A all became `server`).
  const labelValue = label.toLowerCase();
  if (/^ap\d|access point|wireless ap|^wlc\b|^wrt\b/.test(labelValue)) return "access-point";
  if (/^r\d|router|gateway|firewall/.test(labelValue)) return "router";
  if (/^sw\d|switch|bridge|2960/.test(labelValue)) return "switch";
  if (/pc|host|client|operator|laptop|accounting|sales|web admin|admin/.test(labelValue)) return "pc";
  if (/server|dns|dhcp|tftp|ftp|ntp|syslog|controller/.test(labelValue)) return "server";

  // Only use scenario context as a fallback for labels such as a generic
  // endpoint.  Label-specific rules above must always win.
  const contextValue = context.toLowerCase();
  if (/access point|wlc|wireless|wlan|wrt/.test(contextValue)) return /laptop/.test(labelValue) ? "pc" : "access-point";
  if (/server|dns|dhcp|tftp|ftp|ntp|syslog/.test(contextValue)) return "server";
  if (/switch|layer 2/.test(contextValue)) return "switch";
  if (/pc|host|client|operator/.test(contextValue)) return "pc";
  return "router";
}

type TopologyOverride = { devices: SimulationNode[]; links: SimulationLink[] };

const ethernetPort = (id: string, label: string): SimulationPort => ({ id, label, kind: "ethernet" });

/**
 * Reference diagrams are not always simple three-node starter graphs.  Keep
 * explicit mappings for diagrams whose published device map is important to
 * the lesson; the UI and simulator then consume the same device/link data.
 * The first mapping is the ten-device Explore Cisco Devices topology shown in
 * the lab catalogue.
 */
const catalogTopologyOverrides: Record<string, TopologyOverride> = {
  "ccna-topology-001": {
    devices: [
      {
        id: "device-1", label: "Device1", kind: "router", x: 220, y: 72,
        subtitle: "Router · Layer 3 forwarding",
        ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1"), ethernetPort("gi0-2", "Gi0/2")], status: "healthy",
      },
      {
        id: "device-2", label: "Device2", kind: "router", x: 700, y: 72,
        subtitle: "Router · Layer 3 forwarding",
        ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1"), ethernetPort("gi0-2", "Gi0/2")], status: "healthy",
      },
      {
        id: "device-5", label: "Device5", kind: "switch", x: 460, y: 205,
        subtitle: "Distribution switch · central transit",
        ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-3", "Fa0/3"), ethernetPort("fa0-4", "Fa0/4")], status: "healthy",
      },
      {
        id: "device-3", label: "Device3", kind: "switch", x: 230, y: 318,
        subtitle: "Access switch · server segment",
        ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-3", "Fa0/3")], status: "healthy",
      },
      {
        id: "device-4", label: "Device4", kind: "switch", x: 690, y: 318,
        subtitle: "Access switch · user segment",
        ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-3", "Fa0/3")], status: "healthy",
      },
      {
        id: "accounting", label: "Accounting", kind: "pc", x: 830, y: 170,
        subtitle: "Accounting workstation",
        ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy",
      },
      {
        id: "www", label: "WWW", kind: "server", x: 120, y: 430,
        subtitle: "Web server", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy",
      },
      {
        id: "ftp", label: "FTP", kind: "server", x: 310, y: 430,
        subtitle: "File-transfer server", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy",
      },
      {
        id: "web-admin", label: "Web Admin", kind: "pc", x: 610, y: 430,
        subtitle: "Web administration workstation",
        ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy",
      },
      {
        id: "sales", label: "Sales", kind: "pc", x: 800, y: 430,
        subtitle: "Sales workstation",
        ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy",
      },
    ],
    links: [
      { id: "ccna-topology-001-link-1", source: { deviceId: "device-1", portId: "gi0-0" }, target: { deviceId: "device-2", portId: "gi0-0" }, status: "up", label: "Router interconnect" },
      { id: "ccna-topology-001-link-2", source: { deviceId: "device-1", portId: "gi0-1" }, target: { deviceId: "device-5", portId: "fa0-1" }, status: "up", label: "Primary path" },
      { id: "ccna-topology-001-link-3", source: { deviceId: "device-2", portId: "gi0-1" }, target: { deviceId: "device-5", portId: "fa0-2" }, status: "up" },
      { id: "ccna-topology-001-link-4", source: { deviceId: "device-5", portId: "fa0-3" }, target: { deviceId: "device-3", portId: "fa0-1" }, status: "up" },
      { id: "ccna-topology-001-link-5", source: { deviceId: "device-5", portId: "fa0-4" }, target: { deviceId: "device-4", portId: "fa0-1" }, status: "up" },
      { id: "ccna-topology-001-link-6", source: { deviceId: "device-3", portId: "fa0-2" }, target: { deviceId: "www", portId: "gi0-0" }, status: "up" },
      { id: "ccna-topology-001-link-7", source: { deviceId: "device-3", portId: "fa0-3" }, target: { deviceId: "ftp", portId: "gi0-0" }, status: "up" },
      { id: "ccna-topology-001-link-8", source: { deviceId: "device-4", portId: "fa0-2" }, target: { deviceId: "web-admin", portId: "gi0-0" }, status: "up" },
      { id: "ccna-topology-001-link-9", source: { deviceId: "device-4", portId: "fa0-3" }, target: { deviceId: "sales", portId: "gi0-0" }, status: "up" },
    ],
  },
};

function portsFor(kind: SimulationNode["kind"], context: string): SimulationPort[] {
  const wireless = /wireless|wlan|wpa|laptop|access point|wrt/i.test(context);
  const names = kind === "switch"
    ? ["Fa0/1", "Fa0/2", "Fa0/23", "Fa0/24"]
    : kind === "pc" || kind === "server"
      ? ["Gi0/0"]
      : ["Gi0/0", "Gi0/1", "Gi0/2", "Console"];
  const ports: SimulationPort[] = names.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, kind: label === "Console" ? "console" : "ethernet" }));
  if (wireless && kind === "pc") ports.unshift({ id: "wlan0", label: "WLAN0", kind: "wireless" as const });
  if (wireless && kind === "access-point") ports.unshift({ id: "radio0", label: "Radio0", kind: "wireless" as const });
  return ports;
}

function deviceLabels(lab: CcnaLabEntry): string[] {
  const context = `${lab.title} ${lab.scenario.context} ${lab.scenario.requirement}`;
  if (/wireless|wpa|wlan/i.test(context)) return ["AP1", "Laptop-PT", "PC-A"];
  if (/automation|json|rest|controller/i.test(context)) return ["Controller", "R1", "SW1", "Operator-PC"];
  if (/vlan|trunk|switch|etherchannel|spanning|mac/i.test(context)) return ["SW1", "SW2", "PC-A", "PC-B"];
  if (/routing|ospf|route|hsrp|vrrp/i.test(context)) return ["R1", "R2", "PC-A", "PC-B"];
  if (/dhcp|dns|nat|ntp|syslog|tftp|ftp|ssh|acl|password|security/i.test(context)) return ["R1", "SW1", "PC-A", "Server"];
  return ["R1", "SW1", "PC-A"];
}

function createDevices(lab: CcnaLabEntry): SimulationNode[] {
  const override = catalogTopologyOverrides[lab.id];
  if (override) return override.devices.map((device) => ({ ...device, ports: device.ports.map((port) => ({ ...port })) }));
  const context = `${lab.title} ${lab.scenario.context} ${lab.scenario.requirement}`;
  return deviceLabels(lab).map((label, index) => {
    const kind = kindFor(label, context);
    return {
      id: `${slug(label)}-${index + 1}`,
      label,
      kind,
      x: 130 + (index % 3) * 280,
      y: 130 + Math.floor(index / 3) * 190,
      subtitle: kind === "router" ? "Layer 3 forwarding" : kind === "switch" ? "Layer 2 switching" : kind === "pc" ? "Endpoint" : kind === "server" ? "Service endpoint" : "Wireless access",
      ports: portsFor(kind, context),
      status: "healthy",
    };
  });
}

function createLinks(devices: SimulationNode[], lab: CcnaLabEntry): SimulationLink[] {
  const override = catalogTopologyOverrides[lab.id];
  if (override) return override.links.map((link) => ({ ...link, source: { ...link.source }, target: { ...link.target } }));
  const links: SimulationLink[] = [];
  const endpointUsed = (deviceId: string, portId: string) => links.some((link) =>
    (link.source.deviceId === deviceId && link.source.portId === portId)
    || (link.target.deviceId === deviceId && link.target.portId === portId));
  for (let index = 0; index < devices.length - 1; index += 1) {
    const from = devices[index];
    const to = devices[index + 1];
    const fromPort = from.ports.find((port) => port.kind === "ethernet" && !endpointUsed(from.id, port.id));
    const toPort = to.ports.find((port) => port.kind === "ethernet" && !endpointUsed(to.id, port.id));
    if (!fromPort || !toPort) continue;
    links.push({
      id: `${slug(lab.id)}-link-${index + 1}`,
      source: { deviceId: from.id, portId: fromPort.id },
      target: { deviceId: to.id, portId: toPort.id },
      status: "up",
      label: index === 0 ? "Primary path" : undefined,
    });
  }
  return links;
}

function checklistFor(lab: CcnaLabEntry): SimulationChecklistItem[] {
  const verification = lab.verification.length > 0 ? lab.verification : ["Verify the intended end-to-end path and record the observed result."];
  return [
    { id: "topology", title: "Connect the intended topology", detail: lab.diagram ? "Use the published diagram as the reference, then verify every cable in the editable graph." : "Use the starter graph and document any topology assumption before configuring it.", required: true },
    ...verification.map((item, index) => ({ id: `verify-${index + 1}`, title: `Verification ${index + 1}`, detail: item, required: true })),
    { id: "fault", title: "Reproduce and recover the expected fault", detail: `${lab.fault.failure} Recovery: ${lab.fault.recovery}`, required: true },
    { id: "evidence", title: "Save evidence without credentials", detail: "Record the device, command or observation and time; never include passwords or tokens.", required: true },
  ];
}

const supportedReadCommands = [
  "show version",
  "show ip interface brief",
  "show interfaces status",
  "show interfaces switchport",
  "show vlan brief",
  "show running-config",
] as const;

/** Turn long catalog verification prose into a command that the local IOS
 * model can actually execute.  The prose remains visible in the scenario;
 * the guided step only offers a safe, deterministic command for this slice. */
function guidedCommandFor(text: string, index: number) {
  const value = text.trim().toLowerCase();
  if (value.startsWith("show version")) return "show version";
  if (value.startsWith("show ip interface")) return "show ip interface brief";
  if (value.startsWith("show interfaces switchport")) return "show interfaces switchport";
  if (value.startsWith("show interfaces status")) return "show interfaces status";
  if (value.startsWith("show vlan")) return "show vlan brief";
  if (value.startsWith("show running-config")) return "show running-config";
  if (value.includes("vlan")) return "show vlan brief";
  if (value.includes("interface")) return "show ip interface brief";
  return supportedReadCommands[(index + 1) % supportedReadCommands.length];
}

function guideFor(lab: CcnaLabEntry, checklist: SimulationChecklistItem[], devices: SimulationNode[]): SimulationStage[] {
  const stages = checklist.map((item, index) => {
    let command = item.id === "evidence"
      ? "show running-config"
      : guidedCommandFor(item.detail ?? item.title, index);
    const isTopology = item.id === "topology";
    const isFault = item.id === "fault";
    const switching = /vlan|switchport|interfaces status/.test(command);
    const routing = /routing|ospf|static route|ipv6|subnet/.test(lab.title.toLowerCase());
    const target = devices.find((node) => node.kind === (switching || !routing ? "switch" : "router"))
      ?? devices.find((node) => node.kind === "router" || node.kind === "switch")
      ?? devices[0];
    if (target.kind !== "router" && target.kind !== "switch") {
      command = item.id === "evidence" ? "show running-config" : isTopology ? "show version" : "show ip interface brief";
    }
    const explanation: Record<string, string> = {
      "show version": "Check the device identity and IOS version. Read the model and software information before deciding which configuration commands to use.",
      "show ip interface brief": "Check the IP address, Status and Protocol of each interface. Compare connected ports with the topology; up/up indicates an active interface, while administratively down means it is shut down.",
      "show interfaces status": "Check which physical ports are connected, their VLAN, speed and duplex. Compare each port with its cable in the topology before changing settings.",
      "show interfaces switchport": "Check access or trunk mode and the access/native VLAN on each port. Compare these settings with the lab requirement before configuring the switch.",
      "show vlan brief": "Check that the required VLAN exists and that the intended access ports belong to it. Compare the VLAN IDs and port list with the lab requirement.",
      "show running-config": "Read the current configuration and locate the interfaces and settings used in this lab. Compare them with your intended changes and keep evidence without passwords.",
    };
    const task = `On ${target.label}, run ${command}. ${explanation[command] ?? "Read the output and compare it with this lab's requirements."}`;
    return {
      id: item.id,
      deviceId: target.id,
      title: item.title,
      instruction: isTopology
        ? `Start on ${target.label}. Read its role and connections in the topology, then run the command below in its console to check its interfaces.`
        : isFault
          ? `${item.detail ?? "Reproduce the lab fault"} Use the recovery note as your target, then verify the resulting device state.`
          : `${item.detail ?? "Verify the lab configuration."} ${task}`,
      why: isTopology
        ? "A topology is a plan: identify the device and its role before changing configuration."
        : isFault
          ? "Troubleshooting is evidence-led. Confirm the state after the recovery instead of trusting a typed command."
          : "The output is the evidence that the step is complete; the next stage stays locked until it is produced.",
      command,
      expected: `A valid ${command} response appears in the ${target.label} console.`,
      hint: `Use ${target.label}, not another device. If the prompt ends with >, enter enable first; if it contains (config), enter end before the check. Unambiguous IOS abbreviations are accepted.`,
    } satisfies SimulationStage;
  });
  const checks = new Map<string, SimulationStage>();
  return stages.filter((stage) => {
    const key = `${stage.deviceId}:${stage.command}`;
    const previous = checks.get(key);
    // The adapter sometimes maps several catalog checks to the same supported
    // IOS command. They are one diagnostic step, not several achievements.
    if (previous && stage.id.startsWith("verify-")) {
      // Full catalog verification notes remain in the lab brief; don't repeat
      // the same simulated check or inflate this workspace's achievement count.
      return false;
    }
    if (previous) {
      stage.expected += " Repeating an already credited result does not pass: the output must show a new device state after your changes.";
      stage.hint += " Make the required lab changes before checking again; rerunning the same unchanged check is not another achievement.";
    }
    checks.set(key, stage);
    return true;
  });
}

function terminalFor(lab: CcnaLabEntry) {
  const verification = lab.verification.slice(0, 8);
  const commands: Record<string, string[]> = {
    help: ["show version", "show ip interface brief", "show interfaces status", "show running-config", ...verification],
    "show version": ["Cisco IOS Software, guided CCNA lab image", `Lab: ${lab.title}`, `Domain: ${lab.domain}`],
    "show ip interface brief": ["Interface              IP-Address      OK? Method Status                Protocol", "Gi0/0                  unassigned      YES unset  administratively down down", "Gi0/1                  unassigned      YES unset  administratively down down"],
    "show interfaces status": ["Port      Name               Status       Vlan       Duplex  Speed Type", "Fa0/1                       connected    1          a-full  a-100 10/100BaseTX", "Fa0/24                      notconnect   1          auto    auto 10/100BaseTX"],
    "show running-config": [`! Guided baseline for ${lab.id}`, "! Apply only the commands required by the scenario.", "version 15.2", `! ${lab.fault.failure}`],
  };
  for (const command of verification) commands[command.toLowerCase()] ??= [`Evidence target: ${command}`, "Run this check in the simulator after applying the lab change."];
  return { hostname: lab.title.slice(0, 28), prompt: "Switch#", intro: ["This is a guided, isolated lab terminal.", "Type help to see the read-only checks available."], commands };
}

/**
 * A pack that the project authored for this exact lab. Its devices, cables and steps are the lab's
 * own, and every graded step carries a predicate over live device state, so the workspace can grade
 * the learner without trusting what was typed into a console.
 */
function authoredStages(pack: SimLabPack): SimulationStage[] {
  return pack.objectives.flatMap((objective) => objective.steps.map((step) => {
    // The guide names the console this step belongs to, in both directions: a graded step says which
    // device its check reads, and an ungraded one says no check runs there either (the structural gate
    // requires the device label in `expected`, and a learner needs to know where a step counts).
    const deviceLabel = pack.devices.find((device) => device.id === step.deviceId)?.label ?? step.deviceId;
    return {
      id: `${objective.id}:${step.id}`,
      deviceId: step.deviceId,
      title: step.title,
      instruction: `${objective.title} — ${step.instruction}`,
      why: step.why,
      command: step.commands?.[0] ?? "show running-config",
      commands: step.commands,
      expected: step.ungraded
        ? `${step.ungraded} No check runs on ${deviceLabel} for this step.`
        : `This step is credited when this lab's own check reads the required state on ${deviceLabel}.`,
      check: step.check,
      ungraded: step.ungraded,
    };
  }));
}

function authoredChecklist(pack: SimLabPack): SimulationChecklistItem[] {
  return pack.objectives.flatMap((objective) => objective.steps.map((step) => ({
    id: `${objective.id}:${step.id}`,
    title: step.title,
    detail: step.ungraded ?? `${objective.title} · on ${pack.devices.find((device) => device.id === step.deviceId)?.label ?? "this lab"}`,
    required: !step.ungraded,
  })));
}

function createPack(lab: CcnaLabEntry): CcnaSimulationPack {
  const handsOn = handsOnById.get(lab.id);
  const authored = getAuthoredLabPack(lab.id);
  const devices = authored ? authored.devices.map((node) => ({ ...node, ports: node.ports.map((port) => ({ ...port })) })) : createDevices(lab);
  const topology = handsOn?.topology;
  const sources = lab.sourceRefs.map((source) => ({ title: source.title, url: source.url }));
  const checklist = authored ? authoredChecklist(authored) : checklistFor(lab);
  return {
    id: `ccna-sim-${slug(lab.id)}`,
    labId: lab.id,
    bandId: lab.bandId,
    reviewStatus: lab.reviewStatus,
    title: lab.title,
    summary: lab.catalogSummary ?? lab.scenario.requirement,
    domain: lab.domain,
    difficulty: lab.tier,
    duration: lab.duration,
    scenario: authored ? {
      role: authored.scenario.role,
      context: `${authored.scenario.context}. ${authored.diagramNote}`,
      objective: `Objectives ${lab.objectives.join(", ")} · ${authored.scenario.objective}`,
      requirement: authored.scenario.requirement,
      prerequisites: authored.scenario.prerequisites,
    } : {
      role: lab.scenario.role,
      context: `${lab.scenario.context}. ${topology?.note ?? "Use the editable starter graph as the working topology."}`,
      objective: `Objectives ${lab.objectives.join(", ")} · ${lab.scenario.requirement}`,
      requirement: `Success means the intended path is configured and verified. Expected fault: ${lab.fault.failure} Recovery: ${lab.fault.recovery}`,
      prerequisites: lab.prerequisites,
    },
    devices,
    links: authored ? authored.links.map((link) => ({ ...link, source: { ...link.source }, target: { ...link.target } })) : createLinks(devices, lab),
    checklist,
    stages: authored ? authoredStages(authored) : guideFor(lab, checklist, devices),
    terminal: terminalFor(lab),
    references: authored ? [...authored.references] : sources,
    sourceSummary: lab.reviewStatus === "reviewed" ? "Objectives and sources were reviewed for this learning-path entry." : `Draft fallback: ${lab.reviewNote ?? "The catalog mapping still needs review."}`,
    fallback: authored ? false : lab.kind === "catalog" && lab.artifacts.steps === 0,
    topologyOutline: topology,
    lab: authored ?? undefined,
    ...(lab.diagram ? { diagram: lab.diagram } : {}),
  };
}

const allPacks = ccnaLabPath.map(createPack);
const packByLabId = new Map(allPacks.map((pack) => [pack.labId, pack]));
export const ccnaSimulationPackByLabId = packByLabId;

/** All 109 packs are available through the adapter. Entries whose catalog
 * mapping still needs review remain visible and are labelled as fallbacks; a
 * learner must never lose the simulator just because a source mapping is
 * awaiting review. */
export const ccnaSimulationPacks = allPacks;
export const ccnaSimulationPackSummaries: CcnaSimulationPackSummary[] = allPacks.map(({ id, labId, bandId, title, domain, difficulty, duration, reviewStatus, fallback }) => ({ id, labId, bandId, title, domain, difficulty, duration, reviewStatus, fallback }));
export const ccnaSimulationStats = {
  bands: ccnaLabBands.length,
  labs: allPacks.length,
  reviewedPacks: allPacks.filter((pack) => pack.reviewStatus === "reviewed").length,
  draftFallbackPacks: allPacks.filter((pack) => pack.reviewStatus === "needs-review").length,
  diagrams: ccnaLabPath.filter((lab) => Boolean(lab.diagram)).length,
} as const;

export function getCcnaSimulationPack(labId: string) {
  return packByLabId.get(labId);
}

export function listCcnaSimulationPacks(bandId?: string, includeDraft = true) {
  return allPacks.filter((pack) => (includeDraft || pack.reviewStatus === "reviewed") && (!bandId || pack.bandId === bandId));
}

export function getCcnaSimulationBand(bandId: string) {
  return ccnaLabBands.find((band) => band.id === bandId);
}

export const ccnaSimulationBandSummaries = ccnaLabBands.map((band) => ({
  id: band.id,
  order: band.order,
  title: band.title,
  summary: band.summary,
  labCount: band.labIds.length,
  labIds: [...band.labIds],
}));

if (new Set(allPacks.map((pack) => pack.labId)).size !== ccnaLabPathStats.total) {
  throw new Error("CCNA simulation pack adapter does not cover every learning-path lab exactly once.");
}

