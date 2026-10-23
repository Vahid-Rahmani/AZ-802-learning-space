"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardCheck, Download, FileText, Globe, Lightbulb, LockKeyhole, Monitor, Network, RotateCcw, Search, Server, ShieldCheck, Terminal, Wrench } from "lucide-react";
import { compareTypedCharacters } from "@/lib/german-learning-engine";
import { applySatztatAction, createSatztatProgress, getSatztatCaseResult, getSatztatSelfReviewEligibility, getSatztatSummary, parseSatztatProgress, SATZTAT_MAX_DRAFT, satztatCases, satztatDiagnostics, type SatztatAction, type SatztatCaseId, type SatztatDiagnostic, type SatztatProgress } from "@/lib/satztat-engine";

type View = "brief" | "investigate" | "report";
const views: { id: View; title: string }[] = [{ id: "brief", title: "Ticket" }, { id: "investigate", title: "Investigate & repair" }, { id: "report", title: "German report" }];
const positions = { pc: { left: "5%", top: "18%" }, sw: { left: "36%", top: "60%" }, dns: { left: "70%", top: "13%" }, file: { left: "70%", top: "67%" } };

function ResultMark({ done }: { done: boolean }) { return <span className={`st-check ${done ? "is-done" : ""}`} aria-label={done ? "Verified" : "Not yet verified"}>{done ? <Check size={12} /> : "○"}</span>; }

