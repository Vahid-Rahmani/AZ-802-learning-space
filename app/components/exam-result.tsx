"use client";

import { copy, skills } from "@/lib/course-data";

type Copy = typeof copy.en;
const localized = (lang: "fa" | "en" | "de", fa: string, en: string, de: string) => lang === "fa" ? fa : lang === "de" ? de : en;

export function ExamResult({ t, correct, answered, totalQuestions, selectedSkillId, stats, onRestart }: { t: Copy; correct: number; answered: number; totalQuestions: number; selectedSkillId: string | null; stats: Record<string, { correct: number; total: number }>; onRestart: () => void }) {
  const percent = answered ? Math.round((correct / answered) * 100) : 0;
  const reportSkills = selectedSkillId ? skills.filter((skill) => skill.id === selectedSkillId) : skills.filter((skill) => stats[skill.id]);
  return <section className="mx-auto max-w-4xl space-y-5">
    <article className="rounded-3xl border border-cyan-300/25 bg-[#111a28] p-7">
      <h2 className="text-2xl font-bold">{localized(t.lang, "گزارش آزمون", "Exam report", "Prüfungsbericht")}</h2>
      <p className="mt-4 text-4xl font-bold text-cyan-200">{percent}%</p>
      <p className="mt-2 text-sm text-slate-400">{correct} / {totalQuestions} · {percent >= 70 ? localized(t.lang, "قبول", "Pass", "Bestanden") : localized(t.lang, "نیاز به مرور", "Review needed", "Wiederholen")}</p>
      <button type="button" onClick={onRestart} className="mt-6 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071016]">{localized(t.lang, "آزمون دوباره", "Retake exam", "Prüfung wiederholen")} →</button>
    </article>
    <article className="rounded-3xl border border-white/10 bg-[#111a28] p-6">
      <h3 className="text-lg font-bold">{localized(t.lang, "گزارش مهارت‌ها", "Skill report", "Kompetenzbericht")}</h3>
      <div className="mt-5 space-y-3">
        {reportSkills.length ? reportSkills.map((skill) => {
          const stat = stats[skill.id] ?? { correct: 0, total: 0 };
          return <p key={skill.id} className="rounded-xl bg-black/15 p-3 text-sm"><span className="font-semibold">{skill.name}</span><span className="float-end text-slate-400">{stat.correct}/{stat.total}</span></p>;
        }) : <p className="text-sm text-slate-400">{localized(t.lang, "هنوز پاسخی ثبت نشده است.", "No answers recorded yet.", "Noch keine Antworten gespeichert.")}</p>}
      </div>
    </article>
  </section>;
}
