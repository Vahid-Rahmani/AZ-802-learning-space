"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, FlaskConical, Save, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleSubtitle } from "./google-translate";
import { labEmployees, labPermissionMatrix, serverLabs, type ServerLab } from "@/lib/content/server-labs";
import { emptyServerLabState, gradeServerLab, parseServerLabState, type LabOutcome, type ServerLabState } from "@/lib/server-lab-state";

type Grade = ReturnType<typeof gradeServerLab>;
type SavedLab = { state: ServerLabState; grade: Grade; evidenceUrl?: string | null };
const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;

export function WindowsServerLabs({ userId, legacy }: { userId: string | null; legacy: ReactNode }) {
  return <LearningLabPath userId={userId} labs={serverLabs} kicker="Windows Server · independent lab path" title="Build it. Test it. Explain it." intro="Turn the supplied server assignments into your own working domain, users, permissions and security tests. Azure labs are unchanged." legacy={legacy} />;
}

export function LearningLabPath({ userId, labs, kicker, title, intro, legacy, resumeLatest = false, initialLabId }: { userId: string | null; labs: ServerLab[]; kicker: string; title: string; intro: string; legacy?: ReactNode; resumeLatest?: boolean; initialLabId?: string }) {
  const [selected, setSelected] = useState(initialLabId ?? labs[0].id);
  const selectionTouched = useRef(false);
  const selectLab = (id: string) => { selectionTouched.current = true; setSelected(id); };
  const [summaries, setSummaries] = useState<Record<string, Grade>>({});
  useEffect(() => {
    let alive = true;
    void fetch("/api/lab-submissions").then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { submissions?: { labId: string; evidenceText: string; updatedAt?: string }[] };
      const grades: Record<string, Grade> = {};
      for (const row of payload.submissions ?? []) {
        const lab = labs.find((item) => item.id === row.labId);
        if (!lab) continue;
        try { const state = parseServerLabState(JSON.parse(row.evidenceText), lab); if (state) grades[lab.id] = gradeServerLab(lab, state); } catch { /* Older submissions use free-form evidence, not this format. */ }
      }
      if (alive) {
        setSummaries(grades);
        if (resumeLatest && !selectionTouched.current) {
          const recent = (payload.submissions ?? []).filter((row) => grades[row.labId]).sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0))[0];
          if (recent) setSelected(recent.labId);
        }
      }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [userId, labs, resumeLatest]);
  const lab = labs.find((item) => item.id === selected) ?? labs[0];
  const index = labs.indexOf(lab);
  const completed = Object.values(summaries).filter((grade) => grade.complete).length;
  return <div className="server-labs-workspace">
    <header className="server-labs-heading"><div><p className="server-lab-kicker"><Copy text={kicker} /></p><h2><Copy text={title} /></h2><p><Copy text={intro} /></p></div><span className="server-lab-badge"><FlaskConical size={20} /> {completed} / {labs.length} <Copy text="labs complete" /></span></header>
    <nav className="server-lab-library" aria-label={`${kicker} stages`}>{labs.map((item, i) => <button type="button" key={item.id} aria-current={selected === item.id ? "step" : undefined} onClick={() => selectLab(item.id)}><span className="server-lab-number">{summaries[item.id]?.complete ? <CheckCircle2 size={20} /> : i + 1}</span><span><strong><Copy text={item.title} /></strong><span className="server-lab-meta"><Copy text={`${item.minutes} min · ${item.tests.length} practical tests · ${item.questions.length} quiz questions`} /></span></span></button>)}</nav>
    <ServerLabWorkspace key={`${userId}:${lab.id}`} lab={lab} userId={userId} onSaved={(grade) => setSummaries((previous) => ({ ...previous, [lab.id]: grade }))} />
    <div className="server-lab-navigation"><button type="button" disabled={index === 0} onClick={() => selectLab(labs[index - 1].id)}><ChevronLeft size={18} /><Copy text="Previous lab" /></button><button type="button" disabled={index === labs.length - 1} onClick={() => selectLab(labs[index + 1].id)}><Copy text="Next lab" /><ChevronRight size={18} /></button></div>
    {legacy && <details className="server-lab-legacy"><summary><Copy text="Existing two-server hardening lab" /></summary><div className="mt-5">{legacy}</div></details>}
  </div>;
}

