"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import { GoogleSubtitle } from "./google-translate";
import { ccnaBankQuestions, ccnaQuestionCount } from "@/lib/content/ccna-bank";

export type CcnaExamMode = "quick" | "mixed" | "full";
type QuestionOrder = { id: string; optionOrder: number[] };
type ExamSession = {
  version: 1;
  mode: CcnaExamMode;
  questionOrder: QuestionOrder[];
  answers: Record<string, number>;
  currentIndex: number;
  startedAt: number;
  expiresAt: number | null;
  completedAt?: number;
};
type CcnaBankQuestion = (typeof ccnaBankQuestions)[number];

const modeConfig: Record<CcnaExamMode, { title: string; description: string; count: number; minutes: number | null }> = {
  quick: { title: "Quick check", description: "Eight focused questions to check one study block.", count: 8, minutes: 18 },
  mixed: { title: "Mixed review", description: "A balanced set across the six official CCNA domains.", count: 60, minutes: 75 },
  full: { title: "Full endurance review", description: "A long internal review of the bank; it is not a Cisco exam replica.", count: 120, minutes: 120 },
};

const Copy = ({ text }: { text: string }) => <GoogleSubtitle text={text} />;

function shuffle<T>(items: T[], seed: number) {
  const result = [...items];
  let value = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) >>> 0;
    const target = value % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function sessionKey(userId: string, mode: CcnaExamMode) {
  return `ccna-exam-session:v1:${userId}:${mode}`;
}

function buildSession(mode: CcnaExamMode): ExamSession {
  const config = modeConfig[mode];
  const seed = Date.now() ^ Math.floor(Math.random() * 0xffffffff);
  const selected = shuffle(ccnaBankQuestions, seed).slice(0, Math.min(config.count, ccnaBankQuestions.length));
  return {
    version: 1,
    mode,
    questionOrder: selected.map((question, index) => ({
      id: question.id,
      optionOrder: shuffle([0, 1, 2, 3], seed + index + 11),
    })),
    answers: {},
    currentIndex: 0,
    startedAt: Date.now(),
    expiresAt: config.minutes ? Date.now() + config.minutes * 60_000 : null,
  };
}

function isSession(value: unknown, mode: CcnaExamMode): value is ExamSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ExamSession>;
  return item.version === 1 && item.mode === mode && Array.isArray(item.questionOrder) && item.questionOrder.length > 0 && typeof item.currentIndex === "number" && !!item.answers;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
}

