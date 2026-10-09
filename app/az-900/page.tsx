"use client";
/* eslint-disable react-hooks/set-state-in-effect -- authenticated, account-scoped progress is restored from browser storage after identity is known */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { BookOpen, FlaskConical, LayoutDashboard, Layers, ListChecks, Library, Network, Search } from "lucide-react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { LearningStart, PracticeHub, PracticeResume, SimpleNavigation } from "@/app/components/simple-learning";
import { MobileNavigation } from "@/app/components/mobile-navigation";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { KnowledgeSearch } from "@/app/components/knowledge-search";
import { QuestionExplanation } from "@/app/components/question-explanation";
import { copy } from "@/lib/course-data";
import {
  az900Course,
  az900DomainDefinitions,
  az900DomainWeights,
  az900Labs,
  az900Lessons,
  az900ObjectiveById,
  az900Questions,
  az900QuestionsByDomain,
  az900QuestionsByGroup,
  az900QuestionsByObjective,
  az900Stages,
  type Az900Question,
} from "@/lib/content/az900";

type View = "practice" | "home" | "lessons" | "bank" | "graph" | "search" | "exams" | "labs" | "cards";
type ExamMode = "practice" | "quick" | "stage" | "mixed" | "full";
type ActiveQuestion = Az900Question & { optionOrder: number[] };
type StoredState = {
  view?: View;
  selectedStageId?: string;
  selectedObjectiveId?: string;
  fontScale?: number;
  translationLanguage?: string;
  attemptedIds?: string[];
  correctIds?: string[];
  cardIds?: string[];
  quiz?: { mode: ExamMode; questionOrder: Array<{ questionId: string; optionOrder: number[] }>; answers: Record<string, number>; index: number; expiresAt: string | null; sessionId: string };
};

const examModes = {
  quick: { title: "Quick Check", count: 8, minutes: 15, description: "Eight questions sampled across all three official domains, weighted to the published ranges." },
  stage: { title: "Stage Assessment", count: 30, minutes: 35, description: "Up to 30 questions drawn from the selected study-guide group." },
  mixed: { title: "Weighted Mixed Review", count: 40, minutes: 45, description: "40 questions distributed across the three domains using the official weight split." },
  full: { title: "Comprehensive Review", count: 60, minutes: 70, description: "An internal endurance review across the whole bank. Not a reconstruction of the official exam format." },
} as const;

function hash(value: string) { let output = 2166136261; for (const character of value) output = Math.imul(output ^ character.charCodeAt(0), 16777619); return output >>> 0; }
function shuffle<T>(values: readonly T[], seed: string) { const output = [...values]; let state = hash(seed); for (let index = output.length - 1; index > 0; index -= 1) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const swap = Math.floor((state / 0x100000000) * (index + 1)); [output[index], output[swap]] = [output[swap], output[index]]; } return output; }
function displayQuestion(question: Az900Question, optionOrder: number[]): ActiveQuestion { return { ...question, options: optionOrder.map((index) => question.options[index]), correct: optionOrder.indexOf(question.correct), optionOrder }; }
function makeActiveQuestions(source: Az900Question[], count: number, seed: string) { return shuffle(source, `${seed}:questions`).slice(0, Math.min(count, source.length)).map((question) => displayQuestion(question, shuffle([0, 1, 2, 3], `${seed}:${question.id}`))); }
function restoreQuestions(order: Array<{ questionId: string; optionOrder: number[] }>) { return order.flatMap((entry) => { const question = az900Questions.find((item) => item.id === entry.questionId); return question && entry.optionOrder.length === question.options.length ? [displayQuestion(question, entry.optionOrder)] : []; }); }

/**
 * Distributes a quiz across domains by the official weight split, using largest
 * remainder so the integer per-domain counts add up to exactly `total`.
 */
function domainQuota(total: number, weightEntries: Array<[string, number]>) {
  const weightTotal = weightEntries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const exact = weightEntries.map(([domainId, weight]) => {
    const value = (weight / weightTotal) * total;
    return { domainId, count: Math.floor(value), remainder: value - Math.floor(value) };
  });
  let leftover = total - exact.reduce((sum, entry) => sum + entry.count, 0);
  for (const entry of [...exact].sort((a, b) => b.remainder - a.remainder)) {
    if (leftover <= 0) break;
    entry.count += 1;
    leftover -= 1;
  }
  return exact;
}

