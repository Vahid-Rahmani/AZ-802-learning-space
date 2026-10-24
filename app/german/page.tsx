"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Headphones, Languages, RotateCcw, Volume2 } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { copy } from "@/lib/course-data";
import { b1GrammarLessons, b1GrammarUnits } from "@/lib/content/german-b1-grammar";
import { germanLessons, germanUnits } from "@/lib/content/german-learning";
import { compareCharacters, compareTypedCharacters, createGermanProgress, getGermanSummary, MAX_GERMAN_INPUT, MAX_GERMAN_WRITING_INPUT, parseGermanProgress, recordGermanAttempt, updateGermanDraft, type GermanMode, type GermanProgress } from "@/lib/german-learning-engine";

const modes: { id: GermanMode; title: string; description: string }[] = [
  { id: "copy", title: "1 · Model", description: "Read the sentence, notice its grammar, then type it. This is practice, not an independent recall test." },
  { id: "dictation", title: "2 · Listen", description: "Listen and type what you hear. Audio uses an available German browser voice, not a recording of a native speaker." },
  { id: "recall", title: "3 · Recall", description: "Write from the meaning and grammar cue. Colours appear after checking, so they cannot give away the answer. Only a correct, unassisted first check advances recall." },
  { id: "writing", title: "4 · Write", description: "Use the pattern in a new IT situation. There is more than one correct answer; use the checklist to review your own writing." },
];
const normalized = (text: string) => text.normalize("NFC");

export default function GermanPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("");
  useEffect(() => {
    let live = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async response => {
      const data = response.ok ? await response.json() as { user?: { id?: unknown } } : null;
      if (live && typeof data?.user?.id === "string") setUserId(data.user.id);
    }).catch(() => undefined).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  const signOut = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return false;
    setUserId(null); setAccountOpen(false); return true;
  };
  if (loading) return <main className="study-app min-h-screen"><p className="p-8" role="status">Loading your learning account…</p></main>;
  if (!userId) return <main className="study-app min-h-screen"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;
  return <GoogleSubtitleProvider language={language}><main className="study-app german-app font-scale-content" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell german-shell">
      <aside className="app-sidebar"><AppBrand subtitle="Learn. Practice. Progress." /><SimpleNavigation active="german" items={[
        { key: "german", label: "German for IT", href: "/german", icon: <Languages size={18} /> },
        { key: "german-b1", label: "B1 Grammatik · 12 Themen", href: "/german/b1-grammar", icon: <BookOpen size={18} /> },
        { key: "grammar-cases", label: "SatzTat · پرونده‌های گرامر", href: "/german/grammar-cases", icon: <ChevronRight size={18} /> },
        { key: "satztat", label: "SatzTat · Network missions", href: "/german/satztat", icon: <ChevronRight size={18} /> },
        { key: "home", label: "Windows Server", href: "/", icon: <BookOpen size={18} /> },
        { key: "linux", label: "Linux practice", href: "/linux", icon: <ChevronRight size={18} /> },
      ]} /><div className="german-sidebar-note"><strong>B1 → B2 bridge · IT context</strong><p><GoogleSubtitle text="Remember a pattern. Use it in a new situation. Return when your review is due." /></p><p>{germanLessons.length} lessons · {germanUnits.length} units</p></div></aside>
      <section className="app-content german-content"><StudyHeader title="German for IT" course="Deutsch" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} /><GermanWorkspace key={userId} userId={userId} /></section>
    </div>{accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}

