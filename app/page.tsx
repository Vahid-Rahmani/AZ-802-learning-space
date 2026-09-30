"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { copy, learningGraphStages, lessons, questions, trainingStages } from "@/lib/course-data";
import { AccountPanel, AuthPanel, Cards, Labs, Lesson, PracticalExam, Quiz, SkillGraph } from "@/app/components/learning-views";
import { Dashboard } from "@/app/components/dashboard-with-exams";
import { FontSizeControl, StageProgressStrip, TrainingHub } from "@/app/components/training-views";
import { BookOpen, LayoutDashboard, Network, ListChecks, FlaskConical, Layers } from "lucide-react";
import { ExamResult } from "@/app/components/exam-result";
import { examQuestionPool, optionOrder, selectExamQuestions, type ExamMode } from "@/lib/content/exam-blueprints";
import { GoogleTranslateControl } from "@/app/components/google-translate";

type Language = "fa" | "en" | "de";
type View = "home" | "lesson" | "graph" | "quiz" | "practical" | "labs" | "cards";
type QuizMode = ExamMode | "practice" | "exam";
const TRANSLATION_VERSION = 2;
const GUEST_ID = "local-guest";
type QuizQuestion = typeof questions[number];
type QuizQuestionState = QuizQuestion & { optionOrder?: number[] };
type StoredQuizQuestion = { questionId: string; optionOrder: number[] };
type StoredQuizState = {
  mode: QuizMode;
  sessionId: string | null;
  expiresAt?: string | null;
  selectedSkillId: string | null;
  selectedDomain: string | null;
  questionOrder: StoredQuizQuestion[];
  questionIndex: number;
  answersByQuestion: Record<string, number>;
  quizFinished: boolean;
};

function shuffledQuestion(question: QuizQuestion, shuffleSeed = question.id): QuizQuestionState {
  const indexes = optionOrder(question as QuizQuestion & { stageId?: string; primaryDomain?: string }, shuffleSeed);
  const localized = question as QuizQuestion & { optionsFa?: string[] };
  return { ...question, options: indexes.map((index) => question.options[index]), optionsFa: indexes.map((index) => localized.optionsFa?.[index] ?? question.options[index]), correct: indexes.indexOf(question.correct), optionOrder: indexes };
}

function restoreQuizQuestions(order: StoredQuizQuestion[]): QuizQuestionState[] {
  return order.flatMap((item) => {
    const question = questions.find((candidate) => candidate.id === item.questionId);
    if (!question) return [];
    const indexes = item.optionOrder.filter((index, position, all) => Number.isInteger(index) && index >= 0 && index < question.options.length && all.indexOf(index) === position);
    if (indexes.length !== question.options.length) return [];
    const localized = question as QuizQuestion & { optionsFa?: string[] };
    return [{ ...question, options: indexes.map((index) => question.options[index]), optionsFa: indexes.map((index) => localized.optionsFa?.[index] ?? question.options[index]), correct: indexes.indexOf(question.correct), optionOrder: indexes }];
  });
}

function buildQuizQuestions(scope: { skillId?: string | null; domain?: string | null; mode?: QuizMode; seed?: string } | null): QuizQuestionState[] {
  const pool = scope?.domain ? questions.filter((item) => item.domain === scope.domain) : scope?.skillId ? questions.filter((item) => item.skillId === scope.skillId) : questions;
  if (scope?.mode === "practice" || !scope?.mode) return pool.map((question) => shuffledQuestion(question, `${scope?.seed ?? "practice"}:${question.id}`));
  const selectedMode = scope.mode === "exam" ? "quick" : scope.mode;
  const normalized = examQuestionPool().filter((item) => !scope?.domain || item.domain === scope.domain).filter((item) => !scope?.skillId || item.skillId === scope.skillId);
  const selected = selectExamQuestions({ mode: selectedMode, pool: normalized, stageId: scope.domain ?? undefined, seed: scope.seed ?? crypto.randomUUID() });
  return selected.map((question) => shuffledQuestion(question, scope.seed ?? "exam"));
}