export function CcnaExamWorkspace({ userId, mode }: { userId: string; mode: CcnaExamMode }) {
  const config = modeConfig[mode];
  const [session, setSession] = useState<ExamSession | null>(null);
  const [now, setNow] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const persisted = useRef(false);
  const questionsById = useMemo(() => new Map(ccnaBankQuestions.map((question) => [question.id, question])), []);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      try {
        const stored = JSON.parse(localStorage.getItem(sessionKey(userId, mode)) ?? "null") as unknown;
        setSession(isSession(stored, mode) ? stored : buildSession(mode));
      } catch {
        setSession(buildSession(mode));
      }
    });
    return () => { alive = false; };
  }, [mode, userId]);

  useEffect(() => {
    if (!session) return;
    try { localStorage.setItem(sessionKey(userId, mode), JSON.stringify(session)); } catch { /* Offline progress remains usable when storage is unavailable. */ }
    persisted.current = true;
  }, [mode, session, userId]);

  useEffect(() => {
    if (!session?.expiresAt || session.completedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.completedAt, session?.expiresAt]);

  const questions = useMemo(() => (session?.questionOrder ?? []).map((item) => {
    const question = questionsById.get(item.id);
    return question ? { question, optionOrder: item.optionOrder } : null;
  }).filter((item): item is { question: CcnaBankQuestion; optionOrder: number[] } => item !== null), [questionsById, session]);
  const effectiveNow = now || session?.startedAt || 0;
  const expired = !!session?.expiresAt && effectiveNow >= session.expiresAt && !session.completedAt;
  const completed = !!session?.completedAt || expired;
  const current = questions[Math.min(session?.currentIndex ?? 0, Math.max(questions.length - 1, 0))];
  const remaining = session?.expiresAt ? Math.max(0, Math.ceil((session.expiresAt - effectiveNow) / 1000)) : null;
  const answered = session ? Object.keys(session.answers).length : 0;
  const score = session ? questions.reduce((total, item) => {
    const selectedDisplay = session.answers[item.question.id];
    const selectedCanonical = selectedDisplay === undefined ? undefined : item.optionOrder[selectedDisplay];
    return total + (selectedCanonical === item.question.correct ? 1 : 0);
  }, 0) : 0;

  useEffect(() => {
    if (!expired || !session) return;
    void Promise.resolve().then(() => {
      setSession((currentSession) => currentSession && !currentSession.completedAt ? { ...currentSession, completedAt: Date.now() } : currentSession);
    });
  }, [expired, session]);

  const update = (next: Partial<ExamSession>) => setSession((currentSession) => currentSession ? { ...currentSession, ...next } : currentSession);
  const selectAnswer = (displayIndex: number) => {
    if (!session || !current || completed) return;
    update({ answers: { ...session.answers, [current.question.id]: displayIndex } });
  };
  const restart = () => { setShowReview(false); setSession(buildSession(mode)); };
  if (!session || !current) return <section className="ccna-exam-workspace" aria-busy="true"><p role="status"><Copy text="Preparing your saved assessment…" /></p></section>;

  if (completed) return <section className="ccna-exam-workspace" aria-labelledby="ccna-exam-result-title">
    <header className="ccna-exam-workspace-header"><div><p className="ccna-dashboard-eyebrow"><Copy text="Assessment complete" /></p><h2 id="ccna-exam-result-title"><Copy text={config.title} /></h2><p><Copy text={`${score}/${questions.length} correct · ${answered}/${questions.length} answered`} /></p></div><button type="button" className="ccna-exam-secondary-action" onClick={restart}><RotateCcw size={16} /><Copy text="Start a new set" /></button></header>
    <div className="ccna-exam-result-score"><strong>{Math.round((score / Math.max(questions.length, 1)) * 100)}%</strong><span><Copy text="internal practice score" /></span></div>
    <button type="button" className="ccna-exam-review-toggle" onClick={() => setShowReview((value) => !value)}><Copy text={showReview ? "Hide answer review" : "Review answers and explanations"} /></button>
    {showReview && <div className="ccna-exam-review-list">{questions.map((item, index) => { const selectedDisplay = session.answers[item.question.id]; const selectedCanonical = selectedDisplay === undefined ? undefined : item.optionOrder[selectedDisplay]; const correct = selectedCanonical === item.question.correct; return <article key={item.question.id} className={correct ? "is-correct" : "is-wrong"}><p className="ccna-exam-review-index"><Copy text={`Question ${index + 1} · ${correct ? "Correct" : "Review"}`} /></p><h3><Copy text={item.question.text} /></h3><p><strong><Copy text={`Correct answer: ${item.question.options[item.question.correct]}`} /></strong></p><p><Copy text={item.question.explain} /></p></article>; })}</div>}
  </section>;

  const selected = session.answers[current.question.id];
  return <section className="ccna-exam-workspace" aria-labelledby="ccna-exam-question-title">
    <header className="ccna-exam-workspace-header"><div><p className="ccna-dashboard-eyebrow"><Copy text={`${config.title} · ${mode === "full" ? "endurance review" : "saved session"}`} /></p><h2 id="ccna-exam-question-title"><Copy text={config.description} /></h2><p><Copy text={`Question ${(session.currentIndex ?? 0) + 1} of ${questions.length} · ${answered} answered`} /></p></div>{remaining !== null && <div className={`ccna-exam-clock ${remaining < 60 ? "is-warning" : ""}`}><Clock3 size={16} /><strong>{formatTime(remaining)}</strong></div>}</header>
    <div className="ccna-exam-progress"><span style={{ width: `${((session.currentIndex + 1) / questions.length) * 100}%` }} /></div>
    <article className="ccna-exam-question-card"><p className="ccna-exam-question-meta"><Copy text={`Domain ${current.question.domain} · ${current.question.objective}`} /></p><h3><Copy text={current.question.text} /></h3><div className="ccna-exam-options" role="group" aria-label="Exam answer options">{current.optionOrder.map((canonicalIndex, displayIndex) => <button type="button" key={canonicalIndex} className={selected === displayIndex ? "is-selected" : ""} aria-pressed={selected === displayIndex} onClick={() => selectAnswer(displayIndex)}><span>{String.fromCharCode(65 + displayIndex)}</span><Copy text={current.question.options[canonicalIndex]} /></button>)}</div></article>
    <footer className="ccna-exam-navigation"><button type="button" className="ccna-exam-secondary-action" disabled={session.currentIndex === 0} onClick={() => update({ currentIndex: session.currentIndex - 1 })}><ArrowLeft size={16} /><Copy text="Previous" /></button><span><Copy text="Answers save automatically on this device" /></span>{session.currentIndex === questions.length - 1 ? <button type="button" className="ccna-exam-primary-action" onClick={() => update({ completedAt: Date.now() })}><CheckCircle2 size={16} /><Copy text="Finish assessment" /></button> : <button type="button" className="ccna-exam-primary-action" onClick={() => update({ currentIndex: session.currentIndex + 1 })}><Copy text="Next" /><ArrowRight size={16} /></button>}</footer>
  </section>;
}

export const ccnaExamQuestionCounts = { quick: modeConfig.quick.count, mixed: modeConfig.mixed.count, full: modeConfig.full.count, bank: ccnaQuestionCount } as const;
