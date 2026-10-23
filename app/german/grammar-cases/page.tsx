"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BookOpen, ArrowLeft, FolderSearch } from "lucide-react";
import { AppBrand, StudyHeader } from "@/app/components/study-header";
import { SimpleNavigation } from "@/app/components/simple-learning";
import { AccountPanel, AuthPanel } from "@/app/components/learning-views";
import { copy } from "@/lib/course-data";
import { GrammarCasesWorkspace } from "@/app/components/grammar-cases-workspace";

export default function GrammarCasesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [translation, setTranslation] = useState("");
  const [authError, setAuthError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setAuthError(false);
    void fetch("/api/auth/me", { cache: "no-store", signal: controller.signal }).then(async r => {
      if (!r.ok && r.status !== 401) throw Error("account unavailable");
      const data = r.ok ? await r.json() as { user?: { id?: unknown } } : null;
      if (!controller.signal.aborted && typeof data?.user?.id === "string") setUserId(data.user.id);
    }).catch(() => { if (!controller.signal.aborted) setAuthError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  if (loading) return <main className="study-app min-h-screen" lang="fa" dir="rtl"><p className="p-8" role="status">در حال بازکردن پرونده‌ها…</p></main>;
  if (authError) return <main className="study-app min-h-screen" lang="fa" dir="rtl"><p className="p-8" role="alert">ارتباط حساب برقرار نشد. <button onClick={() => setRetry(v => v + 1)}>تلاش دوباره</button></p></main>;
  if (!userId) return <main className="study-app min-h-screen"><div className="auth-required"><AuthPanel onClose={() => undefined} onAuthenticated={setUserId} /></div></main>;
  return <main className="study-app german-app gc-app font-scale-content" style={{ "--wincraft-font-scale": fontScale } as CSSProperties}>
    <div className="app-shell german-shell">
      <aside className="app-sidebar"><AppBrand subtitle="Learn. Practice. Progress." /><SimpleNavigation active="grammar" items={[
        { key: "grammar", label: "پرونده‌های گرامر", href: "/german/grammar-cases", icon: <FolderSearch size={18} /> },
        { key: "german", label: "German for IT", href: "/german", icon: <BookOpen size={18} /> },
        { key: "network", label: "SatzTat · Network missions", href: "/german/satztat", icon: <ArrowLeft size={18} /> },
        { key: "home", label: "All learning paths", href: "/", icon: <ArrowLeft size={18} /> },
      ]} /><div className="german-sidebar-note" lang="fa" dir="rtl"><strong>یک ساختار؛ موقعیت‌های گوناگون</strong><p>بازی شبکه جداست. اینجا ساختن و اصلاح جمله، خودِ بازی است.</p><p>۲۴ مأموریت · ۴ فصل · بدون تایمر اجباری</p></div></aside>
      <section className="app-content german-content"><StudyHeader title="SatzTat · پرونده‌های گرامر" course="Deutsch" t={copy.fa} fontScale={fontScale} onFontScale={setFontScale} translationLanguage={translation} onTranslationLanguage={setTranslation} onAccount={() => setAccount(true)} /><GrammarCasesWorkspace key={userId} userId={userId} /></section>
    </div>
    {account && <AccountPanel onClose={() => setAccount(false)} onSignOut={async () => {
      try { const r = await fetch("/api/auth/logout", { method: "POST" }); if (!r.ok) return false; setUserId(null); setAccount(false); return true; } catch { return false; }
    }} />}
  </main>;
}
