"use client";
/* eslint-disable react-hooks/set-state-in-effect -- authenticated, account-scoped progress is restored from browser storage after identity is known */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, Cloud, FlaskConical, LayoutDashboard, Layers, ListChecks, Network, Search } from "lucide-react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { CourseSwitcher } from "@/app/components/course-switcher";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { MobileNavigation } from "@/app/components/mobile-navigation";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { KnowledgeSearch } from "@/app/components/knowledge-search";
import { QuestionExplanation } from "@/app/components/question-explanation";
import { copy } from "@/lib/course-data";
import { az900Course, az900Domains, az900Labs, az900Lessons, az900Questions, az900Stages, type Az900Question } from "@/lib/content/az900";

type View = "home" | "lessons" | "graph" | "search" | "exams" | "labs" | "cards";
type ExamMode = "practice" | "quick" | "stage" | "mixed" | "full";
type ActiveQuestion = Az900Question & { optionOrder: number[] };
type StoredState = {
  view?: View;
  selectedStageId?: string;
  fontScale?: number;
  translationLanguage?: string;
  attemptedIds?: string[];
  correctIds?: string[];
  cardIds?: string[];
  quiz?: { mode: ExamMode; questionOrder: Array<{ questionId: string; optionOrder: number[] }>; answers: Record<string, number>; index: number; expiresAt: string | null; sessionId: string };
};

const examModes = {
  quick:{ title:"Quick Check", count:8, minutes:15, description:"A short check across the current AZ-900 blueprint." },
  stage:{ title:"Stage Assessment", count:30, minutes:35, description:"Up to 30 questions from the selected learning stage." },
  mixed:{ title:"Weighted Mixed Review", count:40, minutes:45, description:"40 original questions weighted 11 / 15 / 14 across the three official domains." },
  full:{ title:"Comprehensive Review", count:60, minutes:70, description:"An internal endurance review, not a reconstruction of the official exam format." },
} as const;

function hash(value: string) { let output = 2166136261; for (const character of value) output = Math.imul(output ^ character.charCodeAt(0), 16777619); return output >>> 0; }
function shuffle<T>(values: readonly T[], seed: string) { const output = [...values]; let state = hash(seed); for (let index = output.length - 1; index > 0; index -= 1) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const swap = Math.floor((state / 0x100000000) * (index + 1)); [output[index], output[swap]] = [output[swap], output[index]]; } return output; }
function displayQuestion(question: Az900Question, optionOrder: number[]): ActiveQuestion { return { ...question, options:optionOrder.map((index) => question.options[index]), correct:optionOrder.indexOf(question.correct), optionOrder }; }
function makeActiveQuestions(source: Az900Question[], count: number, seed: string) { return shuffle(source, `${seed}:questions`).slice(0, Math.min(count, source.length)).map((question) => displayQuestion(question, shuffle([0, 1, 2, 3], `${seed}:${question.id}`))); }
function restoreQuestions(order: Array<{ questionId: string; optionOrder: number[] }>) { return order.flatMap((entry) => { const question = az900Questions.find((item) => item.id === entry.questionId); return question && entry.optionOrder.length === 4 ? [displayQuestion(question, entry.optionOrder)] : []; }); }

function selectForMode(mode: Exclude<ExamMode, "practice">, stageId: string, seed: string) {
  if (mode === "stage") return makeActiveQuestions(az900Questions.filter((question) => question.objectiveGroupId === stageId), examModes.stage.count, seed);
  if (mode === "quick") return makeActiveQuestions(az900Questions, examModes.quick.count, seed);
  const targets = mode === "mixed" ? [11, 15, 14] : [17, 23, 20];
  return shuffle(az900Domains.flatMap((domain, index) => makeActiveQuestions(az900Questions.filter((question) => question.domain === domain), targets[index], `${seed}:${domain}`)), `${seed}:combined`);
}

