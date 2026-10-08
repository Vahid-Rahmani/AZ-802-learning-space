"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  cloneSimulationState,
  connectSimulationPorts,
  disconnectSimulationLink,
  endpointKey,
  findSimulationPort,
  moveSimulationNode,
  type SimulationEndpoint,
  type SimulationLink,
  type SimulationNode,
  type SimulationPack,
  type SimulationState,
  updateSimulationViewport,
} from "@/lib/ccna-sim/topology";

type WorkspacePanel = "scenario" | "topology" | "terminal" | "reference";
type Notice = { kind: "info" | "success" | "error"; text: string };
type TerminalEntry = { input: string; output: string[] };
type WorkspaceSnapshot = {
  version: 1;
  state: SimulationState;
  checkedItems: string[];
  terminalEntries: TerminalEntry[];
};

export type CcnaSimulationWorkspaceProps = {
  pack: SimulationPack;
  /** Defaults to the lab id. Use a user-scoped key when account syncing is available. */
  persistKey?: string;
  className?: string;
  onComplete?: (packId: string) => void;
};

const CANVAS_WIDTH = 920;
const CANVAS_HEIGHT = 440;
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

function statusColor(status: SimulationNode["status"] = "healthy") {
  if (status === "fault") return "#fb7185";
  if (status === "warning") return "#fbbf24";
  return "#4ade80";
}

function isSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<WorkspaceSnapshot>;
  return snapshot.version === 1 && Boolean(snapshot.state && Array.isArray(snapshot.state.nodes) && Array.isArray(snapshot.state.links));
}

function terminalResponse(pack: SimulationPack, command: string) {
  const normalized = command.trim().toLowerCase();
  const configured = pack.terminal?.commands?.[normalized] ?? pack.terminal?.commands?.[command.trim()];
  if (configured) return configured;
  if (normalized === "help" || normalized === "?") return Object.keys(pack.terminal?.commands ?? {}).sort().map((item) => `  ${item}`);
  if (normalized === "clear") return [];
  return [`% Unknown command: ${command.trim() || "(empty)"}`, "% Type help to see the commands supported by this lab."];
}