export function SatztatWorkspace({ userId, translationLanguage = "" }: { userId: string; translationLanguage?: string }) {
  const storageKey = `klybit-satztat:v1:${userId}`;
  const [progress, setProgress] = useState<SatztatProgress>(createSatztatProgress);
  const [caseId, setCaseId] = useState<SatztatCaseId>("dns-record");
  const [view, setView] = useState<View>("brief");
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading saved mission…");
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("pc");
  const [selfChecks, setSelfChecks] = useState<number[]>([]);
  const [now, setNow] = useState(Date.now);
  const reportInput = useRef<HTMLTextAreaElement>(null);
  const evidenceLog = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const translationContext = useRef("");
  const mission = satztatCases.find(item => item.id === caseId)!;
  const current = progress.cases[caseId];
  const result = getSatztatCaseResult(progress, caseId);
  const summary = getSatztatSummary(progress, now);
  const inReview = current.reviewStartedAt !== null;
  const reviewDue = current.reviewDueAt !== null && current.reviewDueAt <= now;
  const lastAttempt = current.attempts.at(-1);
  const lastWasReview = lastAttempt?.kind === "review";
  const lastReviewStart = current.log.filter(entry => entry.kind === "review" && entry.text.startsWith("Delayed recall started")).at(-1)?.at;
  const helpWindowStart = current.reviewStartedAt ?? (lastWasReview ? lastReviewStart ?? lastAttempt.at : null);
  const showAssistance = !(inReview || lastWasReview) || current.reviewAssisted;
  const showModel = current.revealed && (helpWindowStart === null || current.log.some(entry => entry.kind === "model" && entry.at >= helpWindowStart));
  const feedbackResult = lastWasReview ? lastAttempt.result : current.reportResult;
  const feedbackStyle = lastWasReview && !lastAttempt.independent ? "not-assessed" : feedbackResult;
  const feedbackTitle = lastWasReview ? lastAttempt.independent ? "Independent delayed recall recorded" : "Recall did not earn independent credit" : current.selfReview ? "Self-review recorded · not automatic verification" : feedbackResult === "verified" ? "Supported language form verified" : feedbackResult === "needs-repair" ? "A supported error to repair" : "Not automatically assessed";
  const attemptLabel = inReview ? "DELAYED RECALL · NOT A NEW TRANSFER TEST" : current.submissionCount > 0 ? "REVISION · FIRST SUBMISSION ALREADY RECORDED" : current.languageAssistance ? "ASSISTED PRACTICE" : "INDEPENDENT FIRST ATTEMPT";
  const draftUnchecked = !!lastAttempt && current.draft !== lastAttempt.answer;
  const selfReviewEligibility = getSatztatSelfReviewEligibility(caseId, current.draft);
  const lastObservation = current.observations.at(-1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw && raw.length < 300_000 ? JSON.parse(raw) : null;
        const restored = parseSatztatProgress(saved?.progress);
        if (restored) {
          setProgress(restored);
          const restoredId = satztatCases.some(item => item.id === saved.caseId) && getSatztatCaseResult(restored, saved.caseId).unlocked ? saved.caseId as SatztatCaseId : "dns-record";
          setCaseId(restoredId);
          const restoredView = views.some(item => item.id === saved.view) ? saved.view as View : "brief";
          setView(restoredView === "report" && !getSatztatCaseResult(restored, restoredId).technicalResolved ? "investigate" : restoredView);
          setSaveStatus("Mission resumed · saved in this browser");
        } else setSaveStatus(raw ? "Saved data could not be read · new mission started" : "Progress saves in this browser");
      } catch { setSaveStatus("Storage unavailable · progress will not survive closing this page"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (evidenceLog.current) evidenceLog.current.scrollTop = evidenceLog.current.scrollHeight; }, [caseId, current.log, ready]);
  useEffect(() => {
    if (!ready || !translationLanguage) { translationContext.current = ""; return; }
    const context = `${caseId}:${translationLanguage}:${current.reviewStartedAt ?? "report"}`;
    if (translationContext.current === context) return;
    translationContext.current = context;
    save(applySatztatAction(progress, caseId, { type: "language-hint" }, Date.now()));
    // Translation is exposure, not a new grading event on each draft edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, caseId, translationLanguage, current.reviewStartedAt]);

  function save(next: SatztatProgress, nextCase = caseId, nextView = view) {
    // Persist exposure before the render that reveals a model or hint.
    try { localStorage.setItem(storageKey, JSON.stringify({ progress: next, caseId: nextCase, view: nextView })); setSaveStatus("Saved · this browser only"); }
    catch { setSaveStatus("Could not save · keep this page open to retain this session"); }
    setProgress(next);
  }
  function dispatch(action: SatztatAction) { save(applySatztatAction(progress, caseId, action, Date.now())); }
  function navigate(next: View) {
    if (next === "report" && !result.technicalResolved) return;
    setView(next); save(progress, caseId, next);
  }
  function selectCase(nextId: SatztatCaseId) {
    if (!getSatztatCaseResult(progress, nextId).unlocked) return;
    const nextView = getSatztatCaseResult(progress, nextId).technicalResolved ? "report" : progress.cases[nextId].hypothesis ? "investigate" : "brief";
    setCaseId(nextId); setView(nextView); setSelfChecks([]); setSelectedDevice("pc"); save(progress, nextId, nextView);
  }
  function verify() {
    const checked = (["ipconfig", "dns-authoritative", "service-name"] as SatztatDiagnostic[]).reduce((state, diagnostic) => applySatztatAction(state, caseId, { type: "diagnostic", diagnostic }, Date.now()), progress);
    save(checked);
  }
  function insertCharacter(character: string) {
    const input = reportInput.current;
    if (!input) return;
    const start = input.selectionStart, end = input.selectionEnd;
    dispatch({ type: "draft", value: current.draft.slice(0, start) + character + current.draft.slice(end) });
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + character.length, start + character.length); });
  }
  function exportProgress() {
    try {
      const blob = new Blob([JSON.stringify({ format: "klybit-satztat", exportedAt: new Date().toISOString(), progress, caseId, view }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "klybit-satztat-progress.json"; link.click(); URL.revokeObjectURL(url);
    } catch { setSaveStatus("Export unavailable in this browser · your current mission is unchanged"); }
  }
  function reset() {
    const fresh = createSatztatProgress(); setCaseId("dns-record"); setView("brief"); setSelfChecks([]); setResetOpen(false); save(fresh, "dns-record", "brief");
  }
  const inspect = (id: string) => {
    setSelectedDevice(id);
    if (id === "sw") return; // Physical LAN is an explicitly healthy fixture, not a switch CLI.
    const diagnostic: SatztatDiagnostic = id === "dns" ? "dns-authoritative" : id === "file" ? "service-ip" : "ipconfig";
    dispatch({ type: "diagnostic", diagnostic });
  };
  const hintLog = current.log.filter(item => item.kind === "technical-hint").at(-1);
  const technicalLogs = current.log.filter(item => ["diagnostic", "repair", "notice"].includes(item.kind)).slice(-12);
  const completedChecks = [!!current.hypothesis.trim() || current.observations.length > 0, current.observations.length > 0, result.technicalResolved, result.languageVerified || current.selfReview];
  const verifiedCount = completedChecks.filter(Boolean).length;
  if (!ready) return <p role="status">Opening your saved incident desk…</p>;

  return <div className="st-workspace">
    <section className="st-hero" aria-labelledby="st-title"><div><p className="st-eyebrow"><Network size={14} /> SATZTAT · NETWORK INCIDENT DESK</p><h2 id="st-title">Detect. Repair. <span>Explain.</span></h2><p>A real problem to think through. A German sentence with a purpose.</p><div className="st-hero-tags"><span>Past counterfactuals</span><span>Text-first · no microphone needed</span><span>2 playable cases</span></div></div><div className="st-hero-progress"><span className="st-orbit" aria-hidden="true"><Network size={32} /></span><strong>{summary.completed}<small> / {summary.total}</small></strong><span>stories completed</span></div></section>

    <div className="st-session-bar"><span role="status">{saveStatus}</span><div><button type="button" onClick={exportProgress}><Download size={14} />Export</button><button type="button" onClick={() => setResetOpen(true)}><RotateCcw size={14} />Reset game</button></div></div>
    {resetOpen && <div className="st-reset-confirm" role="group" aria-label="Confirm game reset"><p>Reset these two game cases? Your existing German lessons and their progress will not change.</p><button type="button" onClick={reset}>Yes, reset game only</button><button type="button" onClick={() => setResetOpen(false)}>Cancel</button></div>}

    <nav className="st-case-nav" aria-label="Available incident cases">{satztatCases.map((item, index) => {
      const itemResult = getSatztatCaseResult(progress, item.id);
      return <button key={item.id} type="button" disabled={!itemResult.unlocked} aria-current={caseId === item.id ? "step" : undefined} onClick={() => selectCase(item.id)}><span className="st-case-number">{itemResult.storyCompleted ? <Check size={18} /> : itemResult.unlocked ? String(index + 1).padStart(2, "0") : <LockKeyhole size={17} />}</span><span><strong className="notranslate" lang="de" translate="no">{itemResult.unlocked ? item.title.replace(/^Fall \d+ · /u, "") : "Next incident"}</strong><small>{index === 0 ? "Guided investigation" : itemResult.unlocked ? "New cause · transfer case" : "Complete case 01 to unlock"}</small></span><ChevronRight size={16} /></button>;
    })}</nav>

    <div className="st-layout">
      <section className="st-case-panel" aria-labelledby="st-scene-heading"><div className="st-panel-heading"><div><span className="st-eyebrow">MADAR IT · INCIDENT {caseId === "dns-record" ? "01" : "02"}</span><h3 id="st-scene-heading">The scene</h3></div><span className="st-status-pill"><span aria-hidden="true">●</span> LAN links up</span></div>
        <div className="st-ticket"><FileText size={18} /><div><span>INCOMING TICKET</span><p className="notranslate" lang="de" translate="no">{mission.ticket}</p></div></div>
        <div className="st-topology" role="group" aria-label="Network scene. Select a device to inspect it."><svg viewBox="0 0 640 380" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="st-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".8" fill="#446080" /></pattern></defs><rect width="640" height="380" fill="url(#st-grid)" /><path d="M100 110 C100 245 300 130 300 265 M300 265 C455 265 390 90 520 90 M300 265 C400 265 435 300 520 300" /></svg>
          <span className="st-scene-caption">ONE COMPANY · ONE CONNECTED LAN</span>
          {mission.topology.map(device => <button key={device.id} type="button" className={`st-node st-node--${device.id}`} style={positions[device.id as keyof typeof positions]} aria-label={`Inspect ${device.label}`} aria-pressed={selectedDevice === device.id} onClick={() => inspect(device.id)}><span className="st-node-icon">{device.kind === "pc" ? <Monitor size={25} /> : device.kind === "switch" ? <Network size={25} /> : device.id === "dns" ? <Globe size={25} /> : <Server size={25} />}</span><strong>{device.label}</strong><small>{device.address ?? "LAN switch"}</small><span className="st-node-led" aria-hidden="true" /></button>)}
          <span className="st-scene-foot"><Search size={12} /> Inspect a client, DNS or server · LAN switch already healthy</span>
        </div>
        <details className="st-text-map"><summary>Text alternative · devices and addresses</summary><ul>{mission.topology.map(device => <li key={device.id}><strong>{device.label}</strong><span>{device.address ?? "Connects the devices on this LAN"}</span></li>)}</ul><p>All physical links are up. Address reachability, DNS resolution and application access must be tested separately.</p></details>
        <div className="st-tech-state"><ShieldCheck size={20} /><div><strong>{result.technicalResolved ? "Service verified by name" : result.needsFreshDiagnostics ? "Change made · fresh verification needed" : "Incident open · investigate the evidence"}</strong><span>Revision {current.network.revision} · {current.observations.filter(item => item.revision === current.network.revision).length} current observations</span></div></div>
      </section>

      <section className="st-task-panel" aria-labelledby="st-task-heading"><div className="st-panel-heading"><div><span className="st-eyebrow">YOUR NEXT MOVE</span><h3 id="st-task-heading">{inReview ? "Delayed recall" : view === "brief" ? "Understand the incident" : view === "investigate" ? "Follow the evidence" : "Write the handover"}</h3></div><span className="st-task-count">{verifiedCount}/4</span></div>
        <nav className="st-step-tabs" aria-label="Mission steps">{views.map((item, index) => <button key={item.id} type="button" aria-current={view === item.id ? "step" : undefined} disabled={item.id === "report" && !result.technicalResolved} onClick={() => navigate(item.id)}><span>{index + 1}</span>{item.title}</button>)}</nav>
        <div className="st-task-body">
          {view === "brief" && <><p className="st-lead">{mission.goal}</p><div className="st-context-card"><strong>Your role: support engineer</strong><p>Find the cause, verify a repair, then explain an earlier alternative in German. The technical result and the language result are recorded separately.</p></div><form onSubmit={event => { event.preventDefault(); if (current.hypothesis.trim()) navigate("investigate"); }}><label htmlFor="st-hypothesis">Your working hypothesis <small>English or German · not graded</small></label><textarea id="st-hypothesis" value={current.hypothesis} onChange={event => dispatch({ type: "hypothesis", value: event.target.value })} maxLength={1000} rows={3} placeholder="What could explain the difference between access by address and by name?" /><button className="st-primary" type="submit" disabled={!current.hypothesis.trim()}>Open the investigation<ArrowRight size={15} /></button></form><details className="st-bridge" onToggle={event => { if (event.currentTarget.open) dispatch({ type: "language-hint" }); }}><summary><BookOpen size={15} />Need a grammar bridge? <small>Assisted</small></summary><p>The report uses an unreal earlier alternative. You need Perfekt and verb-final subordinate clauses first. Opening help records language assistance; it does not prevent playing.</p><p className="notranslate" lang="de" translate="no">Perfekt: Wir haben etwas geprüft.<br />Nebensatz: …, weil wir etwas geprüft haben.</p><a href="/german">Practise the prerequisite German lessons →</a></details></>}

          {view === "investigate" && lastObservation && <div className="st-inline-result" role="status"><span>{lastObservation.revision === current.network.revision ? "LATEST OBSERVATION" : "OLDER OBSERVATION · RERUN AFTER YOUR CHANGE"}</span><pre>{lastObservation.text}</pre></div>}

          {view === "investigate" && <><p className="st-lead">Compare observations before choosing a change. All checks below run against the same authored case state.</p><div className="st-diagnostic-buttons">{satztatDiagnostics.map(diagnostic => <button key={diagnostic.id} type="button" onClick={() => dispatch({ type: "diagnostic", diagnostic: diagnostic.id })}><Terminal size={14} />{diagnostic.label}</button>)}</div><div className="st-repair-block"><h4><Wrench size={15} />Change desk</h4><p>Only the listed changes are simulated in this case.</p>{mission.repairs.map(repair => <button key={repair.id} type="button" onClick={() => dispatch({ type: "repair", repair: repair.id })}><ArrowRight size={13} />{repair.label}</button>)}</div><div className="st-verification"><h4><ClipboardCheck size={15} />Verification, not a manual checklist</h4>{(["ipconfig", "dns-authoritative", "service-name"] as SatztatDiagnostic[]).map(id => { const check = current.observations.find(item => item.diagnostic === id && item.revision === current.network.revision); return <div key={id}><ResultMark done={!!check?.ok} /><span>{id === "ipconfig" ? "Client uses the approved DNS server" : id === "dns-authoritative" ? "Authoritative name points to the service" : "TCP 445 works through client name resolution"}</span></div>; })}</div><button type="button" className="st-primary" onClick={verify}>Run verification checks<ShieldCheck size={15} /></button><button type="button" className="st-help-action" onClick={() => dispatch({ type: "technical-hint" })}><Lightbulb size={14} />Technical hint · recorded separately</button>{hintLog && <p className="st-hint" role="status">{hintLog.text}</p>}{result.technicalResolved && <button className="st-next-report" type="button" onClick={() => navigate("report")}>Repair verified. Write the German report<ArrowRight size={15} /></button>}</>}

          {view === "report" && <><p className="st-lead">{mission.reportPrompt}</p><div className="st-report-note"><span>{attemptLabel}</span><p>{inReview ? "Recall the learned form without reopening help. Your previous hints and notes stay hidden until you ask for help again." : "No live correctness colours here: construct your own sentence before checking. Recognised alternatives are accepted; unfamiliar formulations remain ungraded."}</p></div><form onSubmit={event => { event.preventDefault(); if (!composing.current) { setSelfChecks([]); dispatch({ type: inReview ? "review-report" : "submit-report" }); } }}><label htmlFor="st-report">Your German postmortem</label><textarea id="st-report" ref={reportInput} className="notranslate" lang="de" dir="ltr" translate="no" value={current.draft} onChange={event => dispatch({ type: "draft", value: event.target.value })} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} maxLength={SATZTAT_MAX_DRAFT} rows={6} autoCapitalize="sentences" autoCorrect="off" spellCheck={false} placeholder="Write your own German explanation…" aria-describedby="st-report-help" /><div className="st-input-tools"><div aria-label="German characters">{["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map(character => <button key={character} type="button" aria-label={`Insert ${character}`} onMouseDown={event => event.preventDefault()} onClick={() => insertCharacter(character)}>{character}</button>)}</div><span>{current.draft.length}/{SATZTAT_MAX_DRAFT}</span></div><p id="st-report-help" className="st-small">Local, reviewed answer set · not an AI grammar judge. {draftUnchecked ? "Your draft has changed; the previous result describes your last submission." : "Grammar evidence is separate from network verification."}</p><button type="submit" className="st-primary" disabled={!current.draft.trim()}>{inReview ? "Check delayed recall" : "Check my report"}<Check size={15} /></button></form>
            {!inReview && current.reportFeedback && <div className={`st-report-feedback st-report-feedback--${feedbackStyle}`} role="status"><strong>{feedbackTitle}</strong><p>{current.reportFeedback}</p></div>}
            {!inReview && current.reportResult === "not-assessed" && !selfReviewEligibility.eligible && <p className="st-small">{selfReviewEligibility.reason}</p>}
            {!inReview && current.reportResult === "needs-repair" && !draftUnchecked && <div className="st-character-review notranslate" lang="de" translate="no" aria-label="Post-submission character comparison against a teaching model">{compareTypedCharacters(mission.target, current.draft).map((character, index) => <span key={index} className={character.status === "incorrect" ? "st-letter-error" : "st-letter-ok"}>{character.character}</span>)}<small>After-check comparison to one model, not a judgment of every possible German sentence.</small></div>}
            <div className="st-report-tools"><button type="button" onClick={() => dispatch({ type: "language-hint" })}><Lightbulb size={14} />Grammar hint · assisted</button><button type="button" onClick={() => dispatch({ type: "reveal-model" })}><BookOpen size={14} />Show model · assisted</button></div>
            {showAssistance && current.hintLevel > 0 && <p className="st-hint">{mission.hints[current.hintLevel - 1]}</p>}
            {showModel && <div className="st-model"><span>TEACHING MODEL · EXPOSURE RECORDED</span><p className="notranslate" lang="de" translate="no">{mission.target}</p><small>Another valid clause order:</small><p className="notranslate" lang="de" translate="no">{mission.variants[0]}</p></div>}
            {!inReview && current.reportResult === "not-assessed" && <div className="st-self-review"><h4>Your sentence may be valid</h4><p>We cannot automatically verify this formulation. Reveal a model, compare these points and record a self-review to continue the story without claiming language verification.</p>{["My sentence describes an unreal earlier alternative", "The action and result match this incident", "I checked auxiliaries, participles and clause order"].map((text, index) => <label key={text}><input type="checkbox" checked={selfChecks.includes(index)} onChange={() => setSelfChecks(previous => previous.includes(index) ? previous.filter(item => item !== index) : [...previous, index])} />{text}</label>)}<button type="button" disabled={!current.revealed || selfChecks.length !== 3 || draftUnchecked || !selfReviewEligibility.eligible} onClick={() => dispatch({ type: "self-review" })}>Record self-review · no automatic credit</button></div>}
            <details className="st-glossary" onToggle={event => { if (event.currentTarget.open) dispatch({ type: "language-hint" }); }}><summary><CircleHelp size={14} />Words in context · assisted</summary>{mission.glossary.map(word => <p key={word.term}><strong className="notranslate" lang="de" translate="no">{word.term}</strong><span>{word.meaning}</span></p>)}</details>
          </>}
        </div>
      </section>
    </div>

    <section className="st-evidence-panel" aria-label="Collected technical evidence"><div className="st-panel-heading"><div><span className="st-eyebrow">OBSERVATIONS & CHANGES</span><h3>Evidence log</h3></div><span className="st-small">Bounded story simulation · not a live terminal</span></div><div ref={evidenceLog} className="st-evidence-log" tabIndex={0} aria-label="Scrollable technical evidence">{technicalLogs.length === 0 ? <p className="st-empty"><Search size={20} />Select a device or run a diagnostic to collect evidence.</p> : technicalLogs.map((entry, index) => <article key={`${entry.at}-${index}`}><span>{entry.kind === "diagnostic" ? "$ CHECK" : entry.kind === "repair" ? "CHANGE" : "NOTE"}</span><pre>{entry.text}</pre></article>)}</div></section>

    <section className="st-outcomes" aria-label="Separate learning outcomes"><article><ShieldCheck size={19} /><span>Technical repair</span><strong>{result.technicalResolved ? "Verified" : "Not yet verified"}</strong></article><article><FileText size={19} /><span>Language evidence</span><strong>{result.languageVerified ? "Supported form verified" : current.selfReview ? "Self-reviewed only" : "Not yet verified"}</strong></article><article><BookOpen size={19} /><span>Independent first response</span><strong>{result.independentLanguage ? "Observed in this case" : "Not yet observed"}</strong></article></section>
    {result.storyCompleted && <section className="st-complete" aria-label="Case completed"><span className="st-complete-icon"><Check size={24} /></span><div><p className="st-eyebrow">CASE CLOSED · KEEP LEARNING</p><h3>{current.selfReview ? "Incident resolved. Report self-reviewed." : "Incident resolved. Report verified."}</h3><p>{result.transferVerified ? "An unassisted supported response was observed in the new incident. This is evidence from one case, not a certificate of grammar mastery." : "The story is complete. Independent transfer and delayed recall are tracked separately."}</p></div>{caseId === "dns-record" && <button type="button" className="st-primary" onClick={() => selectCase("dns-client")}>Open the next incident<ArrowRight size={15} /></button>}</section>}

    <div className="st-bottom-grid"><section className="st-review-panel"><h3><RotateCcw size={16} />Return to the case</h3><p>{current.reviewDueAt === null ? "A verified language response schedules your first recall for the next day." : reviewDue ? "A delayed recall is ready. Previous hints and model sentences will be hidden during it." : `Next recall: ${new Date(current.reviewDueAt).toLocaleString()}`}</p><p className="st-small">Review level {current.reviewLevel}/4 · 1, 3, 7, 14-day starting intervals. Repeating today cannot create delayed-recall evidence.</p>{reviewDue && result.storyCompleted && !inReview && <button type="button" onClick={() => { const next = applySatztatAction(progress, caseId, { type: "start-review" }, Date.now()); save(next, caseId, "report"); setView("report"); }}>Start due recall</button>}</section><details className="st-dossier"><summary><FileText size={16} />Your language case file <span>{current.attempts.filter(attempt => attempt.result === "needs-repair").length} supported repairs</span></summary>{inReview && !current.reviewAssisted ? <p>Previous answers stay hidden during independent recall.</p> : <><p className="st-small">Saved examples from your submissions, not an automatic diagnosis of all German grammar.</p>{current.attempts.filter(attempt => attempt.result === "needs-repair").slice(-3).map((attempt, index) => <blockquote key={`${attempt.at}-${index}`} className="notranslate" lang="de" translate="no">{attempt.answer}</blockquote>)}<p>{current.attempts.length ? `${current.submissionCount} reports · ${current.languageAssistance} language help actions · ${current.technicalAssistance} technical hints` : "Your first submitted report becomes a baseline. No result is invented before you submit."}</p></>}</details></div>
    <footer className="st-footer"><span>Original teaching simulation · two released cases, not the full 24-mission plan.</span><a href="/german">Back to all German lessons<ArrowRight size={13} /></a></footer>
  </div>;
}
