"use client";

import { useCallback, useEffect, useState } from "react";
import { useCcnaShell } from "@/app/ccna/layout";
import { learningTasks, learningStages, learningSources, learningPack, knowledgePassed, type LearningTask } from "@/lib/content/cisco-learning";
import { CcnaSimulationWorkspace } from "./ccna-simulation-workspace";
import { LearningText } from "./cisco-learning-language";

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
      if (p && Array.isArray(p.completed) && p.completed.every((id: unknown) => typeof id === "string") && p.answers && typeof p.answers === "object" && !Array.isArray(p.answers)) {
        saved = { completed: [...new Set<string>(p.completed)].filter(id => learningTasks.some(t => t.id === id)), answers: p.answers,
          lastTask: learningTasks.some(t => t.id === p.lastTask) ? p.lastTask : undefined };
      }
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
  return <CiscoLearningPathContent />;
}

function CiscoLearningPathContent() {
  const { progress, ready } = useLearningProgress();
  const { language } = useCcnaShell();
  const next = learningTasks.find(t => !progress.completed.includes(t.id)) ?? learningTasks[0];
  const fa = language === "fa";
  const german = language === "de";
  return <section className="cisco-learning-path" dir={fa ? "rtl" : "ltr"} lang={language}>
    <div className="cisco-learning-toolbar">
      <div>
        <p className="cisco-learning-kicker">{fa ? "مسیر آموزشی سیسکو" : german ? "Cisco-Lernpfad" : "Cisco learning path"}</p>
        <p><LearningText text="شبکهٔ شرکت مدار را از اولین Switch تا طراحی Enterprise بساز. تیک عملی از وضعیت دستگاه است؛ بررسی فهم درس جدا مشخص می‌شود." /></p>
      </div>
    </div>
    <p><a className="cisco-learning-primary" href={href(progress.lastTask ?? next.id)}>{fa ? "ادامهٔ مسیر" : german ? "Lernpfad fortsetzen" : "Continue learning"}</a> <span>{ready ? (fa ? `${progress.completed.length}/${learningTasks.length} تمرین تکمیل‌شده در این مرورگر` : german ? `${progress.completed.length}/${learningTasks.length} Übungen in diesem Browser abgeschlossen` : `${progress.completed.length}/${learningTasks.length} exercises completed in this browser`) : (fa ? "در حال خواندن پیشرفت…" : german ? "Fortschritt wird geladen…" : "Loading progress…")}</span></p>
    {learningStages.map(stage => {
      const tasks = learningTasks.filter(t => t.stageIds.includes(stage.id));
      return <details className="cisco-learning-stage" key={stage.id} open={stage.id === "S01" || tasks.some(t => t.id === next.id)}>
        <summary>{stage.id} · <LearningText text={stage.titleFa} /> <small dir="ltr">{stage.track}</small></summary>
        <p><LearningText text={stage.growthFa} /> · {fa ? "پیش‌نیاز" : german ? "Voraussetzungen" : "Prerequisites"}: <LearningText text={stage.prerequisites.join("، ") || "ندارد"} /></p>
        <p><LearningText text={stage.exitCriteriaFa} /></p>
        <ol>{tasks.map(task => <li key={task.id}><a href={href(task.id)}><span>{progress.completed.includes(task.id) ? "✓" : task.id}</span> <LearningText text={task.titleFa} /></a><small>{task.minutes} {fa ? "دقیقه" : german ? "Minuten" : "minutes"} · {task.assessment.startsWith("guided") ? (fa ? "هدایت‌شده / فهم درس" : german ? "Geführt / Wissenscheck" : "Guided / knowledge") : (fa ? "عملی / وضعیت دستگاه" : german ? "Praktisch / Gerätestatus" : "Hands-on / device state")}</small></li>)}</ol>
        {!tasks.length && <p>{fa ? "نقشهٔ این مرحله موجود است؛ تمرین کامل آن هنوز منتشر نشده است." : german ? "Die Stufe ist kartiert; vollständige Übungen werden noch veröffentlicht." : "This stage is mapped; its complete exercises are not published yet."}</p>}
      </details>;
    })}
    <p>{fa ? "مسیر موضوعی است، نه ادعای پوشش کامل آزمون." : german ? "Dies ist ein thematischer Lernpfad und kein vollständiger Prüfungsanspruch." : "This is a topic path, not a claim of complete exam coverage."} CCNA v1.1; v2.0 from 2027-02-03. Enterprise: ENCOR v1.2 / ENARSI v1.1; CCIE EI v1.1; separate Security v6.1 branch.</p>
    <a href="/ccna/build">{fa ? "تمرین‌های ساخت قبلی" : german ? "Frühere Aufbauübungen" : "Previous build exercises"}</a> · <a href="/ccna/library">{fa ? "کتابخانهٔ ۱۰۹ لب قبلی" : german ? "Frühere Bibliothek mit 109 Labs" : "Previous 109-lab library"}</a>
  </section>;
}