export function CcnaSimulationWorkspace({ pack, persistKey, className, onComplete }: CcnaSimulationWorkspaceProps) {
  const storageKey = `ccna-simulation:${persistKey ?? pack.id}`;
  const [state, setState] = useState<SimulationState>(() => cloneSimulationState(pack));
  const [selectedPort, setSelectedPort] = useState<SimulationEndpoint | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("topology");
  const [notice, setNotice] = useState<Notice>({ kind: "info", text: "Select a port, then select a port on another device to connect a cable." });
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => new Set());
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [terminalDraft, setTerminalDraft] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const hydratedKey = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ type: "node" | "pan"; id?: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const completionNotified = useRef(false);

  const requiredItems = useMemo(() => (pack.checklist ?? []).filter((item) => item.required !== false), [pack.checklist]);
  const completedRequired = requiredItems.filter((item) => checkedItems.has(item.id)).length;
  const connectedCount = state.links.length;

  useEffect(() => {
    hydratedKey.current = null;
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
    const timer = window.setTimeout(() => {
      if (snapshot) {
        setState(snapshot.state);
        setCheckedItems(new Set(snapshot.checkedItems ?? []));
        setTerminalEntries(snapshot.terminalEntries ?? []);
      }
      hydratedKey.current = storageKey;
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || hydratedKey.current !== storageKey) return;
    const snapshot: WorkspaceSnapshot = {
      version: 1,
      state,
      checkedItems: [...checkedItems],
      terminalEntries,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Persistence is best-effort; the current session remains usable.
    }
  }, [checkedItems, hydrated, state, storageKey, terminalEntries]);

  useEffect(() => {
    if (!requiredItems.length || completedRequired !== requiredItems.length || completionNotified.current) return;
    completionNotified.current = true;
    onComplete?.(pack.id);
  }, [completedRequired, onComplete, pack.id, requiredItems.length]);

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

  const handleNodePointerDown = (event: ReactPointerEvent<SVGGElement>, node: SimulationNode) => {
    event.stopPropagation();
    const point = canvasPoint(event as unknown as ReactPointerEvent<SVGSVGElement>);
    dragRef.current = { type: "node", id: node.id, pointerId: event.pointerId, startX: point.x, startY: point.y, originX: node.x, originY: node.y };
    setSelectedNode(node.id);
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
      setSelectedNode(node.id);
      setNotice({ kind: "info", text: `${node.label} selected. Choose one of its ports to start a cable.` });
    }
  };

  const resetLab = () => {
    setState(cloneSimulationState(pack));
    setSelectedPort(null);
    setSelectedNode(null);
    setCheckedItems(new Set());
    setTerminalEntries([]);
    setNotice({ kind: "info", text: "Lab reset. Select a port, then select a port on another device to connect a cable." });
    completionNotified.current = false;
  };

  const submitCommand = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = terminalDraft.trim();
    if (!input) return;
    const output = terminalResponse(pack, input);
    if (input.toLowerCase() === "clear") {
      setTerminalEntries([]);
    } else {
      setTerminalEntries((current) => [...current, { input, output }]);
    }
    setTerminalDraft("");
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
  const selectedNodeData = state.nodes.find((node) => node.id === selectedNode);

  const panelTabs: Array<{ id: WorkspacePanel; label: string }> = [
    { id: "scenario", label: "Scenario" },
    { id: "topology", label: "Topology" },
    { id: "terminal", label: "Terminal" },
    { id: "reference", label: "Reference" },
  ];

  return <section className={`ccna-simulation-workspace${className ? ` ${className}` : ""}`} aria-labelledby="ccna-simulation-title">
    <header className="ccna-simulation-header">
      <div>
        <p className="ccna-simulation-eyebrow">Interactive CCNA lab</p>
        <h2 id="ccna-simulation-title">{pack.title}</h2>
        {pack.summary && <p className="ccna-simulation-summary">{pack.summary}</p>}
      </div>
      <div className="ccna-simulation-badges" aria-label="Lab details">
        {pack.domain && <span>{pack.domain}</span>}
        {pack.difficulty && <span>{pack.difficulty}</span>}
        {pack.duration && <span>{pack.duration}</span>}
      </div>
    </header>

    <nav className="ccna-simulation-tabs" aria-label="Simulation panels" role="tablist">
      {panelTabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={activePanel === tab.id} onClick={() => setActivePanel(tab.id)}>{tab.label}</button>)}
    </nav>

    <div className="ccna-simulation-layout" data-active-panel={activePanel}>
      <aside className="ccna-simulation-panel ccna-simulation-scenario" data-panel="scenario">
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">1</span><h3>Scenario &amp; checklist</h3></div>
        {pack.scenario.role && <p className="ccna-simulation-role">{pack.scenario.role}</p>}
        <p>{pack.scenario.context}</p>
        <h4>Objective</h4>
        <p>{pack.scenario.objective}</p>
        {pack.scenario.requirement && <><h4>Success criteria</h4><p>{pack.scenario.requirement}</p></>}
        {pack.scenario.prerequisites && pack.scenario.prerequisites.length > 0 && <><h4>Prerequisites</h4><ul>{pack.scenario.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul></>}
        <div className="ccna-simulation-progress" aria-label={`${completedRequired} of ${requiredItems.length} required checklist items complete`}>
          <div><strong>{completedRequired}/{requiredItems.length || 0}</strong><span>required checks</span></div>
          <div className="ccna-simulation-progress-track"><span style={{ width: `${requiredItems.length ? (completedRequired / requiredItems.length) * 100 : 0}%` }} /></div>
        </div>
        <ul className="ccna-simulation-checklist">
          {(pack.checklist ?? []).map((item) => <li key={item.id} className={checkedItems.has(item.id) ? "is-complete" : ""}>
            <button type="button" aria-pressed={checkedItems.has(item.id)} onClick={() => toggleChecklist(item.id)}><span aria-hidden="true">{checkedItems.has(item.id) ? "✓" : "○"}</span><span><strong>{item.title}</strong>{item.detail && <small>{item.detail}</small>}</span></button>
          </li>)}
        </ul>
        <button type="button" className="ccna-simulation-danger-button" onClick={resetLab}>Reset lab</button>
      </aside>

      <section className="ccna-simulation-panel ccna-simulation-topology-panel" data-panel="topology" aria-labelledby="ccna-topology-workspace-title">
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">2</span><h3 id="ccna-topology-workspace-title">Topology workspace</h3></div>
        <div className="ccna-simulation-toolbar" role="toolbar" aria-label="Topology controls">
          <button type="button" onClick={() => setZoom(-.15)} disabled={state.viewport.scale <= .65} aria-label="Zoom out">−</button>
          <output aria-live="polite">{Math.round(state.viewport.scale * 100)}%</output>
          <button type="button" onClick={() => setZoom(.15)} disabled={state.viewport.scale >= 2} aria-label="Zoom in">+</button>
          <button type="button" onClick={fitView}>Fit</button>
          <span className="ccna-simulation-toolbar-spacer" />
          <span className="ccna-simulation-connection-count">{connectedCount} cable{connectedCount === 1 ? "" : "s"}</span>
        </div>
        <div className="ccna-simulation-notice" data-kind={notice.kind} role="status" aria-live="polite">{notice.text}</div>
        <div className="ccna-simulation-canvas-wrap">
          <svg ref={svgRef} className="ccna-simulation-canvas" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} role="application" aria-label="Interactive network topology. Drag devices to move them; select two ports to connect a cable." onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
            <rect className="ccna-simulation-canvas-background" x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} rx="16" />
            <g transform={`translate(${state.viewport.x} ${state.viewport.y}) scale(${state.viewport.scale})`}>
              {state.links.map((link) => {
                const source = endpointPoint(state, link.source);
                const target = endpointPoint(state, link.target);
                if (!source || !target) return null;
                const middleX = (source.x + target.x) / 2;
                const middleY = (source.y + target.y) / 2;
                return <g key={link.id} className="ccna-simulation-link" data-status={link.status ?? "up"} role="button" tabIndex={0} aria-label={`Disconnect cable between ${endpointLabel(state, link.source)} and ${endpointLabel(state, link.target)}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => handleLink(link)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleLink(link); } }}>
                  <line className="ccna-simulation-link-hitbox" x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                  <line className="ccna-simulation-link-line" x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                  <text className="ccna-simulation-link-label" x={middleX} y={middleY - 6}>{link.label ?? "connected"}</text>
                </g>;
              })}
              {state.nodes.map((node) => <g key={node.id} className={`ccna-simulation-node${selectedNode === node.id ? " is-selected" : ""}`} data-device-kind={node.kind} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-label={`${node.label}, ${DEVICE_META[node.kind].label}. Press Enter to select the device.`} onPointerDown={(event) => handleNodePointerDown(event, node)} onKeyDown={(event) => handleNodeKey(event, node)}>
                <rect className="ccna-simulation-node-card" x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT} rx="14" />
                <g transform={`translate(${-NODE_WIDTH / 2 + 8} -22)`}><DeviceGlyph kind={node.kind} /></g>
                <text className="ccna-simulation-node-label" x={-NODE_WIDTH / 2 + 58} y="-7">{node.label}</text>
                <text className="ccna-simulation-node-subtitle" x={-NODE_WIDTH / 2 + 58} y="14">{node.subtitle ?? DEVICE_META[node.kind].label}</text>
                <circle className="ccna-simulation-node-status" cx={NODE_WIDTH / 2 - 18} cy={-NODE_HEIGHT / 2 + 18} r="5" fill={statusColor(node.status)} />
                {node.ports.map((port, index) => { const point = portPoint(node, index); const localX = point.x - node.x; const localY = point.y - node.y; const selected = selectedPort?.deviceId === node.id && selectedPort.portId === port.id; return <g key={port.id} className={`ccna-simulation-port${selected ? " is-selected" : ""}`} transform={`translate(${localX} ${localY})`} role="button" tabIndex={0} aria-label={`${node.label} ${port.label}. ${selected ? "Selected" : "Select port"}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); handlePort({ deviceId: node.id, portId: port.id }); } }}>
                  <circle className="ccna-simulation-port-dot" r="7" />
                  <text className="ccna-simulation-port-label" x="0" y="-12">{port.label}</text>
                </g>; })}
              </g>)}
            </g>
          </svg>
        </div>
        <div className="ccna-simulation-hints"><span>Drag canvas to pan</span><span>Drag devices to arrange</span><span>Select two ports to connect</span><span>Activate a cable to disconnect</span></div>
        {selectedNodeData && <p className="ccna-simulation-selected-device"><strong>{selectedNodeData.label}</strong> · {selectedNodeData.ports.length} ports · {selectedNodeData.kind}</p>}
      </section>

      <section className="ccna-simulation-panel ccna-simulation-terminal-panel" data-panel="terminal" aria-labelledby="ccna-terminal-title">
        <div className="ccna-simulation-panel-heading"><span className="ccna-simulation-panel-icon">3</span><h3 id="ccna-terminal-title">Device terminal</h3><span className="ccna-simulation-terminal-host">{pack.terminal?.hostname ?? "Lab device"}</span></div>
        <div className="ccna-simulation-terminal-output" role="log" aria-live="polite" tabIndex={0}>
          {!terminalEntries.length && (pack.terminal?.intro ?? ["This terminal is a guided lab console.", "Type help to see the commands available for this scenario."]).map((line) => <p key={line} className="ccna-simulation-terminal-line">{line}</p>)}
          {terminalEntries.map((entry, index) => <div key={`${entry.input}-${index}`} className="ccna-simulation-terminal-entry"><p><span className="ccna-simulation-terminal-prompt">{pack.terminal?.prompt ?? "Switch#"}</span> {entry.input}</p>{entry.output.map((line, lineIndex) => <p key={`${line}-${lineIndex}`} className="ccna-simulation-terminal-response">{line}</p>)}</div>)}
        </div>
        <form className="ccna-simulation-terminal-form" onSubmit={submitCommand}><label htmlFor="ccna-simulation-command" className="sr-only">Terminal command</label><span className="ccna-simulation-terminal-prompt">{pack.terminal?.prompt ?? "Switch#"}</span><input id="ccna-simulation-command" value={terminalDraft} onChange={(event) => setTerminalDraft(event.target.value)} placeholder="show ..." autoComplete="off" spellCheck={false} /><button type="submit">Run</button></form>
      </section>

      <aside className="ccna-simulation-panel ccna-simulation-reference-panel" data-panel="reference">
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

