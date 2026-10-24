"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitleProvider } from "@/app/components/google-translate";
import { GermanWorkspace } from "@/app/german/page";
import { copy } from "@/lib/course-data";

export default function GermanB1GrammarPage() {
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
      <aside className="app-sidebar"><AppBrand subtitle="B1 Grammatik" /><SimpleNavigation active="german-b1" items={[
        { key: "german-b1", label: "B1 Grammatik · 12 Themen", href: "/german/b1-grammar", icon: <BookOpen size={18} /> },
        { key: "grammar-cases", label: "SatzTat · پرونده‌های گرامر", href: "/german/grammar-cases", icon: <ChevronRight size={18} /> },
        { key: "satztat", label: "SatzTat · Network missions", href: "/german/satztat", icon: <ChevronRight size={18} /> },
      ]} /><div className="german-sidebar-note"><strong>۱۲ مبحث کامل B1</strong><p>هر مبحث با مثال، دیکته، یادآوری و نوشتن تمرین می‌شود.</p></div></aside>
      <section className="app-content german-content"><StudyHeader title="B1 Grammatik" course="Deutsch" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} /><GermanWorkspace key={userId} userId={userId} variant="b1" /></section>
    </div>{accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
