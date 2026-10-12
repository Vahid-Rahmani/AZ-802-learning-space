"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, FileText, Folder, HelpCircle, Package, Play, RotateCcw, Server, ShieldCheck, Terminal } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { copy } from "@/lib/course-data";
import { createLinuxSession, isLinuxSession, linuxPrompt, runLinuxCommand, type LinuxSession } from "@/lib/linux-sim/engine";
import { linuxLessons, linuxLessonResults, linuxSources } from "@/lib/content/linux-learning";

type Entry = { prompt: string; command: string; output: string[]; failed: boolean };
const commands = ["cat", "cd", "chmod", "clear", "cp", "dnf", "echo", "grep", "help", "hostname", "id", "ip", "ls", "man", "mkdir", "mv", "ping", "pwd", "rm", "sudo", "systemctl", "touch", "uname", "whoami"];
const intro: Entry = { prompt: "", command: "", output: ["Welcome to your Linux practice shell.", "Files, packages, services and network responses are simulated.", "Type help for supported commands. No commands run on your computer."], failed: false };

export default function LinuxPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("");
  const [prefsReady, setPrefsReady] = useState(false);
  useEffect(() => {
    let live = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async response => {
      const data = response.ok ? await response.json() as { user?: { id?: unknown } } : null;
      if (live && typeof data?.user?.id === "string") setUserId(data.user.id);
    }).catch(() => undefined).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const p = JSON.parse(localStorage.getItem("klybit-linux-reading") ?? "{}");
        if (typeof p.fontScale === "number" && Number.isFinite(p.fontScale)) setFontScale(Math.max(.85, Math.min(1.3, p.fontScale)));
        if (typeof p.language === "string") setLanguage(p.language);
      } catch { /* Reading preferences are optional. */ }
      setPrefsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (prefsReady) try { localStorage.setItem("klybit-linux-reading", JSON.stringify({ fontScale, language })); } catch { /* Works without storage. */ }
  }, [fontScale, language, prefsReady]);
  const signOut = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return false;
    setUserId(null); setAccountOpen(false); return true;
  };
  if (loading) return <main className="study-app min-h-screen"><p className="p-8" role="status">Loading your learning account…</p></main>;
  if (!userId) return <main className="study-app min-h-screen"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;
  return <GoogleSubtitleProvider language={language}><main className="study-app linux-app font-scale-content" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell linux-app-shell">
      <aside className="app-sidebar"><AppBrand subtitle="Cloud, servers & networking" /><SimpleNavigation active="workspace" items={[
        { key: "workspace", label: "Linux workspace", href: "/linux", icon: <Terminal size={18} /> },
        { key: "windows", label: "Windows Server", href: "/", icon: <Server size={18} /> },
        { key: "cisco", label: "Cisco learning", href: "/ccna/learning", icon: <BookOpen size={18} /> },
      ]} /><div className="linux-sidebar-note"><ShieldCheck size={20} /><strong><GoogleSubtitle text="A safe place to experiment" /></strong><p><GoogleSubtitle text="Your terminal changes stay inside this browser's practice workspace." /></p></div></aside>
      <section className="app-content linux-app-content"><StudyHeader title="Linux terminal lab" course="Linux" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} /><LinuxWorkspace key={userId} userId={userId} /></section>
    </div>{accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}

