"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { IosSession } from "@/lib/ccna-sim/session";
import { findInterface } from "@/lib/ccna-sim/device";
import type { SimMode } from "@/lib/ccna-sim/tokens";
import {
  cloneSimulationState,
  connectSimulationPorts,
  disconnectSimulationLink,
  endpointKey,
  findSimulationPort,
  arrangeSimulationNodes,
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
    hostname: string;
    vlans: Array<[number, { id: number; name: string }]>;
    interfaces: Array<{
      name: string;
      kind: "ethernet" | "svi";
      mode: "access" | "trunk" | "routed";
      accessVlan: number;
      nativeVlan: number;
      allowedVlans: number[] | "all";
      description: string;
      modeExplicit: boolean;
      adminUp: boolean;
      address: { ip: string; mask: string } | null;
    }>;
  };
  selected: { interfaces: string[]; vlan: number | null };
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
};
type TerminalView = {
  kind: SimulationNode["kind"];
  hostname: string;
  prompt: string;
  mode: SimMode;
  closed: boolean;
  entries: TerminalEntry[];
  history: string[];
  draft: string;
};
type WorkspaceSnapshot = {
  version: 1 | 2 | 3;
  layoutVersion?: 2 | 3;
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
const CANVAS_HEIGHT = 500;
const NODE_WIDTH = 184;
const NODE_HEIGHT = 92;
const PORT_GAP = 38;

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

/** Lightweight original SVG glyphs keep the canvas legible without shipping vendor artwork. */
function DeviceGlyph({ kind }: { kind: SimulationNode["kind"] }) {
  const common = { className: `ccna-simulation-device-icon ccna-simulation-device-icon--${DEVICE_META[kind].tone}`, viewBox: "0 0 48 48", width: 42, height: 42, "aria-hidden": true } as const;
  if (kind === "router") return <svg {...common}><circle cx="24" cy="24" r="17" /><path d="M14 24h20M24 14v20M18 18l12 12M30 18 18 30" /><circle cx="24" cy="24" r="3" /></svg>;
  if (kind === "switch") return <svg {...common}><rect x="6" y="14" width="36" height="20" rx="5" /><path d="M11 23h26M12 29h4m4 0h4m4 0h4m4 0h2" /><path d="M15 18v2m6-2v2m6-2v2m6-2v2" /></svg>;
  if (kind === "pc") return <svg {...common}><rect x="8" y="8" width="32" height="23" rx="3" /><path d="M24 31v6M16 40h16M18 37h12" /><rect className="ccna-simulation-device-icon-screen" x="12" y="12" width="24" height="15" rx="1.5" /></svg>;
  if (kind === "server") return <svg {...common}><rect x="10" y="5" width="28" height="38" rx="4" /><path d="M14 13h20M14 24h20M14 35h20" /><circle cx="17" cy="9" r="1.5" /><circle cx="17" cy="20" r="1.5" /><circle cx="17" cy="31" r="1.5" /><path d="M22 9h8m-8 11h8m-8 11h8" /></svg>;
  if (kind === "access-point") return <svg {...common}><path d="M14 25a14 14 0 0 1 20 0M18 29a8 8 0 0 1 12 0M22 33a3 3 0 0 1 4 0" /><circle cx="24" cy="38" r="2.5" /><path d="M24 38V15" /><path d="M19 12a7 7 0 0 1 10 0" /></svg>;
  if (kind === "firewall") return <svg {...common}><path d="m24 5 14 6v10c0 9-6 16-14 22C16 37 10 30 10 21V11l14-6Z" /><path d="M14 17h20M14 23h20M18 11v6m8-6v6m-8 6v6m8-6v6" /></svg>;
  return <svg {...common}><path d="M12 35h25a7 7 0 0 0 1-14 11 11 0 0 0-21-3 8 8 0 0 0-5 15Z" /><path d="M18 35v3m6-3v3m6-3v3" /></svg>;
}

function portPoint(node: SimulationNode, index: number) {
  const columns = Math.max(1, Math.min(4, node.ports.length));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const totalWidth = (columns - 1) * PORT_GAP;
  return {
    x: node.x - totalWidth / 2 + column * PORT_GAP,
    y: node.y + NODE_HEIGHT / 2 + 15 + row * 18,
  };
}

function endpointPoint(state: SimulationState, endpoint: SimulationEndpoint) {
  const node = state.nodes.find((candidate) => candidate.id === endpoint.deviceId);
  if (!node) return null;
  const index = node.ports.findIndex((port) => port.id === endpoint.portId);
  return index < 0 ? null : portPoint(node, index);
}

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

function curvedLinkPath(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const bend = Math.min(56, Math.max(20, distance * .14));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const controlX = (source.x + target.x) / 2 + normalX * bend;
  const controlY = (source.y + target.y) / 2 + normalY * bend;
  return `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
}

function linkMidpoint(source: { x: number; y: number }, target: { x: number; y: number }) {
  return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
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

function portStatus(state: SimulationState, nodeId: string, portId: string) {
  const link = state.links.find((candidate) => endpointKey(candidate.source) === `${nodeId}:${portId}` || endpointKey(candidate.target) === `${nodeId}:${portId}`);
  if (!link) return { label: "disabled", tone: "disabled" };
  if (link.status === "fault") return { label: "fault", tone: "fault" };
  if (link.status === "down") return { label: "down", tone: "down" };
  return { label: "connected", tone: "connected" };
}

function preferredDevice(nodes: SimulationNode[]) {
  return nodes.find((node) => node.kind === "switch") ?? nodes[0] ?? null;
}

function isSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<WorkspaceSnapshot>;
  return (snapshot.version === 1 || snapshot.version === 2 || snapshot.version === 3) && Boolean(snapshot.state && Array.isArray(snapshot.state.nodes) && Array.isArray(snapshot.state.links));
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
  const expectedLinks = new Set((pack.links ?? []).map((link) => link.id));
  return snapshot.state.links.every((link) => expectedLinks.has(link.id));
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
  const session = new IosSession(saved?.hostname || node.label);
  if (saved?.device && Array.isArray(saved.device.interfaces) && Array.isArray(saved.device.vlans) && (saved.device.interfaces.length > 0 || saved.device.vlans.length > 0)) {
    session.state.device = {
      hostname: saved.device.hostname || saved.hostname || node.label,
      vlans: new Map(saved.device.vlans.map(([id, vlan]) => [Number(id), { id: Number(vlan.id), name: vlan.name }])),
      interfaces: saved.device.interfaces.map((port) => ({
        ...port,
        allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all",
        address: port.address ? { ...port.address } : null,
      })),
    };
    session.state.selected = {
      interfaces: (saved.selected?.interfaces ?? []).map((name) => findInterface(session.state.device, name)).filter((port): port is NonNullable<ReturnType<typeof findInterface>> => Boolean(port)),
      vlan: typeof saved.selected?.vlan === "number" ? saved.selected.vlan : null,
    };
    session.state.config = { startup: saved.config?.startup ? [...saved.config.startup] : null };
  } else {
    // Match the IOS command engine to the ports published by this topology. In
    // particular, switch packs use Fa0/1-style names while router packs use Gi0/0.
    const ethernetNames = node.ports.filter((port) => port.kind === "ethernet").map((port) => port.label);
    if (ethernetNames.length > 0) {
      const defaults = session.state.device.interfaces;
      const template = defaults[0];
      const svi = defaults.find((port) => port.kind === "svi");
      if (template) {
        session.state.device.interfaces = [
          ...ethernetNames.map((name, index) => ({ ...template, name, address: null, description: "", modeExplicit: false, accessVlan: 1, nativeVlan: 1, allowedVlans: "all" as const, adminUp: true, mode: "access" as const, kind: "ethernet" as const, ...(defaults[index] ? { kind: defaults[index].kind, mode: defaults[index].mode } : {}) })),
          ...(svi ? [{ ...svi }] : []),
        ];
      }
    }
  }
  session.state.mode = isSimMode(saved?.mode) ? saved.mode : "user";
  session.state.closed = saved?.closed === true;
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
    draft: runtime.draft,
    entries: runtime.entries.map((entry) => ({ ...entry, output: [...entry.output] })),
    device: {
      hostname: device.hostname,
      vlans: [...device.vlans.entries()].map(([id, vlan]) => [id, { ...vlan }]),
      interfaces: device.interfaces.map((port) => ({ ...port, allowedVlans: Array.isArray(port.allowedVlans) ? [...port.allowedVlans] : "all", address: port.address ? { ...port.address } : null })),
    },
    selected: { interfaces: runtime.session.state.selected.interfaces.map((port) => port.name), vlan: runtime.session.state.selected.vlan },
    config: { startup: runtime.session.state.config.startup ? [...runtime.session.state.config.startup] : null },
  };
}

function terminalView(runtime: TerminalRuntime): TerminalView {
  return {
    kind: runtime.kind,
    hostname: runtime.session.state.device.hostname,
    prompt: runtime.session.prompt,
    mode: runtime.session.state.mode,
    closed: runtime.session.state.closed,
    entries: runtime.entries.map((entry) => ({ ...entry, output: [...entry.output] })),
    history: [...runtime.history],
    draft: runtime.draft,
  };
}

function defaultTerminalView(node: SimulationNode): TerminalView {
  return { kind: node.kind, hostname: node.label, prompt: `${node.label}>`, mode: "user", closed: false, entries: [], history: [], draft: "" };
}

function terminalResponse(pack: SimulationPack, command: string) {
  const normalized = command.trim().toLowerCase();
  const configured = pack.terminal?.commands?.[normalized] ?? pack.terminal?.commands?.[command.trim()];
  if (configured) return configured;
  if (normalized === "help" || normalized === "?") return Object.keys(pack.terminal?.commands ?? {}).sort().map((item) => `  ${item}`);
  if (normalized === "clear") return [];
  return [`% Unknown command: ${command.trim() || "(empty)"}`, "% Type help to see the commands supported by this lab."];
}

function entryMatchesStage(entry: TerminalEntry, stage: SimulationStage) {
  const target = stage.command.trim().toLowerCase();
  const matched = entry.matched?.trim().toLowerCase();
  if (matched === target) return true;
  const input = entry.input.trim().toLowerCase();
  return input === target || input.startsWith(`${target} `);
}

function stageWasPassed(stage: SimulationStage, views: Record<string, TerminalView>) {
  return Object.values(views).some((view) => view.entries.some((entry) => entryMatchesStage(entry, stage)));
}

export function CcnaSimulationWorkspace({ pack, persistKey, className, onComplete, onDeviceSelect }: CcnaSimulationWorkspaceProps) {
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
  const dragRef = useRef<{ type: "node" | "pan"; id?: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const completionNotified = useRef(false);

  const requiredItems = useMemo(() => (pack.checklist ?? []).filter((item) => item.required !== false), [pack.checklist]);
  const guidedStages = useMemo(() => pack.stages ?? [], [pack.stages]);
  const completedStageIds = useMemo(() => {
    const complete = new Set<string>();
    let previousComplete = true;
    for (const stage of guidedStages) {
      const passed: boolean = previousComplete && stageWasPassed(stage, terminalViews);
      if (passed) complete.add(stage.id);
      previousComplete = passed;
    }
    return complete;
  }, [guidedStages, terminalViews]);
  const requiredCount = guidedStages.length || requiredItems.length;
  const completedRequired = guidedStages.length ? completedStageIds.size : requiredItems.filter((item) => checkedItems.has(item.id)).length;
  const nextStageIndex = guidedStages.findIndex((stage) => !completedStageIds.has(stage.id));
  const activeStage = nextStageIndex >= 0 ? guidedStages[nextStageIndex] : null;
  const connectedCount = state.links.length;
  const selectedNode = activeDeviceId;
  const effectiveActiveDeviceId = activeDeviceId ?? state.nodes[0]?.id ?? null;
  const selectedNodeData = state.nodes.find((node) => node.id === effectiveActiveDeviceId);
  const getTerminalRuntime = useCallback((node: SimulationNode) => {
    const existing = terminalSessions.current[node.id];
    if (existing) return existing;
    const runtime = createTerminalRuntime(node);
    terminalSessions.current[node.id] = runtime;
    return runtime;
  }, []);
  const activeView = selectedNodeData ? terminalViews[selectedNodeData.id] ?? defaultTerminalView(selectedNodeData) : null;

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
    const compatibleSnapshot = snapshot && hasCompatibleTopology(snapshot, pack) ? snapshot : null;
    const timer = window.setTimeout(() => {
      if (compatibleSnapshot) {
        const restoredState = compatibleSnapshot.layoutVersion === 3
          ? compatibleSnapshot.state
          : {
            ...compatibleSnapshot.state,
            nodes: arrangeSimulationNodes(compatibleSnapshot.state.nodes),
            viewport: { scale: 1, x: 0, y: 0 },
          };
        setState(restoredState);
        setCheckedItems(new Set(compatibleSnapshot.checkedItems ?? []));
        const firstDevice = restoredState.nodes[0];
        const savedSessions = compatibleSnapshot.sessions ?? {};
        terminalSessions.current = Object.fromEntries(restoredState.nodes.map((node) => {
          const saved = savedSessions[node.id];
          if (saved) return [node.id, createTerminalRuntime(node, saved)];
          return [node.id, createTerminalRuntime(node, node.id === firstDevice?.id && compatibleSnapshot.terminalEntries ? {
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
        setTerminalViews(Object.fromEntries(restoredState.nodes.map((node) => [node.id, terminalView(terminalSessions.current[node.id])] )));
        const preferred = preferredDevice(restoredState.nodes);
        const restoredActiveId = compatibleSnapshot.activeDeviceId && restoredState.nodes.some((node) => node.id === compatibleSnapshot?.activeDeviceId) ? compatibleSnapshot.activeDeviceId : preferred?.id ?? null;
        setActiveDeviceId(restoredActiveId);
        const restoredDraft = restoredActiveId ? terminalSessions.current[restoredActiveId]?.draft ?? "" : "";
        setTerminalDraft(restoredDraft);
        setTerminalCursor(restoredDraft.length);
      } else {
        // Migrate progress from an older graph, but never keep its stale
        // nodes/links or terminal sessions after a topology definition changes.
        setState(cloneSimulationState(pack));
        setCheckedItems(new Set(snapshot?.checkedItems ?? []));
        const defaults = Object.fromEntries(pack.devices.map((node) => {
          const runtime = createTerminalRuntime(node);
          terminalSessions.current[node.id] = runtime;
          return [node.id, terminalView(runtime)];
        }));
        setTerminalViews(defaults);
        setActiveDeviceId(preferredDevice(pack.devices)?.id ?? null);
      }
      hydratedKey.current = storageKey;
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pack, storageKey]);

  useEffect(() => {
    if (!hydrated || hydratedKey.current !== storageKey) return;
    const sessions = Object.fromEntries(state.nodes.map((node) => [node.id, serializeTerminalRuntime(terminalSessions.current[node.id] ?? getTerminalRuntime(node))]));
    const snapshot: WorkspaceSnapshot = {
      version: 3,
      layoutVersion: 3,
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
  }, [activeDeviceId, checkedItems, completedStageIds, getTerminalRuntime, hydrated, state, storageKey, terminalViews]);

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
      x: ((event.clientX - rect.left) * scaleX - state.viewport.x) / state.viewport.scale,
      y: ((event.clientY - rect.top) * scaleY - state.viewport.y) / state.viewport.scale,
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
    const result = connectSimulationPorts(state, selectedPort, endpoint);
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
    const runtime = getTerminalRuntime(node);
    setActiveDeviceId(node.id);
    onDeviceSelect?.(node);
    setTerminalDraft(runtime.draft);
    setTerminalViews((current) => ({ ...current, [node.id]: terminalView(runtime) }));
    setActivePanel("terminal");
    setTerminalCursor(runtime.draft.length);
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
      setState((current) => moveSimulationNode(current, drag.id as string, Math.max(100, Math.min(CANVAS_WIDTH - 100, drag.originX + point.x - drag.startX)), Math.max(80, Math.min(CANVAS_HEIGHT - 100, drag.originY + point.y - drag.startY))));
    } else {
      setState((current) => updateSimulationViewport(current, { x: drag.originX + (point.x - drag.startX) * current.viewport.scale, y: drag.originY + (point.y - drag.startY) * current.viewport.scale }));
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
    const resetViews = Object.fromEntries(pack.devices.map((node) => {
      const runtime = createTerminalRuntime(node);
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
    if (!selectedNodeData) return;
    const runtime = createTerminalRuntime(selectedNodeData);
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
    if (!input || !selectedNodeData) return;
    const runtime = getTerminalRuntime(selectedNodeData);
    const promptBefore = runtime.session.prompt;
    const isGenericDevice = !["router", "switch"].includes(runtime.kind);
    const result = isGenericDevice
      ? { lines: terminalResponse(pack, input), prompt: runtime.session.prompt, mode: runtime.session.state.mode, closed: false, matched: null }
      : runtime.session.execute(input);
    runtime.history.push(input);
    runtime.historyCursor = -1;
    runtime.draftBeforeHistory = "";
    runtime.draft = "";
    if (input.toLowerCase() === "clear") {
      runtime.entries = [];
    } else {
      runtime.entries = [...runtime.entries, { input, output: result.lines, promptBefore, promptAfter: result.prompt, mode: result.mode, matched: result.matched }];
    }
    setTerminalDraft("");
    setTerminalCursor(0);
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
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
    runtime.draft = "";
    runtime.historyCursor = -1;
    runtime.draftBeforeHistory = "";
    setTerminalDraft("");
    setTerminalCursor(0);
    setTerminalViews((current) => ({ ...current, [selectedNodeData.id]: terminalView(runtime) }));
  };

  const prepareStageCommand = (stage: SimulationStage) => {
    const node = selectedNodeData ?? state.nodes[0];
    if (!node) return;
    const runtime = getTerminalRuntime(node);
    runtime.draft = stage.command;
    runtime.historyCursor = -1;
    setActiveDeviceId(node.id);
    setTerminalDraft(stage.command);
    setTerminalCursor(stage.command.length);
    setTerminalViews((current) => ({ ...current, [node.id]: terminalView(runtime) }));
    setActivePanel("terminal");
    window.requestAnimationFrame(() => terminalSurfaceRef.current?.focus());
  };

  const handleTerminalKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selectedNodeData || !activeView || activeView.closed) return;
    const key = event.key;
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

  const toggleChecklist = (itemId: string) => {
    setCheckedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const setZoom = (delta: number) => setState((current) => updateSimulationViewport(current, { scale: current.viewport.scale + delta }));
  const fitView = () => setState((current) => updateSimulationViewport(current, { scale: 1, x: 0, y: 0 }));
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

  return <section className={`ccna-simulation-workspace${className ? ` ${className}` : ""}`} aria-label={`Interactive ${pack.title} lab`}>
    <nav className="ccna-simulation-tabs" aria-label="Simulation panels" role="tablist">
      {panelTabs.map((tab) => <button key={tab.id} id={`ccna-panel-tab-${tab.id}`} type="button" role="tab" aria-selected={activePanel === tab.id} aria-controls={`ccna-panel-${tab.id}`} tabIndex={activePanel === tab.id ? 0 : -1} onClick={() => setActivePanel(tab.id)} onKeyDown={(event) => handlePanelTabKey(event, tab.id)}>{tab.label}</button>)}
    </nav>

    <div className="ccna-simulation-layout" data-active-panel={activePanel}>
      <aside id="ccna-panel-scenario" className="ccna-simulation-panel ccna-simulation-scenario" data-panel="scenario" role="tabpanel" aria-labelledby="ccna-panel-tab-scenario" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">1</span><h3>Scenario &amp; checklist</h3></div>
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
        <div className="ccna-simulation-progress" aria-label={`${completedRequired} of ${requiredCount} required checklist items complete`}>
          <div><strong>{completedRequired}/{requiredCount || 0}</strong><span>{guidedStages.length ? "guided stages" : "required checks"}</span></div>
          <div className="ccna-simulation-progress-track"><span style={{ width: `${requiredCount ? (completedRequired / requiredCount) * 100 : 0}%` }} /></div>
        </div>
        {guidedStages.length === 0 && <ul className="ccna-simulation-checklist">
          {(pack.checklist ?? []).map((item) => {
            const complete = guidedStages.length ? completedStageIds.has(item.id) : checkedItems.has(item.id);
            return <li key={item.id} className={complete ? "is-complete" : ""}>
              <button type="button" aria-pressed={complete} disabled={guidedStages.length > 0} onClick={() => toggleChecklist(item.id)}><span aria-hidden="true">{complete ? "✓" : "○"}</span><span><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}{guidedStages.length > 0 && <small className="ccna-simulation-checklist-status">{complete ? "Verified from the terminal" : "Complete the guided step in the console"}</small>}</span></button>
            </li>;
          })}
        </ul>}
        {guidedStages.length > 0 && <section className="ccna-simulation-guide ccna-simulation-guide--scenario" aria-label="Guided lab steps">
          <div className="ccna-simulation-guide-heading"><div><span className="ccna-simulation-guide-kicker">Guided path</span><strong>{activeStage ? `Stage ${nextStageIndex + 1} of ${guidedStages.length}` : "Lab complete"}</strong></div><span className="ccna-simulation-guide-score">{completedStageIds.size}/{guidedStages.length} verified</span></div>
          <ol className="ccna-simulation-stage-list">
            {guidedStages.map((stage, index) => {
              const complete = completedStageIds.has(stage.id);
              const unlocked = index === 0 || completedStageIds.has(guidedStages[index - 1]?.id);
              return <li key={stage.id} className={`ccna-simulation-stage${complete ? " is-complete" : ""}${activeStage?.id === stage.id ? " is-current" : ""}${!unlocked ? " is-locked" : ""}`}>
                <span className="ccna-simulation-stage-marker" aria-hidden="true">{complete ? "✓" : index + 1}</span>
                <span><strong>{stage.title}</strong><small>{complete ? "Verified" : unlocked ? "Ready" : "Locked until the previous stage passes"}</small></span>
              </li>;
            })}
          </ol>
          {activeStage && <div className="ccna-simulation-current-stage">
            <p className="ccna-simulation-current-stage-title">Next: {activeStage.title}</p>
            <p>{activeStage.instruction}</p>
            <p className="ccna-simulation-stage-why"><strong>Why:</strong> {activeStage.why}</p>
            <div className="ccna-simulation-stage-command"><code>{activeStage.command}</code><button type="button" onClick={() => prepareStageCommand(activeStage)}>Use command</button></div>
            <small className="ccna-simulation-stage-expected">Expected: {activeStage.expected} {activeStage.hint}</small>
          </div>}
          {!activeStage && <p className="ccna-simulation-guide-complete">All guided stages are verified. You completed this lab path.</p>}
        </section>}
        <button type="button" className="ccna-simulation-danger-button" onClick={resetLab}>Reset lab</button>
      </aside>

      <div className="ccna-simulation-main-column">
      <section id="ccna-panel-topology" className="ccna-simulation-panel ccna-simulation-topology-panel" data-panel="topology" role="tabpanel" aria-labelledby="ccna-panel-tab-topology" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><h3 id="ccna-topology-workspace-title">Topology</h3></div>
        <div className="ccna-simulation-toolbar" role="toolbar" aria-label="Topology controls">
          <button type="button" onClick={() => setZoom(-.15)} disabled={state.viewport.scale <= .65} aria-label="Zoom out">−</button>
          <output aria-live="polite">{Math.round(state.viewport.scale * 100)}%</output>
          <button type="button" onClick={() => setZoom(.15)} disabled={state.viewport.scale >= 2} aria-label="Zoom in">+</button>
          <button type="button" onClick={fitView}>Fit</button>
          <button type="button" onClick={toggleTopologyFullscreen} aria-label="Expand topology" title="Expand topology">⛶</button>
          <span className="ccna-simulation-toolbar-spacer" />
          <span className="ccna-simulation-connection-count" aria-label="Topology connection count">{connectedCount} link{connectedCount === 1 ? "" : "s"}</span>
        </div>
        <div className="sr-only" data-kind={notice.kind} role="status" aria-live="polite">{notice.text}</div>
        <div className="ccna-simulation-canvas-wrap">
          <svg ref={svgRef} className="ccna-simulation-canvas" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} role="group" aria-label="Interactive network topology. Drag devices to move them; select two ports to connect a cable." onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
            <rect className="ccna-simulation-canvas-background" x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx="16" />
            <g transform={`translate(${state.viewport.x} ${state.viewport.y}) scale(${state.viewport.scale})`}>
              {state.links.map((link) => {
                const source = endpointPoint(state, link.source);
                const target = endpointPoint(state, link.target);
                if (!source || !target) return null;
                const middle = linkMidpoint(source, target);
                const path = curvedLinkPath(source, target);
                return <g key={link.id} className="ccna-simulation-link" data-status={link.status ?? "up"} role="button" tabIndex={0} aria-label={`Disconnect cable between ${endpointLabel(state, link.source)} and ${endpointLabel(state, link.target)}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => handleLink(link)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleLink(link); } }}>
                  <path className="ccna-simulation-link-hitbox" d={path} />
                  <path className="ccna-simulation-link-line" d={path} />
                  <text className="ccna-simulation-link-label" x={middle.x} y={middle.y - 8}>{linkPortLabel(state, link)}</text>
                </g>;
              })}
              {state.nodes.map((node) => <g key={node.id} className={`ccna-simulation-node${selectedNode === node.id ? " is-selected" : ""}`} data-device-kind={node.kind} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-pressed={selectedNode === node.id} aria-label={`${node.label}, ${DEVICE_META[node.kind].label}. Press Enter to select the device.`} onPointerDown={(event) => handleNodePointerDown(event, node)} onKeyDown={(event) => handleNodeKey(event, node)}>
                <rect className="ccna-simulation-node-card" x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT} rx="14" />
                <g transform={`translate(${-NODE_WIDTH / 2 + 8} -22)`}><DeviceGlyph kind={node.kind} /></g>
                <text className="ccna-simulation-node-label" x={-NODE_WIDTH / 2 + 58} y="-7">{node.label}</text>
                <text className="ccna-simulation-node-subtitle" x={-NODE_WIDTH / 2 + 58} y="14">{node.subtitle ?? DEVICE_META[node.kind].label}</text>
                <circle className="ccna-simulation-node-status" cx={NODE_WIDTH / 2 - 18} cy={-NODE_HEIGHT / 2 + 18} r="5" fill={statusColor(node.status)} />
                {node.ports.map((port, index) => { const point = portPoint(node, index); const localX = point.x - node.x; const localY = point.y - node.y; const selected = selectedPort?.deviceId === node.id && selectedPort.portId === port.id; return <g key={port.id} className={`ccna-simulation-port${selected ? " is-selected" : ""}`} transform={`translate(${localX} ${localY})`} role="button" tabIndex={0} aria-pressed={selected} aria-label={`${node.label} ${port.label}. ${selected ? "Selected" : "Select port"}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); } }}>
                  <circle className="ccna-simulation-port-dot" r="7" />
                  <text className="ccna-simulation-port-label" x="0" y="-12">{port.label}</text>
                </g>; })}
              </g>)}
            </g>
          </svg>
        </div>
        <div className="ccna-simulation-topology-meta"><span>{state.nodes.length} devices · {connectedCount} links</span></div>
        {selectedNodeData && <section className="ccna-simulation-interface-status" aria-labelledby="ccna-interface-status-title">
          <h4 id="ccna-interface-status-title">Interface status <span>{selectedNodeData.label}</span></h4>
          <div className="ccna-simulation-interface-table-wrap">
            <table className="ccna-simulation-interface-table">
              <thead><tr><th scope="col">Port</th><th scope="col">Mode</th><th scope="col">VLAN</th><th scope="col">Status</th></tr></thead>
              <tbody>{selectedNodeData.ports.map((port) => { const status = portStatus(state, selectedNodeData.id, port.id); return <tr key={port.id}><th scope="row">{port.label}</th><td>{portMode(port.kind)}</td><td>{portMode(port.kind) === "routed" ? "—" : "1"}</td><td><span className={`ccna-simulation-status-dot is-${status.tone}`} />{status.label}</td></tr>; })}</tbody>
            </table>
          </div>
        </section>}
      </section>

      <section id="ccna-panel-terminal" className="ccna-simulation-panel ccna-simulation-terminal-panel" data-panel="terminal" role="tabpanel" aria-labelledby="ccna-panel-tab-terminal" tabIndex={-1}>
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">3</span><h3 id="ccna-terminal-title">Device console</h3><span className="ccna-simulation-terminal-host">{selectedNodeData ? `${selectedNodeData.label} · ${activeView ? simModeLabels[activeView.mode] : "user"}` : "Select a device"}</span></div>
        <div className="ccna-simulation-device-tabs" role="tablist" aria-label="Device consoles">
          {state.nodes.map((node) => {
            const view = terminalViews[node.id] ?? defaultTerminalView(node);
            const selected = node.id === selectedNodeData?.id;
            return <button key={node.id} type="button" role="tab" aria-selected={selected} aria-controls="ccna-active-device-console" className={`ccna-simulation-device-tab${selected ? " is-active" : ""}`} onClick={() => selectDevice(node)}>
              <span>{node.label}</span><small>{simModeLabels[view.mode]}</small>
            </button>;
          })}
        </div>
        <div ref={terminalSurfaceRef} id="ccna-active-device-console" className="ccna-simulation-terminal-screen" role="textbox" aria-multiline="false" aria-label={`Type commands for ${selectedNodeData?.label ?? "the selected device"}`} tabIndex={0} onPointerDown={() => terminalSurfaceRef.current?.focus()} onKeyDown={handleTerminalKeyDown}>
          <div className="ccna-simulation-terminal-output" role="log" aria-live="polite">
            {!activeView?.entries.length && <>
              <p className="ccna-simulation-terminal-line">Connected to {selectedNodeData?.label ?? "the selected device"}.</p>
              <p className="ccna-simulation-terminal-line">Type <code>?</code> or <code>help</code> to see commands for this console.</p>
            </>}
            {activeView?.entries.map((entry, index) => <div key={`${entry.input}-${index}`} className="ccna-simulation-terminal-entry"><p><span className="ccna-simulation-terminal-prompt">{entry.promptBefore}</span> {entry.input}</p>{entry.output.map((line, lineIndex) => <p key={`${line}-${lineIndex}`} className="ccna-simulation-terminal-response">{line}</p>)}</div>)}
          </div>
          <div className="ccna-simulation-terminal-input-line" aria-label="Current command line">
            <span className="ccna-simulation-terminal-prompt">{activeView?.prompt ?? "Select a device>"}</span>{" "}
            <span>{terminalDraft.slice(0, terminalCursor)}</span><span className="ccna-simulation-terminal-cursor" aria-hidden="true">▌</span><span>{terminalDraft.slice(terminalCursor) || "\u00a0"}</span>
          </div>
        </div>
        <div className="ccna-simulation-terminal-actions"><span>↑ ↓ history · Ctrl+L clear · Ctrl+C cancel</span><button type="button" onClick={resetActiveTerminal} disabled={!activeView}>Reset terminal</button></div>
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

