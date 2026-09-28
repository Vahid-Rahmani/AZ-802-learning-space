"use client";

import { useEffect, useState } from "react";
import { copy, lessons, questions } from "@/lib/course-data";
import { AuthPanel, Cards, Dashboard, Labs, Lesson, PracticalExam, Quiz, SkillGraph, text } from "@/app/components/learning-views";
import { ExamResult } from "@/app/components/exam-result";

type Language = "fa" | "en" | "de";
type View = "home" | "lesson" | "graph" | "quiz" | "practical" | "labs" | "cards";

export default function Home() {
  const [language, setLanguage] = useState<Language>("fa");
  const [view, setView] = useState<View>("home");
  const [authOpen, setAuthOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0].id);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(0);
  const [answerStats, setAnswerStats] = useState({ correct: 0, total: 0 });
  const [skillStats, setSkillStats] = useState<Record<string, { correct: number; total: number }>>({});
  const [skillProgress, setSkillProgress] = useState<Record<string, number>>({});
  const [totalProgress, setTotalProgress] = useState(46);
  const [completedLab, setCompletedLab] = useState(false);
  const [labEvidence, setLabEvidence] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [cardKnown, setCardKnown] = useState(false);
  const [cardBox, setCardBox] = useState(1);
  const t = copy[language];
  const activeQuestions = selectedSkillId ? questions.filter((item) => item.skillId === selectedSkillId) : questions;
  const question = activeQuestions[questionIndex % activeQuestions.length];

  // Hydrate client-only progress from local storage once on mount.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("wincraft-progress") ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (["fa", "en", "de"].includes(saved.language)) setLanguage(saved.language as Language);
      if (typeof saved.userId === "string") setUserId(saved.userId);
      if (typeof saved.totalProgress === "number") setTotalProgress(saved.totalProgress);
      if (typeof saved.selectedLessonId === "string") setSelectedLessonId(saved.selectedLessonId);
      if (saved.completedLab) setCompletedLab(true);
      if (typeof saved.labEvidence === "string") setLabEvidence(saved.labEvidence);
      if (typeof saved.cardBox === "number") setCardBox(Math.max(1, Math.min(5, saved.cardBox)));
    } catch { /* optional local state */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";
    try { localStorage.setItem("wincraft-progress", JSON.stringify({ language, userId, totalProgress, selectedLessonId, completedLab, labEvidence, cardKnown, cardBox })); } catch { /* storage can be disabled */ }
  }, [language, userId, totalProgress, selectedLessonId, completedLab, labEvidence, cardKnown, cardBox]);

  useEffect(() => {
    if (!userId) return;
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
          for (const attempt of attempts) { const skillId = questions.find((item) => item.id === attempt.questionId)?.skillId; if (!skillId) continue; bySkill[skillId] ??= { correct: 0, total: 0 }; bySkill[skillId].total += 1; if (attempt.isCorrect) bySkill[skillId].correct += 1; }
          setSkillStats(bySkill);
          setSkillProgress(Object.fromEntries(Object.entries(bySkill).map(([skillId, stat]) => [skillId, Math.round((stat.correct / stat.total) * 100)])));
        }
        const cardsResponse = await fetch("/api/flashcards");
        if (cardsResponse.ok) { const data = await cardsResponse.json() as { flashcards?: Array<{ questionId?: string; box?: number }> }; const card = data.flashcards?.find((item) => item.questionId === "ipsec-connection-rule") ?? data.flashcards?.at(-1); if (card?.box) { setCardBox(card.box); setCardKnown(card.box > 1); } }
      } catch { /* local-first mode remains usable */ }
    })();
    return () => { cancelled = true; };
  }, [userId, selectedLessonId]);

  useEffect(() => { if (userId) void fetch("/api/progress", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: selectedLessonId, completionPercent: totalProgress }) }); }, [userId, selectedLessonId, totalProgress]);

  const startQuiz = (skillId: string | null = null) => {
    setSelectedSkillId(skillId);
    setQuestionIndex(0);
    setAnswer(null);
    setQuizFinished(false);
    setQuizCorrect(0);
    setQuizAnswered(0);
    setView("quiz");
  };

  const submitAnswer = (value: number) => {
    const correct = value === question.correct;
    setAnswer(value);
    setQuizAnswered((current) => current + 1);
    if (correct) { setQuizCorrect((current) => current + 1); setTotalProgress((current) => Math.min(100, current + 2)); }
    setAnswerStats((current) => ({ correct: current.correct + (correct ? 1 : 0), total: current.total + 1 }));
    setSkillStats((current) => { const next = { ...current, [question.skillId]: { ...(current[question.skillId] ?? { correct: 0, total: 0 }), total: (current[question.skillId]?.total ?? 0) + 1, correct: (current[question.skillId]?.correct ?? 0) + (correct ? 1 : 0) } }; setSkillProgress((progress) => ({ ...progress, [question.skillId]: Math.round((next[question.skillId].correct / next[question.skillId].total) * 100) })); return next; });
    if (userId) {
      void fetch("/api/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer: value, isCorrect: value === question.correct }) });
      if (value !== question.correct) void fetch("/api/flashcards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, box: 1 }) });
    }
  };

  const submitLab = async () => {
    setCompletedLab(true);
    setTotalProgress((current) => Math.min(100, current + 5));
    if (!userId) return;
    let evidenceUrl: string | undefined;
    if (evidenceFile) { const form = new FormData(); form.set("labId", "harden-two-server-domain"); form.set("file", evidenceFile); const upload = await fetch("/api/evidence", { method: "POST", body: form }); if (upload.ok) evidenceUrl = (await upload.json() as { key?: string }).key; }
    await fetch("/api/lab-submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ labId: "harden-two-server-domain", evidenceText: labEvidence, evidenceUrl, completed: true }) });
  };

  const navigation: Array<{ key: View; icon: string; label: string }> = [
    { key: "home", icon: "◫", label: t.dashboard }, { key: "graph", icon: "⌘", label: t.graph }, { key: "quiz", icon: "✓", label: t.exams }, { key: "practical", icon: "⚙", label: text(t, "practicalExam", "Practical exam") }, { key: "labs", icon: "▣", label: t.labs }, { key: "cards", icon: "▤", label: t.leitner },
  ];
  return <main dir="ltr" className="min-h-screen bg-[#0b1018] text-[#e8edf5] selection:bg-cyan-300 selection:text-[#071016]"><div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]"><aside className="border-b border-white/10 bg-[#0d1420] p-4 lg:border-b-0 lg:border-e"><div className="flex items-center justify-between gap-3 px-2 py-2 lg:block"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300 text-lg font-black text-[#071016]">W</div><div><p className="font-semibold tracking-tight">WinCraft</p><p className="text-xs text-slate-400">AZ-802 learning space</p></div></div><div className="flex rounded-lg border border-white/10 bg-black/15 p-1 lg:mt-6">{(["fa", "en", "de"] as Language[]).map((lang) => <button type="button" key={lang} onClick={() => setLanguage(lang)} aria-pressed={language === lang} className={`rounded-md px-2 py-1 text-xs font-semibold uppercase ${language === lang ? "bg-white/10 text-cyan-200" : "text-slate-500"}`}>{lang}</button>)}</div></div><nav aria-label="Primary navigation" className="mt-4 grid grid-cols-3 gap-1 sm:grid-cols-6 lg:grid-cols-1">{navigation.map((item) => <button type="button" key={item.key} aria-current={view === item.key ? "page" : undefined} aria-label={item.label} title={item.label} onClick={() => setView(item.key)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-start text-sm transition ${view === item.key ? "bg-cyan-300/10 text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><span aria-hidden="true" className="text-lg">{item.icon}</span><span>{item.label}</span></button>)}</nav><div className="mt-6 hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#14243a] to-[#101723] p-4 lg:block"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">{t.target}</p><p className="mt-2 font-semibold">Windows Server Administrator</p><p className="mt-1 text-sm text-slate-400">AZ-802 · English exam</p><a href="https://learn.microsoft.com/en-us/credentials/certifications/practice-assessments-for-microsoft-certifications" target="_blank" rel="noreferrer" className="mt-4 block text-sm font-semibold text-cyan-200">{t.officialPractice} ↗</a></div></aside><section className="min-w-0 p-4 sm:p-7 lg:p-9"><header className="mb-7 flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">Microsoft Learn aligned · 2026</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{t.greeting}, Alex.</h1></div><button type="button" aria-label="Open account" title="Open account" onClick={() => setAuthOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-[#131d2c] text-sm">{userId ? "✓" : "AL"}</button></header>
      {view === "home" && <Dashboard t={t} progress={totalProgress} correctRate={answerStats.total ? Math.round((answerStats.correct / answerStats.total) * 100) : 74} skillProgress={skillProgress} onLesson={() => setView("lesson")} onQuiz={() => startQuiz()} onPractical={() => setView("practical")} onLabs={() => setView("labs")} onCards={() => setView("cards")} />}{view === "lesson" && <Lesson t={t} selectedLessonId={selectedLessonId} onSelectLesson={setSelectedLessonId} onQuiz={(skillId) => startQuiz(skillId)} />}{view === "graph" && <SkillGraph t={t} selectedSkillId={selectedSkillId} onSelectSkill={setSelectedSkillId} onPractice={() => startQuiz(selectedSkillId)} />}{view === "quiz" && (quizFinished ? <ExamResult t={t} correct={quizCorrect} answered={quizAnswered} totalQuestions={activeQuestions.length} selectedSkillId={selectedSkillId} stats={skillStats} onRestart={() => startQuiz(selectedSkillId)} /> : <Quiz t={t} question={question} selected={questionIndex % activeQuestions.length} totalQuestions={activeQuestions.length} answer={answer} setAnswer={submitAnswer} next={() => { if (questionIndex % activeQuestions.length === activeQuestions.length - 1) setQuizFinished(true); else { setAnswer(null); setQuestionIndex((current) => (current + 1) % activeQuestions.length); } }} />)}{view === "practical" && <PracticalExam t={t} userId={userId} onComplete={(score) => setTotalProgress((current) => Math.min(100, current + (score >= 70 ? 5 : 1)))} />}{view === "labs" && <Labs t={t} completed={completedLab} evidence={labEvidence} evidenceFile={evidenceFile} onEvidence={setLabEvidence} onEvidenceFile={setEvidenceFile} onComplete={submitLab} />}{view === "cards" && <Cards t={t} known={cardKnown} userId={userId} onReview={(quality) => { setCardKnown(quality === "got-it"); if (userId) void fetch("/api/flashcards", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: "ipsec-connection-rule", quality }) }); }} />}</section></div>{authOpen && <AuthPanel t={t} onClose={() => setAuthOpen(false)} onAuthenticated={(id) => { setUserId(id); setAuthOpen(false); }} />}</main>;
}

