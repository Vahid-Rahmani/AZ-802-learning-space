"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Headphones, Languages, RotateCcw, Volume2 } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { copy } from "@/lib/course-data";
import { b1GrammarLessons, b1GrammarQuestions, b1GrammarUnits, type B1GrammarQuestion } from "@/lib/content/german-b1-grammar";
import { germanLessons, germanUnits } from "@/lib/content/german-learning";
import { compareCharacters, compareTypedCharacters, createGermanProgress, getGermanSummary, MAX_GERMAN_INPUT, MAX_GERMAN_WRITING_INPUT, parseGermanProgress, recordGermanAttempt, updateGermanDraft, type GermanMode, type GermanProgress } from "@/lib/german-learning-engine";

const modes: { id: GermanMode; title: string; description: string }[] = [
  { id: "copy", title: "1 · Model", description: "Read the sentence, notice its grammar, then type it. This is practice, not an independent recall test." },
  { id: "dictation", title: "2 · Listen", description: "Listen and type what you hear. Audio uses an available German browser voice, not a recording of a native speaker." },
  { id: "recall", title: "3 · Recall", description: "Write from the meaning and grammar cue. Colours appear after checking, so they cannot give away the answer. Only a correct, unassisted first check advances recall." },
  { id: "writing", title: "4 · Write", description: "Use the pattern in a new IT situation. There is more than one correct answer; use the checklist to review your own writing." },
];
const normalized = (text: string) => text.normalize("NFC");

const TEST_SIZE = 12;
const PASS_MARK = 80;

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const normalizeAnswer = (text: string) => text.normalize("NFC").trim().replace(/\s+/g, " ").replace(/[.,!?;:]/g, "").toLocaleLowerCase("de-DE");

const formatLabels: Record<string, string> = {
  choice: "چندگزینه‌ای",
  fill: "جای خالی",
  fix: "اصلاح اشتباه",
  order: "جمله‌سازی",
};

const formatInstructions: Record<string, string> = {
  choice: "جواب صحیح را انتخاب کن.",
  fill: "پاسخ درست را در جای خالی بنویس.",
  fix: "این جمله اشتباه است؛ جملهٔ درست را انتخاب کن.",
  order: "کلمه‌های به‌هم‌ریخته را به جملهٔ درست تبدیل کن.",
};

