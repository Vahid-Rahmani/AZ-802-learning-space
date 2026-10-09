import { configBodyLines, findInterface, portAllowsVlan, type SimDeviceRole } from "./device.ts";
import { hostVlan, neighbourOf, pingFrom, sameSubnet, type LabDevice, type LabNetwork } from "./lab-network.ts";
import type { SimulationLink, SimulationNode } from "./topology.ts";

/**
 * A lab pack declares what the learner must reach, and every requirement is a predicate over the
 * live device model rather than a command that was typed. This module is the only view a check may
 * use, so a check cannot reach into a terminal transcript, and grading cannot be satisfied by
 * repeating a `show` command.
 */
export type LabStepOutcome = { ok: boolean; detail: string };
export const met = (detail: string): LabStepOutcome => ({ ok: true, detail });
export const unmet = (detail: string): LabStepOutcome => ({ ok: false, detail });

export type LabPortView = {
  exists: boolean;
  name: string;
  kind: "ethernet" | "svi" | "subinterface" | null;
  mode: "access" | "trunk" | "routed" | null;
  accessVlan: number;
  nativeVlan: number;
  allowed: number[] | "all" | null;
  adminUp: boolean;
  dot1q: number;
  parent: string | null;
  address: { ip: string; mask: string } | null;
};

export type LabDeviceView = {
  exists: boolean;
  id: string;
  label: string;
  role: SimDeviceRole | null;
  hostname: string;
  gateway: string | null;
  vlans: number[];
  vlan: (id: number) => { exists: boolean; name: string | null };
  port: (name: string) => LabPortView;
  /** Ports of this device that carry the VLAN, which is what a trunk or access port must do. */
  carriers: (vlan: number) => LabPortView[];
  neighbour: (portName: string) => { deviceId: string; label: string; port: string; role: SimDeviceRole } | null;
  startupSaved: boolean;
  startupMatchesRunning: boolean;
};

export type LabModel = {
  network: LabNetwork;
  device: (id: string) => LabDeviceView;
  /** `linked("SW1:Fa0/24", "R1:Gi0/0")` — a cable between exactly these two ports. */
  linked: (a: string, b: string) => boolean;
  hostVlan: (deviceId: string) => number | null;
  subnet: (a: string, b: string, mask: string) => boolean;
  ping: (fromDeviceId: string, targetIp: string) => LabStepOutcome;
};

const missingPort: LabPortView = {
  exists: false, name: "", kind: null, mode: null, accessVlan: 1, nativeVlan: 1, allowed: null,
  adminUp: false, dot1q: 0, parent: null, address: null,
};

function portView(device: LabDevice | null, name: string): LabPortView {
  const port = device ? findInterface(device.state, name) : undefined;
  if (!port) return { ...missingPort, name };
  return {
    exists: true, name: port.name, kind: port.kind, mode: port.mode, accessVlan: port.accessVlan,
    nativeVlan: port.nativeVlan, allowed: port.allowedVlans, adminUp: port.adminUp,
    dot1q: port.dot1q, parent: port.parent, address: port.address ? { ...port.address } : null,
  };
}

function deviceView(network: LabNetwork, id: string): LabDeviceView {
  // A check may name a device by its id or by the label the learner sees on the canvas.
  const device = network.devices.find((candidate) => candidate.id === id)
    ?? network.devices.find((candidate) => candidate.label.toLowerCase() === id.toLowerCase())
    ?? null;
  return {
    exists: Boolean(device),
    id,
    label: device?.label ?? id,
    role: device?.state.role ?? null,
    hostname: device?.state.hostname ?? "",
    gateway: device?.state.gateway ?? null,
    vlans: device ? [...device.state.vlans.keys()].sort((left, right) => left - right) : [],
    vlan: (vlanId) => {
      const vlan = device?.state.vlans.get(vlanId) ?? null;
      return { exists: Boolean(vlan), name: vlan?.name ?? null };
    },
    port: (name) => portView(device, name),
    carriers: (vlan) => device
      ? device.state.interfaces.filter((port) => port.kind !== "svi" && portAllowsVlan(port, vlan)).map((port) => portView(device, port.name))
      : [],
    neighbour: (portName) => {
      if (!device) return null;
      const other = neighbourOf(network, device.id, portName);
      return other ? { deviceId: other.device.id, label: other.device.label, port: other.port.name, role: other.device.state.role } : null;
    },
    startupSaved: Boolean(device?.startup),
    startupMatchesRunning: Boolean(device?.startup && configBodyLines(device.state).join("\n") === device.startup.join("\n")),
  };
}

export function buildLabModel(network: LabNetwork): LabModel {
  return {
    network,
    device: (id) => deviceView(network, id),
    linked: (a, b) => {
      const [leftDevice, leftPort] = a.split(":");
      const [rightDevice, rightPort] = b.split(":");
      if (!leftDevice || !leftPort || !rightDevice || !rightPort) return false;
      const neighbour = neighbourOf(network, leftDevice, leftPort);
      return Boolean(neighbour && neighbour.device.id === rightDevice && neighbour.port.name.toLowerCase() === rightPort.toLowerCase());
    },
    hostVlan: (deviceId) => hostVlan(network, deviceId),
    subnet: sameSubnet,
    ping: (fromDeviceId, targetIp) => {
      const result = pingFrom(network, fromDeviceId, targetIp);
      return { ok: result.ok, detail: result.reason };
    },
  };
}

export type SimLabStep = {
  id: string;
  title: string;
  /** The console this step is done on; the guide names it. */
  deviceId?: string;
  instruction: string;
  why: string;
  /** A command the step needs, offered as a hint. Never the proof that the step is done. */
  commands?: string[];
  check?: (lab: LabModel) => LabStepOutcome;
  /** Present only when a step genuinely cannot be evaluated; stated instead of faked. */
  ungraded?: string;
};

/**
 * An objective groups the steps that reach one result. `detail` states, in one line, what the
 * objective requires and how it is graded, so the structural acceptance gate (and a reader) can
 * summarize an objective without replaying its steps.
 */
export type SimLabObjective = { id: string; title: string; detail: string; steps: SimLabStep[] };

export type SimLabPack = {
  labId: string;
  title: string;
  difficulty: string;
  duration: string;
  scenario: { role: string; context: string; objective: string; requirement: string; prerequisites: string[] };
  /** What the published diagram shows, or why the lab has no diagram. */
  diagramNote: string;
  devices: SimulationNode[];
  links: SimulationLink[];
  objectives: SimLabObjective[];
  references: Array<{ title: string; url: string }>;
  /**
   * The end state of this lab as keystrokes per console. `validate:ccna-sim` replays it headlessly
   * and asserts that every graded step passes, and that the negative cases do not.
   */
  solution: Array<{ deviceId: string; commands: string[] }>;
};

export const labSteps = (pack: SimLabPack): SimLabStep[] => pack.objectives.flatMap((objective) => objective.steps);
export const gradedSteps = (pack: SimLabPack): SimLabStep[] => labSteps(pack).filter((step): step is SimLabStep & { check: NonNullable<SimLabStep["check"]> } => Boolean(step.check));
