"use client";

import { trainingStages } from "@/lib/course-data";

type Language = "fa" | "en" | "de";
type Copy = { lang: Language; [key: string]: unknown };

const localized = (lang: Language, fa: string, en: string, de: string) => lang === "fa" ? fa : lang === "de" ? de : en;

export function FontSizeControl({ t, scale, onChange }: { t: Copy; scale: number; onChange: (next: number) => void }) {
  const label = localized(t.lang, "اندازهٔ متن", "Text size", "Textgröße");
  return <div className="font-scale-control flex items-center gap-1 rounded-xl border border-white/10 bg-black/15 p-1" aria-label={label}><button type="button" onClick={() => onChange(Math.max(0.85, Number((scale - 0.05).toFixed(2))))} className="grid h-7 w-7 place-items-center rounded-lg text-base text-cyan-100 hover:bg-white/10" aria-label={localized(t.lang, "کوچک‌کردن متن", "Decrease text size", "Text verkleinern")}>−</button><output className="min-w-10 text-center text-xs text-slate-300">{Math.round(scale * 100)}%</output><button type="button" onClick={() => onChange(Math.min(1.3, Number((scale + 0.05).toFixed(2))))} className="grid h-7 w-7 place-items-center rounded-lg text-base text-cyan-100 hover:bg-white/10" aria-label={localized(t.lang, "بزرگ‌کردن متن", "Increase text size", "Text vergrößern")}>+</button></div>;
}

export function TrainingHub({ progress, selectedStageId, onSelectStage }: { t: Copy; progress: Record<string, number>; selectedStageId: string; onSelectStage: (id: string) => void; onPractice: (domain: string) => void; onOpenLesson: (lessonId: string) => void }) {
  const selected = trainingStages.find((stage) => stage.id === selectedStageId) ?? trainingStages[0];
  return <section className="mx-auto max-w-5xl">
    <label className="simple-course-select">Choose a lesson
      <select aria-label="Choose a lesson" value={selected.id} onChange={event => onSelectStage(event.target.value)}>
        {trainingStages.map(stage => <option key={stage.id} value={stage.id}>{stage.stage}. {stage.title.en} · {progress[stage.id] ?? 0}%</option>)}
      </select>
    </label>
    <p className="text-sm text-slate-400">Read the lesson below, then practise its questions. Follow the order if you are new; you can revisit any topic.</p>
  </section>;
}

export function StageProgressStrip({ t, progress, onOpen }: { t: Copy; progress: Record<string, number>; onOpen: () => void }) {
  return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-200">{localized(t.lang, "نقشهٔ پیشرفت آموزش", "Learning progress map", "Lernfortschrittskarte")}</p><h2 className="mt-1 text-lg font-bold">{localized(t.lang, `${trainingStages.length - 1} دامنهٔ رسمی + تمرین ترکیبی Capstone`, `${trainingStages.length - 1} official domains + capstone practice`, `${trainingStages.length - 1} offizielle Domänen + Capstone-Übung`)}</h2></div><button type="button" onClick={onOpen} className="rounded-xl border border-cyan-300/30 px-3 py-2 text-xs font-semibold text-cyan-100">{localized(t.lang, "باز کردن مسیر آموزش", "Open learning path", "Lernpfad öffnen")} →</button></div><div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">{trainingStages.map((stage) => <button type="button" key={stage.id} onClick={onOpen} className="rounded-xl border border-white/10 bg-black/10 p-2 text-start hover:border-cyan-300/50"><span className="text-xs font-bold text-cyan-200">{stage.stage}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{stage.questionIds.length} Q</span><div className="mt-2 h-1 rounded bg-white/5"><div className="h-full rounded bg-cyan-300" style={{ width: `${progress[stage.id] ?? 0}%` }} /></div></button>)}</div></section>;
}