export function GermanWorkspace({ userId, variant = "it" }: { userId: string; variant?: "it" | "b1" }) {
  const courseLessons = variant === "b1" ? b1GrammarLessons : germanLessons;
  const courseUnits = variant === "b1" ? b1GrammarUnits : germanUnits;
  const courseLessonIds = courseLessons.map(item => item.id);
  const storageKey = `klybit-german:${variant}:v1:${userId}`;
  const [progress, setProgress] = useState<GermanProgress>(() => createGermanProgress(courseLessonIds));
  const [lessonId, setLessonId] = useState(courseLessonIds[0]);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading progress…");
  const [feedback, setFeedback] = useState("");
  const [hintUsed, setHintUsed] = useState(false);
  const [assistedIds, setAssistedIds] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [writingChecks, setWritingChecks] = useState<number[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioStatus, setAudioStatus] = useState("");
  const [listView, setListView] = useState<"all" | "due">("all");
  const [clock, setClock] = useState(Date.now);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const lesson = courseLessons.find(item => item.id === lessonId) ?? courseLessons[0];
  const current = progress.lessons[lesson.id];
  const mode = current.mode;
  const draft = current.draft;
  const answers = mode === "recall" ? [lesson.model, ...lesson.variants] : [lesson.model];
  const comparisonTarget = answers.find(answer => normalized(answer) === normalized(draft)) ?? lesson.model;
  const summary = getGermanSummary(progress, courseLessonIds, clock);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw && raw.length < 1000000 ? JSON.parse(raw) : null;
        const restored = parseGermanProgress(saved?.progress, courseLessonIds);
        if (restored) {
          setProgress(restored);
          if (courseLessonIds.includes(saved.lessonId)) setLessonId(saved.lessonId);
          if (Array.isArray(saved.assistedIds)) {
            const ids = saved.assistedIds.filter((id: unknown): id is string => typeof id === "string" && courseLessonIds.includes(id));
            setAssistedIds(ids); setHintUsed(ids.includes(saved.lessonId));
          }
          setSaveStatus("Saved practice resumed · this browser");
        } else setSaveStatus(raw ? "Invalid saved data · started fresh" : "Progress saves in this browser");
      } catch { setSaveStatus("Practice ready · saved data unavailable"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ progress, lessonId, assistedIds })); }
    catch { const timer = window.setTimeout(() => setSaveStatus("Unable to save · practice still works"), 0); return () => window.clearTimeout(timer); }
  }, [progress, lessonId, assistedIds, ready, storageKey]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter(voice => /^de(?:-|_)/i.test(voice.lang)));
    update(); window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", update); window.speechSynthesis.cancel(); };
  }, []);
  useEffect(() => {
    const tick = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(tick);
  }, []);
  const selectLesson = (id: string) => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setLessonId(id); setFeedback(""); setReveal(false); setHintUsed(assistedIds.includes(id)); setChecked(false); setWritingChecks([]); setAudioStatus("");
  };
  const switchMode = (next: GermanMode) => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setProgress(previous => updateGermanDraft(previous, lesson.id, next, ""));
    setAssistedIds(previous => previous.filter(id => id !== lesson.id));
    setFeedback(""); setReveal(false); setHintUsed(false); setChecked(false); setWritingChecks([]); setAudioStatus("");
  };
  const updateDraft = (text: string) => {
    setProgress(previous => updateGermanDraft(previous, lesson.id, mode, text.slice(0, mode === "writing" ? MAX_GERMAN_WRITING_INPUT : MAX_GERMAN_INPUT)));
    setFeedback(""); setReveal(false); setWritingChecks([]);
  };
  const markAssisted = () => {
    setHintUsed(true);
    setAssistedIds(previous => previous.includes(lesson.id) ? previous : [...previous, lesson.id]);
  };
  const checkAnswer = () => {
    if (composing.current || !draft.trim()) return;
    if (mode === "writing") {
      if (writingChecks.length !== lesson.writingChecklist.length) { setFeedback("Review every checklist item before recording your self-review."); return; }
      setProgress(previous => recordGermanAttempt(previous, lesson.id, { mode, correct: false, hintUsed: false, now: Date.now() }));
      setFeedback("Writing self-review recorded. This is not automatic grammar grading or proof of mastery.");
      return;
    }
    const correct = answers.some(answer => normalized(answer) === normalized(draft));
    setProgress(previous => recordGermanAttempt(previous, lesson.id, { mode, correct, hintUsed, now: Date.now() }));
    setChecked(true);
    if (mode === "recall") markAssisted();
    setClock(Date.now());
    if (correct) setFeedback(mode === "recall" && !hintUsed ? "Correct independent recall. Your review schedule is updated; repeat answers today do not advance another box." : "Correct practice. Use Recall without a hint on a later attempt to advance your review box.");
    else setFeedback("Not yet. Check spelling, capitals, umlauts, punctuation and verb position. You can correct your answer and try again.");
  };
  const showHint = () => { markAssisted(); setReveal(true); setFeedback("Model shown · this attempt counts as assisted practice, not independent recall."); };
  const listen = () => {
    if (!voices.length || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lesson.model);
    utterance.voice = voices[0]; utterance.lang = "de-DE"; utterance.rate = .85;
    utterance.onerror = () => setAudioStatus("Audio unavailable. Use Model or Recall instead.");
    utterance.onend = () => setAudioStatus("Listen again whenever you need.");
    setAudioStatus("Playing German browser voice…"); window.speechSynthesis.speak(utterance);
  };
  const insertLetter = (letter: string) => {
    const field = textarea.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? start;
    updateDraft(draft.slice(0, start) + letter + draft.slice(end));
    window.requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + letter.length, start + letter.length); });
  };
  const reset = () => {
    if (!window.confirm("Reset only your German practice in this browser? Review boxes and drafts will be cleared.")) return;
    setProgress(createGermanProgress(courseLessonIds)); setAssistedIds([]); selectLesson(courseLessonIds[0]); setHintUsed(false); setSaveStatus("German practice reset");
  };
  const due = courseLessons.filter(item => { const state = progress.lessons[item.id]; return state.dueAt !== null && state.dueAt <= clock; });
  const reviewed = summary.independentRecallLessons;
  const activeUnit = courseUnits.find(unit => unit.id === lesson.unitId)!;
  const nextLesson = courseLessons[courseLessons.findIndex(item => item.id === lesson.id) + 1];
  const typedCharacters = mode === "recall" && !checked ? Array.from(draft).map(character => ({ character, status: "neutral" })) : mode !== "writing" ? compareTypedCharacters(comparisonTarget, draft) : [];
  const mistakes = typedCharacters.filter(character => character.status === "incorrect").length;
  if (!ready) return <p role="status">Loading your saved German practice…</p>;
  return <div className="german-workspace">
    {variant === "it" && <><a className="german-game-entry" href="/german/grammar-cases" lang="fa" dir="rtl"><span className="german-game-mark" aria-hidden="true">S<span>✦</span></span><span><small>بازی جمله‌سازی · ۲۴ مأموریت در چهار فصل</small><strong>SatzTat · پرونده‌های گرامر</strong><span>موقعیت را بخوان، جمله بساز، اصلاح کن و مهارتت را در موقعیت تازه امتحان کن.</span></span><ArrowRight size={20} aria-hidden="true" /></a><a className="german-game-entry" href="/german/satztat"><span className="german-game-mark" aria-hidden="true">S<span>↗</span></span><span><small>INTERACTIVE NETWORK CASES · SEPARATE GAME</small><strong>SatzTat · Detect. Repair. Explain.</strong><span>Investigate a network incident, then write the German handover.</span></span><ArrowRight size={20} aria-hidden="true" /></a></>}
    <section className="german-intro"><div><p className="german-eyebrow">{variant === "b1" ? "B1 GRAMMATIK · 12 THEMEN" : "GERMAN FOR IT · B1 → B2 BRIDGE"}</p><h2><GoogleSubtitle text={variant === "b1" ? "German B1 grammar, step by step." : "From a sentence to a professional IT handover."} /></h2><p><GoogleSubtitle text={variant === "b1" ? "Learn each grammar topic with examples, dictation, recall and writing." : "Start with useful patterns. Progress to multi-sentence tickets, change reports and complete emails, with spaced recall and guided writing self-review."} /></p></div><div className="german-progress"><strong>{reviewed}/{courseLessons.length}</strong><span>lessons recalled independently</span><progress value={reviewed} max={courseLessons.length} aria-label="Lessons recalled independently" /></div></section>
    <div className="german-metrics"><div><span>Practice</span><strong>{summary.practicedLessons}<small>/{courseLessons.length} lessons</small></strong></div><div><span>Independent recall</span><strong>{summary.independentRecallPasses}<small>successful attempts</small></strong></div><div><span>Writing</span><strong>{summary.writingReviews}<small>self-reviews</small></strong></div><div><span>Due today</span><strong>{due.length}<small>+ {summary.newLessons} new</small></strong></div></div>
    <div className="german-toolbar"><span role="status">{saveStatus}</span><button type="button" onClick={() => { setListView("due"); if (due[0]) selectLesson(due[0].id); }}>Review due ({due.length})</button><button type="button" onClick={reset}><RotateCcw size={14} />Reset German practice</button></div>
    <div className="german-layout">
      <aside className="german-path" aria-label="German learning path"><div className="german-path-heading"><h3><BookOpen size={16} />Your path</h3><button type="button" onClick={() => setListView("all")}>All {courseLessons.length}</button></div>
        {listView === "due" && !due.length && <p className="german-empty">No reviews due. Choose All {courseLessons.length} to practise something new. New lessons are not overdue.</p>}
        {courseUnits.map(unit => { const lessons = (listView === "due" ? due : courseLessons).filter(item => item.unitId === unit.id); if (!lessons.length) return null; return <details key={unit.id} open={unit.id === lesson.unitId || listView === "due"}><summary><span>{unit.title}</span><small>{lessons.filter(item => progress.lessons[item.id].independentRecallCount > 0).length}/{lessons.length}</small></summary><p>{unit.description}</p>{lessons.map(item => <button type="button" key={item.id} aria-current={item.id === lesson.id ? "step" : undefined} onClick={() => selectLesson(item.id)}><span className="german-lesson-index">{progress.lessons[item.id].independentRecallCount > 0 ? <Check size={14} /> : item.id.slice(-3)}</span><span>{item.title}</span><ChevronRight size={13} /></button>)}</details>; })}
      </aside>
      <section className="german-practice" aria-label="German lesson"><div className="german-lesson-heading"><div><p className="german-eyebrow">{lesson.level ?? "B1"} · {activeUnit.title} · {lesson.id.slice(-3)}</p><h3>{lesson.title}</h3><p>{lesson.grammar}</p></div><span className="german-box">Box {current.box}/5</span></div>
        <div className="german-mode-tabs" role="tablist" aria-label="Exercise mode">{modes.map(item => <button type="button" key={item.id} role="tab" id={`german-tab-${item.id}`} aria-selected={mode === item.id} aria-controls="german-exercise" onClick={() => switchMode(item.id)}>{item.title}</button>)}</div>
        <div key={`${lesson.id}-${mode}`} id="german-exercise" role="tabpanel" aria-labelledby={`german-tab-${mode}`}><p className="german-mode-help"><GoogleSubtitle text={modes.find(item => item.id === mode)!.description} /></p><p className="german-scenario"><GoogleSubtitle text={lesson.scenario} /></p>
          {mode === "copy" && <div className="german-model notranslate" lang="de" translate="no" aria-label="German model sentence">{compareCharacters(comparisonTarget, draft).map((item, i) => <span key={i} className={`german-char-${item.status}`}>{item.character}</span>)}</div>}
          {mode === "dictation" && <div className="german-audio"><button type="button" disabled={!voices.length} onClick={listen}><Volume2 size={17} />Play German audio</button><span role="status">{audioStatus || (voices.length ? "Browser speech · German voice" : "No German voice available on this device. Use Model or Recall.")}</span></div>}
          {mode === "recall" && <div className="german-cue"><strong>Write in German</strong><p><GoogleSubtitle text={lesson.recallPrompt} /></p></div>}
          {mode === "writing" && <div className="german-cue"><strong>Your IT writing task</strong><p><GoogleSubtitle text={lesson.writingPrompt} /></p></div>}
          <form onSubmit={event => { event.preventDefault(); checkAnswer(); }}>
            <label htmlFor="german-answer">{mode === "writing" ? "Your German message" : "Type your German answer"}</label>
            <div className={`german-input-shell notranslate${mode === "writing" ? " german-free-writing" : ""}`} lang="de" translate="no">
              {mode !== "writing" && <div className="german-typed-overlay" aria-hidden="true">{typedCharacters.map((item, i) => <span key={i} className={`german-char-${item.status}`}>{item.character}</span>)}{draft.endsWith("\n") && <span> </span>}</div>}
              <textarea id="german-answer" ref={textarea} aria-describedby="german-input-help" value={draft} onChange={event => updateDraft(event.target.value)} onScroll={event => { const overlay = event.currentTarget.previousElementSibling; if (overlay) { overlay.scrollTop = event.currentTarget.scrollTop; overlay.scrollLeft = event.currentTarget.scrollLeft; } }} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} inputMode="text" maxLength={mode === "writing" ? MAX_GERMAN_WRITING_INPUT : MAX_GERMAN_INPUT} rows={4} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} />
            </div>
            <div className="german-special-keys" aria-label="German characters">{["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map(letter => <button type="button" key={letter} className="notranslate" translate="no" lang="de" onClick={() => insertLetter(letter)}>{letter}</button>)}</div>
            <p id="german-input-help" className="german-input-help">{mode === "writing" ? `${draft.trim() ? draft.trim().split(/\s+/u).length : 0} words · Suggested length is guidance, not a pass/fail rule. Review your message using the checklist below.` : mode === "recall" && !checked ? "Independent recall: colour feedback stays hidden until you check your answer." : `Green = correct · red + underline = incorrect · grey = not typed. ${mistakes} typed character errors. Capitals, punctuation and umlauts matter.`}</p>
            {mode === "writing" && <fieldset className="german-writing-checklist"><legend>Self-review · not automatic grading</legend>{lesson.writingChecklist.map((item, i) => <label key={item}><input type="checkbox" checked={writingChecks.includes(i)} onChange={event => setWritingChecks(previous => event.target.checked ? [...previous, i] : previous.filter(index => index !== i))} />{item}</label>)}</fieldset>}
            <div className="german-practice-actions"><button type="submit" className="german-primary" disabled={!draft.trim() || (mode === "writing" && writingChecks.length !== lesson.writingChecklist.length)}>{mode === "writing" ? "Record my self-review" : "Check answer"}<Check size={16} /></button>{mode !== "copy" && mode !== "writing" && <button type="button" onClick={showHint}>Show model · assisted</button>}{nextLesson && <button type="button" onClick={() => selectLesson(nextLesson.id)}>Next lesson<ArrowRight size={16} /></button>}</div>
          </form>
          {feedback && <p className="german-feedback" role="status">{feedback}</p>}
          {reveal && <p className="german-revealed notranslate" lang="de" translate="no">{lesson.model}</p>}
          <details className="german-explanation" onToggle={event => { if (event.currentTarget.open && (mode === "recall" || mode === "dictation")) markAssisted(); }}><summary>Meaning & grammar explanation · فارسی {mode === "recall" || mode === "dictation" ? "(assisted)" : ""}</summary><p lang="fa" dir="rtl" translate="no">{lesson.translationFa}</p><p lang="fa" dir="rtl" translate="no">{lesson.explanationFa}</p></details>
        </div>
      </section>
      <aside className="german-reference"><h3><Languages size={17} />Words in context</h3>{mode === "recall" && !reveal ? <p>Vocabulary examples stay hidden during recall. Choose Show model for assisted practice.</p> : lesson.vocabulary.map(word => <div key={word.term}><strong className="notranslate" lang="de" translate="no">{word.term}</strong><p lang="fa" dir="rtl" translate="no">{word.meaningFa}</p><p className="notranslate" lang="de" translate="no">{word.example}</p></div>)}<div className="german-review-note"><h4>Next review</h4><p>{current.dueAt === null ? "New · first independent recall not recorded" : new Date(current.dueAt).toLocaleDateString()}</p><p>Unassisted recall attempts: {current.independentRecallCount}</p><p>Intervals: 1, 3, 7, 14, 30 days. A starting schedule, not a universal optimum.</p><p><Headphones size={14} />Dictation is optional when German speech is unavailable.</p></div><details><summary>What progress means</summary><p>Recall counts remembered lesson phrases, not proof of vocabulary or grammar mastery. Writing counts your own checklist reviews. No exam coverage or certificate is claimed.</p></details></aside>
    </div>
  </div>;
}
