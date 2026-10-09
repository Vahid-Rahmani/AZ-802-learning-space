/**
 * Generic topology primitives for the CCNA simulation workspace.
 *
 * The content layer can map any published lab to this small contract without
 * teaching the UI about a particular lab, device model, or vendor diagram.
 * The functions in this module are intentionally pure so a future server-side
 * grader can reuse the same connection rules.
 */

import type { SimDeviceRole } from "./device.ts";
import type { LabModel, LabStepOutcome, SimLabPack } from "./lab.ts";

export type SimulationDeviceKind = "router" | "switch" | "pc" | "server" | "access-point" | "firewall" | "cloud";
export type SimulationPortKind = "ethernet" | "serial" | "console" | "wireless";

export type SimulationPort = {
  id: string;
  label: string;
  kind?: SimulationPortKind;
  /** A port may be used once unless the pack explicitly opts into fan-out. */
  allowMultipleLinks?: boolean;
};

export type SimulationNode = {
  id: string;
  label: string;
  kind: SimulationDeviceKind;
  /** The IOS role of this device's console: a switch, a router, or an endpoint host. */
  role?: SimDeviceRole;
  x: number;
  y: number;
  ports: SimulationPort[];
  subtitle?: string;
  /** Optional visual state supplied by the lab pack. */
  status?: "healthy" | "warning" | "fault";
};

export type SimulationEndpoint = {
  deviceId: string;
  portId: string;
};

export type SimulationLink = {
  id: string;
  source: SimulationEndpoint;
  target: SimulationEndpoint;
  status?: "up" | "down" | "fault";
  label?: string;
};

export type SimulationChecklistItem = {
  id: string;
  title: string;
  detail?: string;
  /** The UI uses this to highlight required work; grading remains external. */
  required?: boolean;
};

/**
 * A graded learning step for the browser lab. Its `check` is the only thing that can credit it, and
 * the `command` is the hint the learner runs to see the state the check reads. There is no
 * transcript-based fallback and no manual tick: a step without a check is not a stage.
 */
export type SimulationStage = {
  id: string;
  /** The console this step is done on. */
  deviceId?: string;
  title: string;
  instruction: string;
  why: string;
  /** A command the step needs, offered as a hint; it is never the proof that the step is done. */
  command: string;
  /** Every command this step needs, when it needs more than one. */
  commands?: string[];
  expected: string;
  hint?: string;
  /**
   * The only way a stage is credited: a predicate over live device state. A stage that cannot be
   * checked carries `ungraded` instead of a fake success, and an ungraded stage is shown to the
   * learner without ever being counted.
   */
  check?: (lab: LabModel) => LabStepOutcome;
  /** Stated plainly when a requirement cannot be evaluated automatically. */
  ungraded?: string;
};

export type SimulationScenario = {
  role?: string;
  context: string;
  objective: string;
  requirement?: string;
  prerequisites?: string[];
};

export type SimulationPack = {
  id: string;
  title: string;
  summary?: string;
  domain?: string;
  difficulty?: string;
  duration?: string;
  scenario: SimulationScenario;
  devices: SimulationNode[];
  links?: SimulationLink[];
  checklist?: SimulationChecklistItem[];
  stages?: SimulationStage[];
  references?: Array<{ title: string; url: string }>;
  /** Present when this lab has its own authored pack instead of the generic starter graph. */
  lab?: SimLabPack;
};

export type SimulationViewport = {
  scale: number;
  x: number;
  y: number;
};

export type SimulationState = {
  nodes: SimulationNode[];
  links: SimulationLink[];
  viewport: SimulationViewport;
};

/**
 * Keep the first view of every lab readable and deterministic.  Packs are
 * authored with a rough position, but a topology can contain a different
 * mix of routers, switches and endpoints.  Grouping by role gives the
 * simulator a predictable Packet-Tracer-like starting canvas without
 * changing the lab's devices or links.
 */
