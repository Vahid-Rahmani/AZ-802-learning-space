"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, FileCode2, GitBranch, GitCommitHorizontal, GitPullRequest, HelpCircle, Layers, LockKeyhole, Map, Play, RotateCcw, Save, ShieldCheck, Terminal, Workflow } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { copy } from "@/lib/course-data";
import { cicdMissions } from "@/lib/content/cicd-learning";
import { cicdMissionResults, createCicdSession, describeCicdSession, isCicdSession, runCicdCommand, writeCicdFile, type CicdSession } from "@/lib/cicd-sim/engine";

type Entry = { command: string; output: string[]; failed: boolean };
type WorkbenchTab = "terminal" | "files" | "pipeline" | "releases";
const INTRO: Entry = { command: "", output: ["Welcome to the CI/CD Project Lab.", "This is a simulated project. No shell, Git service or deployment runs on your computer.", "Follow your mission. Type help to see the supported educational commands."], failed: false };
const MAX_INPUT = 300;
const MAX_FILE = 12000;
const MAX_SAVE = 2_000_000;
const tabs: { id: WorkbenchTab; title: string; icon: typeof Terminal }[] = [{ id: "terminal", title: "Terminal", icon: Terminal }, { id: "files", title: "Project files", icon: FileCode2 }, { id: "pipeline", title: "Pipeline", icon: Workflow }, { id: "releases", title: "Releases", icon: Layers }];
const isSecretInput = (value: string) => /^ci\s+secret\s+set\b/i.test(value.trimStart());
const safeEcho = (value: string) => value.replace(/^(\s*ci\s+secret\s+set\b)[\s\S]*$/i, "$1 [REDACTED]").replace(/(?:FAKE_SECRET_|TRAINING_TOKEN_)[A-Za-z0-9_-]+/g, "***");

export default function CicdPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("");
  const [prefsReady, setPrefsReady] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async response => {
      const payload = response.ok ? await response.json() as { user?: { id?: unknown } } : null;
      if (live && typeof payload?.user?.id === "string") setUserId(payload.user.id);
    }).catch(() => undefined).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("klybit-cicd-reading") ?? "{}");
      if (Number.isFinite(stored.fontScale)) setFontScale(Math.min(1.3, Math.max(.85, stored.fontScale)));
      if (typeof stored.language === "string" && stored.language.length < 12) setLanguage(stored.language);
    } catch { /* Optional preferences do not block the lab. */ }
    setPrefsReady(true);
  }, []);
  useEffect(() => { if (prefsReady) try { localStorage.setItem("klybit-cicd-reading", JSON.stringify({ fontScale, language })); } catch { /* The current visit still works. */ } }, [prefsReady, fontScale, language]);
  const signOut = async () => {
    try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) return false; setUserId(null); setAccountOpen(false); return true; } catch { return false; }
  };
  if (loading) return <main className="study-app min-h-screen"><p className="p-8" role="status">Loading your learning account…</p></main>;
  if (!userId) return <main className="study-app min-h-screen"><a href="/" className="cicd-auth-back">← All learning paths</a><AuthPanel onClose={() => { window.location.href = "/"; }} onAuthenticated={setUserId} /></main>;
  return <GoogleSubtitleProvider language={language}><main className="study-app cicd-app font-scale-content" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell cicd-shell"><aside className="app-sidebar"><AppBrand subtitle="Learn. Build. Ship safely." /><SimpleNavigation active="cicd" items={[
      { key: "cicd", label: "CI/CD project lab", href: "/cicd", icon: <Workflow size={18} /> },
      { key: "home", label: "All learning paths", href: "/", icon: <BookOpen size={18} /> },
      { key: "linux", label: "Linux terminal", href: "/linux", icon: <Terminal size={18} /> },
      { key: "docker", label: "Docker practice", href: "/docker", icon: <Layers size={18} /> },
    ]} /><div className="cicd-sidebar-note"><ShieldCheck size={22} /><strong>Learn safely, ship confidently.</strong><p>This project lives in your browser. No live infrastructure, subscriptions or credentials required.</p></div></aside><section className="app-content cicd-app-content"><StudyHeader title="CI/CD project lab" course="CI/CD" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} /><CicdWorkspace key={userId} userId={userId} /></section></div>
    {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}