export default function Home() {
  const [language] = useState<Language>("en");
  const [view, setViewState] = useState<View>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState(trainingStages[0].id);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode>("quick");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionState[]>(() => buildQuizQuestions({ mode: "quick" }));
  const [examSessionId, setExamSessionId] = useState<string | null>(null);
  const [examExpiresAt, setExamExpiresAt] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, number>>({});
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
  const activeQuestions = quizQuestions;
  const question = (activeQuestions.length ? activeQuestions[questionIndex % activeQuestions.length] : questions[0]) as QuizQuestionState;
  const stageProgress = Object.fromEntries(trainingStages.map((stage) => { const stat = domainStats[stage.domain]; return [stage.id, stat?.total ? Math.round((stat.correct / stat.total) * 100) : 0]; }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswer(answersByQuestion[question.id] ?? null);
  }, [questionIndex, question.id, answersByQuestion]);
  const selectedGraphStageId = learningGraphStages.find((stage) => stage.domain === selectedDomain)?.id ?? null;

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
    let cancelled = false;
    // Do not let the first render overwrite a saved in-progress quiz before
    // the account/local state has finished hydrating.
    setLoadedUserId(null);
    setTotalProgress(0); setSelectedLessonId(lessons[0].id); setSelectedStageId(trainingStages[0].id); setCompletedLab(false); setLabEvidence(""); setCardKnown(false); setCardBox(1); setCardQuestionId(questions[0].id); setAnswerStats({ correct: 0, total: 0 }); setSkillStats({}); setDomainStats({}); setSkillProgress({});
    const restoreQuiz = (saved: StoredQuizState, serverAnswers?: Record<string, number[]>, serverIndex?: number, serverSessionId?: string, serverExpiresAt?: string | null) => {
      const restoredQuestions = restoreQuizQuestions(saved.questionOrder);
      if (!restoredQuestions.length) return false;
      const restoredAnswers: Record<string, number> = {};
      for (const question of restoredQuestions) {
        const canonical = serverAnswers?.[question.id]?.[0];
        const displayIndex = serverAnswers
          ? (typeof canonical === "number" ? (question.optionOrder?.indexOf(canonical) ?? -1) : -1)
          : saved.answersByQuestion[question.id];
        if (typeof displayIndex === "number" && displayIndex >= 0) restoredAnswers[question.id] = displayIndex;
      }
      setQuizMode(saved.mode); setExamSessionId(serverSessionId ?? saved.sessionId ?? null); setExamExpiresAt(serverExpiresAt ?? saved.expiresAt ?? null); setQuizStarted(true); setSelectedSkillId(saved.selectedSkillId ?? null); setSelectedDomain(saved.selectedDomain ?? null); setQuizQuestions(restoredQuestions); setAnswersByQuestion(restoredAnswers); setQuestionIndex(Math.max(0, Math.min(serverIndex ?? saved.questionIndex, restoredQuestions.length - 1))); setQuizAnswered(Object.keys(restoredAnswers).length); setQuizCorrect(restoredQuestions.reduce((count, item) => count + (restoredAnswers[item.id] === item.correct ? 1 : 0), 0)); setQuizFinished(Boolean(saved.quizFinished)); setViewState("quiz");
      return true;
    };
    void (async () => {
      let saved: Record<string, unknown> = {};
      try { saved = JSON.parse(localStorage.getItem(`wincraft-progress:${userId}`) ?? "{}"); } catch { /* optional local state */ }
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
      if (saved.answerStats && typeof saved.answerStats === "object") { const stats = saved.answerStats as { correct?: unknown; total?: unknown }; if (typeof stats.correct === "number" && typeof stats.total === "number") setAnswerStats({ correct: stats.correct, total: stats.total }); }
      if (saved.skillStats && typeof saved.skillStats === "object") setSkillStats(saved.skillStats as Record<string, { correct: number; total: number }>);
      if (saved.domainStats && typeof saved.domainStats === "object") setDomainStats(saved.domainStats as Record<string, { correct: number; total: number }>);
      if (saved.skillProgress && typeof saved.skillProgress === "object") setSkillProgress(saved.skillProgress as Record<string, number>);
      const savedQuiz = saved.quizState as Partial<StoredQuizState> | undefined;
      const savedExpiry = typeof savedQuiz?.expiresAt === "string" ? Date.parse(savedQuiz.expiresAt) : NaN;
      const savedQuizIsLive = savedQuiz?.mode === "practice" || !Number.isFinite(savedExpiry) || savedExpiry > Date.now();
      const validSavedQuiz = savedQuizIsLive && savedQuiz && ["practice", "quick", "stage", "mixed", "full", "exam"].includes(savedQuiz.mode ?? "") && Array.isArray(savedQuiz.questionOrder) && typeof savedQuiz.questionIndex === "number" && savedQuiz.answersByQuestion && typeof savedQuiz.answersByQuestion === "object" ? savedQuiz as StoredQuizState : null;
      let restored = validSavedQuiz ? restoreQuiz(validSavedQuiz) : false;
      if (userId !== GUEST_ID && validSavedQuiz?.mode !== "practice") {
        try {
          const response = await fetch(validSavedQuiz?.sessionId ? `/api/exams/sessions/${validSavedQuiz.sessionId}` : "/api/exams/sessions?active=1", { cache: "no-store" });
          if (response.ok) {
            const payload = await response.json() as { session?: { id?: string; mode?: QuizMode; questionOrder?: StoredQuizQuestion[]; answers?: Record<string, number[]>; currentIndex?: number; expiresAt?: string | null; completedAt?: string | null } ; sessions?: Array<{ id?: string; mode?: QuizMode; questionOrder?: StoredQuizQuestion[]; answers?: Record<string, number[]>; currentIndex?: number; expiresAt?: string | null; completedAt?: string | null }> };
            const session = payload.session ?? payload.sessions?.[0];
            const sessionExpiry = typeof session?.expiresAt === "string" ? Date.parse(session.expiresAt) : NaN;
            if (session?.id && Array.isArray(session.questionOrder) && session.mode && !session.completedAt && (!Number.isFinite(sessionExpiry) || sessionExpiry > Date.now())) {
              restored = restoreQuiz({ mode: session.mode, sessionId: session.id, expiresAt: session.expiresAt, selectedSkillId: null, selectedDomain: null, questionOrder: session.questionOrder, questionIndex: session.currentIndex ?? 0, answersByQuestion: {}, quizFinished: false }, session.answers ?? {}, session.currentIndex ?? 0, session.id, session.expiresAt);
            }
          }
        } catch { /* local quiz remains usable if the session API is unavailable */ }
      }
      if (!cancelled) setLoadedUserId(userId);
      void restored;
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    document.documentElement.lang = language;
    if (!userId || loadedUserId !== userId) return;
    const quizState: StoredQuizState | null = quizStarted && !quizFinished ? { mode: quizMode, sessionId: examSessionId, expiresAt: examExpiresAt, selectedSkillId, selectedDomain, questionOrder: quizQuestions.map((item) => ({ questionId: item.id, optionOrder: item.optionOrder ?? optionOrder(item as QuizQuestion & { stageId?: string; primaryDomain?: string }, item.id) })), questionIndex, answersByQuestion, quizFinished } : null;
    try { localStorage.setItem(`wincraft-progress:${userId}`, JSON.stringify({ translationVersion: TRANSLATION_VERSION, language, totalProgress, selectedLessonId, selectedStageId, completedLab, labEvidence, cardKnown, cardBox, cardQuestionId, cardQuestionIds, answerStats, skillStats, domainStats, skillProgress, fontScale, showTranslations, quizState })); } catch { /* storage can be disabled */ }
  }, [language, userId, loadedUserId, quizStarted, quizMode, quizFinished, examSessionId, examExpiresAt, selectedSkillId, selectedDomain, quizQuestions, questionIndex, answersByQuestion, totalProgress, selectedLessonId, selectedStageId, completedLab, labEvidence, cardKnown, cardBox, cardQuestionId, cardQuestionIds, answerStats, skillStats, domainStats, skillProgress, fontScale, showTranslations]);

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
    const requestedMode = scope?.mode ?? "quick";
    const mode = requestedMode === "exam" ? ((window as Window & { __wincraftExamMode?: ExamMode }).__wincraftExamMode ?? "quick") : requestedMode;
    const selectedStage = mode === "stage" && !scope?.domain ? trainingStages.find((stage) => stage.id === selectedStageId) : undefined;
    const effectiveScope = selectedStage ? { ...scope, domain: selectedStage.domain } : scope;
    const seed = crypto.randomUUID();
    setSelectedSkillId(effectiveScope?.skillId ?? null);
    setSelectedDomain(effectiveScope?.domain ?? null);
    setQuizMode(mode);
    setExamSessionId(null);
    setExamExpiresAt(null);
    setQuizStarted(true);
    setQuizQuestions(buildQuizQuestions({ ...effectiveScope, mode, seed }));
    setQuestionIndex(0);
    setAnswer(null);
    setAnswersByQuestion({});
    setQuizFinished(false);
    setQuizCorrect(0);
    setQuizAnswered(0);
    setViewState("quiz");
    if (mode !== "practice" && userId && userId !== GUEST_ID) {
      // The server owns the durable session/order. Until it returns, submitAnswer
      // refuses to record an exam answer so the first click cannot be lost.
      void fetch("/api/exams/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, stageId: effectiveScope?.domain ? (trainingStages.find((stage) => stage.domain === effectiveScope.domain)?.id ?? effectiveScope.domain) : undefined }) }).then(async (response) => { if (!response.ok) return; const data = await response.json().catch(() => ({})) as { session?: { id?: string; expiresAt?: string; questionOrder?: StoredQuizQuestion[] }; questions?: QuizQuestion[] }; if (data.session?.id) setExamSessionId(data.session.id); if (data.session?.expiresAt) setExamExpiresAt(data.session.expiresAt); if (Array.isArray(data.session?.questionOrder) && data.session.questionOrder.length) { const restored = restoreQuizQuestions(data.session.questionOrder); if (restored.length) setQuizQuestions(restored); } else if (Array.isArray(data.questions) && data.questions.length) setQuizQuestions(data.questions.map((item) => shuffledQuestion(item, seed))); }).catch(() => undefined);
    }
  };

  const setView = (nextView: View) => nextView === "quiz" ? startQuiz({ mode: "practice" }) : setViewState(nextView);

  const persistExamIndex = (nextIndex: number) => {
    if (!examSessionId || quizMode === "practice" || !userId || userId === GUEST_ID) return;
    void fetch(`/api/exams/sessions/${examSessionId}/answers`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentIndex: nextIndex }) }).catch(() => undefined);
  };

  const submitAnswer = (value: number) => {
    if (answersByQuestion[question.id] !== undefined) return;
    if (quizMode !== "practice" && userId && userId !== GUEST_ID && !examSessionId) return;
    const correct = value === question.correct;
    const canonicalValue = question.optionOrder?.[value] ?? value;
    setAnswer(value);
    setAnswersByQuestion((current) => ({ ...current, [question.id]: value }));
    setQuizAnswered((current) => current + 1);
    if (correct) { setQuizCorrect((current) => current + 1); setTotalProgress((current) => Math.min(100, current + 2)); }
    if (!correct) { setCardQuestionId(question.id); setCardQuestionIds((current) => current.includes(question.id) ? current : [...current, question.id]); setCardKnown(false); setCardBox(1); }
    setAnswerStats((current) => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    setSkillStats((current) => { const next = { ...current, [question.skillId]: { ...(current[question.skillId] ?? { correct: 0, total: 0 }), total: (current[question.skillId]?.total ?? 0) + 1, correct: (current[question.skillId]?.correct ?? 0) + (correct ? 1 : 0) } }; setSkillProgress((progress) => ({ ...progress, [question.skillId]: Math.round((next[question.skillId].correct / next[question.skillId].total) * 100) })); return next; });
    setDomainStats((current) => { const previous = current[question.domain] ?? { correct: 0, total: 0 }; return { ...current, [question.domain]: { total: previous.total + 1, correct: previous.correct + (correct ? 1 : 0) } }; });
    if (userId && userId !== GUEST_ID && examSessionId && quizMode !== "practice") {
      void fetch(`/api/exams/sessions/${examSessionId}/answers`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: value, currentIndex: questionIndex }) });
    } else if (userId && userId !== GUEST_ID) {
      void fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: canonicalValue, isCorrect: canonicalValue === (questions.find((item) => item.id === question.id)?.correct ?? question.correct) }) });
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

  useEffect(() => {
    if (!quizFinished || !examSessionId || quizMode === "practice") return;
    void fetch(`/api/exams/sessions/${examSessionId}/complete`, { method: "POST" }).catch(() => undefined);
  }, [quizFinished, examSessionId, quizMode]);

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

  const navigation: Array<{ key: View; icon: ReactNode; label: string }> = [
    { key: "home", icon: <LayoutDashboard size={20} />, label: t.dashboard },
    { key: "lesson", icon: <BookOpen size={20} />, label: t.lessons },
    { key: "graph", icon: <Network size={20} />, label: t.graph },
    { key: "quiz", icon: <ListChecks size={20} />, label: t.exams },
    { key: "labs", icon: <FlaskConical size={20} />, label: t.labs },
    { key: "cards", icon: <Layers size={20} />, label: t.leitner },
  ];
  const navigate = (key: View) => key === "quiz" ? startQuiz({ mode: "practice" }) : setView(key);
  if (!userId) return <main dir="ltr" className="study-app min-h-screen bg-[#0b1018] text-[#e8edf5]"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={(id) => { setUserId(id); setAuthOpen(false); }} /></div></main>;
  return <main dir="ltr" className="study-app min-h-screen bg-[#0b1018] text-[#e8edf5] selection:bg-cyan-300 selection:text-[#071016]"><div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="border-b border-white/10 bg-[#0d1420] p-3 sm:p-4 lg:border-b-0 lg:border-e"><div className="flex items-center justify-between gap-3 px-1 py-1 sm:px-2 sm:py-2 lg:block"><div className="flex items-center gap-2.5 sm:gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-300 text-lg font-black text-[#071016]">W</div><div><p className="font-semibold tracking-tight">WinCraft</p><p className="hidden text-xs text-slate-400 sm:block">AZ-802 learning space</p></div></div></div><nav aria-label="Primary navigation" className="mt-4 hidden gap-1 lg:grid lg:grid-cols-1">{navigation.map((item) => <button type="button" key={item.key} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => setView(item.key)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm transition ${view === item.key ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="text-lg">{item.icon}</span><span>{item.label}</span></button>)}</nav><div className="mt-6 hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#14243a] to-[#101723] p-4 lg:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{t.target}</p><p className="mt-2 font-semibold">Windows Server Administrator</p><p className="mt-1 text-sm text-slate-400">AZ-802 · English exam</p><a href="https://learn.microsoft.com/en-us/credentials/certifications/practice-assessments-for-microsoft-certifications" target="_blank" rel="noreferrer" className="mt-4 block text-sm font-semibold text-cyan-200">{t.officialPractice} ↗</a></div></aside><section className="font-scale-content min-w-0 px-3 pb-24 pt-3 sm:p-7 lg:p-9" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}><header className="study-header sticky top-0 z-30 -mx-3 mb-5 flex min-h-14 items-center justify-between gap-2 border-b border-white/10 bg-[#0b1018]/95 px-3 py-2 backdrop-blur sm:static sm:mx-0 sm:mb-7 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0"><div className="min-w-0"><p className="hidden text-xs font-semibold uppercase tracking-[.16em] text-cyan-300 sm:block">Microsoft Learn aligned · 2026</p><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-300 sm:hidden">AZ-802 · WinCraft</p><h1 className="mt-0 truncate text-lg font-bold tracking-tight sm:mt-1 sm:text-3xl">{navigation.find((item) => item.key === view)?.label ?? t.practicalExam}</h1></div><div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><FontSizeControl t={t} scale={fontScale} onChange={setFontScale} /><GoogleTranslateControl /><button type="button" aria-label="Open account" title="Open account" onClick={() => setAuthOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#131d2c] text-sm">{userId ? "✓" : "AL"}</button></div></header><div className="study-context"><button type="button" onClick={() => setView("home")} className="text-cyan-100">WinCraft</button><span aria-hidden="true">/</span><strong>{navigation.find((item) => item.key === view)?.label ?? t.practicalExam}</strong><span className="ml-auto">AZ-802 · 300 questions · 8 stages</span></div>
      {view === "home" && <><Dashboard t={t} progress={totalProgress} correctRate={answerStats.total ? Math.round((answerStats.correct / answerStats.total) * 100) : 0} skillProgress={skillProgress} onLesson={() => setView("lesson")} onQuiz={() => startQuiz({ mode: "practice" })} onTimedExam={() => startQuiz({ mode: "exam" })} onPractical={() => setView("practical")} onLabs={() => setView("labs")} onCards={() => setView("cards")} /><div className="mt-6"><StageProgressStrip t={t} progress={stageProgress} onOpen={() => setView("lesson")} /></div></>}{view === "lesson" && <><TrainingHub t={t} progress={stageProgress} selectedStageId={selectedStageId} onSelectStage={(id) => { setSelectedStageId(id); const stage = trainingStages.find((item) => item.id === id); if (stage?.lessonId) setSelectedLessonId(stage.lessonId); }} onPractice={(domain) => startQuiz({ domain, mode: "practice" })} onOpenLesson={setSelectedLessonId} /><div className="mt-6"><Lesson t={t} selectedLessonId={selectedLessonId} onSelectLesson={setSelectedLessonId} onQuiz={(lessonId) => { const stage = trainingStages.find((item) => item.lessonId === lessonId); startQuiz(stage ? { domain: stage.domain, mode: "practice" } : { skillId: lessons.find((item) => item.id === lessonId)?.skillId, mode: "practice" }); }} /></div></>}{view === "graph" && <SkillGraph t={t} selectedStageId={selectedGraphStageId} progress={stageProgress} onSelectStage={(id) => { const stage = learningGraphStages.find((item) => item.id === id); if (!stage) return; setSelectedDomain(stage.domain); setSelectedStageId(stage.id === "capstone" ? "recovery" : stage.id); if (stage.lessonId) setSelectedLessonId(stage.lessonId); }} onPractice={(domain) => startQuiz({ domain, mode: "practice" })} />}{view === "quiz" && (quizFinished ? <ExamResult t={t} correct={quizCorrect} answered={quizAnswered} totalQuestions={activeQuestions.length} selectedSkillId={selectedSkillId} stats={skillStats} onRestart={() => startQuiz(selectedDomain ? { domain: selectedDomain, mode: quizMode } : selectedSkillId ? { skillId: selectedSkillId, mode: quizMode } : { mode: quizMode })} /> : <Quiz t={t} question={question} selected={questionIndex % activeQuestions.length} totalQuestions={activeQuestions.length} answer={answer} setAnswer={submitAnswer} showTranslations={showTranslations} mode={quizMode} expiresAt={examExpiresAt} previous={() => { const nextIndex = Math.max(0, questionIndex - 1); persistExamIndex(nextIndex); setAnswer(null); setQuestionIndex(nextIndex); }} next={() => { if (questionIndex % activeQuestions.length === activeQuestions.length - 1) { persistExamIndex(questionIndex); setQuizFinished(true); } else { const nextIndex = (questionIndex + 1) % activeQuestions.length; persistExamIndex(nextIndex); setAnswer(null); setQuestionIndex(nextIndex); } }} onTimeout={() => { persistExamIndex(questionIndex); setQuizFinished(true); }} />)}{view === "practical" && <PracticalExam t={t} userId={userId} onComplete={(score) => setTotalProgress((current) => Math.min(100, current + (score >= 70 ? 5 : 1)))} />}{view === "labs" && <Labs t={t} completed={completedLab} evidence={labEvidence} evidenceFile={evidenceFile} onEvidence={setLabEvidence} onEvidenceFile={setEvidenceFile} onComplete={submitLab} />}{view === "cards" && <Cards key={cardQuestionId} t={t} known={cardKnown} userId={userId} questionId={cardQuestionId} dueCount={cardQuestionIds.length} onReview={(quality) => { const remaining = cardQuestionIds.filter((id) => id !== cardQuestionId); const nextQueue = quality === "again" ? [...remaining, cardQuestionId] : remaining; setCardQuestionIds(nextQueue); setCardKnown(quality === "got-it"); setCardBox(quality === "again" ? 1 : Math.min(5, cardBox + 1)); setCardQuestionId(nextQueue[0] ?? questions[0].id); }} />}</section><nav aria-label="Mobile navigation" className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-6 gap-1 rounded-2xl border border-cyan-300/15 bg-[#111a28]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur lg:hidden">{navigation.map((item) => <button type="button" key={`mobile-${item.key}`} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => navigate(item.key)} className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-2 text-center transition ${view === item.key ? "bg-cyan-300/15 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="text-base leading-none">{item.icon}</span><span className="w-full text-xs leading-4">{item.label}</span></button>)}</nav></div>{authOpen && <AccountPanel onClose={closeAccount} onSignOut={signOut} />}</main>;
}

