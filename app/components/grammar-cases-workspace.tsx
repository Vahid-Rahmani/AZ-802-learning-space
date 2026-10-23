"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronLeft, Clock3, FolderSearch, Lightbulb, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { grammarMissions, grammarChapters, grammarDiagnostic, grammarFinal, grammarSkills, type GrammarPrompt, type GrammarSkill } from "@/lib/content/grammar-cases";
import { applyGrammarAction, createGrammarProgress, parseGrammarProgress, grammarSummary, grammarModel, grammarAnswers, grammarHints, missionUnlocked, finalUnlocked, workPassed, eligibleSelfReview, MAX_GRAMMAR_INPUT, type GrammarProgress, type GrammarAction, type Work } from "@/lib/grammar-case-engine";

type View = "welcome" | "diagnostic" | "map" | "practice" | "errors" | "progress" | "final";
function German({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span lang="de" dir="ltr" translate="no" className={`notranslate gc-de ${className}`}>{children}</span>;
}
function CaseIllustration({ chapter }: { chapter: number }) {
  return <svg viewBox="0 0 330 170" fill="none" className="gc-illustration" aria-hidden="true">
    <circle cx="242" cy="74" r="68" fill="currentColor" opacity=".06" /><path d="M26 142H307M47 150H283" stroke="currentColor" opacity=".2" strokeLinecap="round" />
    <rect x="65" y="38" width="153" height="102" rx="16" fill="var(--cp-surface)" stroke="currentColor" strokeWidth="2" />
    <path d="M82 38V23H150L163 38" stroke="currentColor" strokeWidth="2" /><path d="M88 66H164M88 81H181M88 97H145" stroke="currentColor" opacity=".4" strokeWidth="5" strokeLinecap="round" />
    <circle cx="214" cy="108" r="30" fill="var(--cp-surface)" stroke="currentColor" strokeWidth="4" /><path d="M235 131L258 154" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
    <text x="213" y="118" textAnchor="middle" fontSize="28" fill="currentColor" fontFamily="sans-serif">{chapter}</text>
    <path d="M262 33V49M254 41H270M38 81V93M32 87H44" stroke="currentColor" opacity=".5" strokeWidth="3" strokeLinecap="round" />
  </svg>;
}
export function GrammarCasesWorkspace({ userId }: { userId: string }) {
  const storageKey = `klybit-grammar-cases:v1:${userId}`;
  const [progress, setProgress] = useState<GrammarProgress>(createGrammarProgress);
  const [view, setView] = useState<View>("welcome");
  const [missionId, setMissionId] = useState("01");
  const [phase, setPhase] = useState<"main" | "transfer" | "review">("main");
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [clock, setClock] = useState(Date.now);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [demo, setDemo] = useState<number | null>(null);
  const [support, setSupport] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw && raw.length < 2_000_000 ? JSON.parse(raw) : null;
      const restored = parseGrammarProgress(saved?.progress);
      if (restored) {
        setProgress(restored);
        if (missionUnlocked(restored, saved.missionId)) setMissionId(saved.missionId);
        if (saved.phase === "review" && restored.missions[saved.missionId]?.reviewStarted) setPhase("review");
        else if (saved.phase === "transfer" && restored.missions[saved.missionId] && workPassed(restored.missions[saved.missionId].main)) setPhase("transfer");
        setView(restored.diagnosticAt === null ? "diagnostic" : saved.view === "practice" && missionUnlocked(restored, saved.missionId) ? "practice" : "map");
      } else if (raw) setStorageMessage("ذخیرهٔ قبلی قابل‌خواندن نبود؛ شروع تازه آماده است.");
    } catch (error) { setStorageMessage(error instanceof SyntaxError ? "ذخیرهٔ قبلی قابل‌خواندن نبود؛ شروع تازه آماده است." : "ذخیره‌سازی در دسترس نیست؛ می‌توانی تمرین کنی ولی پیشرفت ممکن است نماند."); }
    setReady(true);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ progress, missionId, phase, view })); }
    catch { setStorageMessage("ذخیره انجام نشد؛ تمرین هنوز کار می‌کند. از پیشرفت خروجی بگیر."); }
  }, [storageKey, progress, missionId, phase, view, ready]);
  useEffect(() => {
    const refresh = () => setClock(Date.now());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const dispatch = (action: GrammarAction) => { const now = Date.now(); setClock(now); setProgress(p => applyGrammarAction(p, action, now)); };
  const summary = grammarSummary(progress, clock);
  const mission = grammarMissions.find(m => m.id === missionId) ?? grammarMissions[0];
  const evidence = progress.missions[mission.id];
  const openMission = (id: string) => {
    if (!missionUnlocked(progress, id)) return;
    setMissionId(id); setPhase(progress.missions[id].reviewStarted ? "review" : workPassed(progress.missions[id].main) ? "transfer" : "main"); setView("practice");
  };
  const startReview = (id: string) => { dispatch({ type: "start-review", id }); setMissionId(id); setPhase("review"); setView("practice"); };
  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ progress, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "klybit-grammar-cases.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!ready) return <div className="gc-workspace" lang="fa" dir="rtl"><p role="status">در حال بازیابی پیشرفت…</p></div>;
  return <div className="gc-workspace" lang="fa" dir="rtl">
    <div className="gc-topline"><span><FolderSearch size={16} /> پرونده‌های گرامر <small>Konjunktiv II · گذشته</small></span><span>{summary.completed} / ۲۴ مأموریت</span></div>
    <nav className="gc-nav" aria-label="بخش‌های پرونده‌های گرامر">{([
      ["welcome", "شروع"], ["map", "نقشهٔ مأموریت‌ها"], ["errors", "پروندهٔ خطاها"], ["progress", "شواهد پیشرفت"], ["final", "آزمون پایانی"],
    ] as [View, string][]).map(([id, title]) => <button key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}>{title}{id === "map" && summary.due.length > 0 ? <b>{summary.due.length}</b> : null}</button>)}</nav>
    {storageMessage && <p role="status" className="gc-notice">{storageMessage}</p>}
    {view === "welcome" && <>
      <section className="gc-hero"><div><p className="gc-kicker">۲۴ پرونده؛ یک مهارت واقعی</p><h2>اگر آن روز…</h2><p>دربارهٔ اتفاقی که نیفتاده جمله بساز، سرنخ را بررسی کن و در یک موقعیت تازه دوباره امتحانش کن. اینجا کلیک‌کردن جای یادگیری را نمی‌گیرد.</p><button className="gc-primary" onClick={() => setView(progress.diagnosticAt === null ? "diagnostic" : "map")}>{progress.diagnosticAt === null ? "شروع با ارزیابی کوتاه" : "ادامهٔ پرونده‌ها"}<ArrowLeft size={16} /></button><small>بدون جان، تایمر یا رقابت اجباری · مناسب آشنایان با مبانی آلمانی</small></div><CaseIllustration chapter={1} /></section>
      <section className="gc-panel gc-demo"><p className="gc-kicker">یک نمونهٔ تعاملی · جزو امتیاز نیست</p><h3>قطار دیروز را از دست داده‌ام. کدام جمله دربارهٔ گذشتهٔ خلاف واقع است؟</h3>{["Wenn ich Zeit habe, komme ich.", "Wenn ich Zeit hätte, käme ich.", "Wenn ich Zeit gehabt hätte, wäre ich gekommen."].map((s, i) => <button key={s} onClick={() => setDemo(i)} aria-pressed={demo === i}><German>{s}</German></button>)}{demo !== null && <p role="status">{demo === 2 ? "درست: شرطی دربارهٔ گذشته‌ای است که اتفاق نیفتاده." : demo === 0 ? "این جمله دربارهٔ شرط واقعی حال یا آینده است؛ با گذشتهٔ داستان سازگار نیست." : "این جمله شرط فرضی حال را بیان می‌کند؛ برای گذشته به Partizip II و hätte/wäre نیاز داریم."}</p>}</section>
      <p className="gc-muted">هدف این دوره تمرین یک خانوادهٔ دستوری است، نه وعدهٔ C1 یا تسلط صددرصدی. ارزیابی محلی و محدود است؛ جملهٔ ناشناخته «نیازمند بررسی» می‌ماند.</p>
    </>}
    {view === "diagnostic" && <section className="gc-panel"><p className="gc-kicker">پیش از بازکردن پرونده‌ها</p><h2>چه چیزهایی از قبل بلدی؟</h2><p>چهار سؤال کوتاه؛ پاسخ نخست ذخیره می‌شود. این آزمون تشخیصی است، نه رتبه‌بندی.</p>{grammarDiagnostic.map((q, index) => <fieldset className="gc-question" key={q.id}><legend>{index + 1}. {q.question}</legend>{q.options.map((s, i) => <button key={s} type="button" disabled={q.id in progress.diagnostic} aria-pressed={progress.diagnostic[q.id] === i} onClick={() => dispatch({ type: "diagnostic", id: q.id, choice: i })}><German>{s}</German></button>)}</fieldset>)}{progress.diagnosticAt !== null && <><DiagnosticSupport progress={progress} open={support} onToggle={() => setSupport(v => !v)} /><button className="gc-primary" onClick={() => setView("map")}>بازکردن فصل اول <ArrowLeft size={16} /></button></>}</section>}
    {view === "map" && <>
      <div className="gc-heading"><div><p className="gc-kicker">کم‌کم و با شواهد</p><h2>نقشهٔ پرونده‌ها</h2><p>هر مأموریت دو موقعیت دارد. پایان داستان با تأیید مستقل زبان یکی نیست.</p></div><span className="gc-seal">{summary.completed}<small>پرونده بسته‌شده</small></span></div>
      {progress.diagnosticAt === null ? <div className="gc-panel"><p>ابتدا ارزیابی کوتاه را انجام بده تا مسیر کمکی مناسب مشخص شود.</p><button className="gc-primary" onClick={() => setView("diagnostic")}>ارزیابی اولیه</button></div> : <DiagnosticSupport progress={progress} open={support} onToggle={() => setSupport(v => !v)} />}
      {summary.due.length > 0 && <section className="gc-panel gc-due"><h3><Clock3 size={18} /> مرورهای آماده</h3>{summary.due.map(id => <button key={id} onClick={() => startReview(id)}>مرور {grammarMissions.find(m => m.id === id)?.title}<ArrowLeft size={15} /></button>)}</section>}
      <div className="gc-chapters">{grammarChapters.map(chapter => <section className="gc-chapter" key={chapter.id}><header><span className="gc-chapter-number">۰{chapter.id}</span><div><small>{chapter.subtitle}</small><h3>{chapter.title}</h3><p>{chapter.description}</p></div></header><ol>{grammarMissions.filter(m => m.chapter === chapter.id).map(m => { const current = progress.missions[m.id], unlocked = missionUnlocked(progress, m.id); return <li key={m.id}><button disabled={!unlocked} onClick={() => openMission(m.id)}><span className={`gc-case-number ${current.completedAt !== null ? "is-done" : ""}`}>{current.completedAt !== null ? <Check size={16} /> : unlocked ? m.id : <LockKeyhole size={14} />}</span><span>{m.title}<small>{current.completedAt !== null ? current.transfer.selfReviewed || current.main.selfReviewed ? "داستان تمام؛ بخشی خودبررسی شده" : "دو پاسخ پشتیبانی‌شده ثبت شد" : unlocked ? "آمادهٔ ادامه" : "پس از پروندهٔ قبل"}</small></span><ChevronLeft size={15} /></button></li>; })}</ol></section>)}</div>
    </>}
    {view === "practice" && <div className="gc-practice-layout"><aside className="gc-case-context"><button className="gc-back" onClick={() => setView("map")}>نقشهٔ پرونده‌ها <ArrowLeft size={14} /></button><CaseIllustration chapter={mission.chapter} /><p className="gc-kicker">پرونده {mission.id} · فصل {mission.chapter}</p><h2>{mission.title}</h2><p>{grammarSkills[mission.skill]}</p><ol className="gc-stages"><li data-done={workPassed(evidence.main)}>۱. ساختن و اصلاح جمله</li><li data-done={workPassed(evidence.transfer)}>۲. کاربرد در موقعیت تازه</li><li data-done={evidence.reviews.some(a => a.result.status === "verified" && !a.helped)}>۳. مرور در روزهای بعد</li></ol><small>پایان داستان مسیر را باز می‌کند؛ فقط پاسخ ارزیابی‌شده در آمار زبانی می‌آید.</small></aside>
      <section className="gc-panel gc-practice">
        {phase === "review" && !evidence.reviewStarted ? <div className="gc-complete" role="status"><Check /><h3>مرور ثبت شد</h3><p>زمان مرور بعدی: {evidence.dueAt && new Date(evidence.dueAt).toLocaleDateString("fa-IR")}</p><button onClick={() => setView("map")}>بازگشت به نقشه</button></div> : <PromptEditor key={`${mission.id}-${phase}`} prompt={phase === "main" ? mission.main : mission.transfer} work={evidence[phase]} phase={phase} dispatch={action => dispatch({ ...action, id: mission.id, phase })} chapter={mission.chapter} />}
        {phase !== "review" && workPassed(evidence[phase]) && <div className="gc-complete" role="status"><Sparkles size={22} /><h3>{evidence[phase].selfReviewed ? "خودبررسی ثبت شد؛ تأیید خودکار زبان نداریم" : "پاسخ تأیید شد؛ قدم بعدی آماده است"}</h3>{phase === "main" ? <button className="gc-primary" onClick={() => setPhase("transfer")}>حالا در موقعیتی تازه <ArrowLeft size={16} /></button> : <><p>مرور اول حدود یک روز بعد آماده می‌شود. این زمان‌ها تنظیم اولیه‌اند، نه فرمول علمی قطعی.</p><button className="gc-primary" onClick={() => { const next = grammarMissions.find(m => Number(m.id) === Number(mission.id) + 1); if (next) openMission(next.id); else setView("final"); }}>{mission.id === "24" ? "آزمون پایانی" : "پروندهٔ بعد"}<ArrowLeft size={16} /></button><button onClick={() => setView("map")}>فعلاً همین‌جا توقف می‌کنم</button></>}</div>}
      </section></div>}
    {view === "errors" && <ErrorDossiers progress={progress} openMission={openMission} />}
    {view === "progress" && <ProgressEvidence progress={progress} now={clock} />}
    {view === "final" && <FinalAssessment key={progress.finalFinishedAt ?? "active"} progress={progress} dispatch={dispatch} />}
    <footer className="gc-footer"><span>پیشرفت در همین مرورگر و برای همین حساب ذخیره می‌شود؛ همگام‌سازی ابری ندارد.</span><div><button onClick={exportProgress}>خروجی پیشرفت</button><button onClick={() => setResetConfirm(true)}><RotateCcw size={13} /> شروع دوباره</button></div></footer>
    {resetConfirm && <div className="gc-confirm" role="alertdialog" aria-label="تأیید پاک‌کردن پیشرفت"><p>فقط پیشرفت «پرونده‌های گرامر» این حساب پاک شود؟ درس‌ها و بازی شبکه تغییر نمی‌کنند.</p><button onClick={() => setResetConfirm(false)}>انصراف</button><button onClick={() => { setProgress(createGrammarProgress()); setMissionId("01"); setPhase("main"); setView("welcome"); setResetConfirm(false); }}>بله، فقط این بخش پاک شود</button></div>}
  </div>;
}