function selectForMode(mode: Exclude<ExamMode, "practice">, stageId: string, seed: string) {
  if (mode === "stage") return makeActiveQuestions(az900QuestionsByGroup.get(stageId) ?? [], examModes.stage.count, seed);
  if (mode === "quick") return makeActiveQuestions(az900Questions, examModes.quick.count, seed);
  const total = examModes[mode].count;
  const weightEntries = az900DomainDefinitions.map((domain) => [domain.id, az900DomainWeights[domain.id]] as [string, number]);
  const pool = domainQuota(total, weightEntries).flatMap((entry) =>
    makeActiveQuestions(az900QuestionsByDomain.get(entry.domainId) ?? [], entry.count, `${seed}:${entry.domainId}`),
  );
  // Top up from the whole bank when a domain cannot fill its quota, so the quiz
  // always delivers the advertised number of questions.
  const chosen = new Set(pool.map((question) => question.id));
  const topUp = makeActiveQuestions(az900Questions.filter((question) => !chosen.has(question.id)), total - pool.length, `${seed}:topup`);
  return shuffle([...pool, ...topUp], `${seed}:combined`);
}

function ProgressBar({ value }: { value: number }) { return <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>; }
function domainLabel(domainId: string) { return az900DomainDefinitions.find((domain) => domain.id === domainId)?.title ?? domainId; }

