"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { LearningLabPath } from "@/app/components/windows-server-labs";
import { dockerLabs } from "@/lib/content/docker";
import { LearningStart, PracticeHub, SimpleNavigation } from "@/app/components/simple-learning";
import { copy } from "@/lib/course-data";

export default function DockerPage() {
  const [view, setView] = useState<"home" | "learning" | "practice" | "exams" | "questions" | "labs">("home");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1.1);
  const [language, setLanguage] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      const result = response.ok ? await response.json() as { user?: { id?: string } } : null;
      if (alive && result?.user?.id) setUserId(result.user.id);
    }).catch(() => undefined).finally(() => { if (alive) setLoading(false); });
    void Promise.resolve().then(() => {
      try {
        const preferences = JSON.parse(localStorage.getItem("certpath-docker-reading") ?? "{}");
        if (typeof preferences.fontScale === "number" && Number.isFinite(preferences.fontScale)) setFontScale(Math.max(.85, Math.min(1.3, preferences.fontScale)));
        if (typeof preferences.language === "string") setLanguage(preferences.language);
      } catch { /* Only reading preferences are device-local; all lab progress is server-backed. */ }
      setPreferencesReady(true);
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (preferencesReady) try { localStorage.setItem("certpath-docker-reading", JSON.stringify({ fontScale, language })); } catch { /* Reading controls still work without browser storage. */ }
  }, [fontScale, language, preferencesReady]);
  const signOut = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return false;
    setUserId(null); setAuthOpen(false); return true;
  };
  if (loading) return <main className="study-app min-h-screen"><p className="p-8" role="status">Loading your learning account…</p></main>;
  if (!userId) return <main className="study-app min-h-screen"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;
  return <GoogleSubtitleProvider language={language}><main className="study-app font-scale-content min-h-screen text-[#e8edf5]" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="app-sidebar border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-e">
        <AppBrand subtitle="Cloud, servers & containers" />
        <SimpleNavigation items={[{ key: "home", label: "Home" }, { key: "learning", label: "Learning" }, { key: "practice", label: "Practice" }, { key: "exams", label: "Check knowledge" }]} active={view === "questions" || view === "labs" ? "practice" : view} onNavigate={key => setView(key as typeof view)} /></aside>
      <section className="app-content min-w-0 p-4 sm:p-6 lg:p-8">
        <StudyHeader title={view === "home" ? "Docker" : view === "learning" ? "Learning" : view === "exams" || view === "questions" ? "Check knowledge" : "Practice"} course="Docker" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAuthOpen(true)} />
        {view === "home" && <LearningStart title="Learn Docker step by step" lesson="Prepare Docker, then run your first container." onStart={() => setView("learning")} />}
        {view === "practice" && <PracticeHub onQuestions={() => setView("questions")} onLabs={() => setView("labs")} />}
        {(view === "questions" || view === "labs") && <button className="simple-back" type="button" onClick={() => setView("practice")}>← Practice choices</button>}
        {view !== "home" && view !== "practice" && <section id="docker-learning-path" aria-label="Docker lessons, practical labs and knowledge checks">
          <LearningLabPath key={`${userId}:${view}`} userId={userId} labs={dockerLabs} resumeLatest initialTab={view === "exams" || view === "questions" ? "quiz" : view === "labs" ? "test" : undefined} kicker="Docker" title={view === "exams" || view === "questions" ? "Check what you learned" : "Learn by doing"} intro={view === "exams" ? "These short knowledge checks are not a timed certification exam." : "Choose a lesson or lab below. Follow the steps on your own Docker engine."} />
        </section>}
        <p className="mt-5 text-sm"><GoogleSubtitle text="Original learning exercises based on Docker documentation. This is not an official certification exam. Container execution happens on your own machine, not in this website." /></p>
      </section>
    </div>{authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