function ProgressBar({ value }: { value: number }) { return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-300" style={{ width:`${Math.max(0, Math.min(100, value))}%` }} /></div>; }

export default function Az900Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [selectedStageId, setSelectedStageId] = useState(az900Stages[0].id);
  const [fontScale, setFontScale] = useState(1);
  const [translationLanguage, setTranslationLanguage] = useState("");
  const [attemptedIds, setAttemptedIds] = useState<string[]>([]);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<ActiveQuestion[]>([]);
  const [quizMode, setQuizMode] = useState<ExamMode>("quick");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizExpiresAt, setQuizExpiresAt] = useState<string | null>(null);
  const [quizSessionId, setQuizSessionId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const t = copy.en;

  useEffect(() => { void fetch("/api/auth/me", { cache:"no-store" }).then(async (response) => { if (!response.ok) return; const data = await response.json() as { user?: { id?: string } }; if (data.user?.id) setUserId(data.user.id); }).catch(() => undefined); }, []);
  useEffect(() => {
    if (!userId) return;
    let saved: StoredState = {};
    try { saved = JSON.parse(localStorage.getItem(`wincraft-progress:${userId}:az900`) ?? "{}"); } catch { /* optional browser storage */ }
    if (saved.view) setView(saved.view);
    if (saved.selectedStageId && az900Stages.some((stage) => stage.id === saved.selectedStageId)) setSelectedStageId(saved.selectedStageId);
    if (typeof saved.fontScale === "number") setFontScale(Math.max(.85, Math.min(1.3, saved.fontScale)));
    if (typeof saved.translationLanguage === "string") setTranslationLanguage(saved.translationLanguage);
    setAttemptedIds(saved.attemptedIds?.filter((id) => az900Questions.some((question) => question.id === id)) ?? []);
    setCorrectIds(saved.correctIds?.filter((id) => az900Questions.some((question) => question.id === id)) ?? []);
    setCardIds(saved.cardIds?.filter((id) => az900Questions.some((question) => question.id === id)) ?? []);
    if (saved.quiz) {
      const restored = restoreQuestions(saved.quiz.questionOrder);
      const expiry = saved.quiz.expiresAt ? Date.parse(saved.quiz.expiresAt) : Number.POSITIVE_INFINITY;
      if (restored.length && expiry > Date.now()) { setQuizMode(saved.quiz.mode); setQuizQuestions(restored); setQuizAnswers(saved.quiz.answers); setQuizIndex(Math.min(saved.quiz.index, restored.length - 1)); setQuizExpiresAt(saved.quiz.expiresAt); setQuizSessionId(saved.quiz.sessionId); setView("exams"); }
    }
    void fetch("/api/attempts", { cache:"no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { attempts?: Array<{ questionId?: string; isCorrect?: boolean }> };
      const relevant = (data.attempts ?? []).filter((attempt) => attempt.questionId?.startsWith("az900-q-"));
      if (relevant.length) { setAttemptedIds(Array.from(new Set(relevant.flatMap((item) => item.questionId ? [item.questionId] : [])))); setCorrectIds(Array.from(new Set(relevant.flatMap((item) => item.isCorrect && item.questionId ? [item.questionId] : [])))); }
    }).catch(() => undefined);
    void fetch("/api/flashcards", { cache:"no-store" }).then(async (response) => { if (!response.ok) return; const data = await response.json() as { flashcards?: Array<{ questionId?: string }> }; const ids = (data.flashcards ?? []).flatMap((card) => card.questionId?.startsWith("az900-q-") ? [card.questionId] : []); if (ids.length) setCardIds(Array.from(new Set(ids))); }).catch(() => undefined);
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    const quiz = quizQuestions.length && !quizFinished ? { mode:quizMode, questionOrder:quizQuestions.map((question) => ({ questionId:question.id, optionOrder:question.optionOrder })), answers:quizAnswers, index:quizIndex, expiresAt:quizExpiresAt, sessionId:quizSessionId } : undefined;
    const state: StoredState = { view, selectedStageId, fontScale, translationLanguage, attemptedIds, correctIds, cardIds, quiz };
    try { localStorage.setItem(`wincraft-progress:${userId}:az900`, JSON.stringify(state)); } catch { /* optional browser storage */ }
  }, [userId, hydrated, view, selectedStageId, fontScale, translationLanguage, attemptedIds, correctIds, cardIds, quizQuestions, quizFinished, quizMode, quizAnswers, quizIndex, quizExpiresAt, quizSessionId]);

  const stageProgress = useMemo(() => Object.fromEntries(az900Stages.map((stage) => { const answered = stage.questionIds.filter((id) => attemptedIds.includes(id)).length; return [stage.id, Math.round((answered / stage.questionIds.length) * 100)]; })), [attemptedIds]);
  const overallProgress = Math.round((attemptedIds.length / az900Questions.length) * 100);
  const correctRate = attemptedIds.length ? Math.round((correctIds.length / attemptedIds.length) * 100) : 0;
  const selectedStage = az900Stages.find((stage) => stage.id === selectedStageId) ?? az900Stages[0];

  const startQuiz = useCallback((mode: ExamMode, questionId?: string, stageOverride?: string) => {
    const seed = `${Date.now()}:${crypto.randomUUID()}`;
    const stageForQuiz = stageOverride ?? selectedStageId;
    const selected = questionId
      ? makeActiveQuestions(az900Questions.filter((question) => question.id === questionId), 1, seed)
      : mode === "practice"
        ? makeActiveQuestions(az900Questions.filter((question) => question.objectiveGroupId === stageForQuiz), 999, seed)
        : selectForMode(mode, stageForQuiz, seed);
    const minutes = mode === "practice" ? 0 : examModes[mode].minutes;
    setQuizMode(mode); setQuizQuestions(selected); setQuizAnswers({}); setQuizIndex(0); setQuizFinished(false); setQuizExpiresAt(minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null); setQuizSessionId(`az900-${crypto.randomUUID()}`); setView("exams");
  }, [selectedStageId]);

  const submitAnswer = (displayIndex: number) => {
    const question = quizQuestions[quizIndex];
    if (!question || quizAnswers[question.id] !== undefined) return;
    const canonicalIndex = question.optionOrder[displayIndex];
    const correct = displayIndex === question.correct;
    setQuizAnswers((current) => ({ ...current, [question.id]:displayIndex }));
    setAttemptedIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    if (correct) setCorrectIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    else {
      setCardIds((current) => current.includes(question.id) ? current : [...current, question.id]);
      void fetch("/api/flashcards", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ questionId:question.id, box:1 }) }).catch(() => undefined);
    }
    void fetch("/api/attempts", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ questionId:question.id, selectedAnswer:canonicalIndex, isCorrect:correct, sessionId:quizSessionId }) }).catch(() => undefined);
  };

  const finishOrNext = () => { if (quizIndex >= quizQuestions.length - 1) setQuizFinished(true); else setQuizIndex((index) => index + 1); };
  const signOut = async () => { await fetch("/api/auth/logout", { method:"POST" }).catch(() => undefined); setUserId(null); setAuthOpen(false); return true; };

  if (!userId) return <main className="study-app min-h-screen bg-black text-white"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;

  const navigation = [
    { key:"home" as const, label:"Dashboard", icon:<LayoutDashboard size={19} /> },
    { key:"lessons" as const, label:"Lessons", icon:<BookOpen size={19} /> },
    { key:"graph" as const, label:"Skill graph", icon:<Network size={19} /> },
    { key:"search" as const, label:"Search", icon:<Search size={19} /> },
    { key:"exams" as const, label:"Exams", icon:<ListChecks size={19} /> },
    { key:"labs" as const, label:"Labs", icon:<FlaskConical size={19} /> },
    { key:"cards" as const, label:"Leitner", icon:<Layers size={19} /> },
  ];

  return <GoogleSubtitleProvider language={translationLanguage}><main className="study-app font-scale-content min-h-screen text-[#e8edf5]" style={{ "--wincraft-font-scale":fontScale } as CSSProperties}>
    <div className="app-shell mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="app-sidebar border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-e">
        <AppBrand subtitle="Azure & Windows Server learning" />
        <nav aria-label="AZ-900 navigation" className="mt-4 hidden gap-1 lg:grid">{navigation.map((item) => <button type="button" key={item.key} aria-current={view === item.key ? "page" : undefined} onClick={() => setView(item.key)} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-start text-sm transition ${view === item.key ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : item.key === "search" ? "border-cyan-300/30 bg-cyan-300/5 font-semibold text-cyan-100 shadow-sm shadow-cyan-300/5" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}>{item.icon}<span>{item.label}</span>{item.key === "search" && <span className="ms-auto rounded-full bg-cyan-300/15 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-200">Find</span>}</button>)}</nav>
        <div className="mt-6 hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 lg:block"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">AZ-900</p><p className="mt-2 font-semibold">Azure Fundamentals</p><p className="mt-2 text-xs leading-5 text-slate-400">{az900Course.sourceVersion}</p><ProgressBar value={overallProgress} /></div>
      </aside>
      <section className="study-content min-w-0 px-3 pb-44 pt-3 sm:p-7 lg:p-9">
        <StudyHeader title={navigation.find((item) => item.key === view)?.label ?? "Dashboard"} course="AZ-900" t={t} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={translationLanguage} onTranslationLanguage={setTranslationLanguage} onAccount={() => setAuthOpen(true)} />
        <CourseSwitcher active="az900" />
        <div className="study-context mt-5"><button type="button" onClick={() => setView("home")} className="text-cyan-100">CertPath</button><span>/</span><strong>AZ-900</strong><span className="ml-auto">{az900Questions.length} original questions · {az900Stages.length} stages</span></div>

        {view === "home" && <Az900Dashboard progress={overallProgress} correctRate={correctRate} attempted={attemptedIds.length} stageProgress={stageProgress} onOpen={setView} onExam={startQuiz} />}
        {view === "lessons" && <Az900Lessons selectedStageId={selectedStageId} onSelect={setSelectedStageId} stageProgress={stageProgress} onPractice={() => startQuiz("practice")} />}
        {view === "graph" && <Az900Graph selectedStageId={selectedStageId} onSelect={(id) => { setSelectedStageId(id); setView("lessons"); }} stageProgress={stageProgress} onPractice={(id) => { setSelectedStageId(id); startQuiz("practice", undefined, id); }} />}
        {view === "search" && <KnowledgeSearch questionBank={az900Questions} courseCode="AZ-900" courseName="Azure Fundamentals" examples={["Which service evaluates Azure resource compliance?","تفاوت Azure Policy و RBAC چیست؟","availability zones"]} showTranslations={Boolean(translationLanguage)} onPracticeQuestion={(id) => startQuiz("practice", id)} />}
        {view === "exams" && (quizQuestions.length && !quizFinished ? <Az900Quiz questions={quizQuestions} index={quizIndex} answers={quizAnswers} mode={quizMode} expiresAt={quizExpiresAt} showTranslations={Boolean(translationLanguage)} onAnswer={submitAnswer} onPrevious={() => setQuizIndex((index) => Math.max(0, index - 1))} onNext={finishOrNext} onFinish={() => setQuizFinished(true)} /> : quizFinished ? <Az900Result questions={quizQuestions} answers={quizAnswers} onRestart={() => startQuiz(quizMode)} onExit={() => { setQuizQuestions([]); setQuizAnswers({}); setQuizFinished(false); setQuizExpiresAt(null); }} /> : <Az900ExamChooser selectedStage={selectedStage} onStart={startQuiz} />)}
        {view === "labs" && <Az900Labs userId={userId} />}
        {view === "cards" && <Az900Cards cardIds={cardIds} onReview={(questionId, quality) => { if (quality === "got-it") setCardIds((ids) => ids.filter((id) => id !== questionId)); void fetch("/api/flashcards", { method:"PATCH", headers:{ "content-type":"application/json" }, body:JSON.stringify({ questionId, quality }) }).catch(() => undefined); }} />}
      </section>
      <MobileNavigation items={navigation} primaryKeys={["home", "lessons", "exams", "search"]} active={view} onNavigate={setView} />
    </div>
    {authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}