function DiagnosticSupport({ progress, open, onToggle }: { progress: GrammarProgress; open: boolean; onToggle: () => void }) {
  const weak = grammarDiagnostic.filter(q => progress.diagnostic[q.id] !== q.correct);
  const [checked, setChecked] = useState<number[]>([]);
  return <section className="gc-panel gc-support"><h3>نتیجهٔ شروع: {grammarDiagnostic.length - weak.length} از ۴</h3><p>{weak.length ? "پیش از ادامه، این پل کوتاه را مرور کن. نتیجهٔ اولیه دست‌نخورده می‌ماند." : "مبانی این نمونه‌ها را می‌شناسی؛ کاربرد مستقل را در مأموریت‌ها بررسی می‌کنیم."}</p><button onClick={onToggle} aria-expanded={open}>{open ? "بستن پل آموزشی" : "پل کوتاه Perfekt و wenn"}</button>{open && <div><p>برای روایت گذشتهٔ واقعی، Perfekt می‌سازیم: <German>Ich bin gefahren. Ich habe gelernt.</German> برای گذشتهٔ خلاف واقع: <German>Wenn ich gefahren wäre, hätte ich …</German></p><p>بعد از <German>wenn</German> فعل کمکی به انتها می‌رود؛ جملهٔ اصلی پس از ویرگول با فعل شروع می‌شود. این آموزش است، نه امتیاز مستقل.</p>{grammarDiagnostic.map(q => <p key={q.id}>{q.explanation}</p>)}<h4>دو تمرین کمکی بدون نمره</h4>{["Ich ___ gestern angekommen. → bin", "Wenn ich Zeit ___, komme ich. → habe"].map((s, i) => <div key={s}><German>{s.split(" → ")[0]}</German> <button onClick={() => setChecked(v => v.includes(i) ? v : [...v, i])}>پاسخ و دلیل {i + 1}</button>{checked.includes(i) && <p><German>{s.split(" → ")[1]}</German> — {i === 0 ? "ankommen در این معنای حرکت با sein می‌آید." : "فعل habe در انتهای جملهٔ wenn قرار دارد."}</p>}</div>)}</div>}</section>;
}

