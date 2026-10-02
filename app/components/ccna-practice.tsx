"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Save, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleSubtitle } from "./google-translate";
import { ccnaPracticeUnits, ccnaQuestionCount, ccnaBankAttribution } from "@/lib/content/ccna-bank";
import { emptyServerLabState, gradeServerLab, parseServerLabState, type ServerLabState } from "@/lib/server-lab-state";
import type { LabQuestion, ServerLab } from "@/lib/content/server-labs";

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;
type Checkpoint = { state: ServerLabState; grade: ReturnType<typeof gradeServerLab> };
const relatedLabs = ["ccna-addressing", "ccna-vlans", "ccna-routing", "ccna-services", "ccna-security", "ccna-automation"];

export function CcnaPractice({ userId, onOpenLab }: { userId: string; onOpenLab: (id: string) => void }) {
  const [selected, setSelected] = useState(ccnaPracticeUnits[0].id);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    void fetch("/api/lab-submissions", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { submissions?: { labId: string; evidenceText: string; updatedAt?: string }[] };
      const counts: Record<string, number> = {};
      const rows = (data.submissions ?? []).filter((row) => ccnaPracticeUnits.some((unit) => unit.id === row.labId)).sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0));
      for (const row of rows) {
        const unit = ccnaPracticeUnits.find((item) => item.id === row.labId)!;
        try { const state = parseServerLabState(JSON.parse(row.evidenceText), unit); if (state) counts[unit.id] = Object.keys(state.answers).length; } catch { /* A corrupt row never replaces a saved checkpoint with a blank one. */ }
      }
      if (alive) { setSummaries(counts); if (rows[0] && counts[rows[0].labId] !== undefined) setSelected(rows[0].labId); }
    }).catch(() => undefined).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [userId]);
  const unit = ccnaPracticeUnits.find((item) => item.id === selected)!;
  return <section id="ccna-question-bank" className="server-labs-workspace ccna-practice" aria-label="CCNA question bank">
    <header className="server-labs-heading"><div><p className="server-lab-kicker"><Copy text="CCNA · question bank" /></p><h2><Copy text="Practice by objective. Understand every answer." /></h2><p><Copy text={`${ccnaQuestionCount} practice questions across six domains. The added local sets preserve your original questions and explanations; they are pending technical review. Your earlier practice remains saved. This is untimed learning practice, not the real exam.`} /></p></div></header>
    <nav className="server-lab-library" aria-label="CCNA practice domains">{ccnaPracticeUnits.map((item, i) => <button type="button" key={item.id} disabled={!ready || busy} aria-current={selected === item.id ? "step" : undefined} onClick={() => setSelected(item.id)}><span className="server-lab-number">{i + 1}</span><span><strong><Copy text={item.title} /></strong><span className="server-lab-meta"><Copy text={`${summaries[item.id] ?? 0}/${item.questions.length} answered`} /></span></span></button>)}</nav>
    {ready ? <PracticeWorkspace key={`${userId}:${unit.id}`} userId={userId} unit={unit} onBusy={setBusy} onSaved={(state) => setSummaries((previous) => ({ ...previous, [unit.id]: Object.keys(state.answers).length }))} onOpenLab={() => onOpenLab(relatedLabs[Number(unit.lessonId.split("-").at(-1)) - 1])} /> : <p role="status"><Copy text="Loading your saved practice…" /></p>}
    <p className="server-lab-meta"><Copy text="The original 62 reviewed questions were adapted from the MIT-licensed BlackSwanAust CCNA Lab Simulator. Added local questions retain their own sources and pending review status. Not endorsed by Cisco." /> <a href={ccnaBankAttribution.url} target="_blank" rel="noreferrer"><Copy text="Source and attribution" /> ↗</a> · <a href={ccnaBankAttribution.notice} target="_blank" rel="noreferrer"><Copy text="License notice" /></a></p>
  </section>;
}