function Az900Dashboard({ progress, correctRate, attempted, stageProgress, onOpen, onExam }: { progress:number; correctRate:number; attempted:number; stageProgress:Record<string, number>; onOpen:(view:View) => void; onExam:(mode:ExamMode) => void }) {
  return <div className="space-y-6"><section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><article className="dashboard-overview rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-cyan-200">Azure Fundamentals learning path</p><h2 className="mt-2 text-2xl font-bold">Build a complete AZ-900 foundation</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Three official domains, 57 blueprint objectives, original sourced questions, labs, search, and spaced review.</p></div><span className="progress-ring grid h-24 w-24 shrink-0 place-items-center rounded-full border-[8px] border-cyan-300/25 text-xl font-bold text-cyan-200">{progress}%</span></div><ProgressBar value={progress} /><div className="dashboard-metrics mt-6 grid grid-cols-3 gap-2 sm:gap-3"><Metric label="Answered" value={`${attempted}/${az900Questions.length}`} /><Metric label="Correct" value={`${correctRate}%`} /><Metric label="Stages" value={`11`} /></div></article><article className="dashboard-overview rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#173147] to-[#111a28] p-6"><Cloud className="text-cyan-300" /><p className="mt-4 text-sm text-cyan-100">Recommended next lesson</p><h2 className="mt-2 text-xl font-bold">{az900Lessons[0].title}</h2><p className="mt-3 text-sm leading-7 text-slate-300">{az900Lessons[0].objective}</p><button type="button" onClick={() => onOpen("lessons")} className="mt-5 rounded-xl bg-cyan-300 px-4 py-2.5 font-bold text-[#06131a]">Open learning path →</button></article></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><ActionCard title="Stage practice" text={`${az900Questions.length} sourced questions`} onClick={() => { onOpen("lessons"); }} /><ActionCard title="Quick Check" text="8 questions · 15 minutes" onClick={() => onExam("quick")} /><ActionCard title="Smart search" text="Answers from the AZ-900 bank" onClick={() => onOpen("search")} /><ActionCard title="Hands-on labs" text={`${az900Labs.length} guided activities`} onClick={() => onOpen("labs")} /></section>
    <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Official domains</p><h2 className="mt-1 text-xl font-bold">Weighted readiness map</h2></div><a href={az900Course.studyGuide} target="_blank" rel="noreferrer" className="text-sm font-semibold text-cyan-200">Study guide ↗</a></div><div className="mt-5 grid gap-4 lg:grid-cols-3">{az900Domains.map((domain) => { const stages = az900Stages.filter((stage) => stage.domain === domain); const value = Math.round(stages.reduce((sum, stage) => sum + (stageProgress[stage.id] ?? 0), 0) / stages.length); return <div key={domain} className="rounded-2xl border border-white/10 bg-black/15 p-4"><h3 className="font-semibold">{domain}</h3><p className="mt-1 text-xs text-slate-400">{domain === az900Domains[0] ? "25–30%" : domain === az900Domains[1] ? "35–40%" : "30–35%"}</p><ProgressBar value={value} /></div>; })}</div></section>
  </div>;
}

