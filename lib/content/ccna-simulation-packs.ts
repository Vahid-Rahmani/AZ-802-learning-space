import { ccnaLabs } from "./ccna.ts";
import { ccnaLabBands, ccnaLabPath, ccnaLabPathStats, type CcnaLabEntry } from "./ccna-lab-path.ts";
import type { SimDeviceRole } from "@/lib/ccna-sim/device";
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
 * The mappings below are the hands-on labs whose own topology outline names
 * their devices, ports and cables, plus the ten-device Explore Cisco Devices
 * topology shown in the lab catalogue.
 *
 * A lab that has neither an authored objective pack nor a mapping here keeps
 * the starter graph, which is a placeholder: its devices and cables are not the
 * lab's own, and its page says that nothing is graded yet.
 */
const catalogTopologyOverrides: Record<string, TopologyOverride> = {
  /**
   * The two hands-on labs that do not have an authored objective pack yet still publish a device map
   * of their own, so they get their own devices and cables instead of the starter graph. Their
   * canvases then match the picture the lab shows even though nothing on the page is graded yet: a
   * switched LAN for those labs cannot honestly be drawn as PC-A cabled straight to PC-B.
   *
   * `ccna-etherchannel` — "PC-A → SW1 F0/1", "SW1 ↔ SW2" (F0/23↔F0/23 + F0/24↔F0/24 · Po1) and
   * "SW2 F0/1 → PC-B", all in VLAN 30.
   */
  "ccna-etherchannel": {
    devices: [
      { id: "pc-a", label: "PC-A", kind: "pc", x: 140, y: 120, subtitle: "192.168.30.10/24 · VLAN 30", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy" },
      { id: "pc-b", label: "PC-B", kind: "pc", x: 620, y: 120, subtitle: "192.168.30.20/24 · VLAN 30", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy" },
      { id: "sw1", label: "SW1", kind: "switch", x: 230, y: 330, subtitle: "2960 · F0/1 access VLAN 30", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-23", "Fa0/23"), ethernetPort("fa0-24", "Fa0/24")], status: "healthy" },
      { id: "sw2", label: "SW2", kind: "switch", x: 540, y: 330, subtitle: "2960 · F0/1 access VLAN 30", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-23", "Fa0/23"), ethernetPort("fa0-24", "Fa0/24")], status: "healthy" },
    ],
    links: [
      { id: "ccna-etherchannel-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-1" }, status: "up", label: "PC-A → SW1 F0/1" },
      { id: "ccna-etherchannel-link-2", source: { deviceId: "sw1", portId: "fa0-23" }, target: { deviceId: "sw2", portId: "fa0-23" }, status: "up", label: "Po1 member 1" },
      { id: "ccna-etherchannel-link-3", source: { deviceId: "sw1", portId: "fa0-24" }, target: { deviceId: "sw2", portId: "fa0-24" }, status: "up", label: "Po1 member 2" },
      { id: "ccna-etherchannel-link-4", source: { deviceId: "sw2", portId: "fa0-1" }, target: { deviceId: "pc-b", portId: "gi0-0" }, status: "up", label: "SW2 F0/1 → PC-B" },
    ],
  },
  /**
   * `ccna-services` — "PC-A + inside server → SW1", "R1 G0/0 ↔ G0/1" (inside .50.1/24, outside
   * 198.51.100.1/24) and "SW2 → outside PC", with the inside server at 192.168.50.20 and the outside
   * client at 198.51.100.10. Both switches are the ones the outline's note names.
   */
  "ccna-services": {
    devices: [
      { id: "pc-a", label: "PC-A", kind: "pc", x: 120, y: 120, subtitle: "DHCP client · 192.168.50.0/24", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy" },
      { id: "server", label: "Server", kind: "server", x: 330, y: 120, subtitle: "inside server · 192.168.50.20/24", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy" },
      { id: "sw1", label: "SW1", kind: "switch", x: 230, y: 300, subtitle: "inside LAN switch", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-24", "Fa0/24")], status: "healthy" },
      { id: "r1", label: "R1", kind: "router", x: 380, y: 450, subtitle: "2911 · inside .50.1/24 · outside 198.51.100.1/24", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")], status: "healthy" },
      { id: "sw2", label: "SW2", kind: "switch", x: 540, y: 600, subtitle: "outside LAN switch", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-24", "Fa0/24")], status: "healthy" },
      { id: "pc-b", label: "PC-B", kind: "pc", x: 620, y: 740, subtitle: "outside client · 198.51.100.10/24", ports: [ethernetPort("gi0-0", "Gi0/0")], status: "healthy" },
    ],
    links: [
      { id: "ccna-services-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-1" }, status: "up", label: "PC-A → SW1" },
      { id: "ccna-services-link-2", source: { deviceId: "server", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-2" }, status: "up", label: "inside server → SW1" },
      { id: "ccna-services-link-3", source: { deviceId: "sw1", portId: "fa0-24" }, target: { deviceId: "r1", portId: "gi0-0" }, status: "up", label: "SW1 F0/24 ↔ R1 G0/0" },
      { id: "ccna-services-link-4", source: { deviceId: "r1", portId: "gi0-1" }, target: { deviceId: "sw2", portId: "fa0-24" }, status: "up", label: "R1 G0/1 ↔ SW2 F0/24" },
      { id: "ccna-services-link-5", source: { deviceId: "sw2", portId: "fa0-1" }, target: { deviceId: "pc-b", portId: "gi0-0" }, status: "up", label: "SW2 → outside PC" },
    ],
  },
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

/**
 * The console role of a generated node. Every device this adapter publishes gets exactly one role,
 * so the workspace builds its console with `createLabSession` and never has to guess a role or fall
 * back to a canned transcript. A device whose real control surface is a vendor GUI (a wireless
 * access point, a controller or a cloud) has no role: the lab says so instead of inventing an IOS
 * console that the device does not have.
 */
function roleFor(kind: SimulationNode["kind"]): SimDeviceRole | null {
  if (kind === "router" || kind === "firewall") return "router";
  if (kind === "switch") return "switch";
  if (kind === "pc" || kind === "server") return "host";
  return null;
}

function createDevices(lab: CcnaLabEntry): SimulationNode[] {
  const override = catalogTopologyOverrides[lab.id];
  if (override) return override.devices.map((device) => ({ ...device, role: device.role ?? roleFor(device.kind) ?? undefined, ports: device.ports.map((port) => ({ ...port })) }));
  const context = `${lab.title} ${lab.scenario.context} ${lab.scenario.requirement}`;
  return deviceLabels(lab).map((label, index) => {
    const kind = kindFor(label, context);
    const role = roleFor(kind);
    return {
      id: `${slug(label)}-${index + 1}`,
      label,
      kind,
      ...(role ? { role } : {}),
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

/**
 * A read command is only ever offered on a console whose role implements it, so the guide can never
 * suggest `show vlan brief` on a router or any command this engine would reject. This table is the
 * adapter's side of the contract with `lib/ccna-sim/commands.ts`.
 */
const READ_COMMANDS: Array<{ name: string; roles: readonly SimDeviceRole[]; note: string }> = [
  { name: "show version", roles: ["router", "switch"], note: "Read the device identity and image before choosing commands; this engine answers with the running platform it models." },
  { name: "show ip interface brief", roles: ["router", "switch"], note: "Read each interface's address, line and protocol state; administratively down means the port is shut down." },
  { name: "show ipv6 interface brief", roles: ["router", "switch"], note: "Read the IPv6 address and prefix of each interface; IPv6 is configured per interface, next to IPv4." },
  { name: "show vlan brief", roles: ["switch"], note: "Read which VLANs exist and which access ports carry them. A router does not implement this command, so this step is only offered on a switch." },
  { name: "show interfaces switchport", roles: ["switch"], note: "Read the access or trunk mode, the access VLAN and the trunk allowed list of every port." },
  { name: "show interfaces status", roles: ["switch"], note: "Read each port's state from its real cable: connected, notconnect or disabled." },
  { name: "show ip route connected", roles: ["router", "switch"], note: "Read the directly connected networks; a route disappears when its interface goes down." },
  { name: "show ipv6 route connected", roles: ["router", "switch"], note: "Read the directly connected IPv6 prefixes; IPv6 forwarding also needs `ipv6 unicast-routing`." },
  { name: "show running-config", roles: ["router", "switch"], note: "Read the current configuration and compare it with this lab's requirement." },
  { name: "ipconfig", roles: ["host"], note: "Read this endpoint's address, mask and default gateway." },
];

/** Map one catalog verification sentence to a command this engine really implements. */
function readCommandFor(text: string) {
  const value = text.trim().toLowerCase();
  const exact = READ_COMMANDS.find((entry) => value.startsWith(entry.name));
  if (exact) return exact;
  if (value.includes("ipv6")) return READ_COMMANDS.find((entry) => entry.name === "show ipv6 interface brief") ?? null;
  if (value.includes("vlan") || value.includes("switchport")) return READ_COMMANDS.find((entry) => entry.name === "show vlan brief") ?? null;
  if (value.includes("route")) return READ_COMMANDS.find((entry) => entry.name === "show ip route connected") ?? null;
  if (value.includes("running")) return READ_COMMANDS.find((entry) => entry.name === "show running-config") ?? null;
  if (value.includes("interface") || value.includes("ping") || value.includes("address")) return READ_COMMANDS.find((entry) => entry.name === "show ip interface brief") ?? null;
  return READ_COMMANDS[0];
}

/**
 * What a lab without authored objectives offers instead: the evidence its own catalog entry names,
 * each sentence mapped to a command the target console actually implements. These are observations,
 * never achievements: they carry `required: false`, are not stages, and are never counted as work.
 */
function observationsFor(lab: CcnaLabEntry, devices: SimulationNode[]): SimulationChecklistItem[] {
  const verification = lab.verification.length > 0 ? lab.verification : ["show version"];
  const seen = new Set<string>();
  const items: SimulationChecklistItem[] = [];
  for (const [index, text] of verification.entries()) {
    const command = readCommandFor(text);
    const device = command ? devices.find((node) => node.role && command.roles.includes(node.role)) ?? null : null;
    const key = `${device?.id ?? "none"}:${command?.name ?? text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `observe-${index + 1}`,
      title: command && device ? `${device.label} · ${command.name}` : "This lab's own tool",
      detail: command && device
        ? `${text} ${command.note}`
        : `${text} This lab's devices have no IOS console in this practice model, so this check belongs to the lab's own tool.`,
      required: false,
    });
  }
  items.push({
    id: "observe-boundary",
    title: "What this practice model does not prove yet",
    detail: `Expected fault: ${lab.fault.failure} Recovery: ${lab.fault.recovery} No graded objective is authored for this lab yet, so nothing on this page is credited as completed work.`,
    required: false,
  });
  return items;
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
  const checklist = authored ? authoredChecklist(authored) : observationsFor(lab, devices);
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
    // Only an authored pack has graded stages. A generated pack carries no stage a learner could
    // complete, because this site will not credit work it cannot check against device state.
    stages: authored ? authoredStages(authored) : [],
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