export function simulationCanvasHeight(nodes: Array<{ kind: SimulationDeviceKind }>) {
  const endpoints = nodes.filter((node) => node.kind === "pc" || node.kind === "server").length;
  const rows = Math.ceil(endpoints / 3) + Math.ceil((nodes.length - endpoints) / 3);
  return Math.max(500, 144 + Math.max(0, rows - 1) * 170);
}

export function arrangeSimulationNodes(nodes: SimulationNode[], width = 760, height = simulationCanvasHeight(nodes)) {
  const isEndpoint = (kind: SimulationDeviceKind) => kind === "pc" || kind === "server";
  const roleRank = (kind: SimulationDeviceKind) => kind === "router" || kind === "firewall" || kind === "cloud"
    ? 0
    : kind === "switch" || kind === "access-point"
      ? 1
      : 2;
  const ordered = nodes.map((node, index) => ({ node, index })).sort((left, right) => roleRank(left.node.kind) - roleRank(right.node.kind) || left.index - right.index);
  const chunk = (items: typeof ordered) => {
    const result: Array<typeof ordered> = [];
    for (let index = 0; index < items.length; index += 3) result.push(items.slice(index, index + 3));
    return result;
  };
  const endpointRows = chunk(ordered.filter(({ node }) => isEndpoint(node.kind)));
  const infrastructureRows = chunk(ordered.filter(({ node }) => !isEndpoint(node.kind)));
  const roleRows = endpointRows.length > 0 ? [...endpointRows, ...infrastructureRows] : chunk(ordered);
  const rows = Math.max(1, roleRows.length);
  const horizontalPadding = Math.min(120, width * .14);
  const verticalPadding = Math.min(72, height * .16);
  const usableWidth = Math.max(260, width - horizontalPadding * 2);
  const usableHeight = Math.max(110, height - verticalPadding * 2);

  return roleRows.flatMap((row, rowIndex) => row.map(({ node }, index) => ({
    ...node,
    x: row.length === 1 ? width / 2 : horizontalPadding + (usableWidth * index) / (row.length - 1),
    y: rows === 1 ? height / 2 : verticalPadding + (usableHeight * rowIndex) / (rows - 1),
  })));
}

export type SimulationConnectionResult =
  | { ok: true; state: SimulationState; link: SimulationLink }
  | { ok: false; reason: string };

const DEFAULT_VIEWPORT: SimulationViewport = { scale: 1, x: 0, y: 0 };

export function cloneSimulationState(pack: SimulationPack): SimulationState {
  const nodes = arrangeSimulationNodes(pack.devices.map((node) => ({
    ...node,
    ports: node.ports.map((port) => ({ ...port })),
  })));
  return {
    nodes,
    links: (pack.links ?? []).map((link) => ({
      ...link,
      source: { ...link.source },
      target: { ...link.target },
    })),
    viewport: { ...DEFAULT_VIEWPORT },
  };
}

/** Reset only the visual graph.  Cables and checklist progress stay intact. */
export function resetSimulationLayout(state: SimulationState) {
  return {
    ...state,
    nodes: arrangeSimulationNodes(state.nodes),
    viewport: { ...DEFAULT_VIEWPORT },
  };
}

export function endpointKey(endpoint: SimulationEndpoint) {
  return `${endpoint.deviceId}:${endpoint.portId}`;
}

export function findSimulationNode(state: SimulationState, id: string) {
  return state.nodes.find((node) => node.id === id);
}

export function findSimulationPort(state: SimulationState, endpoint: SimulationEndpoint) {
  const node = findSimulationNode(state, endpoint.deviceId);
  return node?.ports.find((port) => port.id === endpoint.portId);
}

export function isSameEndpoint(left: SimulationEndpoint, right: SimulationEndpoint) {
  return left.deviceId === right.deviceId && left.portId === right.portId;
}

function isEndpointUsed(state: SimulationState, endpoint: SimulationEndpoint) {
  const port = findSimulationPort(state, endpoint);
  if (port?.allowMultipleLinks) return false;
  return state.links.some((link) => isSameEndpoint(link.source, endpoint) || isSameEndpoint(link.target, endpoint));
}

function portKind(state: SimulationState, endpoint: SimulationEndpoint) {
  return findSimulationPort(state, endpoint)?.kind ?? "ethernet";
}

