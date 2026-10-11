"use client";

import { useCallback, useEffect, useState } from "react";
import { useCcnaShell } from "@/app/ccna/layout";
import { learningTasks, learningStages, learningPack, type LearningTask } from "@/lib/content/cisco-learning";
import { CcnaSimulationWorkspace } from "./ccna-simulation-workspace";

const href = (id: string) => `/ccna/sim?task=${encodeURIComponent(id)}`;
type Progress = { completed: string[]; lastTask?: string; answers: Record<string, string[]> };
const empty: Progress = { completed: [], answers: {} };
function useLearningProgress() {
  const { userId } = useCcnaShell();
  const key = `cisco-learning:v1:${userId}`;
  const [progress, setProgress] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let saved = empty;
    try {
      const p = JSON.parse(localStorage.getItem(key) ?? "null");
      if (p && Array.isArray(p.completed) && p.completed.every((id: unknown) => typeof id === "string") && p.answers && typeof p.answers === "object") saved = p;
    } catch { /* A damaged local save must not prevent learning. */ }
    setProgress(saved); setReady(true);
  }, [key]);
  const update = useCallback((change: (p: Progress) => Progress) => {
    setProgress(previous => {
      const next = change(previous);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Keep the current session usable. */ }
      return next;
    });
  }, [key]);
  return { progress, ready, update, userId };
}

export function CiscoLearningPath() {
  const { progress, ready } = useLearningProgress();
  const next = learningTasks.find(t => !progress.completed.includes(t.id)) ?? learningTasks[0];
  return <section className="cisco-learning-path" dir="rtl" lang="fa">
    <p>شبکهٔ شرکت مدار را از اولین Switch تا طراحی Enterprise بساز. تیک عملی از وضعیت دستگاه است؛ بررسی فهم درس جدا مشخص می‌شود.</p>
    <p><a className="cisco-learning-primary" href={href(progress.lastTask ?? next.id)}>ادامهٔ مسیر</a> <span>{ready ? `${progress.completed.length}/${learningTasks.length} تمرین تکمیل‌شده در این مرورگر` : "در حال خواندن پیشرفت…"}</span></p>
    {learningStages.map(stage => {
      const tasks = learningTasks.filter(t => t.stageIds.includes(stage.id));
      return <details className="cisco-learning-stage" key={stage.id} open={stage.id === "S01" || tasks.some(t => t.id === next.id)}>
        <summary>{stage.id} · {stage.titleFa} <small dir="ltr">{stage.track}</small></summary>
        <p>{stage.growthFa} · پیش‌نیاز: {stage.prerequisites.join("، ") || "ندارد"}</p>
        <p>{stage.exitCriteriaFa}</p>
        <ol>{tasks.map(task => <li key={task.id}><a href={href(task.id)}><span>{progress.completed.includes(task.id) ? "✓" : task.id}</span> {task.titleFa}</a><small>{task.minutes} دقیقه · {task.assessment.startsWith("guided") ? "هدایت‌شده / فهم درس" : "عملی / وضعیت دستگاه"}</small></li>)}</ol>
        {!tasks.length && <p>نقشهٔ این مرحله موجود است؛ تمرین کامل آن هنوز منتشر نشده است.</p>}
      </details>;
    })}
    <p>مسیر موضوعی است، نه ادعای پوشش کامل آزمون. CCNA v1.1؛ نسخهٔ v2.0 از 2027-02-03. Enterprise: ENCOR v1.2 / ENARSI v1.1؛ CCIE EI v1.1؛ شاخهٔ مستقل Security v6.1.</p>
    <a href="/ccna/build">تمرین‌های ساخت قبلی</a> · <a href="/ccna/library">کتابخانهٔ ۱۰۹ لب قبلی</a>
  </section>;
}

