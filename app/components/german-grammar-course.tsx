"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Flag,
  Headphones, Languages, LockKeyhole, PenLine, RotateCcw, Save, Sparkles,
  Volume2, X,
} from "lucide-react";
import {
  grammarModules, zuInfinitivDictation, zuInfinitivLesson, zuInfinitivModule,
  zuInfinitivQuestions, zuInfinitivWritingTasks,
} from "@/lib/content/german-a1b2/index";
import {
  emptyCourseState, parseCourseState, type GrammarCourseState, type GrammarQuestion,
} from "@/lib/content/german-a1b2/types";

const MODULE_ID = "infinitiv-zu";
const QUESTION_IDS = zuInfinitivQuestions.map((question) => question.id);
const STORAGE_KEY = (userId: string) => `klybit-german-a1b2:v1:${userId}`;
const MAX_DRAFT = 4000;
type Tab = "learn" | "practice" | "writing" | "dictation" | "results";
type ResultFilter = "all" | "wrong" | "difficult" | "open";

const tabs: { id: Tab; label: string; fa: string }[] = [
  { id: "learn", label: "Lernen", fa: "آموزش" },
  { id: "practice", label: "Üben", fa: "تمرین" },
  { id: "writing", label: "Schreiben", fa: "نوشتن" },
  { id: "dictation", label: "Diktat", fa: "دیکته" },
  { id: "results", label: "Ergebnisse", fa: "نتیجه" },
];

const normalize = (value: string) => value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
const sameText = (left: string, right: string) => normalize(left) === normalize(right);

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return <div className="gg-stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function Explanation({ question, correct, chosen }: { question: GrammarQuestion; correct: boolean; chosen: number | null }) {
  const selectedText = chosen === null ? null : question.options[chosen];
  return <div className={`gg-feedback ${correct ? "is-correct" : "is-wrong"}`} role="status" aria-live="polite">
    <div className="gg-feedback-head">
      <strong>{correct ? "Richtig." : "Noch nicht."}</strong>
      <span>Lösung: <b lang="de" dir="ltr">{question.answer}</b></span>
    </div>
    {!correct && selectedText && <p className="gg-chosen" lang="fa" dir="rtl">پاسخ تو: <b lang="de" dir="ltr">{selectedText}</b> — این شکل در این جمله درست نیست.</p>}
    <section><h4>Grammatische Regel</h4><p lang="de" dir="ltr">{question.explanation.rule}</p></section>
    <section><h4>Begründung</h4><p lang="de" dir="ltr">{question.explanation.reason}</p></section>
    <section><h4>Satzanalyse</h4><p lang="de" dir="ltr">{question.explanation.analysis}</p></section>
    <section><h4>Wortstellung</h4><p lang="de" dir="ltr">{question.explanation.wordOrder}</p></section>
    <section><h4>Formen und Kasus</h4><p lang="de" dir="ltr">{question.explanation.forms}</p></section>
    <section className="gg-error"><h4>Fehleranalyse</h4><p lang="de" dir="ltr">{question.explanation.error}</p></section>
    <section><h4>Zwei neue Beispiele</h4><ul lang="de" dir="ltr">{question.explanation.examples.map((example) => <li key={example}>{example}</li>)}</ul></section>
    <section className="gg-fa-explanation" lang="fa" dir="rtl"><h4>توضیح فارسی</h4><p>{question.explanation.translationFa}</p></section>
  </div>;
}

