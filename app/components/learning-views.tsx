"use client";

import { useEffect, useRef, useState } from "react";
import { copy, lessons, practicalScenarios, questions, skills, trainingStageForQuestion } from "@/lib/course-data";

type Language = "fa" | "en" | "de";
type Copy = typeof copy.en;
export const text = (t: Copy, key: string, fallback: string) => (t as unknown as Record<string, string>)[key] ?? fallback;
const localized = (lang: Language, fa: string, en: string, de: string) => lang === "fa" ? fa : lang === "de" ? de : en;
type TrilingualText = { fa: string; en: string; de: string };
function googleErrorMessage(reason: string | null) {
  if (!reason) return "";
  const messages: Record<string, string> = {
    not_configured: "Google sign-in is not configured on this deployment. Contact the site owner.",
    account_exists: "An account already uses this email. Sign in with its password, then link Google from your account.",
    email_mismatch: "The Google email must match the email on your account.",
    sign_in_required: "Sign in with your password before linking Google.",
    already_linked: "A different Google account is already linked to this account.",
  };
  return messages[reason] ?? "Google sign-in could not be completed. Please try again.";
}
export function BilingualText({ lang, value, className = "" }: { lang: Language; value: TrilingualText; className?: string }) { return lang === "fa" ? <span className={`inline-flex flex-col gap-0.5 ${className}`}><span dir="ltr">{value.en}</span><span dir="rtl" className="text-right text-sm font-normal text-cyan-100">{value.fa}</span></span> : <span dir="ltr" className={className}>{value[lang]}</span>; }
const skillLabels: Record<string, TrilingualText> = { security: { fa: "سخت‌سازی امنیتی", en: "Security hardening", de: "Sicherheitshärtung" }, ha: { fa: "دسترس‌پذیری بالا", en: "High availability", de: "Hohe Verfügbarkeit" }, dr: { fa: "بازیابی فاجعه", en: "Disaster recovery", de: "Notfallwiederherstellung" }, migration: { fa: "مهاجرت", en: "Migration", de: "Migration" }, monitoring: { fa: "مانیتورینگ و عیب‌یابی", en: "Monitoring & troubleshooting", de: "Überwachung und Fehlerbehebung" } };
const skillText = (skill: { id: string; name: string }): TrilingualText => skillLabels[skill.id] ?? { fa: skill.name, en: skill.name, de: skill.name };


