"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Network, BookOpen } from "lucide-react";
import { simCommands } from "@/lib/ccna-sim/commands";
import { simulatorText } from "@/lib/ccna-sim/language";
import { IosSession } from "@/lib/ccna-sim/session";
import { completedInput, historyPosition } from "@/lib/ccna-sim/terminal-controls";
import type { CcnaLabEntry } from "@/lib/content/ccna-lab-path";
import { ccnaLabs } from "@/lib/content/ccna";

type Entry = { promptBefore: string; input: string; lines: string[]; prompt: string; matched: string | null };

/** The simulator surface is deliberately *not* routed through GoogleSubtitle: it is authored in one
 * language and never mixed (content/ccna-simulator-plan.md §2). Everything the learner reads inside
 * this component comes from the English lab content, catalog help or the engine. */
export function CcnaSimulator({ lab, backHref }: { lab: CcnaLabEntry; backHref: string }) {
  const [session] = useState(() => new IosSession("Switch"));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [resetPending, setResetPending] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [mobilePanel, setMobilePanel] = useState("terminal");
  const draftBeforeHistory = useRef("");
  const transcript = useRef<HTMLDivElement>(null);
  const commandInput = useRef<HTMLInputElement>(null);
  const prompt = session.prompt;
  const closed = session.state.closed;
  const buildLab = ccnaLabs.find((entry) => entry.id === lab.id);
  const commands = session.availableCommands;
  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [entries]);

  const run = (value: string) => {
    const typed = value.trim();
    if (!typed || closed) return;
    const promptBefore = session.prompt || prompt;
    const result = session.execute(typed);
    setEntries((previous) => [...previous, { promptBefore, input: typed, lines: result.lines, prompt: result.prompt, matched: result.matched }]);
    setDraft("");
    setHistoryCursor(-1);
    draftBeforeHistory.current = "";
    commandInput.current?.focus();
  };

  const recallHistory = (direction: -1 | 1) => {
    const history = session.commandHistory;
    if (!history.length) return;
    if (historyCursor === -1) draftBeforeHistory.current = draft;
    const bounded = historyPosition(historyCursor, history.length, direction);
    setHistoryCursor(bounded);
    setDraft(bounded === history.length ? draftBeforeHistory.current : history[bounded]);
  };

  const completeDraft = () => {
    const candidates = session.complete(draft);
    if (candidates.length === 1) setDraft((current) => completedInput(current, candidates[0]));
    return candidates.length === 1;
  };

  const reset = () => {
    session.reset();
    setEntries([]);
    setDraft("");
    setHistoryCursor(-1);
    draftBeforeHistory.current = "";
    setResetPending(false);
    commandInput.current?.focus();
  };

  return <div className="ccna-sim" lang="en" dir="ltr" data-mobile-panel={mobilePanel}>
    <header className="ccna-sim-heading">
      <p className="ccna-sim-kicker">{simulatorText.kicker}</p>
      <h2>{lab.title}</h2>
      <p className="ccna-sim-meta">{lab.tier} · {lab.duration} min · {lab.objectives.length} blueprint objectives · {lab.reviewStatus}</p>
      <p className="ccna-sim-notice">{simulatorText.notice}</p>
    </header>
    <nav className="ccna-sim-mobile-tabs" aria-label="Simulator panels">{["terminal", "scenario", "topology", "reference"].map((panel) => <button type="button" key={panel} aria-pressed={mobilePanel === panel} aria-controls={`sim-${panel}-panel`} onClick={() => setMobilePanel(panel)}>{panel === "reference" ? "Commands" : panel[0].toUpperCase() + panel.slice(1)}</button>)}</nav>
    <div className="ccna-sim-grid">
      <section id="sim-scenario-panel" className="ccna-sim-scenario ccna-sim-panel" aria-labelledby="sim-scenario-title">
        <h3 id="sim-scenario-title"><BookOpen size={18} aria-hidden="true" /> Scenario & objectives</h3>
        <p>{lab.scenario.role} {lab.scenario.context}.</p>
        <p>{lab.scenario.requirement}</p>
        <h4>Blueprint objectives</h4>
        <p>{lab.objectives.join(" · ")}</p>
        <h4>Verification checklist</h4>
        <ul>{lab.verification.map((command) => <li key={command}><code>{command}</code></li>)}</ul>
        <p className="ccna-sim-limitation">Only the commands in the terminal reference are implemented. This is one simulated switch, not the complete lab network. Complete unsupported routing, peer-device and connectivity tasks in Packet Tracer.</p>
        <details><summary>Fault checkpoint</summary><p>{lab.fault.failure}</p><p>{lab.fault.recovery}</p></details>
        <details><summary>Official references</summary><ul>{lab.sourceRefs.map((source) => <li key={source.key}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></li>)}</ul></details>
        <a href={backHref} className="ccna-sim-back">{simulatorText.openLibrary}</a>
      </section>
      <section id="sim-terminal-panel" className="ccna-sim-terminal" aria-label={simulatorText.terminal}>
        <div className="ccna-sim-status">
          <span className="ccna-sim-mode"><Terminal size={15} aria-hidden="true" /> {session.state.device.hostname} · {closed ? "closed" : session.state.mode}</span>
          <button type="button" onClick={() => setResetPending(true)} className="ccna-sim-reset">{simulatorText.reset}</button>
        </div>
        {resetPending && <div className="ccna-sim-reset-confirm" role="group" aria-label="Confirm terminal reset"><span>Discard this switch configuration and command history?</span><button type="button" onClick={reset}>Confirm reset</button><button type="button" onClick={() => setResetPending(false)}>Cancel</button></div>}
        <div ref={transcript} className="ccna-sim-transcript" role="log" aria-live="polite" aria-relevant="additions" tabIndex={0}>
          {!entries.length && <p className="ccna-sim-empty">{simulatorText.placeholder}</p>}
          {entries.map((entry, index) => <div key={index} className="ccna-sim-entry">
            <p className="ccna-sim-line ccna-sim-typed"><span className="ccna-sim-prompt">{entry.promptBefore}</span> {entry.input}</p>
            {entry.lines.length > 0 && <pre className="ccna-sim-line">{entry.lines.join("\n")}</pre>}
          </div>)}
          {closed && <p className="ccna-sim-closed">{simulatorText.closed}</p>}
        </div>
        <form className="ccna-sim-input" onSubmit={(event) => { event.preventDefault(); run(draft); }}>
          <span className="ccna-sim-prompt" aria-hidden="true">{prompt}</span>
          <input
            ref={commandInput}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setHistoryCursor(-1); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); recallHistory(event.key === "ArrowUp" ? -1 : 1); }
              else if (event.key === "Tab" && !event.shiftKey && draft && completeDraft()) { event.preventDefault(); }
              else if (event.key.toLowerCase() === "l" && event.ctrlKey) { event.preventDefault(); setEntries([]); }
              else if (event.key.toLowerCase() === "z" && event.ctrlKey) { event.preventDefault(); if (["global", "interface", "vlan", "line"].includes(session.state.mode)) run("end"); }
            }}
            disabled={closed}
            spellCheck={false}
            autoComplete="off"
            aria-label={simulatorText.terminal}
            placeholder={closed ? simulatorText.closed : simulatorText.placeholder}
          />
          <button type="submit" disabled={closed}>{simulatorText.run}</button>
        </form>
        <p className="ccna-sim-shortcuts">↑ ↓ History · Tab Complete · ? Help · Ctrl+L Clear · Ctrl+Z End</p>
      </section>
      <section id="sim-topology-panel" className="ccna-sim-topology ccna-sim-panel" aria-labelledby="sim-topology-title">
        <h3 id="sim-topology-title"><Network size={18} aria-hidden="true" /> Lab topology</h3>
        {lab.diagram ? <>
          <div className="ccna-sim-zoom" role="group" aria-label="Topology zoom"><button type="button" aria-label="Zoom out topology" disabled={zoom <= 100} onClick={() => setZoom(Math.max(100, zoom - 25))}>−</button><output>{zoom}%</output><button type="button" aria-label="Zoom in topology" disabled={zoom >= 200} onClick={() => setZoom(Math.min(200, zoom + 25))}>+</button><button type="button" onClick={() => setZoom(100)}>Fit</button></div>
          <figure className="ccna-sim-diagram"><div style={{ width: `${zoom}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lab.diagram.src} width={lab.diagram.width} height={lab.diagram.height} alt={`${lab.title} reference topology`} />
          </div><figcaption>Reference diagram for this lab. It is not a live simulation of all devices.</figcaption></figure>
        </> : buildLab?.topology ? <div className="ccna-sim-topology-outline"><h4>{buildLab.topology.title}</h4><ul>{buildLab.topology.nodes.map((node) => <li key={node.title}><strong>{node.title}</strong><span>{node.detail}</span></li>)}</ul><p>{buildLab.topology.note}</p></div> : <p>No diagram is published for this concept lab.</p>}
        <h4>Simulated switch · live configuration</h4>
        <div className="ccna-sim-port-scroll" tabIndex={0} aria-label="Simulated interface configuration"><table><thead><tr><th>Port</th><th>Mode</th><th>VLAN</th><th>Admin</th></tr></thead><tbody>{session.state.device.interfaces.map((port) => <tr key={port.name}><th scope="row">{port.name}</th><td>{port.mode}</td><td>{port.kind === "svi" ? "—" : port.mode === "trunk" ? (port.allowedVlans === "all" ? "all" : port.allowedVlans.join(",")) : port.accessVlan}</td><td>{port.adminUp ? "up" : "down"}</td></tr>)}</tbody></table></div>
        <p className="ccna-sim-meta">Admin state is not proof of a connected peer or successful traffic.</p>
      </section>
      <aside id="sim-reference-panel" className="ccna-sim-reference ccna-sim-panel" aria-label={simulatorText.reference}>
        <h3>{simulatorText.reference} · {session.state.mode}</h3>
        <dl>{commands.map((command) => <div key={command.name}>
          <dt>{command.name}</dt>
          <dd>{command.help}<span className="ccna-sim-modes">{command.modes.join(" · ")}{command.args ? ` · ${command.args.join(" ")}` : ""}</span></dd>
        </div>)}</dl>
        <details><summary>All {simCommands.length} implemented commands</summary><ul>{simCommands.map((command) => <li key={command.name}><code>{command.name}</code> · {command.modes.join(" / ")}</li>)}</ul></details>
        <p className="ccna-sim-stage">{simulatorText.stage}</p>
      </aside>
    </div>
  </div>;
}