export function CiscoLearningTask({ task }: { task: LearningTask }) {
  return <CiscoLearningTaskContent task={task} />;
}

function CiscoLearningTaskContent({ task }: { task: LearningTask }) {
  const { progress, ready, update, userId } = useLearningProgress();
  const { language } = useCcnaShell();
  const fa = language === "fa";
  const german = language === "de";
  const [pack] = useState(() => task.assessment === "guided-knowledge" ? null : learningPack(task));
  const [hint, setHint] = useState(0);
  const complete = useCallback(() => update(p => ({ ...p, completed: [...new Set([...p.completed, task.id])] })), [task.id, update]);
  useEffect(() => { if (ready) update(p => ({ ...p, lastTask: task.id })); }, [ready, task.id, update]);
  const questions = task.reviewQuestions ?? [];
  const answers = Array.isArray(progress.answers[task.id]) ? progress.answers[task.id] : [];
  const correct = questions.filter((q, i) => answers[i] === q.answerFa).length;
  const next = learningTasks[learningTasks.findIndex(t => t.id === task.id) + 1];
  const lesson = <div className="cisco-lesson" dir={fa ? "rtl" : "ltr"} lang={language}>
    <p><LearningText text={task.preLessonFa} /></p>
    <p><strong>{fa ? "هدف:" : german ? "Ziel:" : "Goal:"}</strong> <LearningText text={task.goalFa} /></p>
    <details><summary>{fa ? "وضعیت شروع و پیش‌نیاز" : german ? "Startzustand und Voraussetzungen" : "Starting state and prerequisites"}</summary><p><LearningText text={task.initialState.descriptionFa} /></p><p><LearningText text={task.prerequisites.join("، ") || "ندارد"} /></p></details>
    {task.referenceTopology && <section><p>{fa ? "نقشهٔ مرجع آموزشی؛ دستگاه‌ها و لینک‌های زیر روی موتور اجرا نمی‌شوند." : german ? "Referenzdiagramm; die folgenden Geräte und Links werden nicht ausgeführt." : "Reference learning diagram; the devices and links below are not executed by the simulator."}</p><pre dir="ltr">{task.referenceTopology}</pre></section>}
    {!pack && <ol>{task.steps.map((s, i) => <li key={i}><LearningText text={s.instructionFa} /></li>)}</ol>}
    {questions.length > 0 && <section aria-label="بررسی فهم درس">
      <p>{fa ? "بررسی فهم درس؛ این نتیجه تیک تنظیمات دستگاه نیست." : german ? "Wissenscheck; dies ist kein Gerätekonfigurations-Tick." : "Knowledge check; this is not a device-configuration tick."} {correct}/{questions.length}</p>
      {questions.map((q, i) => <label key={q.questionFa}><LearningText text={q.questionFa} /><select value={answers[i] ?? ""} onChange={event => {
        const value = event.target.value;
        update(p => {
          const nextAnswers = [...(Array.isArray(p.answers[task.id]) ? p.answers[task.id] : [])]; nextAnswers[i] = value;
          const done = knowledgePassed(task, nextAnswers);
          return { ...p, answers: { ...p.answers, [task.id]: nextAnswers }, completed: done ? [...new Set([...p.completed, task.id])] : p.completed.filter(id => id !== task.id) };
        });
      }}><option value="">{fa ? "پاسخ را انتخاب کن" : german ? "Antwort auswählen" : "Choose an answer"}</option>{questions.map((question, n) => <option key={n} value={question.answerFa}>{question.answerFa}</option>)}</select><small>{answers[i] ? answers[i] === q.answerFa ? (fa ? "✓ درست" : german ? "✓ Richtig" : "✓ Correct") : (fa ? "دوباره توضیح درس را بررسی کن" : german ? "Lies die Erklärung erneut" : "Review the lesson explanation again") : ""}</small></label>)}
    </section>}
    <button type="button" onClick={() => setHint(n => Math.min(n + 1, task.hintsFa.length))} disabled={hint >= task.hintsFa.length}>{fa ? "راهنمای بعدی" : german ? "Nächster Hinweis" : "Next hint"}</button>
    {task.hintsFa.slice(0, hint).map(h => <p key={h}><LearningText text={h} /></p>)}
    <details><summary>{fa ? "آزمون موفقیت" : german ? "Erfolgstest" : "Success test"}</summary>{task.verification.map((v, i) => <div key={i}><strong dir="ltr">{v.deviceId}</strong>{v.commands.length > 0 && <pre dir="ltr">{v.commands.join("\n")}</pre>}<p><LearningText text={v.expectedFa} /></p></div>)}</details>
    <details><summary>{fa ? "چالش عیب‌یابی" : german ? "Fehlerbehebungs-Challenge" : "Troubleshooting challenge"}</summary>{task.faults.map(f => <div key={f.id}><p><LearningText text={f.descriptionFa} /></p><p><LearningText text={f.expectedFailureFa} /></p>{f.commands.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<details><summary>{fa ? "تعمیر" : german ? "Reparatur" : "Repair"}</summary>{f.repair.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p><LearningText text={f.repairFa} /></p></details></div>)}</details>
    <details><summary>{fa ? "راه‌حل و دلیل" : german ? "Lösung und Erklärung" : "Solution and explanation"}</summary>{task.solution.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p><LearningText text={task.explanationFa} /></p></details>
    <details><summary>{fa ? "محدودیت مدل" : german ? "Modellgrenze" : "Model limitation"}</summary><p><LearningText text={task.simulatorMapping.limitationFa} /></p><p>{fa ? "رمز واقعی وارد نکن. تنظیمات و پیشرفت در همین مرورگر و برای حساب فعلی ذخیره می‌شود." : german ? "Gib keine echten Passwörter ein. Einstellungen und Fortschritt werden in diesem Browser gespeichert." : "Do not enter real passwords. Settings and progress are stored in this browser for the current account."}</p></details>
    <details><summary>{fa ? "منابع رسمی Cisco و مهارت‌ها" : german ? "Offizielle Cisco-Quellen und Fähigkeiten" : "Official Cisco sources and skills"}</summary><p dir="ltr">{task.skills.join(" · ")}</p>{learningSources.filter(s => task.sourceIds.includes(s.id)).map(s => <p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
    {progress.completed.includes(task.id) && <p>✓ {fa ? "این تمرین قبلاً تکمیل شده است؛ وضعیت فعلی دستگاه را جدا در اهداف بررسی کن." : german ? "Diese Übung ist bereits abgeschlossen; prüfe den aktuellen Gerätestatus separat." : "This exercise is already complete; verify the current device state separately in the objectives."}</p>}
    {next && <a href={href(next.id)}>{fa ? "تمرین بعدی: " : german ? "Nächste Übung: " : "Next exercise: "}<LearningText text={next.titleFa} /></a>}
  </div>;
  if (!ready) return <p role="status">در حال خواندن ادامهٔ تمرین…</p>;
  if (!pack) return <section className="cisco-learning-path" dir={fa ? "rtl" : "ltr"} lang={language}>
    <div className="cisco-learning-toolbar"><a href="/ccna/learning">{fa ? "بازگشت به مسیر" : german ? "Zurück zum Lernpfad" : "Back to learning path"}</a></div><p>{task.id} · <LearningText text={task.titleFa} /> · {task.minutes} {fa ? "دقیقه" : german ? "Minuten" : "minutes"}</p>
    <p><LearningText text={task.scenarioFa} /></p><p role="note">{fa ? "پروندهٔ هدایت‌شده: تیک پاسخ آموزشی، نه اجرای دستگاه. هدف و ارزیابی این درس از تنظیمات عملی شبیه‌ساز جداست." : german ? "Geführte Lektion: Der Haken bestätigt die Wissensantwort, nicht die Gerätekonfiguration." : "Guided lesson: the tick confirms the knowledge answer, not device execution."}</p>
    {lesson}
  </section>;
  return <CcnaSimulationWorkspace pack={pack} persistKey={`cisco-learning:v1:${userId}:${task.id}`} lesson={lesson} backHref="/ccna/learning" onComplete={complete} learningLanguage="en" />;
}
