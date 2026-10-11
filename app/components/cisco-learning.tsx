"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Native navigation avoids the deployed vinext Link chunk's missing router exports. */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Network, Play, ShieldCheck, Terminal, Trophy } from "lucide-react";
import { useCcnaShell } from "@/app/ccna/layout";
import { learningTasks, learningStages, learningSources, learningPack, knowledgePassed, gradedLearningCriteria, type LearningTask } from "@/lib/content/cisco-learning";
import { CcnaSimulationWorkspace } from "./ccna-simulation-workspace";
import { LearningText } from "./cisco-learning-language";
import { GoogleSubtitle } from "./google-translate";
import { learningTitles, stageTitles } from "@/lib/content/cisco-learning-display";
import { taskMeasurement, type LearningProgress } from "@/lib/cisco-learning-progress";

const href = (id: string) => `/ccna/sim?task=${encodeURIComponent(id)}`;
const overviewHref = (id: string) => `/ccna/learning/${encodeURIComponent(id)}`;
type Progress = LearningProgress;
const empty: Progress = { completed: [], answers: {} };
function useLearningProgress() {
  const { userId } = useCcnaShell();
  const key = `cisco-learning:v1:${userId}`;
  const [progress, setProgress] = useState<Progress>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    let saved = empty;
    try {
      const p = JSON.parse(localStorage.getItem(key) ?? "null");
      if (p && Array.isArray(p.completed) && p.completed.every((id: unknown) => typeof id === "string") && p.answers && typeof p.answers === "object" && !Array.isArray(p.answers)) {
        saved = { completed: [...new Set<string>(p.completed)].filter(id => learningTasks.some(t => t.id === id)), answers: p.answers,
          lastTask: learningTasks.some(t => t.id === p.lastTask) ? p.lastTask : undefined,
          verified: p.verified && typeof p.verified === "object" && !Array.isArray(p.verified)
            ? Object.fromEntries(Object.entries(p.verified).filter(([, ids]) => Array.isArray(ids) && ids.every(id => typeof id === "string"))) as Record<string, string[]> : {} };
      }
    } catch { /* A damaged local save must not prevent learning. */ }
    setProgress(saved); setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [key]);
  const update = useCallback((change: (p: Progress) => Progress) => {
    setProgress(previous => {
      const next = change(previous);
      if (next === previous) return previous;
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
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const completed = learningTasks.filter(t => taskMeasurement(t, progress).complete).length;
  const next = learningTasks.find(t => !taskMeasurement(t, progress).complete) ?? learningTasks[0];
  const resume = learningTasks.find(t => t.id === progress.lastTask) ?? next;
  const activeStageId = selectedStage ?? resume.stageIds[0];
  const stage = learningStages.find(s => s.id === activeStageId)!;
  const tasks = learningTasks.filter(t => t.stageIds.includes(stage.id));
  const stageDone = tasks.filter(t => taskMeasurement(t, progress).complete).length;
  return <section className="cisco-learning-path" dir="ltr" lang="en">
    <div className="cisco-path-hero">
      <div><p className="cisco-learning-kicker"><Network size={16} /> CCNA → Enterprise → CCIE</p>
        <h2><GoogleSubtitle text="One network. A clear next step." /></h2>
        <p><GoogleSubtitle text="Build your skills one lesson at a time. Choose a stage, review a lesson, then start its exercise." /></p>
        <a className="cisco-learning-primary" href={overviewHref(resume.id)}><Play size={16} /><GoogleSubtitle text={progress.lastTask ? "Resume learning" : "Start learning"} /><ArrowRight size={16} /></a>
      </div>
      <ProgressRing percent={Math.floor(completed / learningTasks.length * 100)} label={`${completed} / ${learningTasks.length} lessons`} />
    </div>
    <div className="cisco-path-stats"><span><BookOpen size={18} />48 lessons</span><span><Network size={18} />13 stages</span><span><ShieldCheck size={18} />Security throughout</span><span><CheckCircle2 size={18} />{ready ? `${completed} completed` : "Loading progress…"}</span></div>
    <div className="cisco-path-layout">
      <nav className="cisco-stage-nav" aria-label="Learning stages">{learningStages.map(s => {
        const entries = learningTasks.filter(t => t.stageIds.includes(s.id));
        const done = entries.filter(t => taskMeasurement(t, progress).complete).length;
        return <button key={s.id} type="button" aria-current={s.id === activeStageId ? "step" : undefined} onClick={() => setSelectedStage(s.id)}>
          <span className="cisco-stage-number">{done === entries.length ? <Check size={16} /> : s.id.slice(1)}</span>
          <span><strong><GoogleSubtitle text={stageTitles[s.id]} /></strong><small>{s.id === "S13" ? "Optional specialization" : s.track.split(" /")[0]} · {done}/{entries.length}</small></span>
        </button>;
      })}</nav>
      <div className="cisco-stage-content" key={stage.id}>
        <header><div><p className="cisco-learning-kicker">{stage.id} · {stage.track}</p><h2><GoogleSubtitle text={stageTitles[stage.id]} /></h2><p><LearningText text={stage.growthFa} /></p></div><span className="cisco-stage-count">{stageDone}/{tasks.length}<small>completed</small></span></header>
        <ProgressBar percent={Math.floor(stageDone / tasks.length * 100)} label={`${stageTitles[stage.id]} progress`} />
        <div className="cisco-lesson-grid">{tasks.map(task => {
          const m = taskMeasurement(task, progress);
          const Icon = m.complete ? CheckCircle2 : task.assessment === "live-state" ? Terminal : BookOpen;
          return <a className={`cisco-lesson-card${m.complete ? " is-complete" : ""}`} key={task.id} href={overviewHref(task.id)}>
            <div className="cisco-card-top"><span className="cisco-card-icon"><Icon size={22} /></span><span>LESSON {task.id}</span><span className="cisco-card-status">{m.complete ? "Complete" : m.percent || progress.lastTask === task.id ? "In progress" : "Ready to start"}</span></div>
            <h3><GoogleSubtitle text={learningTitles[task.id]} /></h3>
            <p>{task.skills.slice(0, 3).join(" · ")}</p>
            <div className="cisco-card-meta"><span><Clock3 size={14} /> {task.minutes} min</span><span>{task.assessment === "guided-knowledge" ? "Guided case study" : m.knowledge ? "Console + knowledge check" : "Hands-on lab"}</span></div>
            <ProgressBar percent={m.percent} label={`Lesson ${task.id} progress`} />
            <div className="cisco-card-bottom"><span>{m.percent}% · {m.passed}/{m.total} checks</span><strong>View lesson <ArrowRight size={15} /></strong></div>
          </a>;
        })}</div>
        <div className="cisco-stage-note"><strong><GoogleSubtitle text="Before this stage" /></strong><p>{stage.prerequisites.length ? stage.prerequisites.map(id => stageTitles[id]).join(" · ") : "No prerequisites. Start with your first switch."}</p><LearningText text={stage.exitCriteriaFa} /></div>
      </div>
    </div>
    <footer className="cisco-path-footer"><p>Progress is saved for this account in this browser. Hands-on checks read device state; guided lessons grade your answers.</p><details><summary>Curriculum versions & resources</summary><p>This topic path is not a claim of complete exam coverage. CCNA v1.1; v2.0 from 2027-02-03. ENCOR v1.2 / ENARSI v1.1; CCIE EI v1.1; separate Security v6.1 branch.</p><a href="/ccna/build">Build exercises</a> · <a href="/ccna/library">109-lab library</a></details></footer>
  </section>;
}

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return <div className="cisco-progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div>;
}

function ProgressRing({ percent, label }: { percent: number; label: string }) {
  return <div className="cisco-progress-ring" style={{ "--progress": `${percent}%` } as CSSProperties} role="img" aria-label={`${percent}% · ${label}`}><div><strong>{percent}%</strong><span>{label}</span></div></div>;
}

export function CiscoLearningOverview({ task }: { task: LearningTask }) {
  const { progress, ready } = useLearningProgress();
  const m = taskMeasurement(task, progress);
  const previous = learningTasks.filter(t => task.prerequisites.includes(t.id));
  return <section className="cisco-learning-path cisco-lesson-overview" dir="ltr" lang="en">
    <a className="cisco-back-link" href="/ccna/learning"><ArrowLeft size={16} /><GoogleSubtitle text="Learning path" /></a>
    <div className="cisco-path-hero"><div><p className="cisco-learning-kicker">LESSON {task.id} · {task.stageIds.map(id => stageTitles[id]).join(" / ")}</p><h2><GoogleSubtitle text={learningTitles[task.id]} /></h2><p><LearningText text={task.goalFa} /></p><a className="cisco-learning-primary" href={href(task.id)}><Play size={16} /><GoogleSubtitle text={m.complete ? "Practise again" : m.percent || progress.lastTask === task.id ? "Continue exercise" : "Start exercise"} /><ArrowRight size={16} /></a></div><ProgressRing percent={m.percent} label={ready ? `${m.passed}/${m.total} checks passed` : "Loading progress…"} /></div>
    <div className="cisco-path-stats"><span><Clock3 size={18} />{task.minutes} minutes</span><span>{task.assessment === "guided-knowledge" ? <BookOpen size={18} /> : <Terminal size={18} />}{task.assessment === "guided-knowledge" ? "Guided case study" : "Simulator exercise"}</span><span><Trophy size={18} />{m.total} success checks</span></div>
    <div className="cisco-overview-columns"><div className="cisco-overview-panel"><h3><GoogleSubtitle text="Your success checklist" /></h3><p><GoogleSubtitle text={m.knowledge ? "Answer the lesson questions correctly to pass each check." : "Each check passes when your device configuration meets the goal."} /></p><table className="cisco-measurement-table"><thead><tr><th>Check</th><th>Status</th></tr></thead><tbody>{m.criteria.map((criterion, i) => <tr key={criterion.id}><td><span className="cisco-check-number">{i + 1}</span><LearningText text={criterion.title} /></td><td><span className={`cisco-check-status${criterion.passed ? " is-passed" : ""}`}>{criterion.passed && <Check size={14} />}{criterion.passed ? "Passed" : "To do"}</span></td></tr>)}</tbody></table><p className="cisco-measurement-note">{m.knowledge ? "This percentage measures knowledge answers. It does not claim a running OSPF, firewall or appliance." : "Live device checks are updated when you open the exercise. You can experiment beyond the lesson."}</p></div>
      <aside className="cisco-overview-panel"><h3><GoogleSubtitle text="Prepare for this lesson" /></h3><p className="cisco-learning-kicker">Prerequisites</p>{previous.length ? previous.map(t => <a className="cisco-prerequisite" key={t.id} href={overviewHref(t.id)}><span>{taskMeasurement(t, progress).complete ? <CheckCircle2 size={16} /> : <BookOpen size={16} />}</span><GoogleSubtitle text={learningTitles[t.id]} /><ArrowRight size={14} /></a>) : <p>No prerequisites. This is your first lesson.</p>}<p className="cisco-learning-kicker">Skills you will practise</p><div className="cisco-skill-tags">{task.skills.map(skill => <span key={skill}>{skill}</span>)}</div><p><LearningText text={task.scenarioFa} /></p></aside>
    </div>
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
  const recordChecks = useCallback((ids: string[]) => {
    if (task.assessment !== "live-state") return;
    update(p => {
      const was = p.verified?.[task.id];
      if (was?.length === ids.length && was.every((id, i) => id === ids[i])) return p;
      const criteria = gradedLearningCriteria(task);
      const allPassed = criteria.length > 0 && criteria.every(c => ids.includes(c.id));
      return { ...p, verified: { ...p.verified, [task.id]: ids }, completed: allPassed ? [...new Set([...p.completed, task.id])] : p.completed.filter(id => id !== task.id) };
    });
  }, [task, update]);
  useEffect(() => { if (ready) update(p => ({ ...p, lastTask: task.id })); }, [ready, task.id, update]);
  const questions = task.reviewQuestions ?? [];
  const answers = Array.isArray(progress.answers[task.id]) ? progress.answers[task.id] : [];
  const correct = questions.filter((q, i) => answers[i] === q.answerFa).length;
  const measured = taskMeasurement(task, progress);
  const next = learningTasks[learningTasks.findIndex(t => t.id === task.id) + 1];
  const lesson = <div className="cisco-lesson" dir={fa ? "rtl" : "ltr"} lang={language}>
    <p><LearningText text={task.preLessonFa} /></p>
    <p><strong>{fa ? "هدف:" : german ? "Ziel:" : "Goal:"}</strong> <LearningText text={task.goalFa} /></p>
    <details><summary>{fa ? "وضعیت شروع و پیش‌نیاز" : german ? "Startzustand und Voraussetzungen" : "Starting state and prerequisites"}</summary><p><LearningText text={task.initialState.descriptionFa} /></p><p><LearningText text={task.prerequisites.join("، ") || "ندارد"} /></p></details>
    {task.referenceTopology && <section><p>{fa ? "نقشهٔ مرجع آموزشی؛ دستگاه‌ها و لینک‌های زیر روی موتور اجرا نمی‌شوند." : german ? "Referenzdiagramm; die folgenden Geräte und Links werden nicht ausgeführt." : "Reference learning diagram; the devices and links below are not executed by the simulator."}</p><pre dir="ltr">{task.referenceTopology}</pre></section>}
    {!pack && <ol>{task.steps.map((s, i) => <li key={i}><LearningText text={s.instructionFa} /></li>)}</ol>}
    {questions.length > 0 && <section className="cisco-knowledge-check" aria-label="Knowledge check">
      <p>{fa ? "بررسی فهم درس؛ این نتیجه تیک تنظیمات دستگاه نیست." : german ? "Wissenscheck; dies ist kein Gerätekonfigurations-Tick." : "Knowledge check; this is not a device-configuration tick."} {correct}/{questions.length}</p>
      <ProgressBar percent={Math.floor(correct / questions.length * 100)} label="Knowledge check progress" />
      {questions.map((q, i) => <fieldset key={q.questionFa}><legend><span>{i + 1}.</span> <LearningText text={q.questionFa} /></legend>
        {[...new Set(questions.map(question => question.answerFa))].map((value, n) => <label className="cisco-answer-choice" key={value}><input type="radio" name={`lesson-${task.id}-question-${i}`} checked={answers[i] === value} value={value} onChange={() => {
        update(p => {
          const nextAnswers = [...(Array.isArray(p.answers[task.id]) ? p.answers[task.id] : [])]; nextAnswers[i] = value;
          const done = knowledgePassed(task, nextAnswers);
          return { ...p, answers: { ...p.answers, [task.id]: nextAnswers }, completed: done ? [...new Set([...p.completed, task.id])] : p.completed.filter(id => id !== task.id) };
        });
      }} /><span className="cisco-answer-letter">{String.fromCharCode(65 + n)}</span><LearningText text={value} /></label>)}<small role="status">{answers[i] ? answers[i] === q.answerFa ? (fa ? "✓ درست" : german ? "✓ Richtig" : "✓ Correct") : (fa ? "دوباره توضیح درس را بررسی کن" : german ? "Lies die Erklärung erneut" : "Review the lesson explanation again") : ""}</small></fieldset>)}
    </section>}
    <button type="button" onClick={() => setHint(n => Math.min(n + 1, task.hintsFa.length))} disabled={hint >= task.hintsFa.length}>{fa ? "راهنمای بعدی" : german ? "Nächster Hinweis" : "Next hint"}</button>
    {task.hintsFa.slice(0, hint).map(h => <p key={h}><LearningText text={h} /></p>)}
    <details><summary>{fa ? "آزمون موفقیت" : german ? "Erfolgstest" : "Success test"}</summary>{task.verification.map((v, i) => <div key={i}><strong dir="ltr">{v.deviceId}</strong>{v.commands.length > 0 && <pre dir="ltr">{v.commands.join("\n")}</pre>}<p><LearningText text={v.expectedFa} /></p></div>)}</details>
    <details><summary>{fa ? "چالش عیب‌یابی" : german ? "Fehlerbehebungs-Challenge" : "Troubleshooting challenge"}</summary>{task.faults.map(f => <div key={f.id}><p><LearningText text={f.descriptionFa} /></p><p><LearningText text={f.expectedFailureFa} /></p>{f.commands.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<details><summary>{fa ? "تعمیر" : german ? "Reparatur" : "Repair"}</summary>{f.repair.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p><LearningText text={f.repairFa} /></p></details></div>)}</details>
    <details><summary>{fa ? "راه‌حل و دلیل" : german ? "Lösung und Erklärung" : "Solution and explanation"}</summary>{task.solution.map((b, i) => <pre key={i} dir="ltr">{b.deviceId}{"\n"}{b.commands.join("\n")}</pre>)}<p><LearningText text={task.explanationFa} /></p></details>
    <details><summary>{fa ? "محدودیت مدل" : german ? "Modellgrenze" : "Model limitation"}</summary><p><LearningText text={task.simulatorMapping.limitationFa} /></p><p>{fa ? "رمز واقعی وارد نکن. تنظیمات و پیشرفت در همین مرورگر و برای حساب فعلی ذخیره می‌شود." : german ? "Gib keine echten Passwörter ein. Einstellungen und Fortschritt werden in diesem Browser gespeichert." : "Do not enter real passwords. Settings and progress are stored in this browser for the current account."}</p></details>
    <details><summary>{fa ? "منابع رسمی Cisco و مهارت‌ها" : german ? "Offizielle Cisco-Quellen und Fähigkeiten" : "Official Cisco sources and skills"}</summary><p dir="ltr">{task.skills.join(" · ")}</p>{learningSources.filter(s => task.sourceIds.includes(s.id)).map(s => <p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
    {progress.completed.includes(task.id) && <p>✓ {fa ? "این تمرین قبلاً تکمیل شده است؛ وضعیت فعلی دستگاه را جدا در اهداف بررسی کن." : german ? "Diese Übung ist bereits abgeschlossen; prüfe den aktuellen Gerätestatus separat." : "This exercise is already complete; verify the current device state separately in the objectives."}</p>}
    {next && <a className="cisco-next-lesson" href={overviewHref(next.id)}><GoogleSubtitle text={`Next lesson: ${learningTitles[next.id]}`} /><ArrowRight size={16} /></a>}
  </div>;
  if (!ready) return <p role="status">Loading your saved exercise…</p>;
  if (!pack) return <section className="cisco-learning-path cisco-guided-exercise" dir="ltr" lang="en">
    <a className="cisco-back-link" href={overviewHref(task.id)}><ArrowLeft size={16} /><GoogleSubtitle text="Lesson overview" /></a>
    <div className="cisco-path-hero"><div><p className="cisco-learning-kicker">LESSON {task.id} · GUIDED CASE STUDY</p><h2><GoogleSubtitle text={learningTitles[task.id]} /></h2><p><LearningText text={task.scenarioFa} /></p><span className="cisco-card-meta"><Clock3 size={16} /> {task.minutes} minutes · {correct}/{questions.length} answers verified</span></div><ProgressRing percent={measured.percent} label={`${correct}/${questions.length} checks passed`} /></div>
    <div className="cisco-guided-columns"><div className="cisco-overview-panel">{lesson}</div><aside className="cisco-overview-panel cisco-guided-progress"><h3><GoogleSubtitle text="Lesson progress" /></h3><ProgressBar percent={measured.percent} label="Lesson progress" /><p>{measured.percent}% · {measured.passed}/{measured.total} checks</p><ol>{measured.criteria.map((c, i) => <li className={c.passed ? "is-passed" : ""} key={c.id}><span>{c.passed ? <CheckCircle2 size={18} /> : i + 1}</span><LearningText text={c.title} /></li>)}</ol><p><GoogleSubtitle text="Read the case, work through its steps, then answer the knowledge check. Each correct answer passes its own check." /></p><p className="cisco-measurement-note"><GoogleSubtitle text="This is a guided case study. These features are not executed by the simulator." /></p><div className="cisco-skill-tags">{task.skills.map(skill => <span key={skill}>{skill}</span>)}</div></aside></div>
  </section>;
  return <CcnaSimulationWorkspace pack={pack} persistKey={`cisco-learning:v1:${userId}:${task.id}`} lesson={lesson} backHref={overviewHref(task.id)} onComplete={complete} onProgress={recordChecks} learningLanguage="en" />;
}