export function GermanGrammarCourse({ userId }: { userId: string }) {
  const [state, setState] = useState<GrammarCourseState>(() => emptyCourseState(MODULE_ID));
  const stateRef = useRef(state);
  const dirtyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [serverMode, setServerMode] = useState<"checking" | "server" | "browser">("checking");
  const [saveStatus, setSaveStatus] = useState("Fortschritt wird geladen …");
  const [tab, setTab] = useState<Tab>("learn");
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [writingOpen, setWritingOpen] = useState<Record<string, boolean>>({});
  const [dictationChecked, setDictationChecked] = useState<Record<string, boolean>>({});
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioStatus, setAudioStatus] = useState("");

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      const key = STORAGE_KEY(userId);
      let local: GrammarCourseState | null = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw && raw.length < 400_000) local = parseCourseState(JSON.parse(raw), MODULE_ID, QUESTION_IDS);
      } catch { local = null; }
      if (local) { setState(local); if (Object.keys(local.answers).length || Object.keys(local.writing).length || Object.keys(local.dictation).length) setTab("practice"); }
      setReady(true);
      setSaveStatus(local ? "Lokaler Fortschritt geladen" : "Neuer Start");

      void fetch("/api/german-course", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as { state?: unknown; stored?: boolean };
        if (!live) return;
        setServerMode("server");
        const remote = parseCourseState(data.state, MODULE_ID, QUESTION_IDS);
        if (remote && data.stored && (!local || remote.updatedAt >= local.updatedAt)) {
          setState(remote);
          if (Object.keys(remote.answers).length || Object.keys(remote.writing).length || Object.keys(remote.dictation).length) setTab("practice");
          setSaveStatus("Vom Konto geladen");
        } else if (local) {
          setDirty(true);
          setSaveStatus("Lokaler Fortschritt wird synchronisiert");
        } else {
          setSaveStatus("Bereit · wird im Konto gespeichert");
        }
      }).catch(() => {
        if (!live) return;
        setServerMode("browser");
        setSaveStatus("Im Browser gespeichert · Server nicht erreichbar");
      }).finally(() => { if (live) setReady(true); });
    }, 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(state)); } catch { /* the server copy remains available */ }
  }, [state, ready, userId]);

  useEffect(() => {
    if (!ready || !dirty) return;
    const timer = window.setTimeout(async () => {
      const snapshot = stateRef.current;
      setSaveStatus("Speichert …");
      try {
        const response = await fetch("/api/german-course", {
          method: "PUT", headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: snapshot }),
        });
        if (!response.ok) throw new Error("unavailable");
        setServerMode("server");
        setSaveStatus("Gespeichert · Konto");
        if (stateRef.current.updatedAt === snapshot.updatedAt) setDirty(false);
      } catch {
        setServerMode("browser");
        setSaveStatus("Im Browser gespeichert · Server nicht erreichbar");
        if (stateRef.current.updatedAt === snapshot.updatedAt) setDirty(false);
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, dirty, ready]);

  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return;
      void fetch("/api/german-course", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: stateRef.current }), keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const update = () => setVoices(window.speechSynthesis.getVoices().filter((voice) => /^de(?:-|_)/i.test(voice.lang)));
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", update); window.speechSynthesis.cancel(); };
  }, []);

  const mutate = (updater: (current: GrammarCourseState) => GrammarCourseState) => {
    setState((current) => ({ ...updater(current), updatedAt: Date.now() }));
    setDirty(true);
  };

  const answeredCount = Object.keys(state.answers).length;
  const correctCount = zuInfinitivQuestions.filter((question) => state.answers[question.id] === question.correctIndex).length;
  const wrongIds = useMemo(() => zuInfinitivQuestions.filter((question) => state.answers[question.id] !== undefined && state.answers[question.id] !== question.correctIndex).map((question) => question.id), [state.answers]);
  const openCount = QUESTION_IDS.length - answeredCount;
  const score = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const completed = answeredCount === QUESTION_IDS.length;
  const progress = Math.round((answeredCount / QUESTION_IDS.length) * 100);

  const reviewing = reviewIds.length > 0;
  const activeQuestion = reviewing
    ? zuInfinitivQuestions.find((question) => question.id === reviewIds[reviewPos]) ?? zuInfinitivQuestions[0]
    : zuInfinitivQuestions[state.currentIndex] ?? zuInfinitivQuestions[0];
  const activeChoice = state.answers[activeQuestion.id];
  const activeAnswered = activeChoice !== undefined;
  const activeCorrect = activeAnswered && activeChoice === activeQuestion.correctIndex;
  const activeIndex = zuInfinitivQuestions.findIndex((question) => question.id === activeQuestion.id);
  const positionLabel = reviewing ? `${reviewPos + 1} / ${reviewIds.length}` : `${state.currentIndex + 1} / ${zuInfinitivQuestions.length}`;

  const selectAnswer = (index: number) => {
    if (activeAnswered) return;
    mutate((current) => ({ ...current, answers: { ...current.answers, [activeQuestion.id]: index } }));
  };
  const clearAnswer = () => {
    mutate((current) => {
      const answers = { ...current.answers };
      delete answers[activeQuestion.id];
      return { ...current, answers };
    });
  };
  const goNext = () => {
    if (reviewing) {
      if (reviewPos + 1 < reviewIds.length) { setReviewPos((value) => value + 1); return; }
      setReviewIds([]); setReviewPos(0); setTab("results"); return;
    }
    if (state.currentIndex + 1 < zuInfinitivQuestions.length) mutate((current) => ({ ...current, currentIndex: current.currentIndex + 1 }));
    else setTab("results");
  };
  const goPrevious = () => {
    if (reviewing) { setReviewPos((value) => Math.max(0, value - 1)); return; }
    mutate((current) => ({ ...current, currentIndex: Math.max(0, current.currentIndex - 1) }));
  };
  const goTo = (index: number) => {
    setReviewIds([]); setReviewPos(0);
    mutate((current) => ({ ...current, currentIndex: index }));
    setTab("practice");
  };
  const toggleDifficult = (id: string) => {
    mutate((current) => ({ ...current, difficult: current.difficult.includes(id) ? current.difficult.filter((item) => item !== id) : [...current.difficult, id] }));
  };
  const startReview = (ids: string[]) => {
    const next = Array.from(new Set(ids)).filter((id) => QUESTION_IDS.includes(id));
    if (!next.length) return;
    setReviewIds(next); setReviewPos(0); setTab("practice");
  };
  const stopReview = () => { setReviewIds([]); setReviewPos(0); };
  const resetModule = async () => {
    if (!window.confirm("Nur dieses Modul zurücksetzen? Alle 100 Antworten, schwierigen Markierungen und Schreibentwürfe werden gelöscht.")) return;
    try { localStorage.removeItem(STORAGE_KEY(userId)); } catch { /* local removal is best effort */ }
    setState(emptyCourseState(MODULE_ID)); setDirty(false); setReviewIds([]); setReviewPos(0); setTab("learn");
    setSaveStatus("Modul zurückgesetzt");
    try { await fetch("/api/german-course", { method: "DELETE" }); setSaveStatus("Modul zurückgesetzt · Konto"); }
    catch { setSaveStatus("Modul lokal zurückgesetzt · Server nicht erreichbar"); }
  };
  const updateWriting = (id: string, text: string) => mutate((current) => ({ ...current, writing: { ...current.writing, [id]: text.slice(0, MAX_DRAFT) } }));
  const updateDictation = (id: string, text: string) => mutate((current) => ({ ...current, dictation: { ...current.dictation, [id]: text.slice(0, MAX_DRAFT) } }));
  const speak = (text: string) => {
    if (!("speechSynthesis" in window) || !voices.length) { setAudioStatus("Keine deutsche Browserstimme verfügbar. Der Satz kann trotzdem geschrieben werden."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[0]; utterance.lang = "de-DE"; utterance.rate = 0.82;
    utterance.onerror = () => setAudioStatus("Audio nicht verfügbar. Nutze den Satz als Leseübung.");
    utterance.onend = () => setAudioStatus("Noch einmal hören, wenn nötig.");
    setAudioStatus("Deutsche Browserstimme spielt …");
    window.speechSynthesis.speak(utterance);
  };

  const resultQuestions = useMemo(() => zuInfinitivQuestions.filter((question) => {
    if (resultFilter === "wrong") return state.answers[question.id] !== undefined && state.answers[question.id] !== question.correctIndex;
    if (resultFilter === "difficult") return state.difficult.includes(question.id);
    if (resultFilter === "open") return state.answers[question.id] === undefined;
    return true;
  }), [resultFilter, state.answers, state.difficult]);

  const activeModule = zuInfinitivModule;
  const difficultQuestions = zuInfinitivQuestions.filter((question) => state.difficult.includes(question.id));

  return <div className="gg-course">
    <section className="gg-hero" aria-labelledby="gg-course-title">
      <div>
        <p className="gg-eyebrow">GRAMMATIK A1–B2 · MODUL {String(activeModule.number).padStart(2, "0")} VON 20</p>
        <h2 id="gg-course-title">Infinitiv mit zu</h2>
        <p className="gg-hero-de" lang="de" dir="ltr">{zuInfinitivLesson.introDe}</p>
        <p className="gg-hero-fa" lang="fa" dir="rtl">{zuInfinitivLesson.introFa}</p>
      </div>
      <div className="gg-hero-numbers" aria-label="Modulübersicht">
        <div><strong>100</strong><span>Fragen</span></div>
        <div><strong>5</strong><span>Themen</span></div>
        <div><strong>A1–B2</strong><span>Niveau</span></div>
      </div>
    </section>

    <div className="gg-tabs" role="tablist" aria-label="Modulbereiche">
      {tabs.map((item) => <button key={item.id} type="button" role="tab" id={`gg-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="gg-panel" onClick={() => setTab(item.id)}>
        <span>{item.label}</span><small lang="fa" dir="rtl">{item.fa}</small>
      </button>)}
    </div>

    <div className="gg-layout">
      <aside className="gg-modules" aria-label="20 Grammatikmodule">
        <div className="gg-side-heading"><h3><BookOpen size={16} />20 Module</h3><span>1 bereit</span></div>
        <p className="gg-module-note">Nur Modul 09 ist vollständig ausgearbeitet. Die übrigen Module bleiben sichtbar, sind aber noch nicht als Lerninhalt freigeschaltet.</p>
        {grammarModules.map((module) => <button key={module.id} type="button" disabled={module.status !== "ready"} aria-current={module.status === "ready" ? "step" : undefined} onClick={() => { if (module.status === "ready") setTab("practice"); }}>
          <span className="gg-module-number">{String(module.number).padStart(2, "0")}</span>
          <span className="gg-module-title"><b>{module.title}</b><small lang="fa" dir="rtl">{module.titleFa}</small></span>
          {module.status === "ready" ? <ChevronRight size={14} /> : <LockKeyhole size={13} />}
        </button>)}
      </aside>

      <main id="gg-panel" className="gg-main" role="tabpanel" aria-labelledby={`gg-tab-${tab}`}>
        {tab === "learn" && <section className="gg-lesson">
          <div className="gg-section-heading"><p className="gg-eyebrow">SCHRITT 1 · VERSTEHEN</p><h3>Die Regel in fünf Blickwinkeln</h3><p>Lies die deutschen Erklärungen. Die persische Zusammenfassung steht direkt darunter; die Fragen können danach ohne Hilfetext beantwortet werden.</p></div>
          {zuInfinitivLesson.sections.map((section, index) => <article key={section.titleDe} className="gg-lesson-card">
            <span className="gg-lesson-index">{String(index + 1).padStart(2, "0")}</span>
            <div><h4 lang="de" dir="ltr">{section.titleDe}</h4><p lang="de" dir="ltr">{section.bodyDe}</p><p className="gg-fa-copy" lang="fa" dir="rtl">{section.bodyFa}</p><ul lang="de" dir="ltr">{section.examples.map((example) => <li key={example}>{example}</li>)}</ul></div>
          </article>)}
          <div className="gg-callout"><CircleHelp size={18} /><div><strong>So wird bewertet</strong><p>Die Lösung erscheint erst nach deiner Auswahl. Richtig ist nur die Form, die im aktuellen Satz grammatisch und inhaltlich passt. Antworten, schwierige Markierungen und Entwürfe werden im Konto gespeichert; die Erklärung bleibt Teil jeder Frage.</p></div></div>
          <button type="button" className="gg-primary" onClick={() => setTab("practice")}><Sparkles size={16} />Mit Frage 1 beginnen</button>
        </section>}

        {tab === "practice" && <section className="gg-question" aria-labelledby="gg-question-title">
          <div className="gg-question-top">
            <div><p className="gg-eyebrow">{reviewing ? "WIEDERHOLUNG" : "SCHRITT 2 · ANWENDEN"}</p><h3 id="gg-question-title">Frage {positionLabel}</h3></div>
            <div className="gg-question-badges"><span className={`gg-level gg-level-${activeQuestion.level.toLowerCase()}`}>{activeQuestion.level}</span><span className="gg-difficulty" aria-label={`Schwierigkeit ${activeQuestion.difficulty} von 3`}>{[1, 2, 3].map((step) => <i key={step} className={step <= activeQuestion.difficulty ? "is-on" : ""} />)}</span></div>
          </div>
          <div className="gg-progress-line"><span style={{ width: `${progress}%` }} /></div>
          {reviewing && <div className="gg-review-banner"><Languages size={16} /><span>Wiederholung: {reviewIds.length} falsche oder markierte Fragen.</span><button type="button" onClick={stopReview}><X size={14} />Beenden</button></div>}
          <p className="gg-prompt" lang="de" dir="ltr">{activeQuestion.prompt}</p>
          <p className="gg-translation" lang="fa" dir="rtl">{activeQuestion.translationFa}</p>
          <div className="gg-options" role="group" aria-label="Vier Antwortmöglichkeiten">
            {activeQuestion.options.map((option, index) => {
              const isCorrectOption = activeAnswered && index === activeQuestion.correctIndex;
              const isWrongChoice = activeAnswered && index === activeChoice && !activeCorrect;
              return <button key={option} type="button" disabled={activeAnswered} aria-pressed={activeChoice === index} className={isCorrectOption ? "is-correct" : isWrongChoice ? "is-wrong" : activeAnswered ? "is-muted" : ""} onClick={() => selectAnswer(index)}>
                <span className="gg-option-letter">{String.fromCharCode(65 + index)}</span>
                <span lang="de" dir="ltr">{option}</span>
                {isCorrectOption && <Check size={17} aria-label="richtige Antwort" />}
                {isWrongChoice && <X size={17} aria-label="falsche Antwort" />}
              </button>;
            })}
          </div>
          {!activeAnswered && <p className="gg-hint">Wähle eine Antwort. Erst danach werden Lösung, deutsche Grammatikerklärung und persische Zusammenfassung sichtbar.</p>}
          {activeAnswered && <Explanation question={activeQuestion} correct={activeCorrect} chosen={activeChoice ?? null} />}
          <div className="gg-question-actions">
            <button type="button" onClick={goPrevious} disabled={reviewing ? reviewPos === 0 : state.currentIndex === 0}><ChevronLeft size={15} />Zurück</button>
            <button type="button" onClick={goNext}>{reviewing && reviewPos + 1 >= reviewIds.length ? "Wiederholung beenden" : "Weiter"}<ChevronRight size={15} /></button>
            {activeAnswered && <button type="button" onClick={clearAnswer}><RotateCcw size={14} />Antwort löschen</button>}
            <button type="button" className={state.difficult.includes(activeQuestion.id) ? "is-flagged" : ""} onClick={() => toggleDifficult(activeQuestion.id)}><Flag size={14} />{state.difficult.includes(activeQuestion.id) ? "Markiert" : "Schwierig"}</button>
            <span className="gg-question-index">Nr. {activeIndex + 1}</span>
          </div>
        </section>}

        {tab === "writing" && <section className="gg-writing">
          <div className="gg-section-heading"><p className="gg-eyebrow">SCHRITT 3 · SCHREIBEN</p><h3>Eigene Sätze mit zu + Infinitiv</h3><p>Schreibe zuerst selbst. Die Musterlösung und die Checkliste erscheinen erst auf Knopfdruck; es gibt keine automatische Freitextnote.</p></div>
          {zuInfinitivWritingTasks.map((task, index) => <article key={task.id} className="gg-writing-card">
            <div className="gg-writing-head"><span>{String(index + 1).padStart(2, "0")}</span><p lang="fa" dir="rtl">{task.promptFa}</p></div>
            <label htmlFor={`gg-write-${task.id}`}>Deine Antwort auf Deutsch</label>
            <textarea id={`gg-write-${task.id}`} lang="de" dir="ltr" value={state.writing[task.id] ?? ""} maxLength={MAX_DRAFT} onChange={(event) => updateWriting(task.id, event.target.value)} rows={3} placeholder="Schreibe deinen Satz …" />
            <div className="gg-writing-actions"><button type="button" onClick={() => setWritingOpen((current) => ({ ...current, [task.id]: !current[task.id] }))}>{writingOpen[task.id] ? "Musterlösung verbergen" : "Musterlösung zeigen"}</button><span>{(state.writing[task.id] ?? "").trim() ? `${(state.writing[task.id] ?? "").trim().split(/\s+/u).length} Wörter` : "Noch kein Entwurf"}</span></div>
            {writingOpen[task.id] && <div className="gg-model"><p className="gg-model-label">Musterlösung</p><p lang="de" dir="ltr">{task.model}</p><ul lang="fa" dir="rtl">{task.checklist.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          </article>)}
        </section>}

        {tab === "dictation" && <section className="gg-dictation">
          <div className="gg-section-heading"><p className="gg-eyebrow">SCHRITT 4 · HÖREN UND SCHREIBEN</p><h3>Diktat mit sechs Sätzen</h3><p>Höre den Satz, schreibe ihn und vergleiche erst danach. Die Browserstimme ist keine Aufnahme einer Muttersprachlerin; ohne deutsche Stimme bleibt der Satz als Leseübung nutzbar.</p></div>
          {zuInfinitivDictation.map((sentence, index) => {
            const draft = state.dictation[`d${index + 1}`] ?? "";
            const checked = dictationChecked[`d${index + 1}`] ?? false;
            const correct = checked && sameText(draft, sentence);
            return <article key={sentence} className={`gg-dictation-card${checked ? correct ? " is-correct" : " is-wrong" : ""}`}>
              <div className="gg-dictation-head"><span>{String(index + 1).padStart(2, "0")}</span><p>Diktat {index + 1}</p><button type="button" onClick={() => speak(sentence)} disabled={!voices.length}><Volume2 size={15} />Hören</button></div>
              <label htmlFor={`gg-dictation-${index}`}>Gehörten Satz schreiben</label>
              <textarea id={`gg-dictation-${index}`} lang="de" dir="ltr" value={draft} maxLength={MAX_DRAFT} onChange={(event) => updateDictation(`d${index + 1}`, event.target.value)} rows={2} placeholder="Schreibe den Satz …" />
              <div className="gg-dictation-actions"><button type="button" disabled={!draft.trim()} onClick={() => setDictationChecked((current) => ({ ...current, [`d${index + 1}`]: true }))}>Vergleichen</button><button type="button" onClick={() => { setDictationChecked((current) => ({ ...current, [`d${index + 1}`]: false })); updateDictation(`d${index + 1}`, ""); }}>Neu schreiben</button>{checked && <span className={correct ? "gg-ok" : "gg-no"}>{correct ? "Zeichen für Zeichen richtig." : "Noch nicht identisch."}</span>}</div>
              {checked && <div className="gg-dictation-model"><p>Musterlösung</p><p lang="de" dir="ltr">{sentence}</p></div>}
            </article>;
          })}
          <p className="gg-audio-status" role="status"><Headphones size={14} />{audioStatus || (voices.length ? `${voices.length} deutsche Browserstimme(n) verfügbar.` : "Keine deutsche Browserstimme gefunden; Diktat bleibt optional.")}</p>
        </section>}

        {tab === "results" && <section className="gg-results">
          <div className="gg-section-heading"><p className="gg-eyebrow">SCHRITT 5 · PRÜFEN</p><h3>Dein Modulstand</h3><p>{completed ? "Alle 100 Fragen sind beantwortet. Die Zusammenfassung zeigt deinen tatsächlichen Stand, keine geschätzte Note." : `Noch ${openCount} von 100 Fragen offen. Du kannst jederzeit unterbrechen; der Stand wird gespeichert.`}</p></div>
          <div className="gg-result-metrics"><Stat label="Beantwortet" value={`${answeredCount}/100`} /><Stat label="Richtig" value={correctCount} /><Stat label="Quote" value={`${score}%`} /><Stat label="Schwierig" value={state.difficult.length} /></div>
          {completed && <div className={`gg-completion ${score >= 80 ? "is-pass" : ""}`}><Award size={22} /><div><strong>{score >= 80 ? "Modul abgeschlossen · sicherer Stand" : "Modul abgeschlossen · weitere Wiederholung sinnvoll"}</strong><p>{score}% der beantworteten Fragen waren richtig. Das ist eine Lernstandsanzeige, kein Zertifikat und keine Prüfungsnote.</p></div></div>}
          <div className="gg-result-actions"><button type="button" className="gg-primary" onClick={() => startReview(wrongIds)} disabled={!wrongIds.length}><RotateCcw size={15} />Falsche üben ({wrongIds.length})</button><button type="button" onClick={() => startReview(state.difficult)} disabled={!state.difficult.length}><Flag size={15} />Markierte üben ({state.difficult.length})</button></div>
          <div className="gg-filters" role="group" aria-label="Ergebnisse filtern">
            {([["all", "Alle 100"], ["wrong", "Falsch"], ["difficult", "Schwierig"], ["open", "Offen"]] as [ResultFilter, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={resultFilter === id} onClick={() => setResultFilter(id)}>{label}</button>)}
          </div>
          <div className="gg-results-list">{resultQuestions.map((question) => {
            const answer = state.answers[question.id];
            const status = answer === undefined ? "open" : answer === question.correctIndex ? "correct" : "wrong";
            return <button key={question.id} type="button" className={`gg-result-row is-${status}`} onClick={() => goTo(zuInfinitivQuestions.findIndex((item) => item.id === question.id))}>
              <span className="gg-result-number">{String(zuInfinitivQuestions.findIndex((item) => item.id === question.id) + 1).padStart(3, "0")}</span>
              <span className="gg-result-copy"><b lang="de" dir="ltr">{question.prompt}</b><small>{question.level} · {question.explanation.rule}</small></span>
              <span className="gg-result-status">{status === "correct" ? "Richtig" : status === "wrong" ? "Falsch" : "Offen"}</span>
              {state.difficult.includes(question.id) && <Flag size={13} aria-label="schwierig markiert" />}
            </button>;
          })}</div>
        </section>}
      </main>

      <aside className="gg-side" aria-label="Fortschritt und Werkzeuge">
        <section className="gg-side-card">
          <div className="gg-side-heading"><h3><TargetIcon />Fortschritt</h3><span>{progress}%</span></div>
          <progress max={100} value={progress} aria-label="Beantwortete Fragen" />
          <div className="gg-side-stats"><span><b>{answeredCount}</b> beantwortet</span><span><b>{correctCount}</b> richtig</span><span><b>{wrongIds.length}</b> falsch</span><span><b>{openCount}</b> offen</span></div>
        </section>
        <section className="gg-side-card">
          <div className="gg-side-heading"><h3><Save size={15} />Speichern</h3><span className={`gg-sync ${serverMode}`}>{serverMode === "server" ? "Konto" : serverMode === "checking" ? "Prüft" : "Browser"}</span></div>
          <p className="gg-save-status" role="status">{saveStatus}</p>
          <p className="gg-side-note">Antworten und Entwürfe werden nach jeder Änderung automatisch gespeichert. Beim erneuten Öffnen wird die letzte Frage wiederhergestellt.</p>
        </section>
        <section className="gg-side-card">
          <div className="gg-side-heading"><h3><Flag size={15} />Wiederholen</h3><span>{wrongIds.length + state.difficult.length}</span></div>
          <button type="button" className="gg-side-action" disabled={!wrongIds.length} onClick={() => startReview(wrongIds)}><RotateCcw size={14} />Falsche Antworten ({wrongIds.length})</button>
          <button type="button" className="gg-side-action" disabled={!state.difficult.length} onClick={() => startReview(difficultQuestions.map((question) => question.id))}><Flag size={14} />Markierte Fragen ({state.difficult.length})</button>
          <p className="gg-side-note">Die Wiederholung nutzt dieselben Prüfungen wie das Modul. Eine richtige Wiederholung löscht die ursprüngliche Antwort nicht.</p>
        </section>
        <section className="gg-side-card">
          <div className="gg-side-heading"><h3><PenLine size={15} />Entwürfe</h3><span>{Object.values(state.writing).filter((text) => text.trim()).length + Object.values(state.dictation).filter((text) => text.trim()).length}</span></div>
          <p className="gg-side-note">Schreib- und Diktatentwürfe werden mitgespeichert. Sie werden nicht automatisch benotet.</p>
        </section>
        <button type="button" className="gg-reset" onClick={resetModule}><RotateCcw size={14} />Nur dieses Modul zurücksetzen</button>
      </aside>
    </div>
  </div>;
}

function TargetIcon() {
  return <span className="gg-target-icon" aria-hidden="true">◎</span>;
}