/**
 * Validate before mutating. An error is deliberately human-readable because
 * it is shown directly beside the topology in the learning workspace.
 */
export function validateSimulationConnection(state: SimulationState, source: SimulationEndpoint, target: SimulationEndpoint) {
  if (isSameEndpoint(source, target)) return "A port cannot be connected to itself.";
  if (!findSimulationNode(state, source.deviceId) || !findSimulationNode(state, target.deviceId)) return "Both devices must exist in this lab.";
  if (!findSimulationPort(state, source) || !findSimulationPort(state, target)) return "Select two published ports from the topology.";
  if (source.deviceId === target.deviceId) return "Connect ports on two different devices.";
  if (isEndpointUsed(state, source) || isEndpointUsed(state, target)) return "One of the selected ports already has a cable. Disconnect it first.";

  const sourceKind = portKind(state, source);
  const targetKind = portKind(state, target);
  if (sourceKind === "console" || targetKind === "console") return "Console ports are for terminal access, not data links.";
  if (sourceKind === "wireless" || targetKind === "wireless") return "Wireless association is configured in the lab steps; it is not a physical cable.";
  if (sourceKind !== targetKind && sourceKind !== "ethernet" && targetKind !== "ethernet") return "Those port types are not compatible.";
  if (state.links.some((link) => (isSameEndpoint(link.source, source) && isSameEndpoint(link.target, target)) || (isSameEndpoint(link.source, target) && isSameEndpoint(link.target, source)))) return "This cable already exists.";
  return null;
}

export function connectSimulationPorts(state: SimulationState, source: SimulationEndpoint, target: SimulationEndpoint, id = `link-${Date.now()}`): SimulationConnectionResult {
  const reason = validateSimulationConnection(state, source, target);
  if (reason) return { ok: false, reason };
  const link: SimulationLink = { id, source: { ...source }, target: { ...target }, status: "up" };
  return { ok: true, link, state: { ...state, links: [...state.links, link] } };
}

export function disconnectSimulationLink(state: SimulationState, linkId: string): SimulationState {
  return { ...state, links: state.links.filter((link) => link.id !== linkId) };
}

export function moveSimulationNode(state: SimulationState, nodeId: string, x: number, y: number): SimulationState {
  return {
    ...state,
    nodes: state.nodes.map((node) => node.id === nodeId ? { ...node, x, y } : node),
  };
}

export function clampSimulationViewport(viewport: SimulationViewport): SimulationViewport {
  return {
    scale: Math.min(3, Math.max(0.2, viewport.scale)),
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
  };
}

/** Keep the same world point beneath the zoom anchor. Translation is unbounded. */
export function zoomSimulationViewport(viewport: SimulationViewport, scale: number, anchor: { x: number; y: number }) {
  const nextScale = clampSimulationViewport({ ...viewport, scale }).scale;
  const ratio = nextScale / viewport.scale;
  return { scale: nextScale, x: anchor.x - (anchor.x - viewport.x) * ratio, y: anchor.y - (anchor.y - viewport.y) * ratio };
}

export function fitSimulationViewport(nodes: SimulationNode[], width: number, height: number): SimulationViewport {
  if (!nodes.length) return { scale: 1, x: 0, y: 0 };
  const left = Math.min(...nodes.map((node) => node.x - 230));
  const right = Math.max(...nodes.map((node) => node.x + 230));
  const top = Math.min(...nodes.map((node) => node.y - 70));
  const bottom = Math.max(...nodes.map((node) => node.y + 235 + Math.floor((node.ports.length - 1) / 4) * 18));
  const scale = Math.min(3, Math.max(.2, Math.min(width / (right - left), height / (bottom - top))));
  return { scale, x: width / 2 - (left + right) / 2 * scale, y: height / 2 - (top + bottom) / 2 * scale };
}

export function updateSimulationViewport(state: SimulationState, viewport: Partial<SimulationViewport>): SimulationState {
  return { ...state, viewport: clampSimulationViewport({ ...state.viewport, ...viewport }) };
}