function Az900Lessons({ selectedStageId, onSelect, stageProgress, onPractice }: { selectedStageId:string; onSelect:(id:string) => void; stageProgress:Record<string, number>; onPractice:() => void }) {
  const stage = az900Stages.find((item) => item.id === selectedStageId) ?? az900Stages[0]; const lesson = az900Lessons.find((item) => item.stageId === stage.id) ?? az900Lessons[0];
  return <div className="space-y-5"><section className="rounded-3xl border border-cyan-300/20 bg-[#111a28] p-5 sm:p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">11-stage learning path</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{az900Stages.map((item) => <button type="button" key={item.id} onClick={() => onSelect(item.id)} className={`rounded-2xl border p-4 text-start ${item.id === stage.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-black/10"}`}><span className="text-xs font-bold text-cyan-200">Stage {item.stage}</span><h3 className="mt-2 text-sm font-semibold">{item.title}</h3><p className="mt-2 text-xs text-slate-400">{item.questionIds.length} questions · {stageProgress[item.id] ?? 0}%</p><ProgressBar value={stageProgress[item.id] ?? 0} /></button>)}</div></section><article className="lesson-panel rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Stage {stage.stage} · {stage.domain}</p><h2 className="mt-3 text-3xl font-bold"><GoogleSubtitle text={lesson.title} /></h2><p className="mt-4 text-base leading-8 text-slate-300"><GoogleSubtitle text={lesson.body} /></p><div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Estimated" value={`${lesson.estimatedMinutes} min`} /><Metric label="Practice bank" value={`${stage.questionIds.length} questions`} /><Metric label="Blueprint" value="2026-07-20" /></div><h3 className="mt-7 text-lg font-semibold">Learning objective</h3><p className="mt-2 leading-7 text-slate-300"><GoogleSubtitle text={lesson.objective} /></p><div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={onPractice} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a]">Practice this stage →</button><a href={lesson.source} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-cyan-100">Microsoft Learn source ↗</a></div></article></div>;
}