export function Dashboard({ t, progress, correctRate, skillProgress, onLesson, onQuiz, onPractical, onLabs, onCards }: { t: Copy; progress: number; correctRate: number; skillProgress: Record<string, number>; onLesson: () => void; onQuiz: () => void; onPractical: () => void; onLabs: () => void; onCards: () => void }) { return <div className="space-y-6"><section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-400">{t.overview}</p><h2 className="mt-1 text-xl font-bold">{t.courseTitle}</h2></div><div className="grid h-20 w-20 place-items-center rounded-full border-[7px] border-cyan-300/25 text-lg font-bold text-cyan-200">{progress}%</div></div><div className="mt-7 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${progress}%` }} /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label={t.lessons} value={localized(t.lang, `${lessons.length} درس`, `${lessons.length} lessons`, `${lessons.length} Lektionen`)} /><Stat label={t.correct} value={`${correctRate}%`} /><Stat label={t.days} value="0" /></div></div><div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-[#173147] to-[#111a28] p-6"><p className="text-sm text-cyan-100">{t.nextLesson}</p><h2 className="mt-2 text-xl font-bold"><BilingualText lang={t.lang} value={lessons[0].title} /></h2><p className="mt-3 text-sm leading-6 text-slate-300"><BilingualText lang={t.lang} value={lessons[0].body} /></p><button type="button" onClick={onLesson} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#071016]">{t.continue} →</button></div></section><section className="grid gap-4 lg:grid-cols-4"><Action title={t.examTitle} meta={localized(t.lang, `${questions.length} سؤال در بانک · ۸ سؤال زمان‌دار`, `${questions.length}-question bank · 8-question timed set`, `${questions.length} Fragen · 8 Fragen im Zeitset`)} icon="✓" button={t.startExam} onClick={onQuiz} /><Action title={text(t, "practicalExam", "Practical exam")} meta={localized(t.lang, "۲ سناریو · شواهد", "2 scenarios · evidence", "2 Szenarien · Nachweis")} icon="⚙" button={localized(t.lang, "شروع", "Start", "Start")} onClick={onPractical} /><Action title={t.labTitle} meta={localized(t.lang, "Hyper-V · ۴۵–۶۰ دقیقه", "Hyper-V · 45–60 min", "Hyper-V · 45–60 Min.")} icon="▣" button={t.openLab} onClick={onLabs} /><Action title={t.reviewTitle} meta={localized(t.lang, "۱/۳/۷/۱۴/۳۰ روز", "1/3/7/14/30 days", "1/3/7/14/30 Tage")} icon="↻" button={t.reviewNow} onClick={onCards} /></section><section className="rounded-3xl border border-white/10 bg-[#111a28] p-6"><div className="flex justify-between"><div><p className="text-sm text-slate-400">{t.skillMap}</p><h2 className="mt-1 text-lg font-bold">AZ-802 readiness</h2></div><span className="text-sm text-slate-500">{localized(t.lang, "بازبینی منبع: ژانویهٔ ۲۰۲۶", "source reviewed Jan 2026", "Quelle geprüft: Jan. 2026")}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{skills.map((skill) => { const percentage = skillProgress[skill.id] ?? skill.progress; return <div key={skill.id}><div className="mb-2 flex justify-between text-sm"><BilingualText lang={t.lang} value={skillText(skill)} /><span className="text-slate-500">{percentage}%</span></div><div className="h-1.5 rounded bg-white/5"><div className="h-full rounded bg-cyan-300" style={{ width: `${percentage}%` }} /></div></div>; })}</div></section></div>; }

export function Lesson({ t, selectedLessonId, onSelectLesson, onQuiz }: { t: Copy; selectedLessonId: string; onSelectLesson: (id: string) => void; onQuiz: (skillId: string) => void }) { const lesson = lessons.find((item) => item.id === selectedLessonId) ?? lessons[0]; const glossaryRows = lesson.glossary.en.map(([englishTerm, englishDefinition], index) => ({ term: { fa: lesson.glossary.fa[index]?.[0] ?? englishTerm, en: englishTerm, de: lesson.glossary.de[index]?.[0] ?? englishTerm }, value: { fa: lesson.glossary.fa[index]?.[1] ?? englishDefinition, en: englishDefinition, de: lesson.glossary.de[index]?.[1] ?? englishDefinition } })); const labels = t.lang === "fa" ? { lesson: "درس", source: "نسخهٔ منبع", glossary: "واژه‌نامه", check: "سنجش یادگیری" } : t.lang === "de" ? { lesson: "Lektion", source: "Quellversion", glossary: "Glossar", check: "Verständnis prüfen" } : { lesson: "Lesson", source: "Source version", glossary: "Glossary", check: "Check understanding" }; return <section className="mx-auto max-w-5xl"><div className="mb-4 flex gap-2 overflow-x-auto pb-2">{lessons.map((item) => <button type="button" key={item.id} onClick={() => onSelectLesson(item.id)} className={`shrink-0 rounded-xl border px-3 py-2 text-start text-sm ${item.id === lesson.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-[#111a28]"}`}><BilingualText lang={t.lang} value={item.title} /></button>)}</div><article className="rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-200">{labels.lesson}</p><h2 className="mt-3 text-3xl font-bold"><BilingualText lang={t.lang} value={lesson.title} /></h2><p className="mt-4 max-w-3xl text-base leading-8 text-slate-300"><BilingualText lang={t.lang} value={lesson.body} /></p><div className="mt-8 grid gap-4 md:grid-cols-3"><Stat label={localized(t.lang, "زمان تخمینی", "Estimated", "Geschätzte Zeit")} value={`${lesson.estimatedMinutes} min`} /><Stat label={localized(t.lang, "هدف AZ-802", "AZ-802 objective", "AZ-802-Ziel")} value={lesson.skillId} /><Stat label={labels.source} value="2026-01" /></div><div className="mt-8 space-y-5 text-sm leading-7 text-slate-300"><h3 className="text-lg font-semibold text-white"><BilingualText lang={t.lang} value={lesson.objective} /></h3><pre className="overflow-auto rounded-xl border border-white/10 bg-black/25 p-4 text-cyan-100">{lesson.command}</pre><div><h3 className="mb-2 text-lg font-semibold text-white">{labels.glossary}</h3><dl className="grid gap-2 sm:grid-cols-2">{glossaryRows.map((entry) => <div key={entry.term.en} className="rounded-xl bg-black/15 p-3"><dt className="font-semibold text-cyan-100"><BilingualText lang={t.lang} value={entry.term} /></dt><dd className="mt-1 text-slate-400"><BilingualText lang={t.lang} value={entry.value} /></dd></div>)}</dl></div><a className="font-semibold text-cyan-200" href={lesson.source} target="_blank" rel="noreferrer">{t.viewSource} ↗</a></div><button type="button" onClick={() => onQuiz(lesson.skillId)} className="mt-8 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071016]">{labels.check} →</button></article></section>; }
export function PracticalExam({ t, userId, onComplete }: { t: Copy; userId: string | null; onComplete: (score: number) => void }) {
  const [selected, setSelected] = useState(0);
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const scenario = practicalScenarios[selected];
  useEffect(() => {
    if (!userId || userId === "local-guest") return;
    void fetch("/api/lab-submissions").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { submissions?: Array<{ labId?: string; score?: number | null }> };
      const previous = data.submissions?.find((item) => item.labId === scenario.id);
      if (typeof previous?.score === "number") setLastScore(previous.score);
    }).catch(() => undefined);
  }, [userId, scenario.id]);
  const submit = async () => {
    if (userId && userId !== "local-guest") {
      const response = await fetch("/api/lab-submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ labId: scenario.id, evidenceText: evidence || "Practical attempt submitted", completed: false }) });
      const data = await response.json() as { score?: number | null };
      const score = typeof data.score === "number" ? data.score : 50;
      setSubmitted(true); setLastScore(score); onComplete(score);
    } else {
      const score = evidence.trim().length >= 40 ? 100 : 50;
      setSubmitted(true); setLastScore(score); onComplete(score);
    }
  };
  return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-6 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-200">{text(t, "practicalExam", "Practical exam")}</p><div className="mt-4 flex gap-2">{practicalScenarios.map((item, index) => <button type="button" key={item.id} onClick={() => { setSelected(index); setSubmitted(false); }} className={`rounded-xl border px-3 py-2 text-sm ${selected === index ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10"}`}><BilingualText lang={t.lang} value={item.title} /></button>)}</div><h2 className="mt-7 text-2xl font-bold"><BilingualText lang={t.lang} value={scenario.title} /></h2><p className="mt-4 leading-8 text-slate-300"><BilingualText lang={t.lang} value={scenario.prompt} /></p><label htmlFor="practical-evidence" className="mt-6 block text-sm text-slate-300">{t.evidence}<textarea id="practical-evidence" value={evidence} onChange={(event) => setEvidence(event.target.value)} className="mt-2 min-h-36 w-full rounded-xl border border-white/10 bg-black/20 p-3" placeholder="Commands, verification output, timestamps…" /></label><a className="mt-4 inline-block text-sm font-semibold text-cyan-200" href={scenario.source} target="_blank" rel="noreferrer">{t.viewSource} ↗</a><button type="button" onClick={() => void submit()} className="mt-6 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071016]">{submitted ? localized(t.lang, "ارسال شد · دوباره بررسی کنید", "Submitted · review again", "Gesendet · erneut prüfen") : localized(t.lang, "ثبت شواهد عملی", "Submit practical evidence", "Praxisnachweis senden")}</button>{lastScore !== null && <p className="mt-4 rounded-xl bg-emerald-400/10 p-4 text-emerald-200">{localized(t.lang, "آخرین نمره", "Latest score", "Letzte Punktzahl")}: {lastScore}% · {lastScore >= 70 ? localized(t.lang, "قبول", "Pass", "Bestanden") : localized(t.lang, "نیازمند بازبینی", "Needs review", "Prüfung nötig")}</p>}</section>;
}


export function SkillGraph({ t, selectedSkillId, onSelectSkill, onPractice }: { t: Copy; selectedSkillId: string | null; onSelectSkill: (id: string) => void; onPractice: () => void }) { const selected = skills.find((skill) => skill.id === selectedSkillId); return <section className="rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{t.graph}</p><h2 className="mt-1 text-xl font-bold">{t.learningGraph}</h2></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">{t.clickNode}</span></div><div className="relative mt-8 min-h-[430px] overflow-hidden rounded-2xl border border-white/5 bg-[#0b1018] p-5"><svg viewBox="0 0 900 420" className="absolute inset-0 h-full w-full opacity-50" aria-hidden="true"><path d="M160 215 L340 95 M160 215 L340 300 M340 95 L570 145 M340 300 L570 275 M570 145 L760 215 M570 275 L760 215" fill="none" stroke="#2d6374" strokeWidth="2" strokeDasharray="5 6" /></svg><div className="relative grid min-h-[390px] grid-cols-3 items-center gap-2 text-center">{skills.map((skill, index) => <button type="button" key={skill.id} aria-pressed={selectedSkillId === skill.id} onClick={() => onSelectSkill(skill.id)} className={`rounded-2xl border p-3 text-start transition hover:-translate-y-1 ${selectedSkillId === skill.id ? "border-cyan-300/70 bg-cyan-300/15" : "border-white/10 bg-[#121d2c]"}`} style={{ gridColumn: index === 0 ? "1" : index < 3 ? "2" : "3" }}><p className="text-xs text-slate-400">{skill.progress}% complete</p><p className="mt-1 text-sm font-bold"><BilingualText lang={t.lang} value={skillText(skill)} /></p><div className="mt-3 h-1 rounded bg-white/5"><div className="h-full rounded bg-cyan-300" style={{ width: `${skill.progress}%` }} /></div></button>)}</div></div>{selected && <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase tracking-[.12em] text-cyan-200">{t.selectedSkill}</p><h3 className="mt-1 font-semibold"><BilingualText lang={t.lang} value={skillText(selected)} /></h3><p className="mt-1 text-sm text-slate-400">{selected.progress}% {t.completeLabel}</p></div><button type="button" onClick={onPractice} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-[#071016]">{t.practiceSkill} →</button></div>}</section>; }

export function Quiz({ t, question, selected, totalQuestions, answer, setAnswer, showTranslations, previous, next, onTimeout }: { t: Copy; question: typeof questions[number]; selected: number; totalQuestions: number; answer: number | null; setAnswer: (value: number) => void; showTranslations: boolean; previous: () => void; next: () => void; onTimeout: () => void }) {
  const [timeLeft, setTimeLeft] = useState(18 * 60);
  useEffect(() => { if (timeLeft <= 0) return; const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [timeLeft]);
  useEffect(() => { if (timeLeft === 0) onTimeout(); }, [timeLeft, onTimeout]);
  const answered = answer !== null;
  const time = `${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`;
  const localizedQuestion = question as typeof question & { textFa?: string; optionsFa?: string[] };
  return <section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400"><span>{t.mixedExam}</span><div className="flex items-center gap-3"><span>{selected + 1} / {totalQuestions} · {time}</span>{t.lang === "fa" && <span className="rounded-full border border-cyan-300/30 px-2 py-1 text-[11px] text-cyan-100">{showTranslations ? "Google Translate · روشن" : "ترجمه خاموش"}</span>}</div></div><div className="mt-4 h-1.5 rounded bg-white/5"><div className="h-full rounded bg-cyan-300" style={{ width: `${((selected + 1) / totalQuestions) * 100}%` }} /></div><p className="mt-8 text-xs font-semibold uppercase tracking-[.13em] text-cyan-200">{question.domain}</p><h2 className="mt-3 text-xl font-semibold leading-8"><span dir="ltr" className="block">{question.text}</span>{t.lang === "fa" && showTranslations && <span dir="rtl" className="mt-2 block text-right text-base font-normal text-cyan-100">{localizedQuestion.textFa ?? question.text}</span>}</h2><div className="mt-6 space-y-3">{question.options.map((option, index) => <button type="button" disabled={answered || timeLeft === 0} onClick={() => setAnswer(index)} key={option} className={`w-full rounded-xl border p-4 text-start text-sm transition ${answer === index ? (index === question.correct ? "border-emerald-400 bg-emerald-400/10" : "border-rose-400 bg-rose-400/10") : index === question.correct && answered ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-black/10 hover:border-cyan-300/50"}`}><span dir="ltr" className="block">{option}</span>{t.lang === "fa" && showTranslations && <span dir="rtl" className="mt-1 block text-right text-slate-300">{localizedQuestion.optionsFa?.[index] ?? option}</span>}</button>)}</div>{answered && <div className={`mt-6 rounded-xl border p-4 ${answer === question.correct ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-300/30 bg-amber-300/5"}`}><p className="flex items-center gap-2 font-semibold"><span className={answer === question.correct ? "text-emerald-300" : "text-rose-300"}>{answer === question.correct ? "＋" : "−"}</span>{answer === question.correct ? t.correctAnswer : t.addedLeitner}</p><p className="mt-2 text-sm leading-6 text-slate-300"><BilingualText lang={t.lang} value={question.rationale} /></p><a className="mt-3 inline-block text-sm font-semibold text-cyan-200" href={question.source} target="_blank" rel="noreferrer">{t.viewSource} ↗</a></div>}<div className="mt-6 flex gap-3"><button type="button" disabled={selected === 0} onClick={previous} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-35">{t.previousQuestion} ←</button><button type="button" disabled={!answered} onClick={next} className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071016] disabled:opacity-35">{t.nextQuestion} →</button></div></section>;
}

export function Labs({ t, completed, evidence, evidenceFile, onEvidence, onEvidenceFile, onComplete }: { t: Copy; completed: boolean; evidence: string; evidenceFile: File | null; onEvidence: (value: string) => void; onEvidenceFile: (file: File | null) => void; onComplete: () => Promise<void> }) { const labName: TrilingualText = { fa: copy.fa.labName, en: copy.en.labName, de: copy.de.labName }; const labDescription: TrilingualText = { fa: copy.fa.labDescription, en: copy.en.labDescription, de: copy.de.labDescription }; const realLab: TrilingualText = { fa: copy.fa.realLab, en: copy.en.realLab, de: copy.de.realLab }; return <section className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#111a28] p-5 sm:p-8"><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200"><BilingualText lang={t.lang} value={realLab} /></span><h2 className="mt-4 text-2xl font-bold"><BilingualText lang={t.lang} value={labName} /></h2><p className="mt-3 max-w-2xl leading-7 text-slate-300"><BilingualText lang={t.lang} value={labDescription} /></p><div className="mt-8 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-2xl bg-black/20 p-5"><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t.topology}</p><div className="mt-5 grid place-items-center gap-3 rounded-xl border border-dashed border-cyan-300/25 bg-[#0c1520] p-5 text-center"><div className="rounded-lg border border-cyan-300/40 p-3 text-sm">DC01<br /><span className="text-xs text-slate-400">AD DS · DNS</span></div><span className="text-cyan-300">↕</span><div className="rounded-lg border border-white/20 p-3 text-sm">SRV01<br /><span className="text-xs text-slate-400">File services</span></div></div><p className="mt-4 text-sm text-slate-400">Hyper-V · two Windows Server evaluation VMs</p></div><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t.steps}</p><ol className="mt-4 space-y-3">{copy.en.labSteps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-xs text-cyan-200">{index + 1}</span><BilingualText lang={t.lang} value={{ fa: copy.fa.labSteps[index], en: step, de: copy.de.labSteps[index] }} /></li>)}</ol></div></div><div className="mt-7 rounded-2xl border border-white/10 p-5"><label htmlFor="lab-evidence" className="font-semibold">{t.evidence}</label><p className="mt-1 text-sm text-slate-400">{t.evidenceHelp}</p><textarea id="lab-evidence" value={evidence} onChange={(event) => onEvidence(event.target.value)} className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-cyan-300" placeholder={localized(t.lang, "خروجی فرمان، خلاصهٔ نتیجه یا لینک شواهد…", "Paste commands, result summary, or evidence link…", "Befehlsausgabe, Ergebniszusammenfassung oder Nachweislink…")} /><label htmlFor="evidence-file" className="mt-4 block text-sm text-slate-300">{localized(t.lang, "پیوست شواهد", "Attach evidence file", "Nachweisdatei anhängen")}<input id="evidence-file" type="file" accept="image/*,.txt,.log,.json,.zip" onChange={(event) => onEvidenceFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-slate-400" /></label>{evidenceFile && <p className="mt-2 text-xs text-cyan-200">{evidenceFile.name} · {(evidenceFile.size / 1024).toFixed(0)} KB</p>}</div><button type="button" onClick={() => void onComplete()} className={`mt-5 rounded-xl px-5 py-3 text-sm font-bold ${completed ? "bg-emerald-400 text-[#071016]" : "bg-cyan-300 text-[#071016]"}`}>{completed ? t.completed : t.markComplete}</button></section>; }

export function Cards({ t, known, userId, questionId, onReview }: { t: Copy; known: boolean; userId: string | null; questionId: string; onReview: (quality: "again" | "got-it") => void }) {
  const [serverBox, setServerBox] = useState<number | null>(null);
  const card = questions.find((item) => item.id === questionId) ?? questions[0];
  const localizedCard = card as typeof card & { textFa?: string; optionsFa?: string[] };
  const stage = trainingStageForQuestion(card.id);
  useEffect(() => {
    if (!userId || userId === "local-guest") return;
    void fetch("/api/flashcards").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { flashcards?: Array<{ questionId?: string; box?: number }> };
      const legacyId = questionId === "az802-q-216" ? "ipsec-connection-rule" : questionId;
      const found = data.flashcards?.find((item) => item.questionId === questionId || item.questionId === legacyId);
      if (found?.box) setServerBox(found.box);
    }).catch(() => undefined);
  }, [userId, questionId]);
  const box = serverBox ?? (known ? 2 : 1);
  const review = async (quality: "again" | "got-it") => {
    if (userId && userId !== "local-guest") {
      const response = await fetch("/api/flashcards", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, quality }) });
      if (response.ok) { const data = await response.json() as { box?: number }; if (data.box) setServerBox(data.box); }
    }
    onReview(quality);
  };
  const cardQuestion: TrilingualText = { fa: localizedCard.textFa ?? card.text, en: card.text, de: card.text };
  const cardAnswer: TrilingualText = { fa: localizedCard.optionsFa?.[card.correct] ?? card.options[card.correct], en: card.options[card.correct], de: card.options[card.correct] };
  return <section className="mx-auto max-w-3xl"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-400">{t.leitner}</p><h2 className="mt-1 text-2xl font-bold">{t.dueCards}</h2></div><div className="flex items-center gap-2"><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-sm text-cyan-200">{box} / 5</span><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">{card.domain}</span></div></div><article className="min-h-80 rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-[#173147] to-[#111a28] p-8"><p className="text-xs font-semibold uppercase tracking-[.14em] text-cyan-200">{stage ? <BilingualText lang={t.lang} value={stage.title} /> : card.domain} · Box {box}</p><h3 className="mt-10 text-2xl font-semibold leading-9"><BilingualText lang={t.lang} value={cardQuestion} /></h3><p className="mt-6 border-t border-white/10 pt-5 text-sm leading-7 text-slate-300"><BilingualText lang={t.lang} value={cardAnswer} /></p></article><div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={() => void review("again")} className="rounded-xl border border-rose-300/30 bg-rose-300/5 px-4 py-3 text-sm font-semibold text-rose-200">{t.again}</button><button type="button" onClick={() => void review("got-it")} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#071016]">{known ? t.scheduled : t.gotIt}</button></div>{!userId && <p className="mt-4 text-xs text-slate-500">Sign in to sync this review across devices.</p>}</section>;
}

export function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-black/15 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
export function Action({ title, meta, icon, button, onClick }: { title: string; meta: string; icon: string; button: string; onClick: () => void }) { return <article className="rounded-2xl border border-white/10 bg-[#111a28] p-5"><span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-cyan-200">{icon}</span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{meta}</p><button type="button" onClick={onClick} className="mt-5 text-sm font-semibold text-cyan-200">{button} →</button></article>; }

export function AuthPanel({ onClose, onAuthenticated }: { onClose: () => void; onAuthenticated: (id: string) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "reset" | "reset-confirm">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => { firstInput.current?.focus(); }, [mode]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("google_error");
    const resetToken = params.get("reset_token");
    if (resetToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToken(resetToken);
      setMode("reset-confirm");
    }
    if (reason) {
      setMessage(googleErrorMessage(reason));
    }
  }, []);

  const labels = { title: "WinCraft account", email: "Email", password: "Password", newPassword: "New password", token: "Recovery token", login: "Sign in", register: "Create account", reset: "Send recovery instructions", confirm: "Change password", forgot: "Forgot password?", back: "Back", close: "Close", sent: "If the account exists, recovery instructions will be sent.", passwordHint: "Password must be at least 10 characters.", networkError: "Could not reach the server. Please try again.", databaseError: "The account database is unavailable. Contact the site owner.", configurationError: "Authentication is not configured on this deployment. Contact the site owner.", invalidCredentials: "Email or password is incorrect.", accountExists: "An account with this email already exists.", google: "Continue with Google", divider: "or" };

  const readResponse = async (response: Response) => {
    const data = await response.json().catch(() => ({})) as { user?: { id?: string }; debugToken?: string; error?: string; code?: string };
    return { response, data };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setMessage("");
    setBusy(true);
    try {
      if ((mode === "register" || mode === "reset-confirm") && password.length < 10) {
        setMessage(labels.passwordHint);
        return;
      }
      if (mode === "reset") {
        const result = await readResponse(await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) }));
        if (result.data.debugToken) { setToken(result.data.debugToken); setMode("reset-confirm"); }
        else setMessage(result.data.error ?? labels.sent);
        return;
      }
      if (mode === "reset-confirm") {
        const result = await readResponse(await fetch("/api/auth/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, newPassword: password }) }));
        if (result.response.ok && result.data.user?.id) onAuthenticated(result.data.user.id);
        else setMessage(result.data.error ?? labels.networkError);
        return;
      }
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const result = await readResponse(await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }));
      if (result.response.ok && result.data.user?.id) onAuthenticated(result.data.user.id);
      else if (result.data.code === "AUTH_NOT_CONFIGURED") setMessage(labels.configurationError);
      else if (result.data.code === "DATABASE_UNAVAILABLE") setMessage(labels.databaseError);
      else if (result.response.status === 401) setMessage(labels.invalidCredentials);
      else if (result.response.status === 409) setMessage(labels.accountExists);
      else setMessage(result.data.error ?? labels.networkError);
    } catch {
      setMessage(labels.networkError);
    } finally {
      setBusy(false);
    }
  };

  const recovery = mode === "reset" || mode === "reset-confirm";
  return <div dir="ltr" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="account-title"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111a28] p-6 text-left shadow-2xl"><div className="flex items-center justify-between"><h2 id="account-title" className="text-xl font-bold">{labels.title}</h2><button type="button" onClick={onClose} aria-label={labels.close} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5">×</button></div><form onSubmit={submit} className="mt-6 space-y-4">{mode !== "reset-confirm" && <label className="block text-sm text-slate-300">{labels.email}<input ref={firstInput} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-cyan-300" /></label>}{mode === "reset-confirm" && <label className="block text-sm text-slate-300">{labels.token}<input ref={firstInput} required value={token} onChange={(event) => setToken(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs outline-none focus:border-cyan-300" /></label>}{(!recovery || mode === "reset-confirm") && <label className="block text-sm text-slate-300">{mode === "reset-confirm" ? labels.newPassword : labels.password}<input required minLength={10} aria-describedby="password-hint" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-cyan-300" /><span id="password-hint" className="mt-1 block text-xs text-slate-500">{labels.passwordHint}</span></label>}<button type="submit" disabled={busy} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#071016] disabled:cursor-wait disabled:opacity-60">{busy ? "…" : mode === "login" ? labels.login : mode === "register" ? labels.register : mode === "reset" ? labels.reset : labels.confirm}</button></form>{mode === "login" && <><div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />{labels.divider}<span className="h-px flex-1 bg-white/10" /></div><a href="/api/auth/google/start" className="block w-full rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/5">{labels.google}</a></>}{message && <p role="alert" className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-cyan-100">{message}</p>}<div className="mt-5 flex flex-wrap gap-3 text-sm text-cyan-200">{recovery ? <button type="button" onClick={() => { setMessage(""); setMode("login"); }}>{labels.back}</button> : <><button type="button" onClick={() => { setMessage(""); setMode(mode === "login" ? "register" : "login"); }}>{mode === "login" ? labels.register : labels.login}</button><button type="button" onClick={() => { setMessage(""); setMode("reset"); }}>{labels.forgot}</button></>}</div></div></div>;
}

export function AccountPanel({ onClose, onSignOut }: { onClose: () => void; onSignOut: () => Promise<boolean> }) {
  const [error, setError] = useState(() => typeof window === "undefined" ? "" : googleErrorMessage(new URLSearchParams(window.location.search).get("google_error")));
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    setError("");
    if (!(await onSignOut())) setError("Could not sign out. Please try again.");
    setBusy(false);
  };
  return <div dir="ltr" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="account-title"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111a28] p-6 text-left shadow-2xl"><div className="flex items-center justify-between"><h2 id="account-title" className="text-xl font-bold">Your account</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-white/5">×</button></div><p className="mt-4 text-sm text-slate-300">Your learning progress is saved to this account.</p><a href="/api/auth/google/start?intent=link" className="mt-6 block rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/5">Link Google account</a><button type="button" disabled={busy} onClick={() => void signOut()} className="mt-3 w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#071016] disabled:opacity-60">{busy ? "Signing out…" : "Sign out"}</button>{error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}</div></div>;
}