function B1GrammarQuiz({ questions, unitId, topicTotal, userId, onMistake, onCorrect }: {
  questions: B1GrammarQuestion[];
  unitId: string;
  topicTotal?: number;
  userId: string;
  onMistake: (id: string) => void;
  onCorrect: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [testQuestions, setTestQuestions] = useState<B1GrammarQuestion[]>([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testChoice, setTestChoice] = useState<number | null>(null);
  const [testTyped, setTestTyped] = useState("");
  const [testAnswers, setTestAnswers] = useState<boolean[]>([]);
  const [testDone, setTestDone] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const bestKey = `klybit-german-b1-test:v1:${userId}:${unitId}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = Number(window.localStorage.getItem(bestKey));
      if (Number.isFinite(stored) && stored >= 0 && stored <= 100) setBest(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bestKey]);

  if (!questions.length) return null;
  const question = questions[index] ?? questions[0];
  const isTyped = question.format === "fill" || question.format === "order";
  const answered = isTyped ? submitted : choice !== null;
  const correct = answered && (isTyped ? normalizeAnswer(typed) === normalizeAnswer(question.answer) : choice === question.correctIndex);
  const choose = (option: number) => {
    if (isTyped || submitted) return;
    setChoice(option);
    if (option === question.correctIndex) onCorrect(question.id);
    else onMistake(question.id);
  };
  const submitFill = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!isTyped || !typed.trim() || submitted) return;
    setSubmitted(true);
    if (normalizeAnswer(typed) === normalizeAnswer(question.answer)) onCorrect(question.id);
    else onMistake(question.id);
  };
  const next = () => { setIndex(value => (value + 1) % questions.length); setChoice(null); setTyped(""); setSubmitted(false); };

  const startTest = () => {
    setTestQuestions(shuffled(questions).slice(0, Math.min(TEST_SIZE, questions.length)));
    setTestIndex(0); setTestChoice(null); setTestTyped(""); setTestAnswers([]); setTestDone(false); setMode("test");
  };
  const recordTestAnswer = () => {
    const current = testQuestions[testIndex];
    if (!current) return;
    const currentIsTyped = current.format === "fill" || current.format === "order";
    if (currentIsTyped ? !testTyped.trim() : testChoice === null) return;
    const isCorrect = currentIsTyped ? normalizeAnswer(testTyped) === normalizeAnswer(current.answer) : testChoice === current.correctIndex;
    const answers = [...testAnswers, isCorrect];
    setTestAnswers(answers);
    if (testIndex + 1 < testQuestions.length) {
      setTestIndex(testIndex + 1); setTestChoice(null); setTestTyped(""); return;
    }
    const right = answers.filter(Boolean).length;
    const score = Math.round((right / testQuestions.length) * 100);
    testQuestions.forEach((item, i) => { if (answers[i]) onCorrect(item.id); else onMistake(item.id); });
    setTestDone(true);
    if (best === null || score > best) {
      setBest(score);
      try { window.localStorage.setItem(bestKey, String(score)); } catch { /* the test still works without a saved best score */ }
    }
  };

  if (mode === "test") {
    const right = testAnswers.filter(Boolean).length;
    const score = testQuestions.length ? Math.round((right / testQuestions.length) * 100) : 0;
    const wrong = testQuestions.filter((_, i) => !testAnswers[i]);
    const current = testQuestions[testIndex];
    return <section className="german-grammar-quiz german-grammar-test" lang="fa" dir="rtl" aria-labelledby="b1-grammar-test-title">
      <p className="german-eyebrow">بخش ۳ · آزمون درس · حد قبولی {PASS_MARK}٪ {best === null ? "" : `· بهترین نتیجه: ${best}٪`}</p>
      {testDone ? <div className="german-test-result" role="status">
        <h3 id="b1-grammar-test-title">{score}٪ — {score >= PASS_MARK ? "قبول" : "نیاز به تمرین بیشتر"}</h3>
        <p>{right} از {testQuestions.length} پاسخ درست بود. {score >= PASS_MARK ? "این مبحث را می‌توانی جلو ببری." : `برای قبولی به ${PASS_MARK}٪ نیاز داری؛ اشتباه‌ها را بخوان و دوباره امتحان کن.`}</p>
        {wrong.length > 0 && <details open className="german-test-wrong"><summary>اشتباه‌ها ({wrong.length})</summary>{wrong.map(item => <div key={item.id}><p className="notranslate" lang="de" dir="ltr" translate="no">{item.prompt}</p><p>{item.translationFa}</p><p><strong>پاسخ درست:</strong> <span className="notranslate" lang="de" dir="ltr" translate="no">{item.answer}</span></p><p>{item.explanationFa}</p></div>)}</details>}
        <div className="german-test-actions"><button type="button" className="german-primary" onClick={startTest}>تلاش دوباره با سؤال‌های تازه</button><button type="button" onClick={() => setMode("practice")}>بازگشت به تمرین</button></div>
      </div> : <>
        <h3 id="b1-grammar-test-title">سؤال {testIndex + 1} از {testQuestions.length} — {current ? formatInstructions[current.format] : "پاسخ را انتخاب کن."}</h3>
        <p className="german-quiz-prompt notranslate" lang="de" dir="ltr" translate="no">{current?.prompt}</p>
        <p>{current?.translationFa}</p>
        {current?.format === "fill" || current?.format === "order" ? <form className="german-fill-form" onSubmit={event => { event.preventDefault(); recordTestAnswer(); }}>
          <label htmlFor="b1-test-fill">پاسخ خود را به آلمانی بنویس</label>
          <input id="b1-test-fill" className="notranslate" lang="de" dir="ltr" translate="no" value={testTyped} onChange={event => setTestTyped(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
          <button type="submit" className="german-primary" disabled={!testTyped.trim()}>{testIndex + 1 === testQuestions.length ? "پایان و دیدن نتیجه" : "ثبت پاسخ"}</button>
        </form> : <>
          <div className="german-grammar-options" role="group" aria-label="German grammar choices">
            {current?.options.map((option, i) => <button type="button" key={option} aria-pressed={testChoice === i} onClick={() => setTestChoice(i)}><span>{String.fromCharCode(65 + i)})</span><span className="notranslate" lang="de" dir="ltr" translate="no">{option}</span></button>)}
          </div>
          <div className="german-test-actions"><button type="button" className="german-primary" disabled={testChoice === null} onClick={recordTestAnswer}>{testIndex + 1 === testQuestions.length ? "پایان و دیدن نتیجه" : "سؤال بعدی"} <ChevronRight size={14} /></button><button type="button" onClick={() => setMode("practice")}>انصراف</button></div>
        </>}
        <p className="german-test-note">در آزمون بازخورد هر سؤال تا پایان نمایش داده نمی‌شود.</p>
      </>}
    </section>;
  }

  return <section className="german-grammar-quiz" lang="fa" dir="rtl" aria-labelledby="b1-grammar-quiz-title">
    <p className="german-eyebrow">بخش ۲ · {formatLabels[question.format]} · {questions.length} سؤال{topicTotal && topicTotal !== questions.length ? ` از ${topicTotal} سؤال این مبحث` : ""}</p>
    <h3 id="b1-grammar-quiz-title">تمرین {index + 1} از {questions.length} — {formatInstructions[question.format]}</h3>
    <p className="german-quiz-prompt notranslate" lang="de" dir="ltr" translate="no">{question.prompt}</p>
    <p>{question.translationFa}</p>
    {isTyped ? <form className="german-fill-form" onSubmit={submitFill}>
      <label htmlFor="b1-fill-answer">پاسخ خود را به آلمانی بنویس</label>
      <input id="b1-fill-answer" className="notranslate" lang="de" dir="ltr" translate="no" value={typed} onChange={event => setTyped(event.target.value)} disabled={submitted} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      <button type="submit" className="german-primary" disabled={!typed.trim() || submitted}>ثبت پاسخ</button>
    </form> : <div className="german-grammar-options" role="group" aria-label="German grammar choices">
      {question.options.map((option, optionIndex) => <button type="button" key={option} aria-pressed={choice === optionIndex} onClick={() => choose(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)})</span><span className="notranslate" lang="de" dir="ltr" translate="no">{option}</span></button>)}
    </div>}
    {answered && <div className={`german-feedback${correct ? "" : " german-quiz-wrong"}`} role="status">
      <p><strong>{correct ? "درست!" : "بررسی جواب:"}</strong> {question.explanationFa}</p>
      {!correct && <p className="german-correct-answer">پاسخ درست: <span className="notranslate" lang="de" dir="ltr" translate="no">{question.answer}</span></p>}
      <button type="button" className="german-grammar-next" onClick={next}>سؤال بعدی <ChevronRight size={14} /></button>
    </div>}
    {!answered && !isTyped && <p className="german-quiz-hint">پس از انتخاب گزینه، پاسخ درست و توضیح نمایش داده می‌شود.</p>}
    <div className="german-test-actions"><button type="button" onClick={startTest}>آزمون این درس · {Math.min(TEST_SIZE, questions.length)} سؤال{best === null ? "" : ` · بهترین ${best}٪`}</button></div>
  </section>;
}

function B1MistakeReview({ questions, onResult, onClose }: {
  questions: B1GrammarQuestion[];
  onResult: (id: string, correct: boolean) => void;
  onClose: () => void;
}) {
  const [queue] = useState(questions);
  const [position, setPosition] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fixed, setFixed] = useState(0);
  const question = queue[position];
  if (!question) return null;
  const isTyped = question.format === "fill" || question.format === "order";
  const answered = isTyped ? submitted : choice !== null;
  const correct = answered && (isTyped ? normalizeAnswer(typed) === normalizeAnswer(question.answer) : choice === question.correctIndex);
  const next = () => {
    if (!answered) return;
    onResult(question.id, correct);
    if (correct) setFixed(value => value + 1);
    setChoice(null); setTyped(""); setSubmitted(false);
    if (position + 1 >= queue.length) { onClose(); return; }
    setPosition(position + 1);
  };
  return <section className="german-grammar-quiz german-mistake-review" lang="fa" dir="rtl" aria-labelledby="b1-mistake-title">
    <p className="german-eyebrow">مرور اشتباه‌ها · {position + 1} از {queue.length} · {fixed} اصلاح‌شده</p>
    <h3 id="b1-mistake-title">این سؤال را قبلاً اشتباه زده‌ای. دوباره امتحان کن.</h3>
    <p className="german-quiz-prompt notranslate" lang="de" dir="ltr" translate="no">{question.prompt}</p>
    <p>{question.translationFa}</p>
    {isTyped ? <form className="german-fill-form" onSubmit={event => { event.preventDefault(); if (typed.trim()) setSubmitted(true); }}>
      <label htmlFor="b1-review-fill">پاسخ خود را به آلمانی بنویس</label>
      <input id="b1-review-fill" className="notranslate" lang="de" dir="ltr" translate="no" value={typed} onChange={event => setTyped(event.target.value)} disabled={submitted} autoComplete="off" autoCapitalize="none" spellCheck={false} />
      <button type="submit" className="german-primary" disabled={!typed.trim() || submitted}>ثبت پاسخ</button>
    </form> : <div className="german-grammar-options" role="group" aria-label="German grammar choices">
      {question.options.map((option, optionIndex) => <button type="button" key={option} aria-pressed={choice === optionIndex} onClick={() => setChoice(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)})</span><span className="notranslate" lang="de" dir="ltr" translate="no">{option}</span></button>)}
    </div>}
    {answered && <div className={`german-feedback${correct ? "" : " german-quiz-wrong"}`} role="status">
      <p><strong>{correct ? "درست! این سؤال از صف حذف شد." : "هنوز نه:"}</strong> {question.explanationFa}</p>
      {!correct && <p className="german-correct-answer">پاسخ درست: <span className="notranslate" lang="de" dir="ltr" translate="no">{question.answer}</span></p>}
      <button type="button" className="german-grammar-next" onClick={next}>{position + 1 >= queue.length ? "پایان مرور" : "سؤال بعدی"} <ChevronRight size={14} /></button>
    </div>}
    <div className="german-test-actions"><button type="button" onClick={onClose}>بستن مرور</button></div>
  </section>;
}

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
        { key: "german-grammatik", label: "Grammatik A1–B2 · 20 Module", href: "/german/grammatik", icon: <Languages size={18} /> },
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
  // Keep the original key for German for IT so existing progress still loads;
  // the standalone B1 route gets its own namespace.
  const storageKey = variant === "b1" ? `klybit-german:b1:v1:${userId}` : `klybit-german:v1:${userId}`;
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
  const [quizMistakes, setQuizMistakes] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
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
          if (variant === "b1" && Array.isArray(saved.mistakes)) {
            setQuizMistakes(saved.mistakes.filter((id: unknown): id is string => typeof id === "string" && b1GrammarQuestions.some(item => item.id === id)));
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
    try { localStorage.setItem(storageKey, JSON.stringify({ progress, lessonId, assistedIds, ...(variant === "b1" ? { mistakes: quizMistakes } : {}) })); }
    catch { const timer = window.setTimeout(() => setSaveStatus("Unable to save · practice still works"), 0); return () => window.clearTimeout(timer); }
  }, [progress, lessonId, assistedIds, quizMistakes, ready, storageKey, variant]);
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
    window.setTimeout(() => setClock(Date.now()), 0);
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
  const markMistake = (id: string) => setQuizMistakes(previous => previous.includes(id) ? previous : [...previous, id]);
  const clearMistake = (id: string) => {
    setQuizMistakes(previous => previous.filter(item => item !== id));
    if (quizMistakes.length === 1 && quizMistakes[0] === id) setReviewOpen(false);
  };
  const reviewMistake = (id: string, correct: boolean) => correct ? clearMistake(id) : markMistake(id);
  const reset = () => {
    if (!window.confirm("Reset only your German practice in this browser? Review boxes, drafts and quiz mistakes will be cleared.")) return;
    setProgress(createGermanProgress(courseLessonIds)); setAssistedIds([]); setQuizMistakes([]); setReviewOpen(false); selectLesson(courseLessonIds[0]); setHintUsed(false); setSaveStatus("German practice reset");
  };
  const due = courseLessons.filter(item => { const state = progress.lessons[item.id]; return state.dueAt !== null && state.dueAt <= clock; });
  const reviewed = summary.independentRecallLessons;
  const activeUnit = courseUnits.find(unit => unit.id === lesson.unitId)!;
  const unitQuizQuestions = b1GrammarQuestions.filter(item => item.unitId === lesson.unitId);
  const unitLessons = courseLessons.filter(item => item.unitId === lesson.unitId);
  const lessonPosition = Math.max(0, unitLessons.findIndex(item => item.id === lesson.id));
  const slotQuestions = unitQuizQuestions.filter(item => item.lessonSlot === lessonPosition);
  const perLesson = Math.ceil(unitQuizQuestions.length / Math.max(1, unitLessons.length));
  const quizQuestions = slotQuestions.length ? slotQuestions : unitQuizQuestions.slice(lessonPosition * perLesson, (lessonPosition + 1) * perLesson);
  const nextLesson = courseLessons[courseLessons.findIndex(item => item.id === lesson.id) + 1];
  const typedCharacters = mode === "recall" && !checked ? Array.from(draft).map(character => ({ character, status: "neutral" })) : mode !== "writing" ? compareTypedCharacters(comparisonTarget, draft) : [];
  const mistakes = typedCharacters.filter(character => character.status === "incorrect").length;
  if (!ready) return <p role="status">Loading your saved German practice…</p>;
  return <div className="german-workspace">
    {variant === "it" && <><a className="german-game-entry" href="/german/grammar-cases" lang="fa" dir="rtl"><span className="german-game-mark" aria-hidden="true">S<span>✦</span></span><span><small>بازی جمله‌سازی · ۲۴ مأموریت در چهار فصل</small><strong>SatzTat · پرونده‌های گرامر</strong><span>موقعیت را بخوان، جمله بساز، اصلاح کن و مهارتت را در موقعیت تازه امتحان کن.</span></span><ArrowRight size={20} aria-hidden="true" /></a><a className="german-game-entry" href="/german/satztat"><span className="german-game-mark" aria-hidden="true">S<span>↗</span></span><span><small>INTERACTIVE NETWORK CASES · SEPARATE GAME</small><strong>SatzTat · Detect. Repair. Explain.</strong><span>Investigate a network incident, then write the German handover.</span></span><ArrowRight size={20} aria-hidden="true" /></a></>}
    {variant !== "b1" && <section className="german-intro"><div><p className="german-eyebrow">GERMAN FOR IT · B1 → B2 BRIDGE</p><h2><GoogleSubtitle text="From a sentence to a professional IT handover." /></h2><p><GoogleSubtitle text="Start with useful patterns. Progress to multi-sentence tickets, change reports and complete emails, with spaced recall and guided writing self-review." /></p></div><div className="german-progress"><strong>{reviewed}/{courseLessons.length}</strong><span>lessons recalled independently</span><progress value={reviewed} max={courseLessons.length} aria-label="Lessons recalled independently" /></div></section>}
    {variant === "b1" && <><section className="german-cue german-b1-teaching" lang="fa" dir="rtl"><strong>بخش ۱ · آموزش فارسی</strong><p>{lesson.translationFa}</p><p>{lesson.explanationFa}</p></section><B1GrammarQuiz key={lesson.id} questions={quizQuestions} unitId={`${lesson.unitId}:${lesson.id}`} topicTotal={unitQuizQuestions.length} userId={userId} onMistake={markMistake} onCorrect={clearMistake} />{reviewOpen && <B1MistakeReview questions={b1GrammarQuestions.filter(item => quizMistakes.includes(item.id))} onResult={reviewMistake} onClose={() => setReviewOpen(false)} />}</>}
    <div className="german-metrics"><div><span>Practice</span><strong>{summary.practicedLessons}<small>/{courseLessons.length} lessons</small></strong></div><div><span>Independent recall</span><strong>{summary.independentRecallPasses}<small>successful attempts</small></strong></div><div><span>Writing</span><strong>{summary.writingReviews}<small>self-reviews</small></strong></div><div><span>Due today</span><strong>{due.length}<small>+ {summary.newLessons} new</small></strong></div></div>
    <div className="german-toolbar"><span role="status">{saveStatus}</span>{variant === "b1" && <button type="button" disabled={!quizMistakes.length} onClick={() => setReviewOpen(true)}>مرور اشتباهات ({quizMistakes.length})</button>}<button type="button" onClick={() => { setListView("due"); if (due[0]) selectLesson(due[0].id); }}>Review due ({due.length})</button><button type="button" onClick={reset}><RotateCcw size={14} />Reset German practice</button></div>
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
