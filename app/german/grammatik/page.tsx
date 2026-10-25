"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, ChevronRight, Languages } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { GoogleSubtitleProvider } from "@/app/components/google-translate";
import { GermanGrammarCourse } from "@/app/components/german-grammar-course";
import { copy } from "@/lib/course-data";

export default function GermanGrammarPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [language, setLanguage] = useState("");
  useEffect(() => {
    let live = true;
    void fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
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
      <aside className="app-sidebar">
        <AppBrand subtitle="Grammatik A1–B2" />
        <SimpleNavigation active="german-grammatik" items={[
          { key: "german-grammatik", label: "Grammatik A1–B2 · 20 Module", href: "/german/grammatik", icon: <Languages size={18} /> },
          { key: "german-b1", label: "B1 Grammatik · 12 Themen", href: "/german/b1-grammar", icon: <BookOpen size={18} /> },
          { key: "german", label: "German for IT", href: "/german", icon: <ChevronRight size={18} /> },
          { key: "grammar-cases", label: "SatzTat · پرونده‌های گرامر", href: "/german/grammar-cases", icon: <ChevronRight size={18} /> },
          { key: "satztat", label: "SatzTat · Network missions", href: "/german/satztat", icon: <ChevronRight size={18} /> },
        ]} />
        <div className="german-sidebar-note"><strong>Modul 09 · Infinitiv mit zu</strong><p>100 Fragen mit deutscher Erklärung, persischer Übersetzung, Schreib- und Diktatübungen.</p><p>1 von 20 Modulen vollständig ausgearbeitet.</p></div>
      </aside>
      <section className="app-content german-content">
        <StudyHeader title="Grammatik A1–B2" course="Deutsch" t={copy.en} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={language} onTranslationLanguage={setLanguage} onAccount={() => setAccountOpen(true)} />
        <GermanGrammarCourse key={userId} userId={userId} />
      </section>
    </div>
    {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} onSignOut={signOut} />}
  </main></GoogleSubtitleProvider>;
}