function validEntries(value: unknown): Entry[] {
  if (!Array.isArray(value)) return [INTRO];
  return value.slice(-100).filter((entry): entry is Entry => !!entry && typeof entry.command === "string" && entry.command.length <= MAX_INPUT && typeof entry.failed === "boolean" && Array.isArray(entry.output) && entry.output.length <= 120 && entry.output.every((line: unknown) => typeof line === "string" && line.length <= 2000)).map(entry => ({ ...entry, command: safeEcho(entry.command), output: entry.output.map(safeEcho) }));
}
const statusClass = (status: string) => /fail|error|unhealthy|degraded|denied/.test(status.toLowerCase()) ? "is-failed" : /pass|success|complete|healthy|approved/.test(status.toLowerCase()) ? "is-passed" : "is-pending";

export function CicdWorkspace({ userId }: { userId: string }) {
  const storageKey = `klybit-cicd:v1:${userId}`;
  const [session, setSession] = useState<CicdSession>(createCicdSession);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading saved project…");
  const [entries, setEntries] = useState<Entry[]>([INTRO]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [missionId, setMissionId] = useState(cicdMissions[0].id);
  const [tab, setTab] = useState<WorkbenchTab>("terminal");
  const [mobilePanel, setMobilePanel] = useState<"guide" | "workspace">("guide");
  const [selectedFile, setSelectedFile] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hintLevels, setHintLevels] = useState<Record<string, number>>({});
  const input = useRef<HTMLInputElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const unsent = useRef("");
  const overview = useMemo(() => describeCicdSession(session), [session]);
  const completed = overview.completedMissionIds;
  const activeIndex = Math.min(completed.length, cicdMissions.length - 1);
  const mission = cicdMissions.find(item => item.id === missionId) ?? cicdMissions[activeIndex];
  const missionIndex = cicdMissions.indexOf(mission);
  const checks = useMemo(() => cicdMissionResults(session, mission.id), [session, mission.id]);
  const earned = completed.includes(mission.id);
  const percent = Math.floor(completed.length / cicdMissions.length * 100);
  const file = overview.files.find(item => item.path === selectedFile) ?? overview.files[0];
  const editorValue = file ? drafts[file.path] ?? file.content : "";
  const unsaved = !!file && editorValue !== file.content;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw && raw.length <= MAX_SAVE) {
          const saved = JSON.parse(raw);
          if (saved.version === 1 && isCicdSession(saved.session)) {
            const state = describeCicdSession(saved.session);
            setSession(saved.session); setEntries(validEntries(saved.entries));
            if (typeof saved.command === "string" && !isSecretInput(saved.command)) setCommand(safeEcho(saved.command.slice(0, MAX_INPUT)));
            if (Array.isArray(saved.history)) setHistory(saved.history.filter((item: unknown): item is string => typeof item === "string" && item.length <= MAX_INPUT && !isSecretInput(item)).slice(-100).map(safeEcho));
            const selected = cicdMissions.findIndex(item => item.id === saved.missionId);
            if (selected >= 0 && selected <= state.completedMissionIds.length) setMissionId(saved.missionId);
            else setMissionId(cicdMissions[Math.min(state.completedMissionIds.length, cicdMissions.length - 1)].id);
            if (typeof saved.selectedFile === "string") setSelectedFile(saved.selectedFile);
            if (saved.drafts && typeof saved.drafts === "object" && !Array.isArray(saved.drafts)) {
              const allowed = new Set(state.files.map(item => item.path));
              setDrafts(Object.fromEntries(Object.entries(saved.drafts).filter(([key, value]) => allowed.has(key) && typeof value === "string" && value.length <= MAX_FILE)) as Record<string, string>);
            }
            setSaveStatus("Saved project resumed · this browser");
          } else setSaveStatus("Invalid save ignored · fresh project opened");
        } else setSaveStatus(raw ? "Oversized save ignored · fresh project opened" : "Project ready · auto-save in this browser");
      } catch { setSaveStatus("Project ready · storage unavailable or invalid"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try {
      const safeDraft = isSecretInput(command) ? "" : safeEcho(command);
      const value = JSON.stringify({ version: 1, session, entries, history, command: safeDraft, missionId, selectedFile, drafts });
      if (value.length > MAX_SAVE) throw new Error("Save limit reached");
      localStorage.setItem(storageKey, value);
    } catch { setSaveStatus("Project active · unable to save in this browser"); }
  }, [ready, storageKey, session, entries, history, command, missionId, selectedFile, drafts]);
  useEffect(() => { if (screen.current) screen.current.scrollTop = screen.current.scrollHeight; }, [entries, tab]);

  const append = (entry: Entry) => setEntries(current => [...current, { ...entry, command: safeEcho(entry.command), output: entry.output.slice(-120).map(line => safeEcho(line.slice(0, 2000))) }].slice(-100));
  const execute = (raw = command) => {
    if (!ready || !raw.trim()) return;
    const result = runCicdCommand(session, raw);
    setSession(result.session);
    if (raw.trim() === "clear" && result.exitCode === 0) setEntries([]);
    else append({ command: raw, output: result.output, failed: result.exitCode !== 0 });
    if (!isSecretInput(raw)) setHistory(current => [...current, safeEcho(raw)].slice(-100));
    setCommand(""); setHistoryIndex(-1); unsent.current = "";
  };
  const saveFile = () => {
    if (!file || !ready) return;
    const result = writeCicdFile(session, file.path, editorValue);
    setSession(result.session); append({ command: `editor: save ${file.path}`, output: result.output, failed: result.exitCode !== 0 });
    if (result.exitCode === 0) setDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== file.path)));
  };
  const nextMission = () => {
    const next = cicdMissions[missionIndex + 1];
    if (next && earned && missionIndex + 1 <= completed.length) { setMissionId(next.id); setHintLevels({}); setMobilePanel("guide"); }
  };
  const reset = () => {
    if (!window.confirm("Reset this CI/CD project only? Its simulated files, pipeline, deployments and earned missions will return to the beginning. Other courses are not affected.")) return;
    setSession(createCicdSession()); setEntries([INTRO]); setCommand(""); setHistory([]); setHistoryIndex(-1); setMissionId(cicdMissions[0].id); setSelectedFile(""); setDrafts({}); setHintLevels({}); setTab("terminal"); setSaveStatus("CI/CD project reset · other courses unchanged");
  };
  if (!ready) return <p className="cicd-loading" role="status">Loading your saved project…</p>;

  return <section className="cicd-workspace" aria-label="CI/CD project simulation">
    <div className="cicd-hero"><div><p className="cicd-eyebrow"><Workflow size={15} aria-hidden="true" /> PROJECT-BASED CI/CD SIMULATION</p><h2><GoogleSubtitle text="From first commit to safe release." /></h2><p><GoogleSubtitle text="One project. Clear missions. Every check backed by the simulated project state." /></p></div><div className="cicd-progress"><strong>{percent}%</strong><span>{completed.length}/{cicdMissions.length} missions earned</span><progress value={completed.length} max={cicdMissions.length} aria-label="CI/CD learning progress" /></div></div>
    <div className="cicd-project-bar"><span role="status"><span className="cicd-live-dot" /><GoogleSubtitle text={saveStatus} /></span><button type="button" onClick={reset}><RotateCcw size={14} aria-hidden="true" />Reset this project</button></div>
    <details className="cicd-mission-map"><summary><Map size={16} aria-hidden="true" /><GoogleSubtitle text="Your mission map" /><span>{completed.length}/{cicdMissions.length}</span></summary><div>{cicdMissions.map((item, index) => { const done = completed.includes(item.id); const locked = index > completed.length; return <button type="button" key={item.id} disabled={locked} aria-current={missionId === item.id ? "step" : undefined} aria-label={`${index + 1}. ${item.title}${locked ? " · locked" : done ? " · earned" : " · active"}`} onClick={() => { setMissionId(item.id); setHintLevels({}); setMobilePanel("guide"); }}><span>{done ? <CheckCircle2 size={18} /> : locked ? <LockKeyhole size={16} /> : String(index + 1).padStart(2, "0")}</span><span><small>{item.chapter}</small><strong><GoogleSubtitle text={item.title} /></strong></span></button>; })}</div></details>
    {percent === 100 && <div className="cicd-completion" role="status"><CheckCircle2 size={24} /><div><strong>Project complete — every mission earned.</strong><p>You can keep experimenting. Your mission history does not replace checking the current project health.</p></div></div>}
    <nav className="cicd-mobile-panels" aria-label="Project panels"><button type="button" id="cicd-guide-tab" aria-pressed={mobilePanel === "guide"} aria-controls="cicd-guide" onClick={() => setMobilePanel("guide")}><BookOpen size={16} />Mission</button><button type="button" id="cicd-workspace-tab" aria-pressed={mobilePanel === "workspace"} aria-controls="cicd-workbench" onClick={() => setMobilePanel("workspace")}><Terminal size={16} />Workspace</button></nav>
    <div className="cicd-lab-layout" data-mobile-panel={mobilePanel}>
      <aside id="cicd-guide" className="cicd-guide" aria-label="Current mission">
        <div className="cicd-mission-heading"><p className="cicd-eyebrow">MISSION {String(missionIndex + 1).padStart(2, "0")} / {cicdMissions.length} · {mission.minutes} MIN</p><h3><GoogleSubtitle text={mission.title} /></h3><span>{mission.chapter}</span></div>
        {earned && <p className="cicd-earned"><CheckCircle2 size={17} /><GoogleSubtitle text="Mission earned" /></p>}
        {missionIndex < completed.length && completed.length < cicdMissions.length && <button type="button" className="cicd-return-active" onClick={() => setMissionId(cicdMissions[activeIndex].id)}>Return to active mission <ArrowRight size={15} /></button>}
        <p className="cicd-scenario"><GoogleSubtitle text={mission.scenario} /></p><div className="cicd-goal"><strong><GoogleSubtitle text="Your goal" /></strong><p><GoogleSubtitle text={mission.goal} /></p></div>
        <p className="cicd-check-heading"><span><GoogleSubtitle text="Live project checks" /></span><strong>{checks.filter(check => check.passed).length}/{checks.length}</strong></p>
        <ol className="cicd-checks">{checks.map(check => <li key={check.id} className={check.passed ? "is-passed" : ""}><span>{check.passed ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span><div><strong><GoogleSubtitle text={check.title} /></strong><p><GoogleSubtitle text={check.reason} /></p></div></li>)}</ol>
        {earned && <p className="cicd-history-note">An earned mission is historical evidence. Live checks can change as the shared project evolves.</p>}
        <details className="cicd-guide-details"><summary><HelpCircle size={15} />Hints, one step at a time</summary>{mission.steps.map(step => { const key = `${mission.id}:${step.id}`; const level = hintLevels[key] ?? 0; return <div className="cicd-hint" key={step.id}><strong><GoogleSubtitle text={step.title} /></strong><p><GoogleSubtitle text={step.detail} /></p>{step.hints.slice(0, level).map((hint, i) => <pre key={i} translate="no">{hint}</pre>)}{level < step.hints.length && <button type="button" onClick={() => setHintLevels(current => ({ ...current, [key]: level + 1 }))}>Reveal hint {level + 1}</button>}</div>; })}</details>
        <details className="cicd-guide-details"><summary><BookOpen size={15} />Why this works</summary><p><GoogleSubtitle text={mission.why} /></p>{mission.prerequisites.length > 0 && <p>Prerequisites: {mission.prerequisites.join(" · ")}</p>}</details>
        <details className="cicd-guide-details"><summary><ShieldCheck size={15} />Verify & troubleshoot</summary>{mission.verify.map((item, index) => <pre key={index} translate="no">{item}</pre>)}<p><GoogleSubtitle text={mission.fault} /></p></details>
        <details className="cicd-guide-details cicd-solution"><summary>Complete solution (spoiler)</summary><p>Use the virtual-file editor for file contents. Read first, then perform the actions yourself.</p>{mission.solution.map((line, index) => <pre key={index} translate="no">{line}</pre>)}</details>
        {earned && missionIndex < cicdMissions.length - 1 && <button type="button" className="cicd-next" onClick={nextMission}>Next mission <ArrowRight size={17} /></button>}
        <button type="button" className="cicd-open-workspace" onClick={() => { setMobilePanel("workspace"); setTab("terminal"); input.current?.focus(); }}>Open workspace <ChevronRight size={16} /></button>
      </aside>
      <section id="cicd-workbench" className="cicd-workbench" aria-label="Project workbench">
        <div className="cicd-state-strip"><span><GitBranch size={15} />{overview.branch}</span><span><GitCommitHorizontal size={15} /><code>{overview.commit}</code></span><span className="cicd-sim-label"><ShieldCheck size={14} />SIMULATED</span></div>
        <div className="cicd-workbench-tabs" role="tablist" aria-label="Project workbench views">{tabs.map((item, index) => <button type="button" key={item.id} role="tab" id={`cicd-tab-${item.id}`} tabIndex={tab === item.id ? 0 : -1} aria-selected={tab === item.id} aria-controls={`cicd-panel-${item.id}`} onClick={() => setTab(item.id)} onKeyDown={event => { const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); setTab(tabs[next].id); document.getElementById(`cicd-tab-${tabs[next].id}`)?.focus(); } }}><item.icon size={16} /><GoogleSubtitle text={item.title} /></button>)}</div>
        {tab === "terminal" && <div id="cicd-panel-terminal" role="tabpanel" aria-labelledby="cicd-tab-terminal" className="cicd-terminal-panel" translate="no"><div className="cicd-terminal-title"><span><i /><i /><i /></span><span>learner@project-lab — simulated shell</span></div><div ref={screen} className="cicd-terminal-screen" onClick={event => { if (!(event.target instanceof HTMLInputElement) && !window.getSelection()?.toString()) input.current?.focus({ preventScroll: true }); }}><div className="cicd-transcript" role="log" aria-label="CI/CD terminal output" aria-live="polite" aria-relevant="additions">{entries.map((entry, index) => <div key={index}>{entry.command && <p><span className="cicd-prompt">project-lab $</span> {entry.command}</p>}{entry.output.length > 0 && <pre className={entry.failed ? "is-failed" : ""}>{entry.output.join("\n")}</pre>}</div>)}</div><form className="cicd-command-line" onSubmit={event => { event.preventDefault(); if (!composing.current) execute(); }}><label htmlFor="cicd-command" className="cicd-prompt">project-lab $</label><input ref={input} id="cicd-command" aria-label="CI/CD terminal command" value={command} maxLength={MAX_INPUT} onChange={event => setCommand(event.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" enterKeyHint="send" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => {
          if (composing.current || event.nativeEvent.isComposing) { if (event.key === "Enter") event.preventDefault(); return; }
          if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); setEntries([]); }
          else if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); append({ command: `${command}^C`, output: [], failed: false }); setCommand(""); setHistoryIndex(-1); }
          else if (event.key === "ArrowUp") { event.preventDefault(); if (!history.length) return; if (historyIndex === -1) unsent.current = command; const index = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(index); setCommand(history[index]); }
          else if (event.key === "ArrowDown") { event.preventDefault(); if (historyIndex === -1) return; const index = historyIndex + 1; setHistoryIndex(index >= history.length ? -1 : index); setCommand(index >= history.length ? unsent.current : history[index]); }
        }} /><button type="submit" aria-label="Run CI/CD command"><Play size={15} /></button></form></div><div className="cicd-terminal-footer"><span>↑ ↓ history · Ctrl+L clear · Ctrl+C cancel</span><button type="button" onClick={() => execute("help")}>Command reference</button></div></div>}
        {tab === "files" && <div id="cicd-panel-files" role="tabpanel" aria-labelledby="cicd-tab-files" className="cicd-files-panel"><div className="cicd-editor-toolbar"><label htmlFor="cicd-file">Virtual file<select id="cicd-file" value={file?.path ?? ""} onChange={event => setSelectedFile(event.target.value)}>{overview.files.map(item => <option key={item.path} value={item.path}>{item.path}{item.staged ? " · staged" : item.modified ? " · modified" : ""}</option>)}</select></label><button type="button" onClick={saveFile} disabled={!file || !unsaved}><Save size={15} />Save virtual file</button></div><p className="cicd-editor-note">{unsaved ? "Unsaved editor changes. Save the virtual file before using Git or running checks." : "Edits affect this simulated project only. Never paste real credentials."}</p><textarea aria-label="Virtual project file contents" translate="no" lang="en" value={editorValue} maxLength={MAX_FILE} onChange={event => { if (file) setDrafts(current => ({ ...current, [file.path]: event.target.value })); }} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} /><div className="cicd-file-state">{overview.files.map(item => <span key={item.path} className={item.modified || item.staged ? "is-pending" : ""}>{item.staged ? "A" : item.modified ? "M" : "✓"} <code>{item.path}</code></span>)}</div></div>}
        {tab === "pipeline" && <div id="cicd-panel-pipeline" role="tabpanel" aria-labelledby="cicd-tab-pipeline" className="cicd-pipeline-panel"><div className="cicd-inspector-heading"><Workflow size={22} /><div><h3>Pipeline run</h3><p>Stages and results come from your committed project configuration.</p></div></div>{overview.pipeline ? <><div className="cicd-run-summary"><strong>{overview.pipeline.id}</strong><span className={statusClass(overview.pipeline.status)}>{overview.pipeline.status}</span><code>{overview.pipeline.commit}</code></div><ol className="cicd-pipeline-graph">{overview.pipeline.stages.map((stage, index) => <li key={`${index}:${stage.name}`} className={statusClass(stage.status)}><span>{/pass|success|complete/.test(stage.status.toLowerCase()) ? <Check size={17} /> : <Circle size={17} />}</span><strong>{stage.name}</strong><small>{stage.status}</small></li>)}</ol><p className="cicd-inspector-note">Use <code>ci logs</code> in the terminal to inspect the evidence and failure reasons. A green run applies to its recorded commit, not to future edits.</p><button type="button" className="cicd-secondary" onClick={() => { setTab("terminal"); setCommand("ci logs"); }}>Inspect logs in terminal <ArrowRight size={15} /></button></> : <div className="cicd-empty"><GitPullRequest size={35} /><h3>Your first pipeline is waiting.</h3><p>Follow the mission to configure and run it. No stages have passed yet.</p></div>}</div>}
        {tab === "releases" && <div id="cicd-panel-releases" role="tabpanel" aria-labelledby="cicd-tab-releases" className="cicd-releases-panel"><div className="cicd-inspector-heading"><Layers size={22} /><div><h3>Artifacts & environments</h3><p>Build once. Verify provenance. Promote the same artifact.</p></div></div><div className="cicd-environments">{overview.environments.map(environment => <article key={environment.name}><span className="cicd-eyebrow">{environment.name}</span><strong className={statusClass(environment.status)}>{environment.status}</strong><code>{environment.artifact || "No artifact deployed"}</code></article>)}</div><h4>Built artifacts</h4><p className="cicd-inspector-note">Use <code>ci artifacts</code> to inspect registry publication evidence.</p>{overview.artifacts.length > 0 ? <div className="cicd-table-scroll"><table><thead><tr><th>Artifact</th><th>Source commit</th><th>Version</th></tr></thead><tbody>{overview.artifacts.map(artifact => <tr key={artifact.id}><td><code>{artifact.id}</code></td><td><code>{artifact.commit}</code></td><td>{artifact.version}</td></tr>)}</tbody></table></div> : <p className="cicd-inspector-note">No artifacts yet. A successful build must create a traceable release first.</p>}</div>}
        <div className="cicd-health-strip"><span><Workflow size={14} />Pipeline: <strong className={statusClass(overview.pipeline?.status ?? "not run")}>{overview.pipeline?.status ?? "not run"}</strong></span><span><Layers size={14} />{overview.artifacts.length} artifacts</span><span><CheckCircle2 size={14} />{completed.length} earned missions</span></div>
        <details className="cicd-limitations"><summary><ShieldCheck size={15} />Simulation scope & safe practice</summary><p><GoogleSubtitle text="This is a deterministic educational model of a CI/CD project, not a live shell, GitHub runner, container engine or cloud. Only documented command forms work. The pipeline JSON is an explicit teaching format, not a complete GitHub Actions YAML runtime. No commands execute on your computer. Do not enter real tokens, passwords or secrets." /></p><p><GoogleSubtitle text="Progress and project state are saved in this browser for the signed-in account, not synced between devices. Earned missions record past success; live checks and deployment health show the current project state." /></p><a href="https://docs.github.com/en/actions/get-started/understand-github-actions" target="_blank" rel="noreferrer">GitHub Actions concepts ↗</a><a href="https://git-scm.com/docs/gittutorial" target="_blank" rel="noreferrer">Official Git tutorial ↗</a><a href="https://docs.npmjs.com/cli/v11/commands/npm-ci" target="_blank" rel="noreferrer">Reproducible npm installs ↗</a><a href="https://docs.docker.com/get-started/docker-concepts/building-images/" target="_blank" rel="noreferrer">Container image concepts ↗</a></details>
      </section>
    </div>
  </section>;
}
