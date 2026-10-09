"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { createLabSession, IosSession } from "@/lib/ccna-sim/session";
import { findInterface, portLinkStatus, type SimCableState, type SimInterfaceKind, type SimStaticRoute } from "@/lib/ccna-sim/device";
import { simulationCableCurve } from "@/lib/ccna-sim/cable-geometry";
import { simulationPortPoint as portPoint, simulationEndpointPoint as endpointPoint } from "@/lib/ccna-sim/port-geometry";
import { DeviceGlyph } from "./ccna-device-art";
import { copyManagement, type SimManagement } from "@/lib/ccna-sim/management";
import { checkedStageResults } from "@/lib/ccna-sim/guidance";
import { simulatorText } from "@/lib/ccna-sim/language";
import { buildLabModel } from "@/lib/ccna-sim/lab";
import type { LabNetwork } from "@/lib/ccna-sim/lab-network";
import type { SimMode } from "@/lib/ccna-sim/tokens";
import {
  cloneSimulationState,
  connectSimulationPorts,
  disconnectSimulationLink,
  endpointKey,
  findSimulationPort,
  arrangeSimulationNodes,
  simulationCanvasHeight,
  zoomSimulationViewport,
  fitSimulationViewport,
  moveSimulationNode,
  type SimulationEndpoint,
  type SimulationLink,
  type SimulationNode,
  type SimulationPack,
  type SimulationStage,
  type SimulationState,
  updateSimulationViewport,
} from "@/lib/ccna-sim/topology";

type WorkspacePanel = "scenario" | "topology" | "terminal" | "reference";
type Notice = { kind: "info" | "success" | "error"; text: string };
type TerminalEntry = { input: string; output: string[]; promptBefore: string; promptAfter: string; mode: SimMode; matched?: string | null };
type PersistedTerminalSession = {
  kind: SimulationNode["kind"];
  hostname: string;
  mode: SimMode;
  closed: boolean;
  history: string[];
  draft?: string;
  entries: TerminalEntry[];
  device: {
    id?: string;
    hostname: string;
    role?: "switch" | "router" | "host";
    gateway?: string | null;
    ipv6Gateway?: string | null;
    ipv6Routing?: boolean;
    management?: SimManagement;
    staticRoutes?: SimStaticRoute[];
    vlans: Array<[number, { id: number; name: string }]>;
    interfaces: Array<{
      name: string;
      kind: "ethernet" | "svi" | "subinterface";
      mode: "access" | "trunk" | "routed";
      accessVlan: number;
      nativeVlan: number;
      allowedVlans: number[] | "all";
      description: string;
      modeExplicit: boolean;
      adminUp: boolean;
      address: { ip: string; mask: string } | null;
      ipv6?: { address: string; prefix: number } | null;
      dot1q?: number;
      parent?: string | null;
    }>;
  };
  selected: { interfaces: string[]; vlan: number | null; vty?: number[] };
  config: { startup: string[] | null };
};
type TerminalRuntime = {
  nodeId: string;
  kind: SimulationNode["kind"];
  session: IosSession;
  entries: TerminalEntry[];
  history: string[];
  draft: string;
  historyCursor: number;
  draftBeforeHistory: string;
  /** True when a saved console came from an older device model and only its transcript was kept. */
  migrated: boolean;
};
type TerminalView = {
  inputHidden?: boolean;
  kind: SimulationNode["kind"];
  hostname: string;
  prompt: string;
  mode: SimMode;
  closed: boolean;
  entries: TerminalEntry[];
  history: string[];
  draft: string;
  /** The device state behind this console, which is what the lab's checks read. */
  device: PersistedTerminalSession["device"];
  startup: string[] | null;
};
type WorkspaceSnapshot = {
  version: 1 | 2 | 3 | 4 | 5;
  /**
   * Which console model produced the saved devices. Version 1 snapshots predate
   * `createLabSession`: their devices were hand-built with every port up, so a router's port could
   * look enabled before the learner enabled it. Restoring one would restore that false credit, so a
   * session without the current marker starts from the pack's real device defaults instead.
   */
  deviceModel?: number;
  layoutVersion?: 2 | 3 | 4;
  state: SimulationState;
  checkedItems: string[];
  completedStages?: string[];
  activeDeviceId?: string | null;
  sessions?: Record<string, PersistedTerminalSession>;
  /** Version 1 compatibility: the old single terminal transcript is assigned to the first device. */
  terminalEntries?: Array<{ input: string; output: string[] }>;
};

export type CcnaSimulationWorkspaceProps = {
  pack: SimulationPack;
  /** Defaults to the lab id. Use a user-scoped key when account syncing is available. */
  persistKey?: string;
  className?: string;
  onComplete?: (packId: string) => void;
  /** Integration hook for a future per-device console dock. */
  onDeviceSelect?: (node: SimulationNode) => void;
};

const CANVAS_WIDTH = 760;
const NODE_WIDTH = 210;

const DEVICE_META: Record<SimulationNode["kind"], { label: string; tone: string }> = {
  router: { label: "Router", tone: "router" },
  switch: { label: "Switch", tone: "switch" },
  pc: { label: "PC", tone: "pc" },
  server: { label: "Server", tone: "server" },
  "access-point": { label: "Access point", tone: "access-point" },
  firewall: { label: "Firewall", tone: "firewall" },
  cloud: { label: "Cloud", tone: "cloud" },
};
const DEVICE_KINDS = Object.keys(DEVICE_META) as Array<SimulationNode["kind"]>;


function endpointLabel(state: SimulationState, endpoint: SimulationEndpoint) {
  const node = state.nodes.find((candidate) => candidate.id === endpoint.deviceId);
  const port = findSimulationPort(state, endpoint);
  return `${node?.label ?? endpoint.deviceId} · ${port?.label ?? endpoint.portId}`;
}

function linkPortLabel(state: SimulationState, link: SimulationLink) {
  const source = findSimulationPort(state, link.source)?.label ?? link.source.portId;
  const target = findSimulationPort(state, link.target)?.label ?? link.target.portId;
  return link.label ? `${link.label} · ${source} ↔ ${target}` : `${source} ↔ ${target}`;
}

function statusColor(status: SimulationNode["status"] = "healthy") {
  if (status === "fault") return "#fb7185";
  if (status === "warning") return "#fbbf24";
  return "#4ade80";
}

function portMode(kind: string | undefined) {
  if (kind === "serial") return "routed";
  if (kind === "console") return "console";
  if (kind === "wireless") return "wireless";
  return "access";
}

/**
 * The interface table prints the same word `show interfaces status` prints (`portLinkStatus`), from the
 * same cable state, so the screen, the console and a graded check can never describe one port
 * differently. Only the colour is this panel's own.
 */
const CABLE_TONES: Record<string, "connected" | "disabled" | "down" | "fault"> = {
  connected: "connected",
  disabled: "disabled",
  "err-disabled": "fault",
  notconnect: "down",
};

function portStateLabel(port: { kind: SimInterfaceKind; adminUp: boolean }, cable: SimCableState) {
  const label = portLinkStatus(port, cable);
  return { label, tone: CABLE_TONES[label] ?? "disabled" };
}

function preferredDevice(nodes: SimulationNode[]) {
  return nodes.find((node) => node.kind === "switch" && node.role)
    ?? nodes.find((node) => Boolean(node.role))
    ?? nodes[0]
    ?? null;
}

function isSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<WorkspaceSnapshot>;
  return (snapshot.version === 1 || snapshot.version === 2 || snapshot.version === 3 || snapshot.version === 4 || snapshot.version === 5) && Boolean(snapshot.state && Array.isArray(snapshot.state.nodes) && Array.isArray(snapshot.state.links));
}

/** The console model version this build can restore, see `WorkspaceSnapshot.deviceModel`. */
const DEVICE_MODEL_VERSION = 2;

/**
 * Whether a saved console still describes the console this lab publishes today. The published node's
 * role is the contract — the saved copy of it only exists to restore what the learner had — so a
 * save whose device role no longer matches is migrated instead of restored.
 */
function savedConsoleMatchesPublishedModel(node: SimulationNode, saved?: PersistedTerminalSession) {
  if (!saved?.device) return false;
  const publishedRole = node.role ?? "host";
  return (saved.device.role ?? publishedRole) === publishedRole;
}