function PromptEditor({ prompt, work, phase, dispatch, chapter }: {
  prompt: GrammarPrompt; work: Work; phase: "main" | "transfer" | "review"; chapter: number;
  dispatch: (a: { type: "hint" | "model" | "submit" | "self-review" } | { type: "draft"; text: string }) => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null), composing = useRef(false);
  const [checks, setChecks] = useState<number[]>([]);
  const last = work.attempts.at(-1), currentResult = last?.answer === work.draft ? last.result : undefined;
  const passed = workPassed(work) && phase !== "review";
  const target = grammarAnswers(prompt).find(s => s === work.draft) ?? grammarModel(prompt);
  const insert = (character: string) => {
    const node = input.current; if (!node) return;
    const start = node.selectionStart, end = node.selectionEnd;
    dispatch({ type: "draft", text: work.draft.slice(0, start) + character + work.draft.slice(end) });
    node.focus(); requestAnimationFrame(() => node.setSelectionRange(start + 1, start + 1));
  };
  return <div className="gc-editor"><p className="gc-kicker">{phase === "main" ? "۱ · موقعیت و هدف" : phase === "transfer" ? "۲ · انتقال به موقعیت تازه" : "یادآوری با فاصله · موقعیت آشنای دوم"}</p><h3>{prompt.situation}</h3><div className="gc-goal">{prompt.goal}</div><p className="gc-muted">{chapter < 4 ? "واژه‌های کمکی: " : "موضوع و واژه‌های کلیدی: "}<German>{prompt.cues}</German></p>
    <form onSubmit={e => { e.preventDefault(); if (!composing.current && !passed) dispatch({ type: "submit" }); }}>
      <label htmlFor="gc-answer">جملهٔ تو به آلمانی</label><textarea id="gc-answer" ref={input} lang="de" dir="ltr" translate="no" className="notranslate" value={work.draft} maxLength={MAX_GRAMMAR_INPUT} autoCapitalize="sentences" autoComplete="off" spellCheck={false} disabled={passed} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={e => { setChecks([]); dispatch({ type: "draft", text: e.target.value }); }} placeholder="Wenn …" aria-describedby="gc-evaluation-limit" />
      <div className="gc-input-tools"><div className="gc-umlauts" dir="ltr">{["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map(s => <button key={s} type="button" disabled={passed} onClick={() => insert(s)} aria-label={`درج ${s}`} translate="no">{s}</button>)}</div><small>{work.draft.length}/{MAX_GRAMMAR_INPUT}</small></div>
      <div className="gc-actions"><button className="gc-primary" type="submit" disabled={!work.draft.trim() || passed}>بررسی جمله <Check size={16} /></button><button type="button" disabled={passed || work.hints >= 3} onClick={() => dispatch({ type: "hint" })}><Lightbulb size={15} />{work.hints >= 3 ? "همهٔ سرنخ‌ها باز شد" : work.hints ? "سرنخ بیشتر" : chapter === 1 && phase === "main" ? "کشف ساختار با راهنما" : "یک سرنخ"}</button>{work.attempts.length >= 2 && !passed && <button type="button" onClick={() => dispatch({ type: "model" })}>دیدن نمونه و توضیح</button>}</div>
    </form>
    {work.hints > 0 && <aside className="gc-hint" role="status"><strong>سرنخ {work.hints}</strong><p>{grammarHints[currentResult?.code ?? prompt.skill][Math.min(1, work.hints - 1)]}</p>{work.hints >= 3 && <p>شرط را از نتیجه جدا بنویس و سپس وصل کن: <German>Wenn + Subjekt + … + Partizip II + hätte/wäre, hätte/wäre + Subjekt + … + Partizip II.</German> واژه‌ها: <German>{prompt.cues}</German></p>}<small>دریافت کمک ثبت شد؛ پاسخ بعدی مستقل شمرده نمی‌شود.</small></aside>}
    {currentResult && <div className={`gc-feedback is-${currentResult.status}`} role="status"><strong>{currentResult.status === "verified" ? "ساختار و معنا تأیید شد" : currentResult.status === "error" ? "فرصت اصلاح" : "ارزیابی قطعی نداریم"}</strong><p>{currentResult.message}</p><div className="gc-evidence-tags"><span>معنا: {currentResult.meaning === "matched" ? "سازگار" : currentResult.meaning === "mismatch" ? "ناسازگار" : "نامشخص"}</span><span>ساختار: {currentResult.grammar === "matched" ? "تأیید" : currentResult.grammar === "needs-work" ? "نیازمند اصلاح" : "نامشخص"}</span><span>طبیعی‌بودن: ارزیابی نشده</span></div>{currentResult.status === "error" && <p>خودت جمله را اصلاح کن و دوباره بررسی بزن؛ لازم نیست اول پاسخ نمونه را ببینی.</p>}</div>}
    {work.modelSeen && <aside className="gc-model"><strong>یک پاسخ معتبر؛ نه تنها پاسخ ممکن</strong><p><German>{grammarModel(prompt)}</German></p><p>شرط: <German>{prompt.condition}</German>؛ نتیجه: <German>{prompt.consequence}</German>. فعل کمکی در انتهای بخش <German>wenn</German> و ابتدای جملهٔ اصلی است.</p><small>این نمونه دیده شده؛ کپی آن موفقیت مستقل نیست. رنگ‌ها فقط تفاوت با همین نمونه‌اند، نه داوری گرامر.</small><div className="gc-char-compare" lang="de" dir="ltr" translate="no" aria-label="مقایسهٔ نوشتاری با نمونه">{Array.from(work.draft).map((s, i) => <span key={i} className={s === Array.from(target)[i] ? "gc-char-ok" : "gc-char-diff"}>{s}</span>)}</div>
      {phase !== "review" && currentResult?.status === "uncertain" && <div className="gc-self-review"><p>اگر بیان متفاوتی داری، خودت این سه مورد را بررسی کن. ادامهٔ داستان ممکن است، ولی تأیید زبانی خودکار ثبت نمی‌شود.</p>{["جمله با معنای داستان و گذشتهٔ خلاف واقع سازگار است.", "Partizip II و hätte/wäre را برای هر دو فعل بررسی کردم.", "جایگاه فعل و فاعل هر دو بخش را با ساختار مقایسه کردم."].map((s, i) => <label key={s}><input type="checkbox" checked={checks.includes(i)} onChange={e => setChecks(v => e.target.checked ? [...v, i] : v.filter(x => x !== i))} />{s}</label>)}<button disabled={checks.length !== 3 || !eligibleSelfReview(work.draft)} onClick={() => dispatch({ type: "self-review" })}>ثبت خودبررسی و ادامهٔ داستان</button></div>}
    </aside>}
    <p id="gc-evaluation-limit" className="gc-fineprint">ارزیابی محلی با چند صورت جمله و خطاهای مشخص انجام می‌شود؛ تحلیل آزاد هوش مصنوعی نیست. متن خالی امتیاز ندارد؛ بیان ناشناخته غلط فرض نمی‌شود.</p>
  </div>;
}

function ErrorDossiers({ progress, openMission }: { progress: GrammarProgress; openMission: (id: string) => void }) {
  const errors = grammarMissions.flatMap(m => ["main", "transfer", "review"].flatMap(phase => progress.missions[m.id][phase as "main"].attempts.filter(a => a.result.code).map(a => ({ id: m.id, title: m.title, ...a }))));
  const groups = Object.entries(grammarSkills).map(([skill, label]) => ({ skill: skill as GrammarSkill, label, items: errors.filter(e => e.result.code === skill) })).filter(g => g.items.length);
  const uncertain = grammarMissions.flatMap(m => [m.main, m.transfer].flatMap((q, index) => progress.missions[m.id][index ? "transfer" : "main"].attempts.filter(a => a.result.status === "uncertain").slice(-1).map(a => ({ title: m.title, ...a }))));
  return <section className="gc-panel"><p className="gc-kicker">سرنخ از پاسخ‌های خودت</p><h2>پروندهٔ خطاها</h2><p>فقط خطاهای قابل‌شناسایی دسته‌بندی می‌شوند. بیان نامطمئن خطای قطعی نیست.</p>{!groups.length && <p className="gc-empty">هنوز خطای پشتیبانی‌شده‌ای ثبت نشده است.</p>}{groups.map(g => <article className="gc-error-card" key={g.skill}><h3>{g.label} <small>{g.items.length} بار</small></h3><p>{grammarHints[g.skill][0]}</p>{g.items.slice(-2).map((e, i) => <blockquote key={i}><German>{e.answer}</German><small>{e.title}</small></blockquote>)}<button onClick={() => openMission(g.items.at(-1)!.id)}>بازکردن تمرین مرتبط</button></article>)}{uncertain.length > 0 && <details><summary>{uncertain.length} بیان نیازمند بررسی؛ نه الزاماً غلط</summary>{uncertain.map((a, i) => <p key={i}><strong>{a.title}</strong><br /><German>{a.answer}</German></p>)}</details>}</section>;
}

function ProgressEvidence({ progress, now }: { progress: GrammarProgress; now: number }) {
  const s = grammarSummary(progress, now);
  return <section><div className="gc-heading"><div><p className="gc-kicker">داستان با یادگیری یکی نیست</p><h2>شواهد پیشرفت</h2><p>این اعداد فقط عملکرد ثبت‌شده در همین نمونه‌ها را نشان می‌دهند، نه تسلط کلی بر زبان.</p></div><span className="gc-seal">{s.storyPoints}<small>امتیاز داستانی</small></span></div><div className="gc-metrics">{[[s.firstTry, "درستی در تلاش اول", "از ۴۸ موقعیت تمرینی"], [s.independent, "پاسخ اول بدون کمک", "پاسخ پشتیبانی‌شده در تمرین"], [s.assisted, "موفقیت با کمک یا تلاش دوباره", "از شواهد مستقل جداست"], [s.selfCorrected, "خوداصلاحی", "بدون دیدن نمونه"], [s.transfer, "انتقال بی‌کمک", "از ۲۴ موقعیت دوم"], [s.delayed, "مرور تأخیری بی‌کمک", "از ۲۴ پرونده"]].map(([count, label, detail]) => <div key={String(label)}><strong>{count}</strong><span>{label}</span><small>{detail}</small></div>)}</div><section className="gc-panel"><h3>سابقهٔ شروع و پایان</h3><p>ارزیابی اولیه: {progress.diagnosticAt === null ? "هنوز انجام نشده" : `${grammarDiagnostic.filter(q => progress.diagnostic[q.id] === q.correct).length} از ۴ سؤال انتخابی`}</p><p>آزمون پایان: {progress.finalFinishedAt === null ? "هنوز کامل نشده" : `${Object.values(progress.final).filter(a => a.result.status === "verified").length} از ۶ پاسخ در محدوده تأیید شد`}</p><p>آزمون شروع انتخابی و آزمون پایان تولیدی‌اند؛ اختلاف نمرهٔ آن‌ها اندازهٔ علمی رشد نیست.</p><p>{s.selfReviewed} پاسخ با خودبررسی ادامه پیدا کرده؛ به آمار تأیید خودکار افزوده نشده است.</p></section><div className="gc-table-wrap"><table><caption>شواهد هر مهارت</caption><thead><tr><th>مهارت</th><th>تلاش‌ها</th><th>پاسخ مستقل</th><th>موفقیت با کمک</th><th>مرور مستقل</th><th>وضعیت</th></tr></thead><tbody>{Object.entries(grammarSkills).map(([skill, label]) => { const entries = grammarMissions.filter(m => m.skill === skill).map(m => progress.missions[m.id]), works = entries.flatMap(e => [e.main, e.transfer]), attempts = works.flatMap(w => w.attempts), independent = works.filter(w => w.attempts[0]?.result.status === "verified" && !w.attempts[0].helped).length, delayed = entries.filter(e => e.reviews.some(a => a.result.status === "verified" && !a.helped)).length; return <tr key={skill}><th>{label}</th><td>{attempts.length}</td><td>{independent}</td><td>{works.filter(w => w.attempts.some(a => a.helped && a.result.status === "verified")).length}</td><td>{delayed}</td><td>{delayed ? "در مرور تأخیری تأیید شد" : independent ? "کاربرد مستقل مشاهده شد" : "در حال یادگیری"}</td></tr>; })}</tbody></table></div><section className="gc-panel"><h3>تقویم مرور</h3><p>فاصله‌های اولیه حدود ۱، ۳، ۷ و ۱۴ روزند. مرور با کمک، فاصله را دوباره کوتاه می‌کند؛ تمرین ناموفق شواهد موفق قدیمی را پاک نمی‌کند.</p>{grammarMissions.filter(m => progress.missions[m.id].dueAt !== null).map(m => <p key={m.id}>{m.title} — {new Date(progress.missions[m.id].dueAt!).toLocaleDateString("fa-IR")}</p>)}{s.completed === 0 && <p>بعد از پایان اولین پرونده، زمان مرور اینجا ظاهر می‌شود.</p>}</section></section>;
}

function FinalAssessment({ progress, dispatch }: { progress: GrammarProgress; dispatch: (a: GrammarAction) => void }) {
  const composing = useRef(false);
  const q = grammarFinal.find(q => !progress.final[q.id]);
  if (!finalUnlocked(progress)) return <section className="gc-panel gc-empty"><LockKeyhole /><h2>آزمون پایانی هنوز باز نشده</h2><p>ابتدا دو موقعیت هر ۲۴ پرونده را به پایان برسان. ادامه با خودبررسی ممکن است، ولی خودبررسی نمرهٔ مستقل نیست.</p></section>;
  if (progress.finalFinishedAt !== null) return <section className="gc-panel"><h2>آزمون پایانی ثبت شد</h2><p>{Object.values(progress.final).filter(a => a.result.status === "verified").length} از ۶ پاسخ در محدودهٔ ارزیابی تأیید شد؛ این نتیجه وعدهٔ تسلط نیست. تلاش نخست حفظ شده و آزمون دوباره به‌عنوان سؤال ندیده ثبت نمی‌شود.</p>{grammarFinal.map(q => <article className="gc-error-card" key={q.id}><h3>{q.situation}</h3><p>پاسخ تو: <German>{progress.final[q.id].answer}</German></p><p>{progress.final[q.id].result.message}</p><p>یک نمونه: <German>{grammarModel(q)}</German></p></article>)}</section>;
  if (!progress.finalStarted) return <section className="gc-panel"><p className="gc-kicker">موقعیت‌های نگه‌داشته‌شده برای پایان</p><h2>شش سؤال تازه، بدون سرنخ</h2><p>اولین پاسخ هر سؤال قفل می‌شود. جواب‌ها تا پایان شش سؤال نمایش داده نمی‌شوند. زمان‌سنج اجباری نداریم؛ می‌توانی بعداً ادامه بدهی.</p><button className="gc-primary" onClick={() => dispatch({ type: "start-final" })}>شروع آزمون انتقال</button></section>;
  if (!q) return null;
  return <section className="gc-panel gc-final"><p className="gc-kicker">آزمون پایانی · سؤال {Object.keys(progress.final).length + 1} از ۶</p><h2>{q.situation}</h2><p>{q.goal}</p><p>واژه‌های موضوع: <German>{q.cues}</German></p><form onSubmit={e => { e.preventDefault(); if (composing.current) return; dispatch({ type: "final-answer", id: q.id, text: progress.finalDraft }); }}><label htmlFor="gc-final-answer">پاسخ آلمانی؛ فقط تلاش اول ثبت می‌شود</label><textarea id="gc-final-answer" value={progress.finalDraft} maxLength={MAX_GRAMMAR_INPUT} lang="de" dir="ltr" translate="no" spellCheck={false} autoComplete="off" onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onChange={e => dispatch({ type: "final-draft", text: e.target.value })} /><button className="gc-primary" disabled={!progress.finalDraft.trim()} type="submit">ثبت و سؤال بعدی</button></form><p className="gc-muted">در این آزمون بازخورد، سرنخ و نمونه تا پایان نمایش داده نمی‌شوند. ارزیابی همچنان محلی و محدود است.</p></section>;
}