export default function Az900Page() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [view, setView] = useState<View>("home");
  const [selectedStageId, setSelectedStageId] = useState(az900Stages[0].id);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>("");
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
  const knownQuestionIds = useMemo(() => new Set(az900Questions.map((question) => question.id)), []);

  useEffect(() => { void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => { if (!response.ok) return; const data = await response.json() as { user?: { id?: string } }; if (data.user?.id) setUserId(data.user.id); }).catch(() => undefined); }, []);
  useEffect(() => {
    if (!userId) return;
    let saved: StoredState = {};
    try { saved = JSON.parse(localStorage.getItem(`wincraft-progress:${userId}:az900`) ?? "{}"); } catch { /* optional browser storage */ }
    if (saved.view) setView(saved.view);
    if (saved.selectedStageId && az900Stages.some((stage) => stage.id === saved.selectedStageId)) setSelectedStageId(saved.selectedStageId);
    if (saved.selectedObjectiveId && az900ObjectiveById(saved.selectedObjectiveId)) setSelectedObjectiveId(saved.selectedObjectiveId);
    if (typeof saved.fontScale === "number") setFontScale(Math.max(.85, Math.min(1.3, saved.fontScale)));
    if (typeof saved.translationLanguage === "string") setTranslationLanguage(saved.translationLanguage);
    setAttemptedIds(saved.attemptedIds?.filter((id) => knownQuestionIds.has(id)) ?? []);
    setCorrectIds(saved.correctIds?.filter((id) => knownQuestionIds.has(id)) ?? []);
    setCardIds(saved.cardIds?.filter((id) => knownQuestionIds.has(id)) ?? []);
    if (saved.quiz) {
      const restored = restoreQuestions(saved.quiz.questionOrder);
      const expiry = saved.quiz.expiresAt ? Date.parse(saved.quiz.expiresAt) : Number.POSITIVE_INFINITY;
      if (restored.length && expiry > Date.now()) { setQuizMode(saved.quiz.mode); setQuizQuestions(restored); setQuizAnswers(saved.quiz.answers); setQuizIndex(Math.min(saved.quiz.index, restored.length - 1)); setQuizExpiresAt(saved.quiz.expiresAt); setQuizSessionId(saved.quiz.sessionId); setView("exams"); }
    }
    void fetch("/api/attempts", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { attempts?: Array<{ questionId?: string; isCorrect?: boolean }> };
      const relevant = (data.attempts ?? []).filter((attempt) => attempt.questionId && knownQuestionIds.has(attempt.questionId));
      if (relevant.length) { setAttemptedIds(Array.from(new Set(relevant.flatMap((item) => item.questionId ? [item.questionId] : [])))); setCorrectIds(Array.from(new Set(relevant.flatMap((item) => item.isCorrect && item.questionId ? [item.questionId] : [])))); }
    }).catch(() => undefined);
    void fetch("/api/flashcards", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { flashcards?: Array<{ questionId?: string }> };
      const ids = (data.flashcards ?? []).flatMap((card) => card.questionId && knownQuestionIds.has(card.questionId) ? [card.questionId] : []);
      if (ids.length) setCardIds(Array.from(new Set(ids)));
    }).catch(() => undefined);
    setHydrated(true);
  }, [userId, knownQuestionIds]);

  useEffect(() => {
    if (!userId || !hydrated) return;
    const quiz = quizQuestions.length && !quizFinished ? { mode: quizMode, questionOrder: quizQuestions.map((question) => ({ questionId: question.id, optionOrder: question.optionOrder })), answers: quizAnswers, index: quizIndex, expiresAt: quizExpiresAt, sessionId: quizSessionId } : undefined;
    const state: StoredState = { view, selectedStageId, selectedObjectiveId, fontScale, translationLanguage, attemptedIds, correctIds, cardIds, quiz };
    try { localStorage.setItem(`wincraft-progress:${userId}:az900`, JSON.stringify(state)); } catch { /* optional browser storage */ }
  }, [userId, hydrated, view, selectedStageId, selectedObjectiveId, fontScale, translationLanguage, attemptedIds, correctIds, cardIds, quizQuestions, quizFinished, quizMode, quizAnswers, quizIndex, quizExpiresAt, quizSessionId]);

  const stageProgress = useMemo(() => Object.fromEntries(az900Stages.map((stage) => { const answered = stage.questionIds.filter((id) => attemptedIds.includes(id)).length; return [stage.id, stage.questionIds.length ? Math.round((answered / stage.questionIds.length) * 100) : 0]; })), [attemptedIds]);
  const correctRate = attemptedIds.length ? Math.round((correctIds.length / attemptedIds.length) * 100) : 0;
  const selectedStage = az900Stages.find((stage) => stage.id === selectedStageId) ?? az900Stages[0];

  const startQuiz = useCallback((mode: ExamMode, questionId?: string, stageOverride?: string) => {
    const seed = `${Date.now()}:${crypto.randomUUID()}`;
    const stageForQuiz = stageOverride ?? selectedStageId;
    const selected = questionId
      ? makeActiveQuestions(az900Questions.filter((question) => question.id === questionId), 1, seed)
      : mode === "practice"
        ? makeActiveQuestions(az900QuestionsByGroup.get(stageForQuiz) ?? [], 999, seed)
        : selectForMode(mode, stageForQuiz, seed);
    const minutes = mode === "practice" ? 0 : examModes[mode].minutes;
    setQuizMode(mode); setQuizQuestions(selected); setQuizAnswers({}); setQuizIndex(0); setQuizFinished(false); setQuizExpiresAt(minutes ? new Date(Date.now() + minutes * 60000).toISOString() : null); setQuizSessionId(`az900-${crypto.randomUUID()}`); setView("exams");
  }, [selectedStageId]);

  const submitAnswer = (displayIndex: number) => {
    const question = quizQuestions[quizIndex];
    if (!question || quizAnswers[question.id] !== undefined) return;
    const canonicalIndex = question.optionOrder[displayIndex];
    const correct = displayIndex === question.correct;
    setQuizAnswers((current) => ({ ...current, [question.id]: displayIndex }));
    setAttemptedIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    if (correct) setCorrectIds((current) => current.includes(question.id) ? current : [...current, question.id]);
    else {
      setCardIds((current) => current.includes(question.id) ? current : [...current, question.id]);
      void fetch("/api/flashcards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, box: 1 }) }).catch(() => undefined);
    }
    void fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: canonicalIndex, isCorrect: correct, sessionId: quizSessionId }) }).catch(() => undefined);
  };

  const finishOrNext = () => { if (quizIndex >= quizQuestions.length - 1) setQuizFinished(true); else setQuizIndex((index) => index + 1); };
  const signOut = async () => { await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined); setUserId(null); setAuthOpen(false); return true; };

  if (!userId) return <main className="study-app min-h-screen bg-black text-white"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;

  const navigation = [
    { key: "home" as const, label: "Home", icon: <LayoutDashboard size={19} /> },
    { key: "lessons" as const, label: "Learning", icon: <BookOpen size={19} /> },
    { key: "practice" as const, label: "Practice", icon: <FlaskConical size={19} /> },
    { key: "bank" as const, label: "Question bank", icon: <Library size={19} /> },
    { key: "graph" as const, label: "Skill graph", icon: <Network size={19} /> },
    { key: "search" as const, label: "Search", icon: <Search size={19} /> },
    { key: "exams" as const, label: "Exams", icon: <ListChecks size={19} /> },
    { key: "labs" as const, label: "Labs", icon: <FlaskConical size={19} /> },
    { key: "cards" as const, label: "Leitner", icon: <Layers size={19} /> },
  ];

  const sectionView: View = ["bank", "labs", "cards", "search"].includes(view) || (view === "exams" && quizMode === "practice" && quizQuestions.length > 0) ? "practice" : view === "graph" ? "lessons" : view;
  const primaryNavigation = navigation.filter(item => ["home", "lessons", "bank", "labs", "exams", "cards"].includes(item.key));
  return <GoogleSubtitleProvider language={translationLanguage}><main className="study-app font-scale-content min-h-screen text-[#e8edf5]" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="app-sidebar border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-e">
        <AppBrand subtitle="Azure & Windows Server learning" />
        <SimpleNavigation items={primaryNavigation} active={primaryNavigation.some(item => item.key === view) ? view : sectionView} onNavigate={key => setView(key as View)} /></aside>
      <section className="study-content min-w-0 px-3 pb-44 pt-3 sm:p-7 lg:p-9">
        <StudyHeader title={navigation.find((item) => item.key === view)?.label ?? "Dashboard"} course="AZ-900" t={t} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={translationLanguage} onTranslationLanguage={setTranslationLanguage} onAccount={() => setAuthOpen(true)} />
        {hydrated && quizQuestions.length > 0 && !quizFinished && quizMode === "practice" && <PracticeResume question={quizIndex + 1} total={quizQuestions.length} answered={Object.keys(quizAnswers).length} active={view === "exams"} onResume={() => setView("exams")} onPause={() => setView("practice")} />}{view === "home" && <LearningStart title="Learn Azure step by step" lesson={(az900Lessons.find(item => item.stageId === selectedStageId) ?? az900Lessons[0]).title} progress={`${attemptedIds.length}/${az900Questions.length} questions answered · ${correctRate}% correct`} onStart={() => setView("lessons")} metrics={[{label:"Question progress",value:`${attemptedIds.length}/${az900Questions.length}`,percent:Math.round(attemptedIds.length / az900Questions.length * 100)},{label:"Correct answers",value:attemptedIds.length ? `${correctRate}%` : "Not started"},{label:"Current lesson",value:`${az900Stages.findIndex(stage => stage.id === selectedStageId) + 1}/${az900Stages.length}`}]} actions={navigation.filter(item => ["bank","labs","exams","cards","graph","search"].includes(item.key))} onNavigate={key => setView(key as View)} />}
        {view === "practice" && <PracticeHub onQuestions={() => setView("bank")} onLabs={() => setView("labs")}><details className="simple-details"><summary>More practice tools</summary><div className="simple-tools"><button type="button" onClick={() => setView("cards")}>Review saved questions</button><button type="button" onClick={() => setView("search")}>Search questions</button></div></details></PracticeHub>}
        {["bank", "labs", "cards", "search"].includes(view) && <button className="simple-back" type="button" onClick={() => setView("practice")}>← Practice choices</button>}
        {view === "lessons" && <><details className="simple-details"><summary>Learning progress</summary><button className="simple-back" type="button" onClick={() => setView("graph")}>Open skill map →</button></details><Az900Lessons selectedStageId={selectedStageId} onSelect={setSelectedStageId} stageProgress={stageProgress} onPractice={() => startQuiz("practice")} /></>}
        {view === "bank" && <Az900BankView selectedObjectiveId={selectedObjectiveId} onSelectObjective={setSelectedObjectiveId} attemptedIds={attemptedIds} onPracticeQuestion={(id) => startQuiz("practice", id)} showTranslations={Boolean(translationLanguage)} />}
        {view === "graph" && <Az900Graph selectedStageId={selectedStageId} onSelect={(id) => { setSelectedStageId(id); setView("lessons"); }} stageProgress={stageProgress} onPractice={(id) => { setSelectedStageId(id); startQuiz("practice", undefined, id); }} />}
        {view === "search" && <KnowledgeSearch questionBank={az900Questions} courseCode="AZ-900" courseName="Azure Fundamentals" examples={["Which service evaluates Azure resource compliance?", "What is the difference between an availability set and availability zones?", "How does a private endpoint differ from a public endpoint?", "CanNotDelete vs ReadOnly locks"]} showTranslations={Boolean(translationLanguage)} onPracticeQuestion={(id) => startQuiz("practice", id)} />}
        {view === "exams" && (quizQuestions.length && !quizFinished ? <Az900Quiz questions={quizQuestions} index={quizIndex} answers={quizAnswers} mode={quizMode} expiresAt={quizExpiresAt} showTranslations={Boolean(translationLanguage)} onAnswer={submitAnswer} onPrevious={() => setQuizIndex((index) => Math.max(0, index - 1))} onNext={finishOrNext} onFinish={() => setQuizFinished(true)} /> : quizFinished ? <Az900Result questions={quizQuestions} answers={quizAnswers} onRestart={() => startQuiz(quizMode)} onExit={() => { setQuizQuestions([]); setQuizAnswers({}); setQuizFinished(false); setQuizExpiresAt(null); }} /> : <Az900ExamChooser selectedStage={selectedStage} onStart={startQuiz} />)}
        {view === "labs" && <Az900Labs userId={userId} showTranslations={Boolean(translationLanguage)} />}
        {view === "cards" && <Az900Cards cardIds={cardIds} onReview={(questionId, quality) => { if (quality === "got-it") setCardIds((ids) => ids.filter((id) => id !== questionId)); void fetch("/api/flashcards", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, quality }) }).catch(() => undefined); }} />}
      </section>
      <MobileNavigation items={primaryNavigation} primaryKeys={["home", "lessons", "practice", "exams"]} active={sectionView} onNavigate={setView} />
    </div>
    {authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}