function Az900Graph({ selectedStageId, onSelect, stageProgress, onPractice }: { selectedStageId:string; onSelect:(id:string) => void; stageProgress:Record<string, number>; onPractice:(id:string) => void }) {
  return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">AZ-900 → domain → objective → lesson → question</p><h2 className="mt-2 text-2xl font-bold">Interactive Azure Fundamentals graph</h2></div><div className="mt-7 grid gap-5 xl:grid-cols-3">{az900Domains.map((domain) => <article key={domain} className="rounded-2xl border border-cyan-300/20 bg-black/15 p-4"><h3 className="font-semibold text-cyan-50">{domain}</h3><p className="mt-1 text-xs text-slate-400">{domain === az900Domains[0] ? "25–30%" : domain === az900Domains[1] ? "35–40%" : "30–35%"}</p><div className="mt-4 space-y-2">{az900Stages.filter((stage) => stage.domain === domain).map((stage) => <button type="button" key={stage.id} aria-current={selectedStageId === stage.id ? "step" : undefined} onClick={() => onSelect(stage.id)} className={`w-full rounded-xl border p-3 text-start ${selectedStageId === stage.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-[#111a28]"}`}><span className="text-xs font-semibold text-cyan-200">{stage.stage}. {stage.title}</span><span className="mt-1 block text-xs text-slate-400">{stage.questionIds.length} linked questions · {stageProgress[stage.id] ?? 0}%</span></button>)}</div><button type="button" onClick={() => onPractice(az900Stages.find((stage) => stage.domain === domain)?.id ?? az900Stages[0].id)} className="mt-4 text-sm font-semibold text-cyan-200">Practice domain path →</button></article>)}</div></section>;
}

function Az900ExamChooser({ selectedStage, onStart }: { selectedStage:typeof az900Stages[number]; onStart:(mode:ExamMode) => void }) { return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Original practice · not exam dumps</p><h2 className="mt-2 text-2xl font-bold">Choose an AZ-900 review mode</h2><p className="mt-2 text-sm text-slate-400">Current stage: {selectedStage.title}</p></div><div className="flex gap-3 text-sm"><a href={az900Course.practiceAssessment} target="_blank" rel="noreferrer" className="text-cyan-200">Official Practice Assessment ↗</a><a href={az900Course.examSandbox} target="_blank" rel="noreferrer" className="text-cyan-200">Exam interface demo ↗</a></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2">{Object.entries(examModes).map(([mode, config]) => <button type="button" key={mode} onClick={() => onStart(mode as ExamMode)} className="rounded-2xl border border-white/10 bg-black/15 p-5 text-start hover:border-cyan-300/50"><span className="text-xs font-bold uppercase tracking-[.12em] text-cyan-300">{config.count} questions · {config.minutes} min</span><h3 className="mt-2 text-lg font-semibold">{config.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{config.description}</p></button>)}</div><p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-6 text-amber-100">The official AZ-900 assessment time is 45 minutes. Question counts in this app are internal learning modes and do not claim to reproduce the official exam format.</p></section>; }

function Az900Quiz({ questions, index, answers, mode, expiresAt, showTranslations, onAnswer, onPrevious, onNext, onFinish }: { questions:ActiveQuestion[]; index:number; answers:Record<string, number>; mode:ExamMode; expiresAt:string | null; showTranslations:boolean; onAnswer:(index:number) => void; onPrevious:() => void; onNext:() => void; onFinish:() => void }) {
  const question = questions[index]; const answer = answers[question.id]; const answered = answer !== undefined; const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => { if (!expiresAt) { setSeconds(null); return; } const update = () => setSeconds(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, [expiresAt]);
  useEffect(() => { if (expiresAt && seconds === 0) onFinish(); }, [expiresAt, seconds, onFinish]);
  const timer = seconds === null ? "--:--" : `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${(seconds % 60).toString().padStart(2,"0")}`;
  return <section className="reading-panel quiz-workspace mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8 lg:p-10"><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span>{mode === "practice" ? "Stage practice" : examModes[mode].title}</span><span>{index + 1} / {questions.length}{expiresAt ? ` · ${timer}` : ""}</span></div><ProgressBar value={((index + 1) / questions.length) * 100} /><p className="mt-7 text-xs font-bold uppercase tracking-[.13em] text-cyan-300">{question.domain} · {question.objectiveGroupId} · {question.objectiveId}</p><h2 className="mt-3 text-xl font-semibold leading-8"><GoogleSubtitle text={question.text} enabled={showTranslations} /></h2><div className="quiz-options mt-6 grid gap-3 lg:grid-cols-2">{question.options.map((option, optionIndex) => <button type="button" key={`${question.id}-${option}`} disabled={answered} onClick={() => onAnswer(optionIndex)} className={`w-full rounded-xl border p-4 text-start ${answer === optionIndex ? (optionIndex === question.correct ? "border-emerald-400 bg-emerald-400/10" : "border-rose-400 bg-rose-400/10") : answered && optionIndex === question.correct ? "border-emerald-400/60 bg-emerald-400/5" : "border-white/10 bg-black/10 hover:border-cyan-300/50"}`}><GoogleSubtitle text={option} enabled={showTranslations} /></button>)}</div>{answered && <div className={`mt-6 rounded-2xl border p-5 ${answer === question.correct ? "border-emerald-300/30 bg-emerald-300/5" : "border-amber-300/30 bg-amber-300/5"}`}><p className="font-semibold">{answer === question.correct ? "＋ Correct" : "− Added to Leitner review"}</p><div className="mt-2 text-sm leading-7 text-slate-300"><GoogleSubtitle text={question.rationale.en} enabled={showTranslations} /></div><a href={question.source} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-cyan-200">Microsoft Learn source ↗</a></div>}{answered && <QuestionExplanation question={question} selectedAnswer={answer} showTranslations={showTranslations} />}<div className="quiz-actions mt-6 grid grid-cols-2 gap-3 sm:flex"><button type="button" disabled={index === 0} onClick={onPrevious} className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-cyan-100 disabled:opacity-35">Previous ←</button><button type="button" disabled={!answered} onClick={onNext} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a] disabled:opacity-35">{index === questions.length - 1 ? "Finish" : "Next"} →</button></div></section>;
}

function Az900Result({ questions, answers, onRestart, onExit }: { questions:ActiveQuestion[]; answers:Record<string, number>; onRestart:() => void; onExit:() => void }) { const correct = questions.filter((question) => answers[question.id] === question.correct).length; const score = questions.length ? Math.round((correct / questions.length) * 100) : 0; return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-6 text-center sm:p-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Review complete</p><h2 className="mt-4 text-4xl font-bold">{score}%</h2><p className="mt-3 text-slate-300">{correct} correct out of {questions.length}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={onRestart} className="rounded-xl bg-cyan-300 px-6 py-3 font-bold text-[#06131a]">Repeat this mode</button><button type="button" onClick={onExit} className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-cyan-100">Choose another mode</button></div></section>; }

function Az900Labs({ userId }: { userId:string }) { const [selected, setSelected] = useState(az900Labs[0].id); const [evidence, setEvidence] = useState(""); const [message, setMessage] = useState(""); const lab = az900Labs.find((item) => item.id === selected) ?? az900Labs[0]; const submit = async () => { const response = await fetch("/api/lab-submissions", { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify({ labId:lab.id, evidenceText:evidence, completed:true, userId }) }); setMessage(response.ok ? "Evidence saved." : "Add at least eight characters of evidence."); }; return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-3xl border border-white/10 bg-[#111a28] p-5"><h2 className="text-xl font-bold">Guided Azure labs</h2><div className="mt-4 space-y-2">{az900Labs.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item.id); setMessage(""); }} className={`w-full rounded-xl border p-4 text-start ${selected === item.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10"}`}>{item.title}</button>)}</div></section><article className="rounded-3xl border border-cyan-300/20 bg-[#111a28] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Hands-on activity</p><h2 className="mt-3 text-2xl font-bold">{lab.title}</h2><p className="mt-3 leading-7 text-slate-300">{lab.description}</p><ol className="mt-6 space-y-3">{lab.checklist.map((item, index) => <li key={item} className="flex gap-3 rounded-xl bg-black/15 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-sm text-cyan-200">{index + 1}</span><span>{item}</span></li>)}</ol><label className="mt-6 block font-semibold">Evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-black/20 p-3" placeholder="Paste notes, results, or a link to your evidence…" /></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void submit()} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a]">Save evidence</button><a href={lab.source} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-cyan-100">Official guide ↗</a></div>{message && <p className="mt-3 text-sm text-cyan-100">{message}</p>}</article></div>; }

function Az900Cards({ cardIds, onReview }: { cardIds:string[]; onReview:(id:string, quality:"again"|"got-it") => void }) { const card = az900Questions.find((question) => question.id === cardIds[0]); if (!card) return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-8 text-center"><Layers className="mx-auto text-cyan-300" /><h2 className="mt-4 text-2xl font-bold">No AZ-900 cards due</h2><p className="mt-2 text-slate-400">Incorrect answers will appear here automatically.</p></section>; return <section className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">AZ-900 Leitner</p><h2 className="text-2xl font-bold">Review queue</h2></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">{cardIds.length} cards</span></div><article className="mt-5 min-h-80 rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-[#173147] to-[#111a28] p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">{card.objectiveId}</p><h3 className="mt-8 text-2xl font-semibold leading-9"><GoogleSubtitle text={card.text} /></h3><p className="mt-6 border-t border-white/10 pt-5 leading-7 text-slate-300"><GoogleSubtitle text={card.options[card.correct]} /></p></article><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => onReview(card.id, "again")} className="rounded-xl border border-rose-300/30 px-4 py-3 font-semibold text-rose-200">Again · 1 day</button><button type="button" onClick={() => onReview(card.id, "got-it")} className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-[#06131a]">Got it →</button></div></section>; }

function Metric({ label, value }: { label:string; value:string }) { return <div className="rounded-xl bg-black/15 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function ActionCard({ title, text, onClick }: { title:string; text:string; onClick:() => void }) { return <button type="button" onClick={onClick} className="practice-action-card rounded-2xl border border-white/10 bg-[#111a28] p-5 text-start hover:border-cyan-300/50"><h3 className="practice-action-title font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-400">{text}</p><span className="mt-5 block text-sm font-semibold text-cyan-200">Open →</span></button>; }
