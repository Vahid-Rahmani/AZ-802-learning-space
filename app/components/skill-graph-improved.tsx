"use client";

import { useMemo, useRef, useState } from "react";
import { learningGraphStages, lessons, questions } from "@/lib/course-data";

type Language = "fa" | "en" | "de";
type GraphText = { fa: string; en: string; de: string };
type CopyShape = {
  lang: Language;
  graph: string;
  learningGraph: string;
  clickNode: string;
  completeLabel: string;
  viewSource: string;
};
type Stage = (typeof learningGraphStages)[number];
type Question = (typeof questions)[number];

const localized = (lang: Language, fa: string, en: string, de: string) => lang === "fa" ? fa : lang === "de" ? de : en;
const activeText = (lang: Language, value: GraphText) => value[lang];

function stageLabel(stage: Stage, lang: Language) {
  return activeText(lang, stage.title);
}

function questionSummary(question: Question) {
  return question.text.length > 92 ? `${question.text.slice(0, 89)}…` : question.text;
}

/**
 * A useful learning graph for the learner-facing app.
 *
 * Unlike the original linear stage strip, this view makes the learning chain
 * explicit: AZ-802 → domain → objective → lesson → questions → source,
 * lab and Leitner review. The component intentionally has no graph library
 * dependency so it remains fast and keyboard/mobile friendly.
 */