function PracticeWorkspace({ unit, userId, onSaved, onBusy, onOpenLab }: { unit: ServerLab; userId: string; onSaved: (state: ServerLabState) => void; onBusy: (busy: boolean) => void; onOpenLab: () => void }) {
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [status, setStatus] = useState("Loading saved practice…");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const live = useRef(true);
  const draft = useRef<Checkpoint | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const callbacks = useRef({ onSaved, onBusy });
  useEffect(() => { callbacks.current = { onSaved, onBusy }; }, [onSaved, onBusy]);
  const load = async () => {
    setError(""); setStatus("Loading saved practice…");
    try {
      const response = await fetch(`/api/server-labs/${unit.id}`, { cache: "no-store" });
      const result = await response.json() as Checkpoint & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not load your practice. Your progress has not been reset.");
      if (!parseServerLabState(result.state, unit)) throw new Error("Saved practice could not be validated; no progress has been reset.");
      if (live.current) { draft.current = result; setCheckpoint(result); setStatus("Saved to your account"); }
    } catch (failure) { if (live.current) { setError(failure instanceof Error ? failure.message : "Could not load practice."); setStatus("Not loaded — retry"); } }
  };
  useEffect(() => {
    live.current = true;
    void Promise.resolve().then(load);
    return () => { live.current = false; };
    // Remounting per domain/account isolates the save queue and restores that exact checkpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit.id]);
  const save = (state: ServerLabState) => {
    if (!draft.current) return;
    const next = { ...draft.current, state };
    draft.current = next; setCheckpoint(next); setError(""); setStatus("Saving…"); callbacks.current.onBusy(true);
    const ticket = ++revision.current;
    queue.current = queue.current.catch(() => undefined).then(async () => {
      try {
        const response = await fetch(`/api/server-labs/${unit.id}`, { method: "PUT", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ state, userId }) });
        const result = await response.json() as Checkpoint & { error?: string };
        if (!response.ok) throw new Error(result.error || "Could not save. Retry before leaving.");
        if (live.current && ticket === revision.current) { draft.current = result; setCheckpoint(result); setStatus("Saved to your account"); callbacks.current.onSaved(result.state); callbacks.current.onBusy(false); }
      } catch (failure) { if (live.current && ticket === revision.current) { setError(failure instanceof Error ? failure.message : "Could not save."); setStatus("Unsaved changes — retry"); } }
    });
  };
  const change = (update: (state: ServerLabState) => ServerLabState) => { if (draft.current) save(update(draft.current.state)); };
  const state = checkpoint?.state ?? emptyServerLabState();
  const question = unit.questions[state.questionIndex];
  const answer = state.answers[question.id];
  const options = unit.questions.map((q, index) => ({ q, index })).filter(({ q }) => (filter === "all" || q.priority === filter) && `${q.text} ${q.objective} ${q.options.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const answered = Object.keys(state.answers).length;
  const navigate = (index: number) => change((current) => ({ ...current, questionIndex: index, activeTab: "quiz" }));
  return <article className="server-lab-panel">
    <h3><Copy text={unit.title} /></h3>
    <div className="server-lab-save-bar"><span role="status" aria-live="polite"><Save size={18} /><Copy text={status} /></span>{error && <><p role="alert" className="server-lab-error"><Copy text={error} /></p><button type="button" onClick={() => draft.current ? save(draft.current.state) : void load()}><Copy text="Retry" /></button></>}</div>
    {checkpoint && <>
      <div className="ccna-practice-controls">
        <label><span><Search size={17} /><Copy text="Find a question or objective" /></span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="OSPF, 3.4, subnet…" /></label>
        <label><Copy text="Priority" /><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Question priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All questions</SelectItem><SelectItem value="core">Core</SelectItem><SelectItem value="supporting">Supporting</SelectItem></SelectContent></Select></label>
        <label><Copy text={`${options.length} matching questions · jump to question`} /><Select value={options.some(({ q }) => q.id === question.id) ? question.id : ""} onValueChange={(id) => { const index = unit.questions.findIndex((q) => q.id === id); if (index >= 0) navigate(index); }}><SelectTrigger aria-label="Jump to practice question"><SelectValue placeholder="Choose a matching question" /></SelectTrigger><SelectContent>{options.map(({ q, index }) => <SelectItem key={q.id} value={q.id}>{index + 1}. {q.text}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <p className="server-lab-meta"><Copy text={`${answered}/${unit.questions.length} answered · Question ${state.questionIndex + 1} of ${unit.questions.length} · Objective ${question.objective} · ${question.priority === "core" ? "Core" : "Supporting"}`} /></p>
      <div className="server-lab-quiz"><h4><Copy text={question.text} /></h4><div className="server-lab-options" role="group" aria-label="Practice answer options">{question.options.map((option, index) => <button type="button" key={index} disabled={state.quizSubmitted} aria-pressed={answer === index} className={`${answer === index ? "is-selected" : ""} ${answer !== undefined && index === question.correct ? "is-correct" : ""} ${answer === index && index !== question.correct ? "is-wrong" : ""}`} onClick={() => change((current) => ({ ...current, activeTab: "quiz", answers: { ...current.answers, [question.id]: index } }))}><span>{String.fromCharCode(65 + index)}.</span><Copy text={option} /></button>)}</div>
        {answer !== undefined && <p className={answer === question.correct ? "server-lab-correct" : "server-lab-error"}><Copy text={answer === question.correct ? "+ Correct" : "− Incorrect — review Explain"} /></p>}
        <PracticeExplanation key={question.id} question={question} selectedAnswer={answer} />
        <div className="server-lab-navigation"><button type="button" disabled={state.questionIndex === 0} onClick={() => navigate(state.questionIndex - 1)}><ChevronLeft size={18} /><Copy text="Previous question" /></button><button type="button" disabled={state.questionIndex === unit.questions.length - 1} onClick={() => navigate(state.questionIndex + 1)}><Copy text="Next question" /><ChevronRight size={18} /></button></div>
        {state.quizSubmitted ? <><p><Copy text={`Server-graded result: ${checkpoint.grade.quizPercent ?? "Saving…"}% · ${checkpoint.grade.correct}/${unit.questions.length} correct. Your answers remain saved for review.`} /></p><button type="button" onClick={() => change((current) => ({ ...current, quizSubmitted: false }))}><Copy text="Review and revise answers" /></button></> : <button type="button" className="server-lab-primary" disabled={answered < unit.questions.length} onClick={() => change((current) => ({ ...current, quizSubmitted: true }))}><Copy text="Submit domain assessment" /></button>}
        <button type="button" className="server-lab-lesson" disabled={status !== "Saved to your account"} onClick={onOpenLab}><BookOpen size={18} /><Copy text="Open related lesson and hands-on lab" /></button>
      </div>
    </>}
  </article>;
}

function PracticeExplanation({ question, selectedAnswer }: { question: LabQuestion; selectedAnswer: number | undefined }) {
  const [open, setOpen] = useState(false);
  return <section className="question-learning-tools" aria-label={`Explanation for ${question.id}`}>
    <div className="question-learning-tools-header"><div><h3><Copy text="Understand this exact question" /></h3><p className="question-learning-tools-copy"><Copy text="Question-specific explanation and reference." /></p></div><button type="button" className="question-explain-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Copy text={open ? "Close explanation" : "Explain this question"} /></button></div>
    {open && <div className="question-explanation-body">
      <div className="question-explanation-summary"><strong><Copy text={`Correct answer: ${question.options[question.correct]}`} /></strong></div>
      <div className="question-explanation-section"><h4><Copy text="Why the correct answer fits" /></h4><p><Copy text={question.explain} /></p></div>
      {selectedAnswer !== undefined && <div className={`question-explanation-choice ${selectedAnswer === question.correct ? "is-correct" : "is-incorrect"}`}><h4><Copy text="Your answer" /></h4><strong><Copy text={question.options[selectedAnswer]} /></strong></div>}
      {question.whyOthers && <div className="question-explanation-section"><h4><Copy text="Why the other options do not fit" /></h4><div className="question-distractor-list">{question.options.map((option, index) => index !== question.correct && <article key={index} className="question-distractor"><strong><Copy text={option} /></strong><p className="question-distractor-reason"><Copy text={question.whyOthers![index]} /></p></article>)}</div></div>}
      <a className="question-explanation-source" href={question.source} target="_blank" rel="noreferrer"><Copy text="Reference source" /> ↗</a>
    </div>}
  </section>;
}
