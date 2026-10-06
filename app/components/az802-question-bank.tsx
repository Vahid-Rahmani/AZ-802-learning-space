"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ListChecks, Search } from "lucide-react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { questions, trainingStages } from "@/lib/course-data";

type BankQuestion = (typeof questions)[number];

const GENERAL_TOPIC = "General";
const UNRATED = "unrated";

const difficultyLabels: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard", [UNRATED]: "Not rated yet" };

/**
 * The AZ-802 question bank: domain -> topic -> question.
 *
 * Filters read real data only. Topic and difficulty come from the question's own
 * enrichment fields, and answered state comes from the account's saved attempts,
 * so a filter never shows a number the bank cannot prove.
 */
export function Az802QuestionBank({
  userId,
  onPracticeQuestion,
  showTranslations,
}: {
  userId: string | null;
  onPracticeQuestion: (questionId: string) => void;
  showTranslations: boolean;
}) {
  const [stageId, setStageId] = useState(trainingStages[0].id);
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [attempts, setAttempts] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || userId === "local-guest") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttempts({});
      return;
    }
    let alive = true;
    setLoading(true);
    void fetch("/api/attempts", { cache: "no-store" })
      .then(async (response) => (response.ok ? (await response.json()) as { attempts?: Array<{ questionId?: string; isCorrect?: boolean }> } : null))
      .then((data) => {
        if (!alive || !data?.attempts) return;
        const map: Record<string, boolean> = {};
        for (const attempt of data.attempts) if (attempt.questionId) map[attempt.questionId] = Boolean(attempt.isCorrect);
        setAttempts(map);
      })
      .catch(() => undefined)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const stage = trainingStages.find((item) => item.id === stageId) ?? trainingStages[0];
  const domainQuestions = useMemo(() => questions.filter((question) => question.domain === stage.domain), [stage.domain]);

  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of domainQuestions) {
      const key = question.topic?.trim() || GENERAL_TOPIC;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  }, [domainQuestions]);

  const hasUnrated = domainQuestions.some((question) => !question.difficulty);
  const answeredCount = domainQuestions.filter((question) => Object.prototype.hasOwnProperty.call(attempts, question.id)).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return domainQuestions.filter((question) => {
      if (topic !== "all" && (question.topic?.trim() || GENERAL_TOPIC) !== topic) return false;
      if (difficulty !== "all" && (question.difficulty || UNRATED) !== difficulty) return false;
      const answered = Object.prototype.hasOwnProperty.call(attempts, question.id);
      if (status === "answered" && !answered) return false;
      if (status === "unanswered" && answered) return false;
      if (status === "incorrect" && attempts[question.id] !== false) return false;
      if (needle && !`${question.text} ${question.id} ${question.topic ?? ""} ${question.objective ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [domainQuestions, topic, difficulty, status, attempts, query]);

  // min-w-0 lets the control shrink inside the wrapping filter row on a phone;
  // without it a long option label forces the whole page to scroll sideways.
  const selectClass = "w-full min-w-0 max-w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300";
  const filterLabelClass = "grid min-w-0 gap-1 text-xs text-slate-400";

  return <section className="mx-auto max-w-6xl space-y-5" aria-label="AZ-802 question bank">
    <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#173147] to-[#111a28] p-6 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-cyan-200">AZ-802 · question bank</p>
      <h2 className="mt-2 text-2xl font-bold">Domain → topic → question</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
        Every question stays in its official domain. Pick a domain, narrow it by topic, difficulty, or how you answered it, then open the exact question in practice with its full Explain.
      </p>
      <p className="mt-3 text-xs text-slate-400">
        {questions.length} questions in the bank · {domainQuestions.length} in this domain · {answeredCount} answered by your account
        {loading ? " · loading your answers…" : ""}
      </p>
    </div>

    <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Official AZ-802 domains">
      {trainingStages.map((item) => {
        const count = questions.filter((question) => question.domain === item.domain).length;
        const isActive = item.id === stageId;
        return <button
          key={item.id}
          type="button"
          aria-current={isActive ? "true" : undefined}
          onClick={() => { setStageId(item.id); setTopic("all"); }}
          className={`rounded-2xl border p-4 text-start transition ${isActive ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-[#111a28] hover:border-cyan-300/40"}`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-cyan-200">{item.stage === 8 ? "Capstone" : `Domain ${item.stage}`}</span>
            <span className="text-xs text-slate-400">{count} Q</span>
          </span>
          <span className="mt-2 block text-sm font-semibold"><GoogleSubtitle text={item.title.en} enabled={showTranslations} /></span>
        </button>;
      })}
    </nav>

    <div className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className={filterLabelClass}>
          <span>Topic</span>
          <select className={selectClass} value={topic} onChange={(event) => setTopic(event.target.value)} aria-label="Filter by topic">
            <option value="all">All topics ({domainQuestions.length})</option>
            {topicCounts.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
          </select>
        </label>
        <label className={filterLabelClass}>
          <span>Difficulty</span>
          <select className={selectClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value)} aria-label="Filter by difficulty">
            <option value="all">Any difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            {hasUnrated && <option value={UNRATED}>Not rated yet</option>}
          </select>
        </label>
        <label className={filterLabelClass}>
          <span>Your status</span>
          <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by answer status">
            <option value="all">All questions</option>
            <option value="answered">Answered</option>
            <option value="unanswered">Not answered yet</option>
            <option value="incorrect">Answered incorrectly</option>
          </select>
        </label>
        <label className="grid min-w-0 flex-1 gap-1 text-xs text-slate-400 sm:min-w-48">
          <span>Find in this domain</span>
          <span className="relative">
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300" />
            <input
              type="search"
              dir="auto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="FSMO, RODC, quorum…"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-300"
            />
          </span>
        </label>
      </div>

      <p className="mt-4 text-xs text-slate-400" role="status">
        {visible.length} of {domainQuestions.length} questions shown
        {topic !== "all" ? ` · topic: ${topic}` : ""}
        {difficulty !== "all" ? ` · difficulty: ${difficultyLabels[difficulty] ?? difficulty}` : ""}
        {status !== "all" ? ` · status: ${status}` : ""}
      </p>

      <ol className="mt-4 grid gap-3">
        {visible.map((question: BankQuestion) => {
          const answered = Object.prototype.hasOwnProperty.call(attempts, question.id);
          const correct = attempts[question.id];
          return <li key={question.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-cyan-200">{question.id}</span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-300">{question.topic?.trim() || GENERAL_TOPIC}</span>
              <span className={`rounded-full border px-2 py-0.5 ${question.difficulty ? "border-cyan-300/25 text-cyan-100" : "border-white/10 text-slate-400"}`}>
                {difficultyLabels[question.difficulty ?? UNRATED] ?? question.difficulty}
              </span>
              {answered && <span className={`rounded-full border px-2 py-0.5 ${correct ? "border-emerald-400/40 text-emerald-200" : "border-amber-300/40 text-amber-100"}`}>
                {correct ? "Answered correctly" : "Answered incorrectly"}
              </span>}
              {!answered && <span className="rounded-full border border-white/10 px-2 py-0.5 text-slate-400">Not answered yet</span>}
            </div>
            <p className="mt-3 text-sm font-semibold leading-7"><GoogleSubtitle text={question.text} enabled={showTranslations} /></p>
            {question.objective && <p className="mt-2 text-xs leading-6 text-slate-400"><GoogleSubtitle text={question.objective} enabled={showTranslations} /></p>}
            <button
              type="button"
              onClick={() => onPracticeQuestion(question.id)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-bold text-[#071016]"
            >
              <ListChecks size={15} /> Practice this question <ChevronRight size={15} />
            </button>
          </li>;
        })}
      </ol>

      {visible.length === 0 && <p className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm text-amber-100" role="status">
        No question in this domain matches the current filters. Clear a filter to see the rest of the domain.
      </p>}
    </div>
  </section>;
}