function hasCurrentDeviceModel(snapshot: WorkspaceSnapshot) {
  return snapshot.deviceModel === DEVICE_MODEL_VERSION;
}

/**
 * A saved session must not silently replace a newly published topology. Older
 * sessions may contain the former three-node starter graph, while a lab can
 * now have a full router/switch/server topology. Restore only when device
 * kinds, ports and link ids still match; otherwise start from the current
 * pack while retaining checklist progress.
 */
function hasCompatibleTopology(snapshot: WorkspaceSnapshot, pack: SimulationPack) {
  if (snapshot.state.nodes.length !== pack.devices.length) return false;
  const expectedNodes = new Map(pack.devices.map((node) => [node.id, node]));
  const nodesMatch = snapshot.state.nodes.every((node) => {
    const expected = expectedNodes.get(node.id);
    if (!expected || expected.kind !== node.kind) return false;
    const expectedPorts = expected.ports.map((port) => port.id).sort().join("|");
    const savedPorts = node.ports.map((port) => port.id).sort().join("|");
    return expectedPorts === savedPorts;
  });
  if (!nodesMatch) return false;
  // The cables are the learner's as much as the lab's. They may re-plug a published cable or add one
  // of their own, and neither may cost them the session: the earlier rule demanded that every saved
  // cable be one the pack publishes, so a reconnected or added cable failed this test and Resume
  // silently discarded the whole lab. What still has to hold is that every saved cable joins two ports
  // this topology really has, so a stale graph can never be restored over a newly published one.
  const portsByNode = new Map(snapshot.state.nodes.map((node) => [node.id, new Set(node.ports.map((port) => port.id))]));
  return snapshot.state.links.every((link) =>
    Boolean(portsByNode.get(link.source.deviceId)?.has(link.source.portId))
    && Boolean(portsByNode.get(link.target.deviceId)?.has(link.target.portId)));
}

/**
 * The id a cable keeps from the moment it is plugged in.
 *
 * A published cable keeps the id the pack gives it, and a cable the learner adds gets an id derived
 * from its two endpoints instead of a timestamp. The id travels through saving and restoration, so a
 * stable one is what lets a reconnected or added cable come back on Resume; a timestamped id changed
 * on every save and made the two ends of one cable look like different cables across sessions.
 */
function linkIdFor(pack: SimulationPack, left: SimulationEndpoint, right: SimulationEndpoint) {
  const key = (endpoint: SimulationEndpoint) => `${endpoint.deviceId}:${endpoint.portId}`;
  const published = (pack.links ?? []).find((link) =>
    (key(link.source) === key(left) && key(link.target) === key(right))
    || (key(link.source) === key(right) && key(link.target) === key(left)));
  return published?.id ?? `cable-${[key(left), key(right)].sort().join("--")}`;
}

const simModeLabels: Record<SimMode, string> = {
  user: "user",
  privileged: "privileged",
  global: "config",
  interface: "config-if",
  vlan: "config-vlan",
  line: "config-line",
};

const isSimMode = (value: unknown): value is SimMode => ["user", "privileged", "global", "interface", "vlan", "line"].includes(value as SimMode);

function createTerminalRuntime(node: SimulationNode, saved?: PersistedTerminalSession): TerminalRuntime {
  // One console builder for the browser and for validate:ccna-sim, so the device a graded step reads
  // is always the device on screen: the node's published ports with its role's real defaults.
  const session = createLabSession(node, saved?.hostname);
  const savedDevice = saved?.device;
  /**
   * A saved console is restored only when it still describes the device this lab publishes. A save
   * from an older model keeps its transcript and its draft, which is the learner's own work, and
   * starts its device settings from the current defaults — so an obsolete save cannot credit a step
   * the learner never did, and nothing they typed is silently thrown away.
   */
  const restoreDeviceState = savedConsoleMatchesPublishedModel(node, saved)
    && Array.isArray(savedDevice?.interfaces) && Array.isArray(savedDevice?.vlans)
    && (savedDevice!.interfaces.length > 0 || savedDevice!.vlans.length > 0);
  if (restoreDeviceState && savedDevice) {
    session.state.device = {
      id: saved.device.id ?? node.id,
      hostname: saved.device.hostname || saved.hostname || node.label,
      role: saved.device.role ?? node.role ?? "switch",
      gateway: saved.device.gateway ?? null,
      ipv6Gateway: saved.device.ipv6Gateway ?? null,
      ipv6Routing: saved.device.ipv6Routing === true,
      management: copyManagement(saved.device.management),
      staticRoutes: saved.device.staticRoutes?.map((route) => ({ ...route })),
      vlans: new Map(saved.device.vlans.map(([id, vlan]) => [Number(id), { id: Number(vlan.id), name: vlan.name }])),
      interfaces: saved.device.interfaces.map((port) => ({
        ...port,
        allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all",
        address: port.address ? { ...port.address } : null,
        ipv6: port.ipv6 ? { ...port.ipv6 } : null,
        dot1q: port.dot1q ?? 0,
        parent: port.parent ?? null,
      })),
    };
    session.state.selected = {
      interfaces: (saved.selected?.interfaces ?? []).map((name) => findInterface(session.state.device, name)).filter((port): port is NonNullable<ReturnType<typeof findInterface>> => Boolean(port)),
      vlan: typeof saved.selected?.vlan === "number" ? saved.selected.vlan : null,
      vty: (saved.selected?.vty ?? []).filter((id) => Number.isInteger(id) && id >= 0 && id < 16),
    };
    session.state.config = { startup: saved.config?.startup ? [...saved.config.startup] : null };
    session.state.mode = isSimMode(saved?.mode) ? saved.mode : "user";
  }
  session.state.closed = saved?.closed === true && restoreDeviceState;
  const entries = (saved?.entries ?? []).map((entry) => ({
    input: entry.input,
    output: [...entry.output],
    promptBefore: entry.promptBefore || session.prompt,
    promptAfter: entry.promptAfter || session.prompt,
    mode: isSimMode(entry.mode) ? entry.mode : session.state.mode,
    matched: typeof entry.matched === "string" ? entry.matched : null,
  }));
  return {
    nodeId: node.id,
    kind: node.kind,
    session,
    entries,
    history: [...(saved?.history ?? entries.map((entry) => entry.input))],
    draft: saved?.draft ?? "",
    historyCursor: -1,
    draftBeforeHistory: "",
    migrated: Boolean(savedDevice) && !restoreDeviceState,
  };
}