export function CiscoLearningTask({ task }: { task: LearningTask }) {
  const { progress, ready, update, userId } = useLearningProgress();
  const [pack] = useState(() => learningPack(task));
  const [hint, setHint] = useState(0);
  const complete = useCallback(() => update(p => ({ ...p, completed: [...new Set([...p.completed, task.id])] })), [task.id, update]);
  useEffect(() => { if (ready) update(p => ({ ...p, lastTask: task.id })); }, [ready, task.id, update]);
  const questions = task.reviewQuestions ?? [];
  const answers = Array.isArray(progress.answers[task.id]) ? progress.answers[task.id] : [];
  const correct = questions.filter((q, i) => answers[i] === q.answerFa).length;
  const next = learningTasks[learningTasks.findIndex(t => t.id === task.id) + 1];
  const lesson = <div className="cisco-lesson" dir="rtl" lang="fa">
    <p>{task.preLessonFa}</p>
    <p><strong>هدف:</strong> {task.goalFa}</p>
    <details><summary>وضعیت شروع و پیش‌نیاز</summary><p>{task.initialState.descriptionFa}</p><p>{task.prerequisites.join("، ") || "ندارد"}</p></details>
    {questions.length > 0 && <section aria-label="بررسی فهم درس">
      <p>بررسی فهم درس؛ این نتیجه تیک تنظیمات دستگاه نیست. {correct}/{questions.length}</p>
      {questions.map((q, i) => <label key={q.questionFa}>{q.questionFa}<select value={answers[i] ?? ""} onChange={event => {
        const value = event.target.value;
        update(p => {
          const nextAnswers = [...(Array.isArray(p.answers[task.id]) ? p.answers[task.id] : [])]; nextAnswers[i] = value;
          const done = questions.every((question, n) => nextAnswers[n] === question.answerFa);
          return { ...p, answers: { ...p.answers, [task.id]: nextAnswers }, completed: done ? [...new Set([...p.completed, task.id])] : p.completed.filter(id => id !== task.id) };
        });
      }}><option value="">پاسخ را انتخاب کن</option>{questions.map((question, n) => <option key={n} value={question.answerFa}>{question.answerFa}</option>)}</select><small>{answers[i] ? answers[i] === q.answerFa ? "✓ درست" : "دوباره توضیح درس را بررسی کن" : ""}</small></label>)}
    </section>}
    <button type="button" onClick={() => setHint(n => Math.min(n + 1, task.hintsFa.length))} disabled={hint >= task.hintsFa.length}>راهنمای بعدی</button>
    {task.hintsFa.slice(0, hint).map(h => <p key={h}>{h}</p>)}
    <details><summary>آزمون موفقیت</summary>{task.verification.map((v, i) => <div key={i}><strong dir="ltr">{v.deviceId}</strong><pre dir="ltr">{v.commands.join("\n")}</pre><p>{v.expectedFa}</p></div>)}</details>
    <details><summary>چالش عیب‌یابی</summary>{task.faults.map(f => <div key={f.id}><p>{f.descriptionFa}</p><p>{f.expectedFailureFa}</p>{f.commands.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<details><summary>تعمیر</summary>{f.repair.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p>{f.repairFa}</p></details></div>)}</details>
    <details><summary>راه‌حل و دلیل</summary>{task.solution.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p>{task.explanationFa}</p></details>
    <details><summary>محدودیت مدل</summary><p>{task.simulatorMapping.limitationFa}</p><p>رمز واقعی وارد نکن. تنظیمات و پیشرفت در همین مرورگر و برای حساب فعلی ذخیره می‌شود.</p></details>
    {progress.completed.includes(task.id) && <p>✓ این تمرین قبلاً تکمیل شده است؛ وضعیت فعلی دستگاه را جدا در اهداف بررسی کن.</p>}
    {next && <a href={href(next.id)}>تمرین بعدی: {next.titleFa}</a>}
  </div>;
  if (!ready) return <p role="status">در حال خواندن ادامهٔ تمرین…</p>;
  return <CcnaSimulationWorkspace pack={pack} persistKey={`cisco-learning:v1:${userId}:${task.id}`} lesson={lesson} backHref="/ccna/learning" onComplete={complete} />;
}