export function LinuxWorkspace({ userId }: { userId: string }) {
  const storageKey = `klybit-linux:v1:${userId}`;
  const [session, setSession] = useState<LinuxSession>(createLinuxSession);
  const [entries, setEntries] = useState<Entry[]>([intro]);
  const [history, setHistory] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const unsent = useRef("");
  const [lessonId, setLessonId] = useState("001");
  const [tab, setTab] = useState<"terminal" | "files" | "services">("terminal");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading workspace…");
  const input = useRef<HTMLInputElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && saved.length < 3000000) {
          const p = JSON.parse(saved);
          if (p.version === 1 && isLinuxSession(p.session)) {
            setSession(p.session);
            if (Array.isArray(p.entries)) setEntries(p.entries.filter((e: Entry) => typeof e?.prompt === "string" && typeof e.command === "string" && Array.isArray(e.output) && e.output.every(line => typeof line === "string")).slice(-150));
            if (Array.isArray(p.history)) setHistory(p.history.filter((c: unknown) => typeof c === "string").slice(-120));
            if (linuxLessons.some(lesson => lesson.id === p.lessonId)) setLessonId(p.lessonId);
            setSaveStatus("Saved workspace resumed");
          } else setSaveStatus("Started a fresh workspace; the previous save was incompatible");
        } else setSaveStatus("Workspace ready");
      } catch { setSaveStatus("Workspace ready · browser storage unavailable or invalid"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, session, entries, history, lessonId })); }
    catch { const timer = window.setTimeout(() => setSaveStatus("Session active · unable to save in this browser"), 0); return () => window.clearTimeout(timer); }
  }, [ready, session, entries, history, lessonId, storageKey]);
  useEffect(() => { if (screen.current) screen.current.scrollTop = screen.current.scrollHeight; }, [entries, draft, tab, ready]);
  const lesson = linuxLessons.find(l => l.id === lessonId)!;
  const results = linuxLessonResults(session, lessonId);
  const all = linuxLessons.flatMap(l => linuxLessonResults(session, l.id));
  const completed = linuxLessons.filter(l => linuxLessonResults(session, l.id).every(s => s.passed)).length;
  const percent = Math.floor(all.filter(s => s.passed).length / all.length * 100);
  const nextLesson = linuxLessons[linuxLessons.findIndex(l => l.id === lessonId) + 1];
  const lessonDone = results.every(r => r.passed);
  const execute = () => {
    if (!ready || !draft.trim()) return;
    const command = draft;
    const result = runLinuxCommand(session, command);
    setSession(result.session);
    setEntries(previous => command.trim() === "clear" && result.exitCode === 0 ? [] : [...previous, { prompt: linuxPrompt(session), command, output: result.output.slice(-160), failed: result.exitCode !== 0 }].slice(-150));
    setHistory(previous => [...previous, command].slice(-120));
    setDraft(""); setHistoryIndex(-1); unsent.current = "";
  };
  const reset = () => {
    if (!window.confirm("Reset this Linux workspace only? Your simulated files, packages, services and progress will return to the starting state.")) return;
    setSession(createLinuxSession()); setEntries([intro]); setHistory([]); setDraft(""); setHistoryIndex(-1); setLessonId("001"); setTab("terminal"); setSaveStatus("Linux workspace reset");
  };
  if (!ready) return <p role="status">Loading your saved Linux workspace…</p>;
  return <section className="linux-workspace">
    <div className="linux-welcome"><div><p className="linux-eyebrow"><Terminal size={15} /> RHEL-STYLE LEARNING SIMULATION</p><h2><GoogleSubtitle text="Small commands. Real understanding." /></h2><p><GoogleSubtitle text="Learn by changing files, permissions and services in one evolving practice machine." /></p></div><div className="linux-overall"><strong>{percent}%</strong><span>{completed}/{linuxLessons.length} lessons</span><progress value={percent} max={100} aria-label="Linux learning progress" /></div></div>
    <div className="linux-workspace-bar"><span className="linux-save-status" role="status"><span className="linux-status-dot" /><GoogleSubtitle text={saveStatus} /></span><button type="button" onClick={reset}><RotateCcw size={14} /><GoogleSubtitle text="Reset Linux workspace" /></button></div>
    <div className="linux-lab-layout">
      <aside className="linux-lessons" id="linux-guide"><h3><BookOpen size={16} /><GoogleSubtitle text="Your learning path" /></h3><div className="linux-lesson-list">{linuxLessons.map(l => {
        const checks = linuxLessonResults(session, l.id); const done = checks.every(s => s.passed);
        return <button type="button" key={l.id} aria-current={lessonId === l.id ? "step" : undefined} onClick={() => setLessonId(l.id)}><span className={done ? "is-passed" : ""}>{done ? <Check size={15} /> : l.id.slice(1)}</span><span><strong><GoogleSubtitle text={l.title} /></strong><small>{checks.filter(c => c.passed).length}/{checks.length} checks</small></span><ChevronRight size={14} /></button>;
      })}</div><div className="linux-task"><p className="linux-eyebrow">LESSON {lesson.id}</p><h3><GoogleSubtitle text={lesson.title} /></h3><p><GoogleSubtitle text={lesson.summary} /></p><ul className="linux-checks">{results.map(r => <li key={r.id} className={r.passed ? "is-passed" : ""}><span>{r.passed ? <CheckCircle2 size={17} /> : <span className="linux-check-empty" />}</span><GoogleSubtitle text={r.title} /></li>)}</ul><details><summary><HelpCircle size={14} /> <GoogleSubtitle text="Need a hint?" /></summary>{results.filter(r => !r.passed).map(r => <div key={r.id}><p><GoogleSubtitle text={r.title} /></p><pre>{r.hint}</pre></div>)}{lessonDone && <p>All checks passed.</p>}</details><details><summary><BookOpen size={14} /> <GoogleSubtitle text="Why this works" /></summary><p><GoogleSubtitle text={lesson.why} /></p></details>{lessonDone && nextLesson && <button className="linux-next" type="button" onClick={() => setLessonId(nextLesson.id)}><GoogleSubtitle text="Next lesson" /><ArrowRight size={16} /></button>}</div></aside>
      <div className="linux-machine"><div className="linux-mobile-goal"><strong><GoogleSubtitle text={lesson.title} /></strong><p><GoogleSubtitle text={results.find(r => !r.passed)?.title ?? "All checks passed. Choose your next lesson below."} /></p><a href="#linux-guide">Lesson & hints ↓</a></div><div className="linux-machine-tabs" role="tablist" aria-label="Practice machine view">{(["terminal", "files", "services"] as const).map(t => <button type="button" key={t} role="tab" id={`linux-tab-${t}`} aria-selected={tab === t} aria-controls={`linux-panel-${t}`} onClick={() => setTab(t)}>{t === "terminal" ? <Terminal size={15} /> : t === "files" ? <Folder size={15} /> : <Server size={15} />}<GoogleSubtitle text={t === "terminal" ? "Terminal" : t === "files" ? "Virtual files" : "Services"} /></button>)}<span><span className="linux-status-dot" />training-rhel</span></div>
        {tab === "terminal" && <div role="tabpanel" id="linux-panel-terminal" aria-labelledby="linux-tab-terminal" className="linux-terminal-panel"><div className="linux-terminal-heading"><span className="linux-window-dots" aria-hidden="true"><i /><i /><i /></span><span>learner@training-rhel — shell</span><span>SIMULATED</span></div><div className="linux-terminal-screen" ref={screen} onClick={event => { if (!(event.target instanceof HTMLInputElement) && !window.getSelection()?.toString()) input.current?.focus({ preventScroll: true }); }}>
          <div className="linux-transcript" role="log" aria-label="Linux terminal output" aria-live="polite" aria-relevant="additions">{entries.map((entry, i) => <div className="linux-terminal-entry" key={i}>{entry.command && <div><span className="linux-prompt">{entry.prompt}</span> {entry.command}</div>}{entry.output.length > 0 && <pre className={entry.failed ? "linux-error" : ""}>{entry.output.join("\n")}</pre>}</div>)}</div>
          <form className="linux-command-line" onSubmit={event => { event.preventDefault(); if (!composing.current) execute(); }}><label htmlFor="linux-command" className="linux-prompt">{linuxPrompt(session)}</label><input id="linux-command" ref={input} aria-label="Linux terminal command" value={draft} onChange={event => setDraft(event.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" enterKeyHint="send" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => {
            if (composing.current || event.nativeEvent.isComposing) { if (event.key === "Enter") event.preventDefault(); return; }
            if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); setEntries([]); }
            else if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); setEntries(p => [...p, { prompt: linuxPrompt(session), command: `${draft}^C`, output: [], failed: false }].slice(-150)); setDraft(""); setHistoryIndex(-1); }
            else if (event.key === "ArrowUp") { event.preventDefault(); if (!history.length) return; if (historyIndex === -1) unsent.current = draft; const i = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(i); setDraft(history[i]); }
            else if (event.key === "ArrowDown") { event.preventDefault(); if (historyIndex === -1) return; const i = historyIndex + 1; setHistoryIndex(i >= history.length ? -1 : i); setDraft(i >= history.length ? unsent.current : history[i]); }
            else if (event.key === "Tab" && draft && !/\s/.test(draft)) { const matches = commands.filter(c => c.startsWith(draft)); if (matches.length === 1) { event.preventDefault(); setDraft(`${matches[0]} `); } }
          }} /><button type="submit" aria-label="Run Linux command"><Play size={13} /></button></form>
        </div><div className="linux-terminal-footer"><span>{session.cwd}</span><span>↑ ↓ history · Ctrl+L clear · Ctrl+C cancel</span></div></div>}
        {tab === "files" && <div className="linux-inspector" role="tabpanel" id="linux-panel-files" aria-labelledby="linux-tab-files"><h3><Folder size={17} /><GoogleSubtitle text="Practice files" /></h3><p><GoogleSubtitle text="This view reflects your virtual filesystem, not files on your computer." /></p><ul>{Object.entries(session.files).filter(([path]) => path === "/home/learner" || path.startsWith("/home/learner/")).sort(([a], [b]) => a.localeCompare(b)).map(([path, node]) => <li key={path}><div>{node.kind === "directory" ? <Folder size={15} /> : <FileText size={15} />}<code>{path.replace("/home/learner", "~")}</code><small>{node.mode.toString(8)}</small></div>{node.kind === "file" && <pre>{node.content || "(empty file)"}</pre>}</li>)}</ul></div>}
        {tab === "services" && <div className="linux-inspector" role="tabpanel" id="linux-panel-services" aria-labelledby="linux-tab-services"><h3><Server size={17} /><GoogleSubtitle text="Service state" /></h3><p><GoogleSubtitle text="Running now and enabled at startup are measured separately." /></p><div className="linux-service-table"><table><thead><tr><th>Service</th><th>Package</th><th>Runtime</th><th>Startup</th></tr></thead><tbody>{Object.entries(session.services).map(([name, service]) => <tr key={name}><th>{name}</th><td>{session.packages[service.package] ? "Installed" : "Not installed"}</td><td className={service.running ? "is-passed" : ""}>{service.running ? "Active" : "Inactive"}</td><td className={service.enabled ? "is-passed" : ""}>{service.enabled ? "Enabled" : "Disabled"}</td></tr>)}</tbody></table></div></div>}
        <div className="linux-machine-status"><span><Package size={16} />httpd: {session.packages.httpd ? "installed" : "not installed"}</span><span><Server size={16} />httpd: {session.services.httpd?.running ? "active" : "inactive"}</span><span><ShieldCheck size={16} /><GoogleSubtitle text="Browser-only sandbox" /></span></div>
        <details id="linux-command-reference" className="linux-reference"><summary><HelpCircle size={16} /><GoogleSubtitle text="Supported commands & limitations" /></summary><p><GoogleSubtitle text="This educational model supports selected command forms, not a complete RHEL system. It has no real processes, package downloads, SSH server, external network or kernel. Unsupported commands and options return an explicit error. sudo models permissions; do not enter real passwords." /></p><p><code>{commands.join(" · ")}</code></p><p><GoogleSubtitle text="Type help or man followed by a supported command for its available syntax. The help output is authoritative for this simulation." /></p>{linuxSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</details>
      </div>
    </div>
  </section>;
}