function Az900Lessons({ selectedStageId, onSelect, stageProgress, onPractice }: { selectedStageId: string; onSelect: (id: string) => void; stageProgress: Record<string, number>; onPractice: () => void }) {
  const stage = az900Stages.find((item) => item.id === selectedStageId) ?? az900Stages[0];
  const lesson = az900Lessons.find((item) => item.stageId === stage.id) ?? az900Lessons[0];
  return <div className="space-y-5">
    <label className="simple-course-select">Choose a lesson<select aria-label="Choose a lesson" value={stage.id} onChange={event => onSelect(event.target.value)}>{az900Stages.map(item => <option key={item.id} value={item.id}>{item.stage}. {item.title} · {stageProgress[item.id] ?? 0}%</option>)}</select></label>
    <article className="lesson-panel rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Stage {stage.stage} · <GoogleSubtitle text={stage.domain} /> · {stage.weight}</p>
      <h2 className="mt-3 text-3xl font-bold"><GoogleSubtitle text={lesson.title} /></h2>
      <p className="mt-4 text-base leading-8 text-slate-300"><GoogleSubtitle text={lesson.body} /></p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3"><Metric label="Estimated" value={`${lesson.estimatedMinutes} min`} /><Metric label="Practice bank" value={`${stage.questionIds.length} questions`} /><Metric label="Blueprint" value="2026-07-20" /></div>
      <h3 className="mt-7 text-lg font-semibold">Official objectives in this group</h3>
      <ol className="mt-3 space-y-2">{stage.objectives.map((objective) => <li key={objective.id} className="rounded-xl bg-black/15 p-3 text-sm leading-6 text-slate-300"><GoogleSubtitle text={objective.text} /><span className="ms-2 text-xs text-cyan-200">{objective.questionCount} questions</span></li>)}</ol>
      <div className="mt-7 flex flex-wrap gap-3"><button type="button" onClick={onPractice} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a]">Practice this stage →</button>{lesson.sources.slice(0, 3).map((reference) => <a key={reference} href={reference} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-cyan-100">Microsoft Learn source ↗</a>)}</div>
    </article>
  </div>;
}

