"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, FlaskConical, Layers, Network, Search, Terminal } from "lucide-react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { CourseSwitcher } from "@/app/components/course-switcher";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { GoogleSubtitle, GoogleSubtitleProvider } from "@/app/components/google-translate";
import { ccnaQuestionCount } from "@/lib/content/ccna-bank";
import { ccnaLabs, ccnaSources } from "@/lib/content/ccna";
import { ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { copy } from "@/lib/course-data";

/** One route per job: the overview, the question bank, the knowledge search, the eight build stages
 * and the leveled library of every lab this site publishes. Each page owns its own heading, so no
 * page has to scroll past another page's content to reach its own. */
const routes = [
  { href: "/ccna", label: "Overview & domains", icon: Layers },
  { href: "/ccna/practice", label: "Question bank & Explain", icon: BookOpen },
  { href: "/ccna/search", label: "Search all CCNA questions", icon: Search },
  { href: "/ccna/build", label: "Build stages & workspaces", icon: FlaskConical },
  { href: "/ccna/sim", label: "Simulator · practice terminal", icon: Terminal },
  { href: "/ccna/library", label: `Lab library & troubleshooting · ${ccnaLabPathStats.total} labs`, icon: Network },
] as const;

type Shell = {
  userId: string;
  fontScale: number;
  language: string;
  setFontScale: (value: number) => void;
  setLanguage: (value: string) => void;
  openAccount: () => void;
};
const ShellContext = createContext<Shell | null>(null);

/** Reading preferences and the signed-in account, shared by every page under /ccna. */
export function useCcnaShell() {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useCcnaShell must be used inside the CCNA layout");
  return shell;
}

export default function CcnaLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
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
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const preferences = JSON.parse(localStorage.getItem("certpath-ccna-reading") ?? "{}");
        if (typeof preferences.fontScale === "number" && Number.isFinite(preferences.fontScale)) setFontScale(Math.max(.85, Math.min(1.3, preferences.fontScale)));
        if (typeof preferences.language === "string") setLanguage(preferences.language);
      } catch { /* Only reading preferences are local; learner progress is server-backed. */ }
      setPreferencesReady(true);
    });
  }, []);
  useEffect(() => {
    if (preferencesReady) try { localStorage.setItem("certpath-ccna-reading", JSON.stringify({ fontScale, language })); } catch { /* Reading controls work without browser storage. */ }
  }, [fontScale, language, preferencesReady]);
  const signOut = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return false;
    setUserId(null); setAuthOpen(false); return true;
  };
  const shell = useMemo<Shell | null>(() => (userId ? { userId, fontScale, language, setFontScale, setLanguage, openAccount: () => setAuthOpen(true) } : null), [userId, fontScale, language]);
  if (loading) return <main className="study-app min-h-screen"><p className="p-8" role="status">Loading your learning account…</p></main>;
  if (!userId || !shell) return <main className="study-app min-h-screen"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;
  const active = (href: string) => {
    if (href === "/ccna") return pathname === "/ccna";
    if (href === "/ccna/library") return pathname === href || pathname.startsWith("/ccna/bands/");
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  /** Same hard navigation the course switcher uses: the client-side router swallows anchor clicks
   * in this runtime, so a sidebar link must not depend on it. */
  const go = (href: string) => (event: { preventDefault: () => void }) => { event.preventDefault(); window.location.href = href; };
  return <GoogleSubtitleProvider language={language}><main className="study-app ccna-shell font-scale-content min-h-screen text-[#e8edf5]" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="app-sidebar border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-e">
        <AppBrand subtitle="Cloud, servers & networking" />
        <nav className="mt-8 space-y-2" aria-label="CCNA navigation">{routes.map((route) => { const Icon = route.icon; const current = active(route.href); return <a key={route.href} href={route.href} onClick={go(route.href)} aria-current={current ? "page" : undefined} className={current ? "flex min-h-12 items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200" : "flex min-h-12 items-center gap-3 p-3"}><Icon size={19} /><GoogleSubtitle text={route.label} /></a>; })}</nav>
        <div className="sidebar-course-card mt-8 rounded-2xl border border-white/10 p-4"><p className="text-sm text-slate-400"><GoogleSubtitle text="Current track" /></p><h2 className="mt-2 font-bold">CCNA Foundations</h2><p className="mt-2 text-sm text-slate-400"><GoogleSubtitle text={`${ccnaLabPathStats.total} labs in ${ccnaLabPathStats.bands} bands · ${ccnaQuestionCount + ccnaLabs.reduce((count, lab) => count + lab.questions.length, 0)} learning questions · ${ccnaLabPathStats.withDiagram} topology diagrams`} /></p><a href={ccnaSources.packetTracer} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-sm text-cyan-200"><BookOpen size={16} /><GoogleSubtitle text="Official Packet Tracer course" /></a></div>
      </aside>
      <section className="app-content min-w-0 p-4 sm:p-6 lg:p-8">
        <StudyHeader title="CCNA Foundations" course="CCNA" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAuthOpen(true)} />
        <div className="mb-6"><CourseSwitcher active="ccna" /></div>
        <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
      </section>
    </div>{authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
