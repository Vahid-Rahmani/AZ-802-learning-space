"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, Network } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitleProvider } from "@/app/components/google-translate";
import { SatztatWorkspace } from "@/app/components/satztat-workspace";
import { copy } from "@/lib/course-data";

export default function SatztatPage() {
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
  return <GoogleSubtitleProvider language={language}><main className="study-app german-app satztat-app font-scale-content" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell german-shell">
      <aside className="app-sidebar"><AppBrand subtitle="Learn. Practice. Progress." /><SimpleNavigation active="satztat" items={[
        { key: "satztat", label: "SatzTat missions", href: "/german/satztat", icon: <Network size={18} /> },
        { key: "german", label: "German lessons", href: "/german", icon: <BookOpen size={18} /> },
        { key: "home", label: "All learning paths", href: "/", icon: <ArrowLeft size={18} /> },
      ]} /><div className="german-sidebar-note"><strong>One incident. Two skills.</strong><p>Repair the network. Explain the outcome in German.</p><p>2 playable cases · a focused pilot, not the entire planned campaign.</p></div></aside>
      <section className="app-content german-content"><StudyHeader title="SatzTat · Network missions" course="Deutsch" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} /><SatztatWorkspace key={userId} userId={userId} translationLanguage={language} /></section>
    </div>{accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