function serializeTerminalRuntime(runtime: TerminalRuntime): PersistedTerminalSession {
  const device = runtime.session.state.device;
  return {
    kind: runtime.kind,
    hostname: device.hostname,
    mode: runtime.session.state.mode,
    closed: runtime.session.state.closed,
    history: [...runtime.history],
    draft: runtime.session.inputHidden ? "" : runtime.draft,
    entries: runtime.entries.map((entry) => ({ ...entry, output: [...entry.output] })),
    device: {
      id: device.id,
      hostname: device.hostname,
      role: device.role,
      gateway: device.gateway,
      ipv6Gateway: device.ipv6Gateway,
      ipv6Routing: device.ipv6Routing,
      management: copyManagement(device.management),
      staticRoutes: device.staticRoutes?.map((route) => ({ ...route })),
      vlans: [...device.vlans.entries()].map(([id, vlan]) => [id, { ...vlan }]),
      interfaces: device.interfaces.map((port) => ({ ...port, allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all", address: port.address ? { ...port.address } : null, ipv6: port.ipv6 ? { ...port.ipv6 } : null })),
    },
    selected: { interfaces: runtime.session.state.selected.interfaces.map((port) => port.name), vlan: runtime.session.state.selected.vlan, vty: [...(runtime.session.state.selected.vty ?? [])] },
    config: { startup: runtime.session.state.config.startup ? [...runtime.session.state.config.startup] : null },
  };
}

function terminalView(runtime: TerminalRuntime): TerminalView {
  const device = runtime.session.state.device;
  return {
    kind: runtime.kind,
    hostname: device.hostname,
    prompt: runtime.session.prompt,
    mode: runtime.session.currentMode,
    inputHidden: runtime.session.inputHidden,
    closed: runtime.session.state.closed,
    entries: runtime.entries.map((entry) => ({ ...entry, output: [...entry.output] })),
    history: [...runtime.history],
    draft: runtime.draft,
    startup: runtime.session.state.config.startup ? [...runtime.session.state.config.startup] : null,
    device: {
      id: device.id,
      hostname: device.hostname,
      role: device.role,
      gateway: device.gateway,
      ipv6Gateway: device.ipv6Gateway,
      ipv6Routing: device.ipv6Routing,
      management: copyManagement(device.management),
      staticRoutes: device.staticRoutes?.map((route) => ({ ...route })),
      vlans: [...device.vlans.entries()].map(([id, vlan]) => [id, { ...vlan }]),
      interfaces: device.interfaces.map((port) => ({ ...port, allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all", address: port.address ? { ...port.address } : null, ipv6: port.ipv6 ? { ...port.ipv6 } : null })),
    },
  };
}

function defaultTerminalView(node: SimulationNode): TerminalView {
  return {
    kind: node.kind, hostname: node.label, prompt: `${node.label}>`, mode: "user", closed: false,
    entries: [], history: [], draft: "", startup: null,
    device: { hostname: node.label, role: node.role ?? "switch", gateway: null, ipv6Gateway: null, ipv6Routing: false, vlans: [[1, { id: 1, name: "default" }]], interfaces: [] },
  };
}

/**
 * Which labs get a real console and which do not. A node whose real control surface is a vendor GUI
 * (a wireless access point, a controller, a cloud) has no role, and this workspace says so instead of
 * inventing an IOS console for it. There is deliberately no canned transcript path left: a device
 * either runs the engine the graded steps read, or it has no console at all.
 */
function hasConsole(node: SimulationNode) {
  return Boolean(node.role);
}

/**
 * The console session a node starts with, which is the one builder the browser and the headless
 * validator share. A node whose real control surface is a vendor GUI has no console role; it is
 * still modelled as a passive endpoint so its cable and its VLAN are visible to the same model that
 * answers a ping, without inventing an IOS device that the learner could configure.
 */
function consoleSessionFor(node: SimulationNode) {
  return createLabSession(hasConsole(node) ? node : { ...node, role: "host" });
}

/**
 * The live lab model every check is graded against, and the only source the interface table, the
 * canvas and a graded predicate read. It is built from the consoles the learner is actually using,
 * so it always describes the current VLANs, port modes, subinterfaces, addresses and saved
 * configurations — for every lab, whether or not that lab has authored objectives yet.
 */
function buildNetworkSnapshot(state: SimulationState, views: Record<string, TerminalView>): LabNetwork {
  const devices = state.nodes.map((node) => {
    const view = views[node.id];
    if (!view) {
      // A node whose console has not been opened yet still has to report the state its console would
      // start with, or a graded step could read a hand-built default instead of the real device.
      const fresh = consoleSessionFor(node).state.device;
      return { id: node.id, label: node.label, role: fresh.role, state: fresh, startup: null };
    }
    const snapshot = view.device;
    const device = {
      id: snapshot.id ?? node.id,
      hostname: snapshot.hostname || node.label,
      role: snapshot.role ?? node.role ?? "host",
      gateway: snapshot.gateway ?? null,
      ipv6Gateway: snapshot.ipv6Gateway ?? null,
      ipv6Routing: snapshot.ipv6Routing === true,
      management: copyManagement(snapshot.management),
      staticRoutes: snapshot.staticRoutes?.map((route) => ({ ...route })),
      vlans: new Map(snapshot.vlans.map(([id, vlan]) => [Number(id), { id: Number(vlan.id), name: vlan.name }])),
      interfaces: snapshot.interfaces.map((port) => ({
        ...port,
        allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all" as const,
        address: port.address ? { ...port.address } : null,
        ipv6: port.ipv6 ? { ...port.ipv6 } : null,
        dot1q: port.dot1q ?? 0,
        parent: port.parent ?? null,
      })),
    };
    return { id: node.id, label: node.label, role: device.role, state: device, startup: view.startup ? [...view.startup] : null };
  });
  const links = state.links.map((link) => ({
    id: link.id,
    a: { deviceId: link.source.deviceId, port: findSimulationPort(state, link.source)?.label ?? link.source.portId },
    b: { deviceId: link.target.deviceId, port: findSimulationPort(state, link.target)?.label ?? link.target.portId },
    status: link.status,
  }));
  return { devices, links };
}


export function CcnaSimulationWorkspace({ pack, persistKey, className, onComplete, onDeviceSelect }: CcnaSimulationWorkspaceProps) {
  // Reserve room below the last row for the outward cable curves, not a second box.
  const CANVAS_HEIGHT = simulationCanvasHeight(pack.devices) + 160;
  const storageKey = `ccna-simulation:${persistKey ?? pack.id}`;
  const [state, setState] = useState<SimulationState>(() => cloneSimulationState(pack));
  const [selectedPort, setSelectedPort] = useState<SimulationEndpoint | null>(null);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("topology");
  const [notice, setNotice] = useState<Notice>({ kind: "info", text: "Select a port, then select a port on another device to connect a cable." });
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => new Set());
  const [terminalDraft, setTerminalDraft] = useState("");
  const [terminalCursor, setTerminalCursor] = useState(0);
  const [terminalViews, setTerminalViews] = useState<Record<string, TerminalView>>({});
  const [hydrated, setHydrated] = useState(false);
  const hydratedKey = useRef<string | null>(null);
  const terminalSessions = useRef<Record<string, TerminalRuntime>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const terminalSurfaceRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalComposing = useRef(false);
  const latestRef = useRef({ state, views: terminalViews });
  const dragRef = useRef<{ type: "node" | "pan"; id?: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const completionNotified = useRef(false);

  const guidedStages = useMemo(() => pack.stages ?? [], [pack.stages]);
  // A step that cannot be evaluated is shown to the learner but never counted as work, and no step is
  // ever credited from the transcript: only a predicate over live device state can complete one.
  const requiredStages = useMemo(() => guidedStages.filter((stage) => !stage.ungraded), [guidedStages]);
  const labNetwork = useMemo(() => buildNetworkSnapshot(state, terminalViews), [state, terminalViews]);
  const labModel = useMemo(() => buildLabModel(labNetwork), [labNetwork]);
  const checkResults = useMemo(() => checkedStageResults(guidedStages, labModel), [guidedStages, labModel]);
  const completedStageIds = useMemo(() => {
    const done = new Set<string>();
    for (const stage of guidedStages) if (stage.check && checkResults.get(stage.id)?.ok) done.add(stage.id);
    return done;
  }, [checkResults, guidedStages]);
  const requiredCount = requiredStages.length;
  const completedRequired = requiredStages.filter((stage) => completedStageIds.has(stage.id)).length;
  const progressPercent = requiredStages.length ? Math.floor(completedRequired / requiredStages.length * 100) : 0;
  const nextStageIndex = requiredStages.findIndex((stage) => !completedStageIds.has(stage.id));
  const activeStage = nextStageIndex >= 0 ? requiredStages[nextStageIndex] : null;
  const activeStageNumber = nextStageIndex + 1;
  const activeOutcome = activeStage ? checkResults.get(activeStage.id) ?? null : null;
  const connectedCount = state.links.length;
  /** The cable state of one named port on one device, or null when nothing is plugged into it. */
  const cableStatusFor = (nodeId: string, portName: string) => {
    const endpoint = state.links.flatMap((link) => [link.source, link.target])
      .find((end) => end.deviceId === nodeId && findSimulationPort(state, end)?.label === portName);
    if (!endpoint) return null;
    const link = state.links.find((candidate) => endpointKey(candidate.source) === endpointKey(endpoint) || endpointKey(candidate.target) === endpointKey(endpoint));
    return link?.status ?? null;
  };
  /** Only a device the lab gives a console role can be typed into; the others are still on the
   * canvas as cabling and are labelled as GUI devices. */
  const consoleNodes = useMemo(() => state.nodes.filter(hasConsole), [state.nodes]);
  /**
   * The state word of one published port, from its real cable and the port's administrative state.
   * The canvas dot, the interface table and `show interfaces status` all answer with this one word,
   * so a port can never be "connected" on screen while its own console says it is down.
   */
  const portState = (nodeId: string, portLabel: string) => {
    const device = labNetwork.devices.find((candidate) => candidate.id === nodeId);
    const port = device?.state.interfaces.find((candidate) => candidate.name.toLowerCase() === portLabel.toLowerCase());
    const cable = cableStatusFor(nodeId, portLabel);
    if (!port) return cable ? { label: "connected", tone: "connected" as const } : { label: "disabled", tone: "disabled" as const };
    return portStateLabel(port, cable);
  };
  const selectedNode = activeDeviceId;
  const effectiveActiveDeviceId = activeDeviceId && state.nodes.some((node) => node.id === activeDeviceId && hasConsole(node))
    ? activeDeviceId
    : preferredDevice(state.nodes)?.id ?? null;
  const selectedNodeData = state.nodes.find((node) => node.id === effectiveActiveDeviceId) ?? null;
  const stageDevice = state.nodes.find((node) => node.id === activeStage?.deviceId);
  const isStageDeviceSelected = !stageDevice || stageDevice.id === effectiveActiveDeviceId;
  const stageIsChecked = Boolean(activeStage?.check);
  const liveDevice = labNetwork.devices.find((device) => device.id === selectedNodeData?.id) ?? null;
  /**
   * The only console factory in this component. Every console gets the live lab attached, because a
   * host console answers `ping` from the current topology and configuration rather than from a canned
   * reply (`getTerminalRuntime` alone was not enough: consoles built during hydration and reset never
   * received the lab, so a correct lab could answer a ping with "network not attached").
   */
  const makeTerminalRuntime = useCallback((node: SimulationNode, saved?: PersistedTerminalSession) => {
    const runtime = createTerminalRuntime(node, saved);
    runtime.session.state.network = () => buildNetworkSnapshot(latestRef.current.state, latestRef.current.views);
    runtime.session.remoteSessionFor = (id) => {
      const targetNode = latestRef.current.state.nodes.find((candidate) => candidate.id === id && hasConsole(candidate));
      if (!targetNode) return null;
      const target = terminalSessions.current[id] ?? createTerminalRuntime(targetNode);
      terminalSessions.current[id] = target;
      target.session.state.network = runtime.session.state.network;
      const remote = new IosSession(target.session.state.device.hostname, target.session.state.device.role);
      remote.state.device = target.session.state.device;
      remote.state.config = target.session.state.config;
      remote.state.network = runtime.session.state.network;
      remote.remoteSessionFor = runtime.session.remoteSessionFor;
      return remote;
    };
    return runtime;
  }, []);
  const getTerminalRuntime = useCallback((node: SimulationNode) => {
    const existing = terminalSessions.current[node.id];
    if (existing) return existing;
    const runtime = makeTerminalRuntime(node);
    terminalSessions.current[node.id] = runtime;
    return runtime;
  }, [makeTerminalRuntime]);
  const activeView = selectedNodeData && hasConsole(selectedNodeData)
    ? terminalViews[selectedNodeData.id] ?? defaultTerminalView(selectedNodeData)
    : null;

  useEffect(() => {
    hydratedKey.current = null;
    terminalSessions.current = {};
    let snapshot: WorkspaceSnapshot | null = null;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isSnapshot(parsed)) snapshot = parsed;
      }
    } catch {
      // A private window or invalid local data should not prevent the lab opening.
    }
    const compatibleSnapshot = snapshot && hasCurrentDeviceModel(snapshot) && hasCompatibleTopology(snapshot, pack) ? snapshot : null;
    const timer = window.setTimeout(() => {
      if (compatibleSnapshot) {
        const restoredState = compatibleSnapshot.layoutVersion === 4
          ? compatibleSnapshot.state
          : {
            ...compatibleSnapshot.state,
            nodes: arrangeSimulationNodes(compatibleSnapshot.state.nodes),
            viewport: { scale: 1, x: 0, y: 0 },
          };
        setState(restoredState);
        setCheckedItems(new Set(compatibleSnapshot.checkedItems ?? []));
        const firstDevice = restoredState.nodes.find(hasConsole);
        const savedSessions = compatibleSnapshot.sessions ?? {};
        terminalSessions.current = Object.fromEntries(restoredState.nodes.filter(hasConsole).map((node) => {
          const saved = savedSessions[node.id];
          if (saved) return [node.id, makeTerminalRuntime(node, saved)];
          return [node.id, makeTerminalRuntime(node, node.id === firstDevice?.id && compatibleSnapshot.terminalEntries ? {
            kind: node.kind,
            hostname: node.label,
            mode: "user",
            closed: false,
            history: compatibleSnapshot.terminalEntries.map((entry) => entry.input),
            entries: compatibleSnapshot.terminalEntries.map((entry) => ({ ...entry, promptBefore: `${node.label}>`, promptAfter: `${node.label}>`, mode: "user" })),
            device: { hostname: node.label, vlans: [], interfaces: [] },
            selected: { interfaces: [], vlan: null },
            config: { startup: null },
          } : undefined)];
        }));
        setTerminalViews(Object.fromEntries(restoredState.nodes.filter(hasConsole).map((node) => [node.id, terminalView(terminalSessions.current[node.id])] )));
        const preferred = preferredDevice(restoredState.nodes);
        const restoredActiveId = compatibleSnapshot.activeDeviceId
          && restoredState.nodes.some((node) => node.id === compatibleSnapshot?.activeDeviceId && hasConsole(node))
          ? compatibleSnapshot.activeDeviceId
          : preferred?.id ?? null;
        setActiveDeviceId(restoredActiveId);
        const restoredDraft = restoredActiveId ? terminalSessions.current[restoredActiveId]?.draft ?? "" : "";
        setTerminalDraft(restoredDraft);
        setTerminalCursor(restoredDraft.length);
        const migratedLabels = restoredState.nodes.filter((node) => terminalSessions.current[node.id]?.migrated).map((node) => node.label);
        if (migratedLabels.length) {
          setNotice({ kind: "info", text: `This lab's console model changed since your last visit, so ${migratedLabels.join(", ")} kept the console history and ${migratedLabels.length === 1 ? "its" : "their"} device settings were rebuilt from this lab's current defaults. Nothing is credited automatically: run the lab's own steps again.` });
        }
      } else {
        // A saved session whose topology no longer matches this lab keeps its checkpoint progress and
        // starts its consoles from the current topology, and the learner is told why.
        setState(cloneSimulationState(pack));
        setCheckedItems(new Set(snapshot?.checkedItems ?? []));
        const defaults = Object.fromEntries(pack.devices.filter(hasConsole).map((node) => {
          const runtime = makeTerminalRuntime(node);
          terminalSessions.current[node.id] = runtime;
          return [node.id, terminalView(runtime)];
        }));
        setTerminalViews(defaults);
        setActiveDeviceId(preferredDevice(pack.devices)?.id ?? null);
        if (snapshot) {
          setNotice({ kind: "info", text: "A saved session from a previous version of this lab's topology was found. Saved checkpoints were kept and the consoles start from the topology this lab publishes today." });
        }
      }
      hydratedKey.current = storageKey;
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [makeTerminalRuntime, pack, storageKey]);

  useEffect(() => {
    if (!hydrated || hydratedKey.current !== storageKey) return;
    const sessions = Object.fromEntries(consoleNodes.map((node) => [node.id, serializeTerminalRuntime(terminalSessions.current[node.id] ?? getTerminalRuntime(node))]));
    const snapshot: WorkspaceSnapshot = {
      version: 5,
      deviceModel: DEVICE_MODEL_VERSION,
      layoutVersion: 4,
      state,
      checkedItems: [...checkedItems],
      completedStages: [...completedStageIds],
      activeDeviceId,
      sessions,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Persistence is best-effort; the current session remains usable.
    }
  }, [activeDeviceId, checkedItems, completedStageIds, consoleNodes, getTerminalRuntime, hydrated, state, storageKey, terminalViews]);

  useEffect(() => {
    latestRef.current = { state, views: terminalViews };
  }, [state, terminalViews]);

  useEffect(() => {
    const screen = terminalSurfaceRef.current;
    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [terminalDraft, terminalViews, activePanel]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      workspaceRef.current?.style.setProperty("--simulation-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      const screen = terminalSurfaceRef.current;
      if (screen && document.activeElement === terminalInputRef.current) screen.scrollTop = screen.scrollHeight;
    };
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    if (!requiredCount || completedRequired !== requiredCount || completionNotified.current) return;
    completionNotified.current = true;
    onComplete?.(pack.id);
  }, [completedRequired, onComplete, pack.id, requiredCount]);

  const canvasPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePort = (endpoint: SimulationEndpoint) => {
    if (!selectedPort) {
      setSelectedPort(endpoint);
      setNotice({ kind: "info", text: `${endpointLabel(state, endpoint)} selected. Choose a port on another device.` });
      return;
    }
    if (endpointKey(selectedPort) === endpointKey(endpoint)) {
      setSelectedPort(null);
      setNotice({ kind: "info", text: "Port selection cleared." });
      return;
    }
    const result = connectSimulationPorts(state, selectedPort, endpoint, linkIdFor(pack, selectedPort, endpoint));
    if (!result.ok) {
      setNotice({ kind: "error", text: result.reason });
      return;
    }
    setState(result.state);
    setSelectedPort(null);
    setNotice({ kind: "success", text: `Cable connected: ${endpointLabel(state, selectedPort)} ↔ ${endpointLabel(state, endpoint)}.` });
  };

  const handleLink = (link: SimulationLink) => {
    setState((current) => disconnectSimulationLink(current, link.id));
    setSelectedPort(null);
    setNotice({ kind: "success", text: `Cable disconnected: ${endpointLabel(state, link.source)} ↔ ${endpointLabel(state, link.target)}.` });
  };

  const selectDevice = (node: SimulationNode) => {
    // A device without a console is still selectable as a cabling node, but there is nothing to type
    // into: the panel says so instead of opening an invented console.
    const runtime = hasConsole(node) ? getTerminalRuntime(node) : null;
    if (!runtime) {
      setActiveDeviceId(node.id);
      setNotice({ kind: "info", text: `${node.label} is configured in the lab's own tool, not in an IOS console, so this practice model has no console for it.` });
      return;
    }
    const runtimeForConsole = runtime;
    setActiveDeviceId(node.id);
    onDeviceSelect?.(node);
    setTerminalDraft(runtimeForConsole.draft);
    setTerminalViews((current) => ({ ...current, [node.id]: terminalView(runtimeForConsole) }));
    setActivePanel("terminal");
    setTerminalCursor(runtimeForConsole.draft.length);
    setNotice({ kind: "info", text: `${node.label} console selected. Choose a port to connect a cable.` });
  };

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, node: SimulationNode) => {
    event.stopPropagation();
    const point = canvasPoint(event as unknown as ReactPointerEvent<SVGSVGElement>);
    dragRef.current = { type: "node", id: node.id, pointerId: event.pointerId, startX: point.x, startY: point.y, originX: node.x, originY: node.y };
    selectDevice(node);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = canvasPoint(event);
    dragRef.current = { type: "pan", pointerId: event.pointerId, startX: point.x, startY: point.y, originX: state.viewport.x, originY: state.viewport.y };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = canvasPoint(event);
    if (drag.type === "node" && drag.id) {
      setState((current) => moveSimulationNode(current, drag.id as string, drag.originX + (point.x - drag.startX) / current.viewport.scale, drag.originY + (point.y - drag.startY) / current.viewport.scale));
    } else {
      setState((current) => updateSimulationViewport(current, { x: drag.originX + point.x - drag.startX, y: drag.originY + point.y - drag.startY }));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const handleNodeKey = (event: ReactKeyboardEvent<SVGGElement>, node: SimulationNode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDevice(node);
    }
  };

  const resetLab = () => {
    setState(cloneSimulationState(pack));
    setSelectedPort(null);
    setCheckedItems(new Set());
    terminalSessions.current = {};
    const resetViews = Object.fromEntries(pack.devices.filter(hasConsole).map((node) => {
      const runtime = makeTerminalRuntime(node);
      terminalSessions.current[node.id] = runtime;
      return [node.id, terminalView(runtime)];
    }));
    setTerminalViews(resetViews);
    setActiveDeviceId(preferredDevice(pack.devices)?.id ?? null);
    setTerminalDraft("");
    setTerminalCursor(0);
    setNotice({ kind: "info", text: "Lab reset. Select a port, then select a port on another device to connect a cable." });
    completionNotified.current = false;
  };

  const resetActiveTerminal = () => {
    if (!selectedNodeData || !hasConsole(selectedNodeData)) return;
    const runtime = makeTerminalRuntime(selectedNodeData);
    terminalSessions.current[selectedNodeData.id] = runtime;
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
    setTerminalDraft("");
    setTerminalCursor(0);
  };

  const updateTerminalDraft = (nextDraft: string, cursor = nextDraft.length) => {
    if (!selectedNodeData) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    runtime.draft = nextDraft;
    runtime.historyCursor = -1;
    setTerminalDraft(nextDraft);
    setTerminalCursor(Math.max(0, Math.min(nextDraft.length, cursor)));
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
  };

  const submitCommand = () => {
    const input = terminalDraft.trim();
    if (!selectedNodeData || !hasConsole(selectedNodeData)) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    if (!input && !runtime.session.awaitingInput) return;
    const promptBefore = runtime.session.prompt;
    const hidden = runtime.session.inputHidden;
    // A node whose pack declares a role has a real console: the same engine validate:ccna-sim drives,
    // so the screen and the graded state can never disagree (a PC console used to answer from a canned
    // list while its step read device state). A node without a role keeps the guided canned terminal
    // the generated packs ship, so no published lab changes underneath its learners.
    // One engine for every console, for every lab. A device with no console cannot be typed into at
    // all, so no command can ever be answered from a canned list instead of the real device state.
    const result = runtime.session.execute(input);
    if (!hidden) runtime.history.push(input);
    runtime.historyCursor = -1;
    runtime.draftBeforeHistory = "";
    runtime.draft = "";
    if (input.toLowerCase() === "clear") {
      runtime.entries = [];
    } else {
      runtime.entries = [...runtime.entries, { input: hidden ? "••••••" : input, output: result.lines, promptBefore, promptAfter: result.prompt, mode: result.mode, matched: result.matched }];
    }
    setTerminalDraft("");
    setTerminalCursor(0);
    // Remote configuration changes the target device, not the source PC. Publish
    // every console so its tab, interface table and grader see that same mutation.
    setTerminalViews((current) => ({ ...current, ...Object.fromEntries(Object.entries(terminalSessions.current).map(([id, session]) => [id, terminalView(session)])) }));
  };

  const recallHistory = (direction: -1 | 1) => {
    if (!selectedNodeData) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    if (!runtime.history.length) return;
    if (runtime.historyCursor === -1) runtime.draftBeforeHistory = terminalDraft;
    const historyPosition = Math.max(0, Math.min(runtime.history.length, (runtime.historyCursor < 0 ? runtime.history.length : runtime.historyCursor) + direction));
    runtime.historyCursor = historyPosition;
    const nextDraft = historyPosition === runtime.history.length ? runtime.draftBeforeHistory : runtime.history[historyPosition];
    runtime.draft = nextDraft;
    setTerminalDraft(nextDraft);
    setTerminalCursor(nextDraft.length);
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
  };

  const clearTerminalOutput = () => {
    if (!selectedNodeData) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    runtime.entries = [];
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
  };

  const cancelTerminalInput = () => {
    if (!selectedNodeData) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    runtime.session.cancelInput();
    runtime.draft = "";
    runtime.historyCursor = -1;
    runtime.draftBeforeHistory = "";
    setTerminalDraft("");
    setTerminalCursor(0);
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
  };

  const prepareStageCommand = (stage: SimulationStage, command = stage.command) => {
    const node = state.nodes.find((node) => node.id === stage.deviceId && hasConsole(node))
      ?? (selectedNodeData && hasConsole(selectedNodeData) ? selectedNodeData : null)
      ?? consoleNodes[0];
    if (!node || !command) return;
    const runtime = getTerminalRuntime(node);
    runtime.draft = command;
    runtime.historyCursor = -1;
    flushSync(() => {
      setActiveDeviceId(node.id);
      setTerminalDraft(command);
      setTerminalCursor(command.length);
      setTerminalViews((current) => ({ ...current, [node.id]: terminalView(runtime) }));
      setActivePanel("terminal");
    });
    // Mobile browsers only open the keyboard inside the original tap gesture.
    terminalInputRef.current?.focus({ preventScroll: true });
  };

  const handleTerminalKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedNodeData || !hasConsole(selectedNodeData) || !activeView || activeView.closed) return;
    // Soft keyboards and IMEs edit through input events, often with keyCode 229.
    // Let the native inline input handle editing, selection, paste and composition.
    if (terminalComposing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    const key = event.key;
    if (event.target === terminalInputRef.current && !["Enter", "ArrowUp", "ArrowDown"].includes(key)
      && !(event.ctrlKey && ["l", "c"].includes(key.toLowerCase()))) return;
    if (key === "Enter") {
      event.preventDefault();
      submitCommand();
    } else if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      recallHistory(key === "ArrowUp" ? -1 : 1);
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      setTerminalCursor((current) => Math.max(0, current - 1));
    } else if (key === "ArrowRight") {
      event.preventDefault();
      setTerminalCursor((current) => Math.min(terminalDraft.length, current + 1));
    } else if (key === "Home") {
      event.preventDefault();
      setTerminalCursor(0);
    } else if (key === "End") {
      event.preventDefault();
      setTerminalCursor(terminalDraft.length);
    } else if (key === "Backspace") {
      event.preventDefault();
      if (terminalCursor > 0) updateTerminalDraft(`${terminalDraft.slice(0, terminalCursor - 1)}${terminalDraft.slice(terminalCursor)}`, terminalCursor - 1);
    } else if (key === "Delete") {
      event.preventDefault();
      if (terminalCursor < terminalDraft.length) updateTerminalDraft(`${terminalDraft.slice(0, terminalCursor)}${terminalDraft.slice(terminalCursor + 1)}`, terminalCursor);
    } else if (key.toLowerCase() === "l" && event.ctrlKey) {
      event.preventDefault();
      clearTerminalOutput();
    } else if (key.toLowerCase() === "c" && event.ctrlKey) {
      event.preventDefault();
      cancelTerminalInput();
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      updateTerminalDraft(`${terminalDraft.slice(0, terminalCursor)}${key}${terminalDraft.slice(terminalCursor)}`, terminalCursor + 1);
    }
  };

  const setZoom = (delta: number) => setState((current) => ({ ...current, viewport: zoomSimulationViewport(current.viewport, current.viewport.scale + delta, { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }) }));
  const fitView = () => setState((current) => ({ ...current, viewport: fitSimulationViewport(current.nodes, CANVAS_WIDTH, CANVAS_HEIGHT) }));
  const toggleTopologyFullscreen = () => {
    const canvas = svgRef.current?.parentElement;
    if (!canvas) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void canvas.requestFullscreen?.();
  };
  const panelTabs: Array<{ id: WorkspacePanel; label: string }> = [
    { id: "scenario", label: "Scenario" },
    { id: "topology", label: "Topology" },
    { id: "terminal", label: "Terminal" },
    { id: "reference", label: "Reference" },
  ];

  const handlePanelTabKey = (event: ReactKeyboardEvent<HTMLButtonElement>, tabId: WorkspacePanel) => {
    const currentIndex = panelTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0) return;
    const offset = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? panelTabs.length - 1 : offset ? (currentIndex + offset + panelTabs.length) % panelTabs.length : currentIndex;
    if (nextIndex === currentIndex) return;
    event.preventDefault();
    const nextTab = panelTabs[nextIndex];
    setActivePanel(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`ccna-panel-tab-${nextTab.id}`)?.focus());
  };

  return <section ref={workspaceRef} className={`ccna-simulation-workspace${className ? ` ${className}` : ""}`} aria-label={`Interactive ${pack.title} lab`}>
    <header className="ccna-lab-bar">
      <a className="ccna-lab-back" href={pack.lab ? `/ccna/labs/${pack.lab.labId}` : "/ccna/library"}>← {pack.lab ? "Lab brief" : "Labs"}</a>
      {/* One header for the lab page: the site header already carries this title as its h1, so the bar
          shows the same name as text and keeps the only reset control, with its scope in the label. */}
      <div className="ccna-lab-title"><p className="ccna-lab-name">{pack.title}</p><p>{requiredCount ? `${completedRequired}/${requiredCount} steps verified` : "No graded steps authored yet"} · practice model, not a device</p></div>
      <div className="ccna-lab-actions"><button type="button" className="ccna-lab-reset" onClick={resetLab} title="Resets this lab only: device consoles, cables and step progress. Saved answers, quiz grades and evidence are not touched.">Reset lab · this lab only</button></div>
    </header>
    <nav className="ccna-simulation-tabs" aria-label="Simulation panels" role="tablist">
      {panelTabs.map((tab) => <button key={tab.id} id={`ccna-panel-tab-${tab.id}`} type="button" role="tab" aria-selected={activePanel === tab.id} aria-controls={`ccna-panel-${tab.id}`} tabIndex={activePanel === tab.id ? 0 : -1} onClick={() => { flushSync(() => setActivePanel(tab.id)); if (tab.id === "terminal") terminalInputRef.current?.focus({ preventScroll: true }); }} onKeyDown={(event) => handlePanelTabKey(event, tab.id)}>{tab.label}</button>)}
    </nav>

    <div className="ccna-simulation-layout" data-active-panel={activePanel}>
      <aside id="ccna-panel-scenario" className="ccna-simulation-panel ccna-simulation-scenario" data-panel="scenario" role="tabpanel" aria-labelledby="ccna-panel-tab-scenario" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">1</span><h3>Scenario</h3></div>
        {pack.scenario.role && <p className="ccna-simulation-role">{pack.scenario.role}</p>}
        <details className="ccna-simulation-detail">
          <summary>Scenario context</summary>
          <p>{pack.scenario.context}</p>
        </details>
        <details className="ccna-simulation-detail">
          <summary>Objective</summary>
          <p>{pack.scenario.objective}</p>
        </details>
        {pack.scenario.requirement && <details className="ccna-simulation-detail"><summary>Success criteria</summary><p>{pack.scenario.requirement}</p></details>}
        {pack.scenario.prerequisites && pack.scenario.prerequisites.length > 0 && <details className="ccna-simulation-detail"><summary>Prerequisites</summary><ul>{pack.scenario.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></details>}
        <div className="ccna-simulation-progress" aria-label={requiredCount ? `${completedRequired} of ${requiredCount} graded steps verified` : "No graded step is authored for this lab yet"}>
          <div><strong>{progressPercent}%</strong><span>{completedRequired}/{requiredCount} graded steps</span></div>
          <div className="ccna-simulation-progress-track" role="progressbar" aria-label="Verified lab progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
        {requiredStages.length === 0 && <section className="ccna-simulation-guide ccna-simulation-guide--observations" aria-label="What to inspect in this lab">
          <div className="ccna-simulation-guide-heading"><div><span className="ccna-simulation-guide-kicker">Not graded yet</span><strong>Inspect this lab&apos;s own evidence</strong></div><span className="ccna-simulation-guide-score">0 graded steps</span></div>
          <p className="ccna-simulation-device-guidance">This lab publishes its reference diagram and the evidence its catalog entry names, but its device-state objectives are not authored yet, so nothing on this page is credited as completed work. The checks below are read-only: run each one on the device it names to see the state the lab is about.</p>
          <ul className="ccna-simulation-checklist">
            {(pack.checklist ?? []).map((item) => <li key={item.id}>
              <div><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</div>
            </li>)}
          </ul>
        </section>}
        {requiredStages.length > 0 && <section className="ccna-simulation-guide ccna-simulation-guide--scenario" aria-label="Guided lab steps">
          <div className="ccna-simulation-guide-heading"><div><span className="ccna-simulation-guide-kicker">Objectives</span><strong>{activeStage ? `Step ${activeStageNumber} of ${requiredCount}` : "Every step verified"}</strong></div><span className="ccna-simulation-guide-score">{completedRequired}/{requiredCount} verified</span></div>
          {activeStage && <div className="ccna-simulation-current-stage" aria-live="polite">
            <p className="ccna-simulation-current-stage-title">{stageDevice ? `Next on ${stageDevice.label}: ` : "Next: "}{activeStage.title}</p>
            <p className="ccna-simulation-device-guidance">{isStageDeviceSelected
              ? stageIsChecked
                ? `This step is completed on ${stageDevice?.label ?? selectedNodeData?.label ?? "the target device"}. ${selectedNodeData && stageDevice && selectedNodeData.id !== stageDevice.id ? `${selectedNodeData.label} is not needed for it.` : "It is credited from the device state this console produces, not from typing the command."}`
                : `You are on ${selectedNodeData?.label ?? "the target device"}. Complete this check here before moving to the next step.`
              : `${selectedNodeData?.label ?? "This device"} is not needed for this step. First select ${stageDevice?.label} to open its console.`}</p>
            {!isStageDeviceSelected && stageDevice && <button type="button" className="ccna-simulation-open-device" onClick={() => { flushSync(() => { selectDevice(stageDevice); setActivePanel("terminal"); }); terminalInputRef.current?.focus({ preventScroll: true }); }}>Open {stageDevice.label} console</button>}
            <p>{activeStage.instruction}</p>
            <p className="ccna-simulation-stage-why"><strong>Why:</strong> {activeStage.why}</p>
            {/* A step may legitimately offer the same keyword twice (a range form and its per-port
                form, for example), so the chip key includes its position. A duplicate key let React
                omit or duplicate a chip, and a chip is a control the learner clicks. */}
            <div className="ccna-simulation-stage-commands">{(activeStage.commands ?? [activeStage.command]).map((command, commandIndex) => <button key={`${commandIndex}-${command}`} type="button" className="ccna-simulation-stage-command-chip" onClick={() => prepareStageCommand(activeStage, command)}>{command}</button>)}</div>
            <p className="ccna-simulation-stage-result" data-ok={activeOutcome ? String(activeOutcome.ok) : "unknown"}>
              {activeOutcome
                ? activeOutcome.ok ? `Verified: ${activeOutcome.detail}` : `Not yet: ${activeOutcome.detail}`
                : stageIsChecked ? "Credited when the named device's state matches this lab's requirement." : "Credited from the console output this step asks for."}
            </p>
            <small className="ccna-simulation-stage-expected">{activeStage.expected} {activeStage.hint}</small>
          </div>}
          <details className="ccna-simulation-detail"><summary>All {guidedStages.length} steps</summary>
          <ol className="ccna-simulation-stage-list">
            {guidedStages.map((stage, index) => {
              const complete = completedStageIds.has(stage.id);
              const outcome = checkResults.get(stage.id) ?? null;
              // A step with a real check is an independent state requirement, so it can be done in
              // any order; a transcript-graded step keeps the ordered gate it was authored with.
              const unlocked = Boolean(stage.check) || index === 0 || completedStageIds.has(guidedStages[index - 1]?.id);
              return <li key={stage.id} className={`ccna-simulation-stage${complete ? " is-complete" : ""}${activeStage?.id === stage.id ? " is-current" : ""}${!unlocked ? " is-locked" : ""}${stage.ungraded ? " is-ungraded" : ""}`}>
                <span className="ccna-simulation-stage-marker" aria-hidden="true">{stage.ungraded ? "·" : complete ? "✓" : index + 1}</span>
                <span><strong>{stage.title}</strong><small>{stage.ungraded ? "Not evaluated here" : complete ? "Verified" : outcome && !outcome.ok ? outcome.detail : unlocked ? "Ready" : "Locked until the previous step passes"}</small></span>
              </li>;
            })}
          </ol>
          </details>
          {/* A lab whose engine cannot prove part of itself may not read as fully complete: the ungraded
              stages are named here with the count, so 100% of the graded work is never mistaken for the
              whole lab, and the steps list above carries each limitation in its own words. */}
          {!activeStage && <p className="ccna-simulation-guide-complete">100% · All {requiredCount} graded step{requiredCount === 1 ? "" : "s"} are verified. You can keep experimenting with your devices.{guidedStages.length > requiredCount ? ` ${guidedStages.length - requiredCount} further step${guidedStages.length - requiredCount === 1 ? " is" : "s are"} listed as not evaluated here: this practice model does not implement what ${guidedStages.length - requiredCount === 1 ? "it asks" : "they ask"} for, so ${guidedStages.length - requiredCount === 1 ? "it is" : "they are"} never counted towards this total.` : ""}</p>}
        </section>}
      </aside>

      <div className="ccna-simulation-main-column">
      <section id="ccna-panel-topology" className="ccna-simulation-panel ccna-simulation-topology-panel" data-panel="topology" role="tabpanel" aria-labelledby="ccna-panel-tab-topology" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><h3 id="ccna-topology-workspace-title">Topology</h3></div>
        <div className="ccna-simulation-toolbar" role="toolbar" aria-label="Topology controls">
          <button type="button" onClick={() => setZoom(-.15)} disabled={state.viewport.scale <= .2} aria-label="Zoom out">−</button>
          <output aria-live="polite">{Math.round(state.viewport.scale * 100)}%</output>
          <button type="button" onClick={() => setZoom(.15)} disabled={state.viewport.scale >= 3} aria-label="Zoom in">+</button>
          <button type="button" onClick={fitView}>Fit</button>
          <button type="button" onClick={toggleTopologyFullscreen} aria-label="Expand topology" title="Expand topology">⛶</button>
          <span className="ccna-simulation-toolbar-spacer" />
          <span className="ccna-simulation-connection-count" aria-label="Topology connection count">{connectedCount} link{connectedCount === 1 ? "" : "s"}</span>
        </div>
        <div className="sr-only" data-kind={notice.kind} role="status" aria-live="polite">{notice.text}</div>
        <div className="ccna-simulation-canvas-wrap">
          <svg ref={svgRef} className="ccna-simulation-canvas" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="none" role="group" aria-label="Interactive network topology. Drag devices to move them; select two ports to connect a cable." onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
            <defs><pattern id={`lab-dots-${pack.id}`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#242730" /></pattern></defs>
            <rect className="ccna-simulation-canvas-background" x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx="16" />
            <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={`url(#lab-dots-${pack.id})`} pointerEvents="none" />
            <g transform={`translate(${state.viewport.x} ${state.viewport.y}) scale(${state.viewport.scale})`}>
              {state.links.map((link) => {
                const source = endpointPoint(state, link.source);
                const target = endpointPoint(state, link.target);
                if (!source || !target) return null;
                const { path, label: middle } = simulationCableCurve(source, target);
                return <g key={link.id} className="ccna-simulation-link" data-status={link.status ?? "up"} role="button" tabIndex={0} aria-label={`Disconnect cable between ${endpointLabel(state, link.source)} and ${endpointLabel(state, link.target)}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => handleLink(link)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleLink(link); } }}>
                  <title>{linkPortLabel(state, link)}</title>
                  <path className="ccna-simulation-link-hitbox" d={path} />
                  <path className="ccna-simulation-link-line" d={path} vectorEffect="non-scaling-stroke" />
                  <text className="ccna-simulation-link-label" x={middle.x} y={middle.y - 8}>{linkPortLabel(state, link)}</text>
                </g>;
              })}
              {state.nodes.map((node) => <g key={node.id} className={`ccna-simulation-node${selectedNode === node.id ? " is-selected" : ""}`} data-device-kind={node.kind} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-pressed={selectedNode === node.id} aria-label={`${node.label}, ${DEVICE_META[node.kind].label}. Press Enter to select the device.`} onPointerDown={(event) => handleNodePointerDown(event, node)} onKeyDown={(event) => handleNodeKey(event, node)}>
                <title>{node.label} · {DEVICE_META[node.kind].label} · {selectedNode === node.id ? "Console open" : "Click for console"}</title>
                <rect className="ccna-simulation-node-hitbox" x={-NODE_WIDTH / 2} y="-64" width={NODE_WIDTH} height="130" rx="20" />
                <ellipse className="ccna-simulation-node-halo" cx="0" cy="-8" rx="79" ry="57" />
                <g transform="translate(-66 -56)"><DeviceGlyph kind={node.kind} large /></g>
                <text className="ccna-simulation-node-label" x="0" y="56" textAnchor="middle">{node.label}</text>
                <circle className="ccna-simulation-node-status" cx="69" cy="50" r="4" fill={statusColor(node.status)} />
                {node.ports.map((port, index) => { const point = portPoint(state, node, index); const localX = point.x - node.x; const localY = point.y - node.y; const selected = selectedPort?.deviceId === node.id && selectedPort.portId === port.id; return <g key={port.id} className={`ccna-simulation-port${selected ? " is-selected" : ""}`} transform={`translate(${localX} ${localY})`} role="button" tabIndex={0} aria-pressed={selected} aria-label={`${node.label} ${port.label}, ${portState(node.id, port.label).label}. ${selected ? "Selected" : "Select port"}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); } }}>
                  <rect className="ccna-simulation-port-dot" x="-22" y="-9" width="44" height="18" rx="5" data-status={portState(node.id, port.label).tone} />
                  <text className="ccna-simulation-port-label" x="0" y="4">{port.label}</text>
                </g>; })}
              </g>)}
            </g>
          </svg>
        </div>
        <div className="ccna-simulation-topology-meta"><span>{state.nodes.length} devices · {connectedCount} links</span></div>
        {selectedNodeData && <section className="ccna-simulation-interface-status" aria-labelledby="ccna-interface-status-title">
          <h4 id="ccna-interface-status-title">{liveDevice ? "Device state" : "Interface status"} <span>{selectedNodeData.label}</span></h4>
          <div className="ccna-simulation-interface-table-wrap">
            <table className="ccna-simulation-interface-table">
              <thead><tr><th scope="col">Port</th><th scope="col">Mode</th><th scope="col">VLAN</th>{liveDevice && <th scope="col">Address</th>}<th scope="col">Status</th></tr></thead>
          <tbody>{liveDevice
            ? liveDevice.state.interfaces.map((port) => { const state2 = portStateLabel(port, cableStatusFor(liveDevice.id, port.name)); return <tr key={port.name}><th scope="row">{port.name}</th><td>{port.kind === "subinterface" ? "subinterface" : port.mode}</td><td>{port.dot1q ? `dot1q ${port.dot1q}` : port.kind === "svi" || port.mode === "routed" ? "—" : String(port.accessVlan)}</td><td>{port.address ? `${port.address.ip} ${port.address.mask}` : "unassigned"}{port.ipv6 && <><br />{`${port.ipv6.address}/${port.ipv6.prefix}`}</>}</td><td><span className={`ccna-simulation-status-dot is-${state2.tone}`} />{state2.label}</td></tr>; })
            : selectedNodeData.ports.map((port) => { const status = portState(selectedNodeData.id, port.label); return <tr key={port.id}><th scope="row">{port.label}</th><td>{portMode(port.kind)}</td><td>{portMode(port.kind) === "routed" ? "—" : "1"}</td><td>{status.label}</td></tr>; })}</tbody>
            </table>
          </div>
        </section>}
      </section>

      <section id="ccna-panel-terminal" className="ccna-simulation-panel ccna-simulation-terminal-panel" data-panel="terminal" role="tabpanel" aria-labelledby="ccna-panel-tab-terminal" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">3</span><h3 id="ccna-terminal-title">Device console</h3><span className="ccna-simulation-terminal-host">{selectedNodeData ? `${selectedNodeData.label} · ${activeView ? simModeLabels[activeView.mode] : "user"}` : "Select a device"}</span></div>
        <div className="ccna-simulation-device-tabs" role="tablist" aria-label="Device consoles">
          {state.nodes.map((node) => {
            const consoleNode = hasConsole(node);
            const view = consoleNode ? terminalViews[node.id] ?? defaultTerminalView(node) : null;
            const selected = node.id === selectedNodeData?.id;
            return <button key={node.id} type="button" role="tab" aria-selected={selected} aria-controls="ccna-active-device-console" disabled={!consoleNode} title={consoleNode ? undefined : `${node.label} is configured in the lab's own tool, not in an IOS console, so this practice model has no console for it.`} className={`ccna-simulation-device-tab${selected ? " is-active" : ""}${consoleNode ? "" : " is-consoleless"}`} onClick={() => { flushSync(() => selectDevice(node)); terminalInputRef.current?.focus({ preventScroll: true }); }}>
              <span>{node.label}</span><small>{view ? simModeLabels[view.mode] : "no console"}</small>
            </button>;
          })}
        </div>
        <div ref={terminalSurfaceRef} id="ccna-active-device-console" className="ccna-simulation-terminal-screen" role="group" aria-label={`Console for ${selectedNodeData?.label ?? "the selected device"}`} onClick={(event) => { if (event.target !== terminalInputRef.current && window.getSelection()?.isCollapsed !== false) terminalInputRef.current?.focus(); }} onKeyDown={handleTerminalKeyDown}>
          <div className="ccna-simulation-terminal-output" role="log" aria-live="polite">
            {!activeView && <p className="ccna-simulation-terminal-line">{selectedNodeData
              ? `${selectedNodeData.label} has no IOS console in this practice model: its configuration belongs to the lab's own tool. Select a router, switch or host to type commands.`
              : "Select a device to open its console."}</p>}
            {!activeView?.entries.length && <>
              <p className="ccna-simulation-terminal-line">Connected to {selectedNodeData?.label ?? "the selected device"}.</p>
              <p className="ccna-simulation-terminal-line">Type <code>?</code> or <code>help</code> to see commands for this console.</p>
            </>}
            {activeView?.closed && <p className="ccna-simulation-terminal-line ccna-simulation-terminal-closed">{simulatorText.closed}</p>}
            {activeView?.entries.map((entry, index) => <div key={`${entry.input}-${index}`} className="ccna-simulation-terminal-entry"><p><span className="ccna-simulation-terminal-prompt">{entry.promptBefore}</span> {entry.input}</p>{entry.output.map((line, lineIndex) => <p key={`${line}-${lineIndex}`} className="ccna-simulation-terminal-response">{line}</p>)}</div>)}
          </div>
          {activeView && !activeView.closed && <form className="ccna-simulation-terminal-input-line" aria-label="Current command line" onSubmit={(event) => { event.preventDefault(); if (!terminalComposing.current) submitCommand(); }}>
            <span className="ccna-simulation-terminal-prompt">{activeView.prompt}</span>{" "}
            <input ref={terminalInputRef} className="ccna-simulation-terminal-native-input" type={activeView.inputHidden ? "password" : "text"} aria-label={`Type commands for ${selectedNodeData?.label ?? "the selected device"}`} placeholder={activeView.inputHidden ? "Password" : "Type a command…"} value={terminalDraft} inputMode="text" enterKeyHint="send" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} dir="ltr" onChange={(event) => updateTerminalDraft(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)} onSelect={(event) => setTerminalCursor(event.currentTarget.selectionStart ?? terminalDraft.length)} onCompositionStart={() => { terminalComposing.current = true; }} onCompositionEnd={() => { terminalComposing.current = false; }} />
          </form>}
        </div>
        <div className="ccna-simulation-terminal-actions"><span>↑ ↓ history · Ctrl+L clear · Ctrl+C cancel</span><button type="button" onClick={resetActiveTerminal} disabled={!activeView} title="Restarts only the console you are typing in: this device's history and output. The other consoles and your step progress stay.">Restart this console</button></div>
      </section>
      </div>

      <aside id="ccna-panel-reference" className="ccna-simulation-panel ccna-simulation-reference-panel" data-panel="reference" role="tabpanel" aria-labelledby="ccna-panel-tab-reference" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">4</span><h3>Lab reference</h3></div>
        <h4>Connection model</h4>
        <p>Green links are connected. Select a link to disconnect it. A cable must join two different, compatible data ports.</p>
        <h4>Device map</h4>
        <ul className="ccna-simulation-device-legend">{DEVICE_KINDS.map((kind) => <li key={kind}><span className="ccna-simulation-device-legend-icon"><DeviceGlyph kind={kind} /></span><span className="ccna-simulation-device-legend-label">{DEVICE_META[kind].label}</span></li>)}</ul>
        {pack.references && pack.references.length > 0 && <><h4>Sources</h4><ul className="ccna-simulation-references">{pack.references.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer">{reference.title} ↗</a></li>)}</ul></>}
        <p className="ccna-simulation-keyboard-note"><strong>Keyboard:</strong> Tab reaches every port and link. Enter or Space activates the selected control.</p>
      </aside>
    </div>
  </section>;
}

