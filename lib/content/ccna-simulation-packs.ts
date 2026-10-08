import { ccnaLabs } from "./ccna.ts";
import { ccnaLabBands, ccnaLabPath, ccnaLabPathStats, type CcnaLabEntry } from "./ccna-lab-path.ts";
import type { SimulationPack, SimulationNode, SimulationPort, SimulationLink, SimulationChecklistItem } from "@/lib/ccna-sim/topology";
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
  const value = `${label} ${context}`.toLowerCase();
  if (/access point|wlc|wireless|wlan|wrt|laptop/.test(value)) return /laptop/.test(value) ? "pc" : "access-point";
  if (/server|dns|dhcp|tftp|ftp|ntp|syslog/.test(value)) return "server";
  if (/switch|sw\d|2960|layer 2/.test(value)) return "switch";
  if (/pc|host|client|operator/.test(value)) return "pc";
  return "router";
}

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

function terminalFor(lab: CcnaLabEntry) {
  const verification = lab.verification.slice(0, 8);
  const commands: Record<string, string[]> = {
    help: ["show version", "show ip interface brief", "show interfaces status", "show running-config", ...verification],
    "show version": ["Cisco IOS Software, guided CCNA lab image", `Lab: ${lab.title}`, `Domain: ${lab.domain}`],
    "show ip interface brief": ["Interface              IP-Address      OK? Method Status                Protocol", "Gi0/0                  unassigned      YES unset  administratively down down", "Gi0/1                  unassigned      YES unset  administratively down down"],
    "show interfaces status": ["Port      Name               Status       Vlan       Duplex  Speed Type", "Fa0/1                       connected    1          a-full  a-100 10/100BaseTX", "Fa0/24                      notconnect   1          auto    auto 10/100BaseTX"],
    "show running-config": [`! Guided baseline for ${lab.id}`, "! Apply only the commands required by the scenario.", "version 15.2", `! ${lab.fault.failure}`],
  };
  for (const command of verification) commands[command.toLowerCase()] = [`Evidence target: ${command}`, "Run this check in the simulator after applying the lab change."];
  return { hostname: lab.title.slice(0, 28), prompt: "Switch#", intro: ["This is a guided, isolated lab terminal.", "Type help to see the read-only checks available."], commands };
}

function createPack(lab: CcnaLabEntry): CcnaSimulationPack {
  const handsOn = handsOnById.get(lab.id);
  const devices = createDevices(lab);
  const topology = handsOn?.topology;
  const sources = lab.sourceRefs.map((source) => ({ title: source.title, url: source.url }));
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
    scenario: {
      role: lab.scenario.role,
      context: `${lab.scenario.context}. ${topology?.note ?? "Use the editable starter graph as the working topology."}`,
      objective: `Objectives ${lab.objectives.join(", ")} · ${lab.scenario.requirement}`,
      requirement: `Success means the intended path is configured and verified. Expected fault: ${lab.fault.failure} Recovery: ${lab.fault.recovery}`,
      prerequisites: lab.prerequisites,
    },
    devices,
    links: createLinks(devices, lab),
    checklist: checklistFor(lab),
    terminal: terminalFor(lab),
    references: sources,
    sourceSummary: lab.reviewStatus === "reviewed" ? "Objectives and sources were reviewed for this learning-path entry." : `Draft fallback: ${lab.reviewNote ?? "The catalog mapping still needs review."}`,
    fallback: lab.kind === "catalog" && lab.artifacts.steps === 0,
    topologyOutline: topology,
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

