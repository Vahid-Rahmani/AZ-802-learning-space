"use client";

import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, ClipboardCheck, Layers, Network } from "lucide-react";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { GoogleSubtitleProvider } from "@/app/components/google-translate";
import { ccnaLabPath } from "@/lib/content/ccna-lab-path";
import { getCcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { copy } from "@/lib/course-data";
import "./dashboard.css";

/** One route per job: the overview, the question bank, the knowledge search, the eight build stages
 * and the leveled library of every lab this site publishes. Each page owns its own heading, so no
 * page has to scroll past another page's content to reach its own. */
const routes = [
  { key: "home", href: "/ccna", label: "Home", icon: Layers },
  { key: "learning", href: "/ccna/build", label: "Learning", icon: BookOpen },
  { key: "practice", href: "/ccna/train", label: "Practice", icon: Network },
  { key: "exams", href: "/ccna/exams", label: "Exams", icon: ClipboardCheck },
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
  const searchParams = useSearchParams();
  const requestedLab = searchParams.get("lab");
  const simulatorLab = pathname === "/ccna/sim"
    ? ccnaLabPath.find((entry) => entry.id === requestedLab) ?? ccnaLabPath.find((entry) => entry.kind === "hands-on")
    : null;
  const pageTitle = simulatorLab
    ? getCcnaSimulationPack(simulatorLab.id)?.title ?? simulatorLab.title
    : pathname.startsWith("/ccna/train") ? "Practice"
    : pathname.startsWith("/ccna/practice")
      ? "Question practice & Explain"
      : pathname.startsWith("/ccna/exams")
        ? "Exam center"
        : pathname.startsWith("/ccna/library")
          ? "Lab library"
          : pathname.startsWith("/ccna/search")
            ? "Search questions"
            : pathname.startsWith("/ccna/build")
              ? "Guided build stages"
              : "CCNA Foundations";
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
  return <GoogleSubtitleProvider language={language}><main className="study-app ccna-shell font-scale-content min-h-screen text-[#e8edf5]" data-simulator={pathname === "/ccna/sim" ? "true" : undefined} style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="app-sidebar border-b border-white/10 p-3 sm:p-4 lg:border-b-0 lg:border-e">
        <AppBrand subtitle="Cloud, servers & networking" />
        <SimpleNavigation items={routes.map(route => ({ ...route, icon: <route.icon size={19} /> }))} active={pathname === "/ccna" ? "home" : pathname.startsWith("/ccna/build") ? "learning" : pathname.startsWith("/ccna/exams") ? "exams" : "practice"} /></aside>
      <section className="app-content min-w-0 p-4 sm:p-6 lg:p-8">
        <StudyHeader title={pageTitle} course="CCNA" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAuthOpen(true)} />
        <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>
      </section>
    </div>{authOpen && <AccountPanel onClose={() => setAuthOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
