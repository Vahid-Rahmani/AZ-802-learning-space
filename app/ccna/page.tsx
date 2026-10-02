"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, Network } from "lucide-react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { CourseSwitcher } from "@/app/components/course-switcher";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { LearningLabPath } from "@/app/components/windows-server-labs";
import { CcnaPractice } from "@/app/components/ccna-practice";
import { ccnaQuestionCount } from "@/lib/content/ccna-bank";
import { ccnaDomains, ccnaLabs, ccnaSources } from "@/lib/content/ccna";
import { copy } from "@/lib/course-data";

export default function CcnaPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [requestedLab, setRequestedLab] = useState<string | undefined>();
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
      if (!alive) return;
      try {
        const preferences = JSON.parse(localStorage.getItem("certpath-ccna-reading") ?? "{}");
        if (typeof preferences.fontScale === "number" && Number.isFinite(preferences.fontScale)) setFontScale(Math.max(.85, Math.min(1.3, preferences.fontScale)));
        if (typeof preferences.language === "string") setLanguage(preferences.language);
      } catch { /* Only reading preferences are local; learner progress is server-backed. */ }
      setPreferencesReady(true);
    });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (preferencesReady) try { localStorage.setItem("certpath-ccna-reading", JSON.stringify({ fontScale, language })); } catch { /* Reading controls work without browser storage. */ }
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
        <AppBrand subtitle="Cloud, servers & networking" />
        <nav className="mt-8 space-y-2" aria-label="CCNA navigation"><a href="#ccna-question-bank" className="flex min-h-12 items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200"><BookOpen size={19} /><GoogleSubtitle text="Question bank & Explain" /></a><a href="#ccna-learning-path" className="flex min-h-12 items-center gap-3 p-3"><Network size={19} /><GoogleSubtitle text="Lessons & hands-on labs" /></a></nav>
        <div className="sidebar-course-card mt-8 rounded-2xl border border-white/10 p-4"><p className="text-sm text-slate-400"><GoogleSubtitle text="Current track" /></p><h2 className="mt-2 font-bold">CCNA Foundations</h2><p className="mt-2 text-sm text-slate-400"><GoogleSubtitle text={`8 stages · ${ccnaQuestionCount + ccnaLabs.reduce((count, lab) => count + lab.questions.length, 0)} learning questions`} /></p><a href={ccnaSources.packetTracer} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-sm text-cyan-200"><BookOpen size={16} /><GoogleSubtitle text="Official Packet Tracer course" /></a></div>
      </aside>
      <section className="app-content min-w-0 p-4 sm:p-6 lg:p-8">
        <StudyHeader title="CCNA Foundations" course="CCNA" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAuthOpen(true)} />
        <div className="mb-6"><CourseSwitcher active="ccna" /></div>
        <section className="mb-6" aria-label="Official CCNA domains">
          <h2 className="text-xl font-bold"><GoogleSubtitle text="200-301 v1.1 · six official domains" /></h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{ccnaDomains.map((domain) => <li key={domain.id} className="sidebar-course-card rounded-lg border border-white/10 p-3"><GoogleSubtitle text={`${domain.title} · ${domain.weight}%`} /></li>)}</ul>
          <p className="mt-3 text-sm"><GoogleSubtitle text="Foundation coverage, not every exam objective. Domain percentages describe the official blueprint, not the weighting of these short learning quizzes." /> <a className="underline" href={ccnaSources.blueprint} target="_blank" rel="noreferrer"><GoogleSubtitle text="Official objectives" /> ↗</a></p>
        </section>
        <CcnaPractice key={userId} userId={userId} onOpenLab={(id) => { setRequestedLab(id); document.getElementById("ccna-learning-path")?.scrollIntoView({ behavior: "smooth" }); }} />
        <section id="ccna-learning-path" aria-label="CCNA lessons, network labs and knowledge checks">
          <LearningLabPath key={`${userId}:${requestedLab ?? "resume"}`} userId={userId} labs={ccnaLabs} initialLabId={requestedLab} resumeLatest={!requestedLab} kicker="CCNA · 200-301 v1.1 foundations" title="Build a network. Understand every hop." intro="Study each lesson, build its isolated topology, test both success and expected failure, then answer the knowledge check with Explain. Your stage, question position, answers and evidence save to your account." />
        </section>
        <p className="mt-5 text-sm"><GoogleSubtitle text="Independent original labs and adapted MIT-licensed practice questions reviewed against Cisco references; no real certification questions or exam dumps. Labs run on your own desktop simulator, not inside this website. The final automation stage is an offline worksheet." /> <a className="underline" href={ccnaSources.exam} target="_blank" rel="noreferrer"><GoogleSubtitle text="Official Cisco exam information" /> ↗</a></p>
      </section>
    </div>{authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
