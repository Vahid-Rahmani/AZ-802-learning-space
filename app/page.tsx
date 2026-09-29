"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { copy, lessons, questions, trainingStages } from "@/lib/course-data";
import { AccountPanel, AuthPanel, Cards, Dashboard, Labs, Lesson, PracticalExam, Quiz, SkillGraph, text } from "@/app/components/learning-views";
import { FontSizeControl, StageProgressStrip, TrainingHub } from "@/app/components/training-views";
import { ExamResult } from "@/app/components/exam-result";

type Language = "fa" | "en" | "de";
type View = "home" | "lesson" | "graph" | "quiz" | "practical" | "labs" | "cards";
type QuizMode = "exam" | "practice";
const TRANSLATION_VERSION = 2;
const GUEST_ID = "local-guest";
type QuizQuestion = typeof questions[number];

function questionSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function shuffledQuestion(question: QuizQuestion): QuizQuestion {
  const indexes = [0, 1, 2, 3];
  let seed = questionSeed(question.id);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  const localized = question as QuizQuestion & { optionsFa?: string[] };
  return { ...question, options: indexes.map((index) => question.options[index]), optionsFa: indexes.map((index) => localized.optionsFa?.[index] ?? question.options[index]), correct: indexes.indexOf(question.correct) };
}