export function SkillGraphImproved({
  t,
  selectedStageId,
  progress,
  onSelectStage,
  onPractice,
  onOpenLesson,
  onSelectQuestion,
  onOpenLabs,
  onOpenCards,
}: {
  t: CopyShape;
  selectedStageId: string | null;
  progress: Record<string, number>;
  onSelectStage: (id: string) => void;
  onPractice: (domain: string) => void;
  onOpenLesson?: (lessonId: string) => void;
  onSelectQuestion?: (questionId: string) => void;
  onOpenLabs?: () => void;
  onOpenCards?: () => void;
}) {
  const stageButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(null);
  const selected = learningGraphStages.find((stage) => stage.id === selectedStageId) ?? learningGraphStages[0];
  const selectedQuestions = useMemo(() => selected.questionIds.map((id) => questions.find((question) => question.id === id)).filter((question): question is Question => Boolean(question)), [selected.questionIds]);
  const selectedLesson = lessons.find((lesson) => lesson.id === selected.lessonId);
  const selectedProgress = progress[selected.id] ?? (selected.id === "capstone" ? progress.recovery : 0) ?? 0;
  const questionPreview = selectedQuestions.slice(0, 6);
  const focusStage = (index: number) => {
    const next = (index + learningGraphStages.length) % learningGraphStages.length;
    stageButtons.current[next]?.focus();
  };

  return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm text-slate-400">{t.graph}</p>
        <h2 className="mt-1 text-xl font-bold">{t.learningGraph}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {localized(t.lang, "از هدف آزمون تا سؤال و مرور، مسیر یادگیری را دنبال کنید.", "Follow the path from an AZ-802 objective to a lesson, question, source, lab and review card.", "Verfolge den Weg vom AZ-802-Ziel über Lektion und Frage bis zu Quelle, Lab und Wiederholungskarte.")}
        </p>
      </div>
      <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">{t.clickNode}</span>
    </div>

    <div className="mt-7 rounded-2xl border border-white/5 bg-[#0b1018] p-3 sm:p-5">
      <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center">
        <div className="rounded-2xl border border-cyan-300/40 bg-cyan-300/10 p-4 xl:w-44 xl:shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-cyan-200">{localized(t.lang, "ریشهٔ مسیر", "Learning root", "Lernwurzel")}</p>
          <p className="mt-2 text-lg font-bold">AZ-802</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Windows Server Administrator</p>
        </div>
        <span aria-hidden="true" className="hidden text-xl text-cyan-200/60 xl:block">→</span>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{localized(t.lang, "دامنه‌ها و Capstone", "Domains and capstone", "Domänen und Capstone")}</p>
          <ol aria-label={localized(t.lang, "دامنه‌های گراف یادگیری", "Learning graph domains", "Domänen des Lerngraphen")} className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {learningGraphStages.map((stage, index) => {
              const value = Math.max(0, Math.min(100, progress[stage.id] ?? (stage.id === "capstone" ? progress.recovery : 0) ?? 0));
              const isSelected = selected.id === stage.id;
              const isCapstone = stage.id === "capstone";
              return <li key={stage.id} className="min-w-0">
                <button
                  ref={(node) => { stageButtons.current[index] = node; }}
                  type="button"
                  aria-current={isSelected ? "step" : undefined}
                  aria-pressed={isSelected}
                  aria-label={`${stageLabel(stage, t.lang)} · ${stage.questionIds.length} ${localized(t.lang, "سؤال", "questions", "Fragen")} · ${value}%`}
                  onClick={() => { setFocusedQuestionId(null); onSelectStage(stage.id); }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); focusStage(index + 1); }
                    if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); focusStage(index - 1); }
                  }}
                  className={`group min-w-0 w-full rounded-xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${isSelected ? "border-cyan-300/80 bg-cyan-300/15" : isCapstone ? "border-amber-300/30 bg-amber-300/5" : "border-white/10 bg-[#121d2c] hover:border-cyan-300/50"}`}
                >
                  <div className="flex items-start justify-between gap-2"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${isCapstone ? "bg-amber-300/15 text-amber-200" : "bg-white/5 text-cyan-200"}`}>{isCapstone ? "★" : stage.stage}</span><span className="shrink-0 text-xs text-slate-400">{value}%</span></div>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5">{stageLabel(stage, t.lang)}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-white/5"><div className={`h-full rounded ${isCapstone ? "bg-amber-300" : "bg-cyan-300"}`} style={{ width: `${value}%` }} /></div>
                </button>
              </li>;
            })}
          </ol>
        </div>
      </div>
    </div>

    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
      <GraphNode title={localized(t.lang, "هدف", "Objective", "Ziel")} icon="◎" detail={activeText(t.lang, selected.objective)} />
      <GraphArrow />
      <GraphNode title={localized(t.lang, "درس", "Lesson", "Lektion")} icon="▤" detail={selectedLesson ? activeText(t.lang, selectedLesson.title) : localized(t.lang, "درس مرتبط", "Linked lesson", "Verknüpfte Lektion")} action={selectedLesson && onOpenLesson ? { label: localized(t.lang, "باز کردن درس", "Open lesson", "Lektion öffnen"), onClick: () => onOpenLesson(selectedLesson.id) } : undefined} />
      <GraphArrow />
      <GraphNode title={localized(t.lang, "تمرین", "Practice", "Übung")} icon="✓" detail={`${selectedQuestions.length} ${localized(t.lang, "سؤال متصل", "linked questions", "verknüpfte Fragen")}`} action={{ label: localized(t.lang, "تمرین این دامنه", "Practice this domain", "Diese Domäne üben"), onClick: () => onPractice(selected.domain) }} />
    </div>

    <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-cyan-200">{localized(t.lang, "سؤال‌های این مسیر", "Questions in this path", "Fragen in diesem Pfad")}</p><h3 className="mt-1 text-lg font-semibold">{stageLabel(selected, t.lang)}</h3><p className="mt-1 text-sm text-slate-400">{activeText(t.lang, selected.objective)}</p></div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{selectedProgress}% {t.completeLabel}</span>
      </div>
      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {questionPreview.map((question, index) => {
          const isFocused = focusedQuestionId === question.id;
          return <button type="button" key={question.id} aria-pressed={isFocused} onClick={() => { setFocusedQuestionId(question.id); onSelectQuestion?.(question.id); }} className={`min-w-0 rounded-xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${isFocused ? "border-cyan-300/80 bg-cyan-300/10" : "border-white/10 bg-black/15 hover:border-cyan-300/50"}`}><span className="text-[11px] font-semibold text-cyan-200">Q{index + 1}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-300">{questionSummary(question)}</span></button>;
        })}
        {selectedQuestions.length > questionPreview.length && <button type="button" onClick={() => onPractice(selected.domain)} className="min-w-0 rounded-xl border border-dashed border-cyan-300/35 p-3 text-start text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">+{selectedQuestions.length - questionPreview.length} {localized(t.lang, "سؤال دیگر را تمرین کن", "more questions — practice all", "weitere Fragen — alle üben")} →</button>}
      </div>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <GraphNode title={localized(t.lang, "منبع رسمی", "Official source", "Offizielle Quelle")} icon="↗" detail={localized(t.lang, "راهنمای رسمی AZ-802", "AZ-802 Study Guide", "AZ-802 Study Guide")} action={{ label: t.viewSource, onClick: () => window.open(selected.source, "_blank", "noopener,noreferrer") }} />
      <GraphNode title={localized(t.lang, "لاب مرتبط", "Related lab", "Verknüpftes Lab")} icon="▣" detail={localized(t.lang, "تمرین عملی این دامنه", "Hands-on practice for this domain", "Praxisübung für diese Domäne")} action={{ label: localized(t.lang, "باز کردن لاب‌ها", "Open labs", "Labs öffnen"), onClick: () => onOpenLabs ? onOpenLabs() : window.dispatchEvent(new Event("wincraft:open-labs")) }} />
      <GraphNode title="Leitner" icon="↻" detail={localized(t.lang, "پاسخ غلط → کارت مرور", "Wrong answer → review card", "Falsche Antwort → Wiederholungskarte")} action={{ label: localized(t.lang, "مرور کارت‌ها", "Review cards", "Karten wiederholen"), onClick: () => onOpenCards ? onOpenCards() : window.dispatchEvent(new Event("wincraft:open-cards")) }} />
    </div>
  </section>;
}

function GraphArrow() {
  return <div aria-hidden="true" className="hidden items-center justify-center text-xl text-cyan-200/60 lg:flex">→</div>;
}

function GraphNode({ title, icon, detail, action }: { title: string; icon: string; detail: string; action?: { label: string; onClick: () => void } }) {
  return <article className="min-w-0 rounded-2xl border border-white/10 bg-[#121d2c] p-4"><div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200">{icon}</span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{title}</p><p className="mt-1 break-words text-sm leading-6 text-slate-200">{detail}</p></div></div>{action && <button type="button" onClick={action.onClick} className="mt-3 text-xs font-semibold text-cyan-200 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{action.label} →</button>}</article>;
}

