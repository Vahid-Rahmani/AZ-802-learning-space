/**
 * Generic topology primitives for the CCNA simulation workspace.
 *
 * The content layer can map any published lab to this small contract without
 * teaching the UI about a particular lab, device model, or vendor diagram.
 * The functions in this module are intentionally pure so a future server-side
 * grader can reuse the same connection rules.
 */

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

export type SimulationScenario = {
  role?: string;
  context: string;
  objective: string;
  requirement?: string;
  prerequisites?: string[];
};

export type SimulationTerminalPack = {
  hostname?: string;
  prompt?: string;
  intro?: string[];
  /** Optional deterministic command transcript for the generic workspace. */
  commands?: Record<string, string[]>;
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
  terminal?: SimulationTerminalPack;
  references?: Array<{ title: string; url: string }>;
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

export type SimulationConnectionResult =
  | { ok: true; state: SimulationState; link: SimulationLink }
  | { ok: false; reason: string };

const DEFAULT_VIEWPORT: SimulationViewport = { scale: 1, x: 0, y: 0 };

export function cloneSimulationState(pack: SimulationPack): SimulationState {
  return {
    nodes: pack.devices.map((node) => ({
      ...node,
      ports: node.ports.map((port) => ({ ...port })),
    })),
    links: (pack.links ?? []).map((link) => ({
      ...link,
      source: { ...link.source },
      target: { ...link.target },
    })),
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
    scale: Math.min(2, Math.max(0.65, viewport.scale)),
    x: Math.min(260, Math.max(-260, viewport.x)),
    y: Math.min(180, Math.max(-180, viewport.y)),
  };
}

export function updateSimulationViewport(state: SimulationState, viewport: Partial<SimulationViewport>): SimulationState {
  return { ...state, viewport: clampSimulationViewport({ ...state.viewport, ...viewport }) };
}