function buildQuizQuestions(scope: { skillId?: string | null; domain?: string | null; mode?: QuizMode } | null) {
  const pool = scope?.domain ? questions.filter((item) => item.domain === scope.domain) : scope?.skillId ? questions.filter((item) => item.skillId === scope.skillId) : questions;
  const selected = scope?.mode === "practice" || pool.length <= 8 ? pool : Array.from({ length: 8 }, (_, index) => pool[Math.floor(index * pool.length / 8)]);
  return selected.map(shuffledQuestion);
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("fa");
  const [view, setViewState] = useState<View>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(GUEST_ID);
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState(trainingStages[0].id);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("exam");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => buildQuizQuestions({ mode: "exam" }));
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(0);
  const [answerStats, setAnswerStats] = useState({ correct: 0, total: 0 });
  const [skillStats, setSkillStats] = useState<Record<string, { correct: number; total: number }>>({});
  const [domainStats, setDomainStats] = useState<Record<string, { correct: number; total: number }>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, number>>({});
  const [totalProgress, setTotalProgress] = useState(0);
  const [completedLab, setCompletedLab] = useState(false);
  const [labEvidence, setLabEvidence] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [cardKnown, setCardKnown] = useState(false);
  const [cardBox, setCardBox] = useState(1);
  const [cardQuestionId, setCardQuestionId] = useState(questions[0].id);
  const [cardQuestionIds, setCardQuestionIds] = useState<string[]>([]);
  const [fontScale, setFontScale] = useState(1);
  const [showTranslations, setShowTranslations] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const t = copy[language];
  const languageLabels: Record<Language, string> = { fa: "فارسی", en: "English", de: "Deutsch" };
  const activeQuestions = quizQuestions;
  const question = activeQuestions[questionIndex % activeQuestions.length];
  const stageProgress = Object.fromEntries(trainingStages.map((stage) => { const stat = domainStats[stage.domain]; return [stage.id, stat?.total ? Math.round((stat.correct / stat.total) * 100) : 0]; }));

  useEffect(() => {
    if (userId) return;
    void fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json().catch(() => ({})) as { user?: { id?: string } };
      if (data.user?.id) setUserId(data.user.id);
    }).catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    // The OAuth callback arrives before the saved session is restored.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId && new URLSearchParams(window.location.search).has("google_error")) setAuthOpen(true);
  }, [userId]);

  // Guest progress stays on this browser, separate from any account data.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId) { setLoadedUserId(null); return; }
    setTotalProgress(0); setSelectedLessonId(lessons[0].id); setSelectedStageId(trainingStages[0].id); setCompletedLab(false); setLabEvidence(""); setCardKnown(false); setCardBox(1); setCardQuestionId(questions[0].id); setAnswerStats({ correct: 0, total: 0 }); setSkillStats({}); setDomainStats({}); setSkillProgress({});
    try {
      const saved = JSON.parse(localStorage.getItem(`wincraft-progress:${userId}`) ?? "{}");
      if (saved.translationVersion === TRANSLATION_VERSION && ["fa", "en", "de"].includes(saved.language)) setLanguage(saved.language as Language);
      if (typeof saved.totalProgress === "number") setTotalProgress(saved.totalProgress);
      if (typeof saved.selectedLessonId === "string") setSelectedLessonId(saved.selectedLessonId);
      if (saved.completedLab) setCompletedLab(true);
      if (typeof saved.labEvidence === "string") setLabEvidence(saved.labEvidence);
      if (typeof saved.cardBox === "number") setCardBox(Math.max(1, Math.min(5, saved.cardBox)));
      if (typeof saved.cardQuestionId === "string" && questions.some((question) => question.id === saved.cardQuestionId)) setCardQuestionId(saved.cardQuestionId);
      if (Array.isArray(saved.cardQuestionIds)) { const savedCards = saved.cardQuestionIds.filter((id: unknown): id is string => typeof id === "string" && questions.some((question) => question.id === id)); setCardQuestionIds(Array.from(new Set<string>(savedCards))); }
      if (typeof saved.fontScale === "number") setFontScale(Math.max(0.85, Math.min(1.3, saved.fontScale)));
      if (typeof saved.showTranslations === "boolean") setShowTranslations(saved.showTranslations);
      if (typeof saved.selectedStageId === "string" && trainingStages.some((stage) => stage.id === saved.selectedStageId)) setSelectedStageId(saved.selectedStageId);
      if (saved.answerStats && typeof saved.answerStats.correct === "number" && typeof saved.answerStats.total === "number") setAnswerStats(saved.answerStats);
      if (saved.skillStats && typeof saved.skillStats === "object") setSkillStats(saved.skillStats);
      if (saved.domainStats && typeof saved.domainStats === "object") setDomainStats(saved.domainStats);
      if (saved.skillProgress && typeof saved.skillProgress === "object") setSkillProgress(saved.skillProgress);
    } catch { /* optional local state */ }
    setLoadedUserId(userId);
  }, [userId]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
    if (!userId || loadedUserId !== userId) return;
    try { localStorage.setItem(`wincraft-progress:${userId}`, JSON.stringify({ translationVersion: TRANSLATION_VERSION, language, totalProgress, selectedLessonId, selectedStageId, completedLab, labEvidence, cardKnown, cardBox, cardQuestionId, cardQuestionIds, answerStats, skillStats, domainStats, skillProgress, fontScale, showTranslations })); } catch { /* storage can be disabled */ }
  }, [language, userId, loadedUserId, totalProgress, selectedLessonId, selectedStageId, completedLab, labEvidence, cardKnown, cardBox, cardQuestionId, cardQuestionIds, answerStats, skillStats, domainStats, skillProgress, fontScale, showTranslations]);

  useEffect(() => {
    if (!userId || userId === GUEST_ID) return;
    let cancelled = false;
    void (async () => {
      try {
        const [progressResponse, labsResponse, attemptsResponse] = await Promise.all([fetch("/api/progress"), fetch("/api/lab-submissions"), fetch("/api/attempts")]);
        if (cancelled) return;
        if (progressResponse.ok) { const data = await progressResponse.json() as { progress?: Array<{ completionPercent?: number; lessonId?: string }> }; const current = data.progress?.find((item) => item.lessonId === selectedLessonId) ?? data.progress?.at(-1); if (typeof current?.completionPercent === "number") setTotalProgress(current.completionPercent); if (current?.lessonId) setSelectedLessonId(current.lessonId); }
        if (labsResponse.ok) { const data = await labsResponse.json() as { submissions?: Array<{ evidenceText?: string; completedAt?: string | number | null }> }; const latest = data.submissions?.at(-1); if (latest?.evidenceText) setLabEvidence(latest.evidenceText); if (latest?.completedAt) setCompletedLab(true); }
        if (attemptsResponse.ok) {
          const data = await attemptsResponse.json() as { attempts?: Array<{ questionId?: string; isCorrect?: boolean }> };
          const attempts = data.attempts ?? [];
          setAnswerStats({ correct: attempts.filter((item) => item.isCorrect).length, total: attempts.length });
          const bySkill: Record<string, { correct: number; total: number }> = {};
          const byDomain: Record<string, { correct: number; total: number }> = {};
          for (const attempt of attempts) { const item = questions.find((question) => question.id === attempt.questionId); if (!item) continue; bySkill[item.skillId] ??= { correct: 0, total: 0 }; bySkill[item.skillId].total += 1; if (attempt.isCorrect) bySkill[item.skillId].correct += 1; byDomain[item.domain] ??= { correct: 0, total: 0 }; byDomain[item.domain].total += 1; if (attempt.isCorrect) byDomain[item.domain].correct += 1; }
          setSkillStats(bySkill);
          setDomainStats(byDomain);
          setSkillProgress(Object.fromEntries(Object.entries(bySkill).map(([skillId, stat]) => [skillId, Math.round((stat.correct / stat.total) * 100)])));
        }
        const cardsResponse = await fetch("/api/flashcards");
        if (cardsResponse.ok) { const data = await cardsResponse.json() as { flashcards?: Array<{ questionId?: string; box?: number }> }; const card = data.flashcards?.find((item) => item.questionId && (questions.some((question) => question.id === item.questionId) || item.questionId === "ipsec-connection-rule")) ?? data.flashcards?.at(-1); const normalizedQuestionId = card?.questionId === "ipsec-connection-rule" ? "az802-q-216" : card?.questionId; if (normalizedQuestionId && questions.some((question) => question.id === normalizedQuestionId)) setCardQuestionId(normalizedQuestionId); if (card?.box) { setCardBox(card.box); setCardKnown(card.box > 1); } }
      } catch { /* local-first mode remains usable */ }
    })();
    return () => { cancelled = true; };
  }, [userId, selectedLessonId]);

  useEffect(() => { if (userId && userId !== GUEST_ID) void fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: selectedLessonId, completionPercent: totalProgress }) }); }, [userId, selectedLessonId, totalProgress]);

  const startQuiz = (scope: { skillId?: string | null; domain?: string | null; mode?: QuizMode } | null = null) => {
    const mode = scope?.mode ?? "exam";
    setSelectedSkillId(scope?.skillId ?? null);
    setSelectedDomain(scope?.domain ?? null);
    setQuizMode(mode);
    setQuizQuestions(buildQuizQuestions({ ...scope, mode }));
    setQuestionIndex(0);
    setAnswer(null);
    setQuizFinished(false);
    setQuizCorrect(0);
    setQuizAnswered(0);
    setViewState("quiz");
  };

  const setView = (nextView: View) => nextView === "quiz" ? startQuiz({ mode: "practice" }) : setViewState(nextView);

  const submitAnswer = (value: number) => {
    const correct = value === question.correct;
    setAnswer(value);
    setQuizAnswered((current) => current + 1);
    if (correct) { setQuizCorrect((current) => current + 1); setTotalProgress((current) => Math.min(100, current + 2)); }
    if (!correct) { setCardQuestionId(question.id); setCardQuestionIds((current) => current.includes(question.id) ? current : [...current, question.id]); setCardKnown(false); setCardBox(1); }
    setAnswerStats((current) => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    setSkillStats((current) => { const next = { ...current, [question.skillId]: { ...(current[question.skillId] ?? { correct: 0, total: 0 }), total: (current[question.skillId]?.total ?? 0) + 1, correct: (current[question.skillId]?.correct ?? 0) + (correct ? 1 : 0) } }; setSkillProgress((progress) => ({ ...progress, [question.skillId]: Math.round((next[question.skillId].correct / next[question.skillId].total) * 100) })); return next; });
    setDomainStats((current) => { const previous = current[question.domain] ?? { correct: 0, total: 0 }; return { ...current, [question.domain]: { total: previous.total + 1, correct: previous.correct + (correct ? 1 : 0) } }; });
    if (userId && userId !== GUEST_ID) {
      void fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: value, isCorrect: value === question.correct }) });
      if (value !== question.correct) void fetch("/api/flashcards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, box: 1 }) });
    }
  };

  const submitLab = async () => {
    setCompletedLab(true);
    setTotalProgress((current) => Math.min(100, current + 5));
    if (!userId || userId === GUEST_ID) return;
    let evidenceUrl: string | undefined;
    if (evidenceFile) { const form = new FormData(); form.set("labId", "harden-two-server-domain"); form.set("file", evidenceFile); const upload = await fetch("/api/evidence", { method: "POST", body: form }); if (upload.ok) evidenceUrl = (await upload.json() as { key?: string }).key; }
    await fetch("/api/lab-submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ labId: "harden-two-server-domain", evidenceText: labEvidence, evidenceUrl, completed: true }) });
  };

  const signOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) return false;
      setAuthOpen(false);
      setUserId(null);
      setLoadedUserId(null);
      return true;
    } catch {
      return false;
    }
  };

  const closeAccount = () => {
    setAuthOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("google_error")) {
      url.searchParams.delete("google_error");
      window.history.replaceState(null, "", url);
    }
  };

  const navigation: Array<{ key: View; icon: string; label: string }> = [
    { key: "home", icon: "◫", label: t.dashboard }, { key: "graph", icon: "⌘", label: t.graph }, { key: "quiz", icon: "✓", label: t.exams }, { key: "practical", icon: "⚙", label: text(t, "practicalExam", "Practical exam") }, { key: "labs", icon: "▣", label: t.labs }, { key: "cards", icon: "▤", label: t.leitner },
  ];
  const navigate = (key: View) => key === "quiz" ? startQuiz({ mode: "practice" }) : setView(key);
  if (!userId) return <main dir="ltr" className="min-h-screen bg-[#0b1018] text-[#e8edf5]"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={(id) => { setUserId(id); setAuthOpen(false); }} /></div></main>;
  return <main dir="ltr" className="min-h-screen bg-[#0b1018] text-[#e8edf5] selection:bg-cyan-300 selection:text-[#071016]"><div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="border-b border-white/10 bg-[#0d1420] p-3 sm:p-4 lg:border-b-0 lg:border-e"><div className="flex items-center justify-between gap-3 px-1 py-1 sm:px-2 sm:py-2 lg:block"><div className="flex items-center gap-2.5 sm:gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300 text-lg font-black text-[#071016]">W</div><div><p className="font-semibold tracking-tight">WinCraft</p><p className="hidden text-xs text-slate-400 sm:block">AZ-802 learning space</p></div></div><div className="mt-0" aria-label="Language / زبان"><p className="mb-1 hidden text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500 sm:block">Language / زبان</p><div className="flex rounded-lg border border-white/10 bg-black/15 p-1">{(["fa", "en", "de"] as Language[]).map((lang) => <button type="button" key={lang} onClick={() => setLanguage(lang)} aria-pressed={language === lang} className={`rounded-md px-2 py-1 text-[10px] font-semibold sm:px-2.5 sm:text-[11px] ${language === lang ? "bg-white/10 text-cyan-200" : "text-slate-500"}`}>{languageLabels[lang]}</button>)}</div></div></div><nav aria-label="Primary navigation" className="mt-4 hidden gap-1 lg:grid lg:grid-cols-1">{navigation.map((item) => <button type="button" key={item.key} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => setView(item.key)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm transition ${view === item.key ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="text-lg">{item.icon}</span><span>{item.label}</span></button>)}</nav><div className="mt-6 hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#14243a] to-[#101723] p-4 lg:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{t.target}</p><p className="mt-2 font-semibold">Windows Server Administrator</p><p className="mt-1 text-sm text-slate-400">AZ-802 · English exam</p><a href="https://learn.microsoft.com/en-us/credentials/certifications/practice-assessments-for-microsoft-certifications" target="_blank" rel="noreferrer" className="mt-4 block text-sm font-semibold text-cyan-200">{t.officialPractice} ↗</a></div></aside><section className="font-scale-content min-w-0 px-3 pb-24 pt-3 sm:p-7 lg:p-9" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}><header className="sticky top-0 z-30 -mx-3 mb-5 flex min-h-14 items-center justify-between gap-2 border-b border-white/10 bg-[#0b1018]/95 px-3 py-2 backdrop-blur sm:static sm:mx-0 sm:mb-7 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"><div className="min-w-0"><p className="hidden text-xs font-semibold uppercase tracking-[.16em] text-cyan-300 sm:block">Microsoft Learn aligned · 2026</p><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-cyan-300 sm:hidden">AZ-802 · WinCraft</p><h1 className="mt-0 truncate text-lg font-bold tracking-tight sm:mt-1 sm:text-3xl">{t.greeting}, Alex.</h1></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><FontSizeControl t={t} scale={fontScale} onChange={setFontScale} /><button type="button" aria-label={language === "fa" ? (showTranslations ? "Hide Persian translations" : "Show Persian translations") : "Switch to Persian translations"} title={language === "fa" ? (showTranslations ? "Hide Persian translations" : "Show Persian translations") : "Switch to Persian translations"} onClick={() => { if (language !== "fa") { setLanguage("fa"); setShowTranslations(true); } else setShowTranslations((current) => !current); }} className="max-w-24 truncate rounded-xl border border-cyan-300/30 px-2 py-2 text-[10px] font-semibold text-cyan-100 sm:max-w-none sm:px-3 sm:text-xs">{language === "fa" ? (showTranslations ? "ترجمه روشن" : "نمایش ترجمه") : "نمایش فارسی"}</button><button type="button" aria-label="Open account" title="Open account" onClick={() => setAuthOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#131d2c] text-sm">{userId ? "✓" : "AL"}</button></div></header>
      {view === "home" && <><Dashboard t={t} progress={totalProgress} correctRate={answerStats.total ? Math.round((answerStats.correct / answerStats.total) * 100) : 0} skillProgress={skillProgress} onLesson={() => setView("lesson")} onQuiz={() => startQuiz({ mode: "practice" })} onTimedExam={() => startQuiz({ mode: "exam" })} onPractical={() => setView("practical")} onLabs={() => setView("labs")} onCards={() => setView("cards")} /><div className="mt-6"><StageProgressStrip t={t} progress={stageProgress} onOpen={() => setView("lesson")} /></div></>}{view === "lesson" && <><TrainingHub t={t} progress={stageProgress} selectedStageId={selectedStageId} onSelectStage={(id) => { setSelectedStageId(id); const stage = trainingStages.find((item) => item.id === id); if (stage?.lessonId) setSelectedLessonId(stage.lessonId); }} onPractice={(domain) => startQuiz({ domain, mode: "practice" })} onOpenLesson={setSelectedLessonId} /><div className="mt-6"><Lesson t={t} selectedLessonId={selectedLessonId} onSelectLesson={setSelectedLessonId} onQuiz={(lessonId) => { const stage = trainingStages.find((item) => item.lessonId === lessonId); startQuiz(stage ? { domain: stage.domain, mode: "practice" } : { skillId: lessons.find((item) => item.id === lessonId)?.skillId, mode: "practice" }); }} /></div></>}{view === "graph" && <SkillGraph t={t} selectedSkillId={selectedSkillId} onSelectSkill={setSelectedSkillId} onPractice={() => startQuiz({ skillId: selectedSkillId, mode: "practice" })} />}{view === "quiz" && (quizFinished ? <ExamResult t={t} correct={quizCorrect} answered={quizAnswered} totalQuestions={activeQuestions.length} selectedSkillId={selectedSkillId} stats={skillStats} onRestart={() => startQuiz(selectedDomain ? { domain: selectedDomain, mode: quizMode } : selectedSkillId ? { skillId: selectedSkillId, mode: quizMode } : { mode: quizMode })} /> : <Quiz t={t} question={question} selected={questionIndex % activeQuestions.length} totalQuestions={activeQuestions.length} answer={answer} setAnswer={submitAnswer} showTranslations={showTranslations} mode={quizMode} previous={() => { setAnswer(null); setQuestionIndex((current) => Math.max(0, current - 1)); }} next={() => { if (questionIndex % activeQuestions.length === activeQuestions.length - 1) setQuizFinished(true); else { setAnswer(null); setQuestionIndex((current) => (current + 1) % activeQuestions.length); } }} onTimeout={() => setQuizFinished(true)} />)}{view === "practical" && <PracticalExam t={t} userId={userId} onComplete={(score) => setTotalProgress((current) => Math.min(100, current + (score >= 70 ? 5 : 1)))} />}{view === "labs" && <Labs t={t} completed={completedLab} evidence={labEvidence} evidenceFile={evidenceFile} onEvidence={setLabEvidence} onEvidenceFile={setEvidenceFile} onComplete={submitLab} />}{view === "cards" && <Cards key={cardQuestionId} t={t} known={cardKnown} userId={userId} questionId={cardQuestionId} dueCount={cardQuestionIds.length} onReview={(quality) => { const remaining = cardQuestionIds.filter((id) => id !== cardQuestionId); const nextQueue = quality === "again" ? [...remaining, cardQuestionId] : remaining; setCardQuestionIds(nextQueue); setCardKnown(quality === "got-it"); setCardBox(quality === "again" ? 1 : Math.min(5, cardBox + 1)); setCardQuestionId(nextQueue[0] ?? questions[0].id); }} />}</section><nav aria-label="Mobile navigation" className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-6 gap-1 rounded-2xl border border-cyan-300/15 bg-[#111a28]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur lg:hidden">{navigation.map((item) => <button type="button" key={`mobile-${item.key}`} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => navigate(item.key)} className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-center transition ${view === item.key ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="text-base leading-none">{item.icon}</span><span className="w-full truncate text-[9px] leading-3">{item.label}</span></button>)}</nav></div>{authOpen && <AccountPanel onClose={closeAccount} onSignOut={signOut} />}</main>;
}