function Az900BankView({ selectedObjectiveId, onSelectObjective, attemptedIds, onPracticeQuestion, showTranslations }: { selectedObjectiveId: string; onSelectObjective: (id: string) => void; attemptedIds: string[]; onPracticeQuestion: (id: string) => void; showTranslations: boolean }) {
  const activeObjectiveId = selectedObjectiveId || az900Stages[0].objectives[0].id;
  const activeQuestions = az900QuestionsByObjective.get(activeObjectiveId) ?? [];
  return <div className="space-y-5">
    <label className="simple-course-select">Choose a topic<select aria-label="Choose a question topic" value={activeObjectiveId} onChange={event => onSelectObjective(event.target.value)}>{az900Stages.map(stage => <optgroup key={stage.id} label={stage.title}>{stage.objectives.map(objective => <option key={objective.id} value={objective.id}>{objective.text} ({objective.questionCount})</option>)}</optgroup>)}</select></label>
    <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Objective</p>
      <h2 className="mt-2 text-xl font-bold"><GoogleSubtitle text={az900ObjectiveById(activeObjectiveId)?.text ?? activeObjectiveId} enabled={showTranslations} /></h2>
      <p className="mt-2 text-sm text-slate-400"><GoogleSubtitle text={domainLabel(az900ObjectiveById(activeObjectiveId)?.domainId ?? "")} enabled={showTranslations} /> · {activeQuestions.length} questions</p>
      <div className="mt-5 grid gap-3">{activeQuestions.map((question) => { const done = attemptedIds.includes(question.id); return <article key={question.id} className="rounded-2xl border border-white/10 bg-black/15 p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>{question.id} · {question.difficulty}{done ? " · answered" : ""}</span><button type="button" onClick={() => onPracticeQuestion(question.id)} className="rounded-lg border border-cyan-300/40 px-3 py-1 font-semibold text-cyan-100">Practice →</button></div><p className="mt-2 text-sm leading-6"><GoogleSubtitle text={question.text} enabled={showTranslations} /></p><details className="mt-2"><summary className="cursor-pointer text-xs font-semibold text-cyan-200">Show answer and explanation</summary><p className="mt-2 text-sm font-semibold text-emerald-200"><GoogleSubtitle text={question.options[question.correct]} enabled={showTranslations} /></p><p className="mt-2 text-sm leading-6 text-slate-300"><GoogleSubtitle text={question.rationale.en} enabled={showTranslations} /></p><ul className="mt-3 space-y-1 text-xs leading-5 text-slate-400">{question.keyPoints.map((point) => <li key={point}><GoogleSubtitle text={point} enabled={showTranslations} /></li>)}</ul><p className="mt-3 text-xs text-slate-500">Source: <a className="text-cyan-200" href={question.source} target="_blank" rel="noreferrer">{question.source.replace(/^https:\/\/learn\.microsoft\.com\//, "")}</a></p></details></article>; })}</div>
      {activeQuestions.length < 4 && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-6 text-amber-100">This objective has fewer than four authored questions. Add more in <code>lib/content/az900-questions-*.ts</code>.</p>}
    </section>
  </div>;
}

function Az900Graph({ selectedStageId, onSelect, stageProgress, onPractice }: { selectedStageId: string; onSelect: (id: string) => void; stageProgress: Record<string, number>; onPractice: (id: string) => void }) {
  return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">AZ-900 → domain → group → objective → question</p><h2 className="mt-2 text-2xl font-bold">Interactive Azure Fundamentals graph</h2></div><div className="mt-7 grid gap-5 xl:grid-cols-3">{az900DomainDefinitions.map((domain) => <article key={domain.id} className="rounded-2xl border border-cyan-300/20 bg-black/15 p-4"><h3 className="font-semibold text-cyan-50"><GoogleSubtitle text={domain.title} /></h3><p className="mt-1 text-xs text-slate-400">{domain.weightMin}\u2013{domain.weightMax}% · {(az900QuestionsByDomain.get(domain.id) ?? []).length} questions</p><div className="mt-4 space-y-2">{az900Stages.filter((stage) => stage.domainId === domain.id).map((stage) => <button type="button" key={stage.id} aria-current={selectedStageId === stage.id ? "step" : undefined} onClick={() => onSelect(stage.id)} className={`w-full rounded-xl border p-3 text-start ${selectedStageId === stage.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-[#111a28]"}`}><span className="text-xs font-semibold text-cyan-200">{stage.stage}. <GoogleSubtitle text={stage.title} /></span><span className="mt-1 block text-xs text-slate-400">{stage.objectives.length} objectives · {stage.questionIds.length} linked questions · {stageProgress[stage.id] ?? 0}%</span></button>)}</div><button type="button" onClick={() => onPractice(az900Stages.find((stage) => stage.domainId === domain.id)?.id ?? az900Stages[0].id)} className="mt-4 text-sm font-semibold text-cyan-200">Practice domain path →</button></article>)}</div></section>;
}

function Az900ExamChooser({ selectedStage, onStart }: { selectedStage: typeof az900Stages[number]; onStart: (mode: ExamMode) => void }) {
  return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-cyan-300">Reviewed practice · not exam dumps</p><h2 className="mt-2 text-2xl font-bold">Choose an AZ-900 review mode</h2><p className="mt-2 text-sm text-slate-400">Current group: <GoogleSubtitle text={selectedStage.title} /></p></div><div className="flex gap-3 text-sm"><a href={az900Course.practiceAssessment} target="_blank" rel="noreferrer" className="text-cyan-200">Official Practice Assessment ↗</a><a href={az900Course.examSandbox} target="_blank" rel="noreferrer" className="text-cyan-200">Exam interface demo ↗</a></div></div>
    <button type="button" className="simple-primary mt-6" onClick={() => onStart("quick")}>Start quick check · 8 questions →</button><details className="simple-details"><summary>More exam modes</summary><div className="mt-6 grid gap-4 sm:grid-cols-2">{Object.entries(examModes).filter(([mode]) => mode !== "quick").map(([mode, config]) => <button type="button" key={mode} onClick={() => onStart(mode as ExamMode)} className="rounded-2xl border border-white/10 bg-black/15 p-5 text-start hover:border-cyan-300/50"><span className="text-xs font-bold uppercase tracking-[.12em] text-cyan-300">{config.count} questions · {config.minutes} min</span><h3 className="mt-2 text-lg font-semibold">{config.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{config.description}</p></button>)}</div></details>
    <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-6 text-amber-100">The official AZ-900 assessment allows 45 minutes. Question counts here are internal learning modes and do not claim to reproduce the official exam format.</p>
  </section>;
}

function Az900Quiz({ questions, index, answers, mode, expiresAt, showTranslations, onAnswer, onPrevious, onNext, onFinish }: { questions: ActiveQuestion[]; index: number; answers: Record<string, number>; mode: ExamMode; expiresAt: string | null; showTranslations: boolean; onAnswer: (index: number) => void; onPrevious: () => void; onNext: () => void; onFinish: () => void }) {
  const question = questions[index]; const answer = answers[question.id]; const answered = answer !== undefined; const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => { if (!expiresAt) { setSeconds(null); return; } const update = () => setSeconds(Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, [expiresAt]);
  useEffect(() => { if (expiresAt && seconds === 0) onFinish(); }, [expiresAt, seconds, onFinish]);
  const timer = seconds === null ? "--:--" : `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return <section className="reading-panel quiz-workspace mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8 lg:p-10">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span>{mode === "practice" ? "Group practice" : examModes[mode].title}</span><span>{index + 1} / {questions.length}{expiresAt ? ` · ${timer}` : ""}</span></div>
    <ProgressBar value={((index + 1) / questions.length) * 100} />
    <p className="mt-7 text-xs font-bold uppercase tracking-[.13em] text-cyan-300"><GoogleSubtitle text={`${domainLabel(question.domainId)} · ${question.topic}`} enabled={showTranslations} /> · {question.id}</p>
    <h2 className="mt-3 text-xl font-semibold leading-8"><GoogleSubtitle text={question.text} enabled={showTranslations} /></h2>
    <div className="quiz-options mt-6 grid gap-3 lg:grid-cols-2">{question.options.map((option, optionIndex) => <button type="button" key={`${question.id}-${option}`} disabled={answered} onClick={() => onAnswer(optionIndex)} className={`w-full rounded-xl border p-4 text-start ${answer === optionIndex ? (optionIndex === question.correct ? "border-emerald-400 bg-emerald-400/10" : "border-rose-400 bg-rose-400/10") : answered && optionIndex === question.correct ? "border-emerald-400/60 bg-emerald-400/5" : "border-white/10 bg-black/10 hover:border-cyan-300/50"}`}><GoogleSubtitle text={option} enabled={showTranslations} /></button>)}</div>
    {answered && <div className={`mt-6 rounded-2xl border p-5 ${answer === question.correct ? "border-emerald-300/30 bg-emerald-300/5" : "border-amber-300/30 bg-amber-300/5"}`}><p className="font-semibold">{answer === question.correct ? "＋ Correct" : "− Added to Leitner review"}</p><div className="mt-2 text-sm leading-7 text-slate-300"><GoogleSubtitle text={question.rationale.en} enabled={showTranslations} /></div><a href={question.source} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-cyan-200">Microsoft Learn source ↗</a></div>}
    {answered && <QuestionExplanation question={question} selectedAnswer={answer} showTranslations={showTranslations} sourceLabel="AZ-900 Microsoft Learn source ↗" showSchematic={false} />}
    <div className="quiz-actions mt-6 grid grid-cols-2 gap-3 sm:flex"><button type="button" disabled={index === 0} onClick={onPrevious} className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-cyan-100 disabled:opacity-35">Previous ←</button><button type="button" disabled={!answered} onClick={onNext} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a] disabled:opacity-35">{index === questions.length - 1 ? "Finish" : "Next"} →</button></div>
  </section>;
}

function Az900Result({ questions, answers, onRestart, onExit }: { questions: ActiveQuestion[]; answers: Record<string, number>; onRestart: () => void; onExit: () => void }) {
  const correct = questions.filter((question) => answers[question.id] === question.correct).length;
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  const byDomain = az900DomainDefinitions.map((domain) => { const rows = questions.filter((question) => question.domainId === domain.id); const hits = rows.filter((question) => answers[question.id] === question.correct).length; return { domain: domain.title, asked: rows.length, correct: hits }; }).filter((row) => row.asked);
  return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-6 text-center sm:p-10"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Review complete</p><h2 className="mt-4 text-4xl font-bold">{score}%</h2><p className="mt-3 text-slate-300">{correct} correct out of {questions.length}</p><ul className="mt-6 space-y-2 text-start text-sm text-slate-300">{byDomain.map((row) => <li key={row.domain} className="rounded-xl bg-black/15 p-3">{row.domain}: {row.correct}/{row.asked}</li>)}</ul><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={onRestart} className="rounded-xl bg-cyan-300 px-6 py-3 font-bold text-[#06131a]">Repeat this mode</button><button type="button" onClick={onExit} className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-cyan-100">Choose another mode</button></div></section>;
}

function Az900Labs({ userId, showTranslations }: { userId: string; showTranslations: boolean }) {
  const [selected, setSelected] = useState(az900Labs[0].id);
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const lab = az900Labs.find((item) => item.id === selected) ?? az900Labs[0];
  const submit = async () => { const response = await fetch("/api/lab-submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ labId: lab.id, evidenceText: evidence, completed: true, userId }) }); setMessage(response.ok ? "Evidence saved." : "Add at least eight characters of evidence."); };
  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-3xl border border-white/10 bg-[#111a28] p-5"><h2 className="text-xl font-bold">Guided Azure labs</h2><div className="mt-4 space-y-2">{az900Labs.map((item) => <button type="button" key={item.id} onClick={() => { setSelected(item.id); setMessage(""); }} className={`w-full rounded-xl border p-4 text-start ${selected === item.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10"}`}><GoogleSubtitle text={item.title} enabled={showTranslations} /></button>)}</div></section><article className="rounded-3xl border border-cyan-300/20 bg-[#111a28] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300">Hands-on activity</p><h2 className="mt-3 text-2xl font-bold"><GoogleSubtitle text={lab.title} enabled={showTranslations} /></h2><p className="mt-3 leading-7 text-slate-300"><GoogleSubtitle text={lab.description} enabled={showTranslations} /></p><ol className="mt-6 space-y-3">{lab.checklist.map((item, index) => <li key={item} className="flex gap-3 rounded-xl bg-black/15 p-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-sm text-cyan-200">{index + 1}</span><span><GoogleSubtitle text={item} enabled={showTranslations} /></span></li>)}</ol><label className="mt-6 block font-semibold">Evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-black/20 p-3" placeholder="Paste notes, results, or a link to your evidence…" /></label><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => void submit()} className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-[#06131a]">Save evidence</button><a href={az900Course.studyGuide} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-cyan-100">Official study guide ↗</a></div>{message && <p className="mt-3 text-sm text-cyan-100">{message}</p>}</article></div>;
}

function Az900Cards({ cardIds, onReview }: { cardIds: string[]; onReview: (id: string, quality: "again" | "got-it") => void }) {
  const card = az900Questions.find((question) => question.id === cardIds[0]);
  if (!card) return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-8 text-center"><Layers className="mx-auto text-cyan-300" /><h2 className="mt-4 text-2xl font-bold">No AZ-900 cards due</h2><p className="mt-2 text-slate-400">Incorrect answers will appear here automatically.</p></section>;
  return <section className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">AZ-900 Leitner</p><h2 className="text-2xl font-bold">Review queue</h2></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">{cardIds.length} cards</span></div><article className="mt-5 min-h-80 rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-[#173147] to-[#111a28] p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-300"><GoogleSubtitle text={card.topic} /> · {card.id}</p><h3 className="mt-8 text-2xl font-semibold leading-9"><GoogleSubtitle text={card.text} /></h3><p className="mt-6 border-t border-white/10 pt-5 leading-7 text-slate-300"><GoogleSubtitle text={card.options[card.correct]} /></p></article><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => onReview(card.id, "again")} className="rounded-xl border border-rose-300/30 px-4 py-3 font-semibold text-rose-200">Again · 1 day</button><button type="button" onClick={() => onReview(card.id, "got-it")} className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-[#06131a]">Got it →</button></div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-black/15 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