function ServerLabWorkspace({ lab, userId, onSaved }: { lab: ServerLab; userId: string | null; onSaved: (grade: Grade) => void }) {
  const [saved, setSaved] = useState<SavedLab | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Loading saved progress…");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [explained, setExplained] = useState(false);
  const live = useRef(true);
  const draft = useRef<SavedLab | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);

  const load = async () => {
    try {
      const response = await fetch(`/api/server-labs/${lab.id}`);
      const result = await response.json() as SavedLab & { error?: string };
      if (!response.ok) throw new Error(result.error || "Sign in to load your lab progress.");
      if (!live.current) return;
      draft.current = result;
      setSaved(result);
      setStatus("Saved to your account");
    } catch (failure) {
      if (live.current) { setError(failure instanceof Error ? failure.message : "Could not load your lab."); setStatus("Not loaded — no progress has been reset"); }
    }
  };
  useEffect(() => {
    live.current = true;
    void Promise.resolve().then(load);
    return () => { live.current = false; };
    // Lab/account changes remount this component and isolate both draft and save queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab.id, userId]);

  const save = (state: ServerLabState, evidenceUrl?: string | null) => {
    const previous = draft.current;
    if (!previous) return;
    const next = { ...previous, state, ...(evidenceUrl !== undefined ? { evidenceUrl } : {}) };
    draft.current = next;
    setSaved(next);
    setError("");
    setStatus("Saving…");
    const ticket = ++revision.current;
    // Serialize immediate writes so typing, navigation and repeated saves cannot reorder checkpoints.
    queue.current = queue.current.catch(() => undefined).then(async () => {
      try {
        const response = await fetch(`/api/server-labs/${lab.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state, userId, ...(next.evidenceUrl !== undefined ? { evidenceUrl: next.evidenceUrl } : {}) }) });
        const result = await response.json() as SavedLab & { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not save. Retry before closing the page.");
        if (live.current && ticket === revision.current) {
          const accepted = { ...next, state: result.state, grade: result.grade };
          draft.current = accepted;
          setSaved(accepted);
          setStatus("Saved to your account");
          onSaved(result.grade);
        }
      } catch (failure) {
        if (live.current && ticket === revision.current) { setError(failure instanceof Error ? failure.message : "Could not save."); setStatus("Unsaved changes — retry"); }
      }
    });
  };
  const change = (update: (state: ServerLabState) => ServerLabState) => {
    if (draft.current) save(update(draft.current.state));
  };
  const upload = async () => {
    if (!file || uploading || !draft.current) return;
    if (file.size > 8 * 1024 * 1024) { setError("Evidence files must be 8 MB or smaller."); return; }
    setUploading(true);
    setError("");
    try {
      const form = new FormData(); form.set("labId", lab.id); form.set("file", file);
      const response = await fetch("/api/evidence", { method: "POST", body: form });
      const result = await response.json() as { key?: string; error?: string };
      if (!response.ok || !result.key) throw new Error(result.error || "Upload failed. Your notes are still available.");
      if (live.current && draft.current) save(draft.current.state, result.key);
    } catch (failure) { if (live.current) setError(failure instanceof Error ? failure.message : "Upload failed."); }
    finally { if (live.current) setUploading(false); }
  };
  const state = saved?.state ?? emptyServerLabState();
  const tab = state.activeTab;
  const questionIndex = state.questionIndex;
  const setTab = (value: string) => change((current) => ({ ...current, activeTab: value as ServerLabState["activeTab"] }));
  const setQuestionIndex = (update: (index: number) => number) => change((current) => ({ ...current, questionIndex: update(current.questionIndex) }));
  const question = lab.questions[questionIndex];
  const answer = state.answers[question.id];
  const docker = lab.id.startsWith("docker-");
  const ccna = lab.id.startsWith("ccna-");

  return <article className="server-lab-panel" aria-labelledby={`${lab.id}-title`}>
    <div className="server-lab-title-row"><div><p className="server-lab-kicker"><Copy text={lab.assignment} /></p><h3 id={`${lab.id}-title`}><Copy text={lab.title} /></h3><p><Copy text={lab.goal} /></p></div><a href={ccna ? `/ccna#${lab.id}` : docker ? `/docker#${lab.id}` : `/?view=lesson&stage=${lab.lessonId}`} onClick={(event) => { event.preventDefault(); if (docker || ccna) setTab("build"); else window.dispatchEvent(new CustomEvent("wincraft:lab-lesson", { detail: lab.lessonId })); }} className="server-lab-lesson"><BookOpen size={18} /><Copy text={docker || ccna ? "Lesson & commands" : "Related lesson"} /></a></div>
    <div className="server-lab-save-bar"><span role="status" aria-live="polite"><Save size={17} /><Copy text={status} /></span>{saved && <button type="button" onClick={() => save(state)}><Copy text="Save / retry" /></button>}</div>
    {error && <p role="alert" className="server-lab-error"><Copy text={error} />{!saved && <button type="button" onClick={() => { setError(""); setStatus("Loading saved progress…"); void load(); }}><Copy text="Retry loading" /></button>}</p>}
    {!saved ? <p className="server-lab-notice"><Copy text="Your lab opens only after your account's saved progress has loaded. A load error will never replace previous work with an empty draft." /></p> : <>
      <div className="server-lab-progress"><span><Copy text={`${state.stepIds.length}/${lab.steps.length} build steps`} /></span><span><Copy text={`Practical checklist: ${saved.grade.practicalPercent}% (self-reported)`} /></span><span><Copy text={saved.grade.quizPercent === null ? "Knowledge check: not submitted" : `Knowledge check: ${saved.grade.quizPercent}%`} /></span>{saved.grade.complete && <strong><CheckCircle2 size={18} /><Copy text="Lab complete — self-reported evidence" /></strong>}</div>
      <Tabs value={tab} onValueChange={setTab} className="server-lab-tabs"><TabsList aria-label="Lab workflow"><TabsTrigger value="build"><Copy text="1 · Build" /></TabsTrigger><TabsTrigger value="test"><Copy text="2 · Test" /></TabsTrigger><TabsTrigger value="quiz"><Copy text="3 · Quiz & Explain" /></TabsTrigger><TabsTrigger value="evidence"><Copy text="4 · Evidence" /></TabsTrigger></TabsList>
        <TabsContent value="build"><section className="server-lab-prerequisites"><h4><ShieldCheck size={20} /><Copy text="Before you start" /></h4><ul>{lab.prerequisites.map((item) => <li key={item}><Copy text={item} /></li>)}</ul></section>
          {lab.topology ? <CourseTopology topology={lab.topology} /> : docker ? <DockerTopology /> : <LabTopology />}
          {lab.id === "ws-lab-identities" && <Roster />}
          {lab.id === "ws-lab-permissions" && <PermissionMatrix />}
          <ol className="server-lab-steps">{lab.steps.map((step, i) => <li key={step.title}><div className="server-lab-step-heading"><Checkbox id={`${lab.id}-step-${i}`} checked={state.stepIds.includes(String(i))} onCheckedChange={(checked) => change((current) => ({ ...current, stepIds: checked === true ? [...new Set([...current.stepIds, String(i)])] : current.stepIds.filter((id) => id !== String(i)) }))} /><label htmlFor={`${lab.id}-step-${i}`}><strong>{i + 1}. <Copy text={step.title} /></strong></label></div><p><Copy text={step.instruction} /></p>{step.command && <pre tabIndex={0} aria-label={`${ccna ? "Cisco IOS / worksheet" : docker ? "Docker / file" : "PowerShell"} reference for step ${i + 1}`}><code>{step.command}</code></pre>}<details className="server-lab-explain"><summary><Copy text="Explain this step" /></summary><p><Copy text={step.explain} /></p></details></li>)}</ol><button type="button" className="server-lab-primary" onClick={() => setTab("test")}><Copy text="Continue to practical tests" /><ChevronRight size={18} /></button></TabsContent>
        <TabsContent value="test"><p className="server-lab-notice"><Copy text={ccna ? "Run these tests in your isolated simulator or offline worksheet. Record actual observations; the site grades the quiz but cannot inspect or certify your network." : docker ? "Run the commands on your own lab engine. Record actual observations, not assumed success. The site grades the quiz but cannot inspect or certify your containers." : "Run these tests on your own VMs. Pass means the actual result matches the expected result — including an expected Access denied. The site checks your checklist and grades the quiz; it cannot inspect or certify your VM."} /></p>{lab.tests.map((test) => { const result = state.results[test.id]; return <section key={test.id} className="server-lab-test"><h4><Copy text={test.title} /></h4><p><Copy text={test.procedure} /></p><div className="server-lab-expected"><strong><Copy text="Expected result" /></strong><Copy text={test.expected} /></div><label htmlFor={`${lab.id}-${test.id}-outcome`}><Copy text="Observed outcome" /></label><Select value={result?.outcome ?? "not-run"} onValueChange={(value) => change((current) => ({ ...current, results: { ...current.results, [test.id]: { note: current.results[test.id]?.note ?? "", outcome: value as LabOutcome } } }))}><SelectTrigger id={`${lab.id}-${test.id}-outcome`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not-run">Not tested</SelectItem><SelectItem value="pass">Pass — matches expected</SelectItem><SelectItem value="fail">Fail — needs correction</SelectItem></SelectContent></Select><label htmlFor={`${lab.id}-${test.id}-note`}><Copy text="Evidence: account, machine, time, actual result (minimum 8 characters)" /></label><textarea id={`${lab.id}-${test.id}-note`} maxLength={2000} value={result?.note ?? ""} onChange={(event) => change((current) => ({ ...current, results: { ...current.results, [test.id]: { outcome: current.results[test.id]?.outcome ?? "not-run", note: event.target.value } } }))} placeholder="Record what actually happened; never include passwords." /></section>; })}<button type="button" className="server-lab-primary" onClick={() => setTab("quiz")}><Copy text="Continue to knowledge check" /><ChevronRight size={18} /></button></TabsContent>
        <TabsContent value="quiz"><p className="server-lab-notice"><Copy text={ccna ? "Original Cisco-referenced learning questions — not real CCNA exam questions. Answers and question position save to your account." : docker ? "Original Docker learning questions — not a certification exam. Answers and progress save to your account." : "Original learning questions based on this lab and Microsoft Learn — not real certification exam questions. Answers and progress save to your account."} /></p><div className="server-lab-quiz"><p className="server-lab-kicker"><Copy text={`Question ${questionIndex + 1} of ${lab.questions.length}`} /></p>{question.objective && <p className="server-lab-meta"><Copy text={`CCNA v1.1 objective ${question.objective}`} /></p>}<h4><Copy text={question.text} /></h4><div role="group" aria-label="Answer options" className="server-lab-options">{question.options.map((option, i) => <button type="button" key={option} aria-pressed={answer === i} disabled={state.quizSubmitted} className={`${answer === i ? "is-selected" : ""} ${state.quizSubmitted && i === question.correct ? "is-correct" : ""} ${state.quizSubmitted && answer === i && i !== question.correct ? "is-wrong" : ""}`} onClick={() => change((current) => ({ ...current, answers: { ...current.answers, [question.id]: i } }))}><span>{String.fromCharCode(65 + i)}.</span><Copy text={option} /></button>)}</div>{state.quizSubmitted && <p className={answer === question.correct ? "server-lab-correct" : "server-lab-error"}><Copy text={answer === question.correct ? "+ Correct" : "− Incorrect — review the explanation"} /></p>}<button type="button" aria-expanded={explained} onClick={() => setExplained((value) => !value)} className="server-lab-explain-button"><Copy text={explained ? "Close explanation" : "Explain this question"} /></button>{explained && <section className="server-lab-question-explain"><h5><Copy text="Why this answer fits" /></h5><strong><Copy text={question.options[question.correct]} /></strong><p><Copy text={question.explain} /></p><a href={question.source} target="_blank" rel="noreferrer"><Copy text={ccna ? "Official Cisco source" : docker ? "Docker Docs source" : "Microsoft Learn source"} /> ↗</a></section>}<div className="server-lab-navigation"><button type="button" disabled={questionIndex === 0} onClick={() => { setQuestionIndex((i) => i - 1); setExplained(false); }}><ChevronLeft size={18} /><Copy text="Previous question" /></button><button type="button" disabled={questionIndex === lab.questions.length - 1} onClick={() => { setQuestionIndex((i) => i + 1); setExplained(false); }}><Copy text="Next question" /><ChevronRight size={18} /></button></div>{state.quizSubmitted ? <><p><Copy text={`Server-graded result: ${saved.grade.quizPercent ?? "Saving…"}% · ${saved.grade.correct}/${lab.questions.length} correct`} /></p><button type="button" onClick={() => change((current) => ({ ...current, quizSubmitted: false, answers: {} }))}><Copy text="Retry knowledge check" /></button></> : <button type="button" className="server-lab-primary" disabled={lab.questions.some((item) => state.answers[item.id] === undefined)} onClick={() => change((current) => ({ ...current, quizSubmitted: true }))}><Copy text="Submit knowledge check" /></button>}</div></TabsContent>
        <TabsContent value="evidence"><p className="server-lab-notice"><Copy text="Completion requires all build checks, all practical tests passed with evidence notes, at least 80% on the quiz and a final summary. Practical outcomes are self-reported, not independently verified." /></p><label htmlFor={`${lab.id}-evidence`}><strong><Copy text="Final lab report" /></strong></label><textarea id={`${lab.id}-evidence`} maxLength={8000} value={state.evidenceText} onChange={(event) => change((current) => ({ ...current, evidenceText: event.target.value }))} placeholder={ccna ? "Topology, interface names, IP plan, actual tests, repaired faults and final state. No passwords or keys." : docker ? "Engine/context, image tags, port mappings, observed tests and scoped cleanup. No passwords or tokens." : "Topology, users/groups, tests, failures fixed, final safe state. No passwords or EICAR content."} /><label htmlFor={`${lab.id}-file`}><Copy text="Attach benign evidence (maximum 8 MB)" /></label><input id={`${lab.id}-file`} type="file" accept="image/*,.txt,.log,.json,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><button type="button" disabled={!file || uploading} onClick={() => void upload()}><Copy text={uploading ? "Uploading…" : "Upload evidence"} /></button>{saved.evidenceUrl && <a href={`/api/evidence?key=${encodeURIComponent(saved.evidenceUrl)}`} target="_blank" rel="noreferrer"><Copy text="View saved evidence" /> ↗</a>}<button type="button" className="server-lab-primary" onClick={() => save(state)}><Save size={18} /><Copy text="Save final report" /></button></TabsContent>
      </Tabs>
    </>}
    <footer className="server-lab-sources"><strong><Copy text="Official references · reviewed 2026-10-01" /></strong>{lab.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><Copy text={source.title} /> ↗</a>)}</footer>
  </article>;
}

function CourseTopology({ topology }: { topology: NonNullable<ServerLab["topology"]> }) {
  return <figure className="server-lab-topology"><figcaption><Copy text={topology.title} /></figcaption><div>{topology.nodes.flatMap((node, i) => [...(i ? [<span key={`arrow-${i}`} aria-hidden="true">↔</span>] : []), <span key={node.title}><strong><Copy text={node.title} /></strong><Copy text={node.detail} /></span>])}</div><p><Copy text={topology.note} /></p></figure>;
}

function DockerTopology() {
  return <figure className="server-lab-topology"><figcaption><Copy text="From source to a running service" /></figcaption><div><span><strong>Dockerfile + files</strong><Copy text="Build an image" /></span><span aria-hidden="true">→</span><span><strong>Docker Engine</strong><Copy text="Create and run containers" /></span><span aria-hidden="true">→</span><span><strong><Copy text="Application + storage" /></strong><Copy text="Network connects services; volumes retain data" /></span></div><p><Copy text="This learning path uses Linux containers. CLI commands run in your host terminal; commands after sh -c run inside the container. Website controls never execute them for you." /></p></figure>;
}

function LabTopology() {
  return <figure className="server-lab-topology"><figcaption><Copy text="Your isolated lab · 192.168.100.0/24" /></figcaption><div><span><strong>SERVER-DC</strong><Copy text="AD DS · DNS · 192.168.100.10" /></span><span aria-hidden="true">↔</span><span><strong>SERVER-APP01</strong><Copy text="Member server · SMB · 192.168.100.100" /></span><span aria-hidden="true">↔</span><span><strong><Copy text="Host / test client" /></strong><Copy text="Lab adapter · 192.168.100.1" /></span></div><p><Copy text="Use your actual subnet if different. The host represents the guest client only for network tests; run destructive or antivirus exercises inside VMs, never on the host." /></p></figure>;
}
function Roster() {
  return <section className="server-lab-roster"><h4><Copy text="Eight fictional lab users" /></h4><div>{labEmployees.map((user) => <article key={user.login}><strong>{user.login}</strong><Copy text={user.department} /><code>{user.group}</code><span>OU: {user.ou}</span></article>)}</div></section>;
}
function PermissionMatrix() {
  return <section className="server-lab-matrix"><h4><Copy text="Permission matrix · 30 access checks" /></h4><p><Copy text="Columns: Management, Accounting, Sales, Workshop, Interns. On mobile, scroll only the table horizontally." /></p><div tabIndex={0} role="region" aria-label="Scrollable permission matrix"><table><thead><tr>{["Folder", "Management", "Accounting", "Sales", "Workshop", "Interns"].map((title) => <th key={title} scope="col"><Copy text={title} /></th>)}</tr></thead><tbody>{labPermissionMatrix.map((row) => <tr key={row.folder}><th scope="row">{row.folder}</th>{row.rights.map((right, i) => <td key={i}><Copy text={right} /></td>)}</tr>)}</tbody></table></div></section>;
}
