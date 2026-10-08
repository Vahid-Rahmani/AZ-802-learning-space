"use client";

import { useId, useState } from "react";
import { SlidersHorizontal, UserRound } from "lucide-react";
import { ThemeControl } from "@/app/components/appearance-provider";
import { FontSizeControl } from "@/app/components/training-views";
import { GoogleTranslateControl } from "@/app/components/google-translate";

type Props = {
  title: string;
  course: string;
  t: { lang: "en" | "fa" | "de"; [key: string]: unknown };
  fontScale: number;
  onFontScale: (scale: number) => void;
  translationLanguage: string;
  onTranslationLanguage: (language: string) => void;
  onAccount: () => void;
};

export function AppBrand({ subtitle }: { subtitle: string }) {
  return <div className="app-brand">
    <span className="brand-mark" aria-hidden="true"><svg width="27" height="27" viewBox="0 0 28 28" fill="none"><path d="M6 21V14H14V7H22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="6" cy="21" r="2.5" fill="currentColor" /><circle cx="22" cy="7" r="2.5" fill="currentColor" /></svg></span>
    <div><p className="brand-name">Klybit</p><p className="brand-subtitle">{subtitle}</p></div>
  </div>;
}

export function StudyHeader({ title, course, t, fontScale, onFontScale, translationLanguage, onTranslationLanguage, onAccount }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controlsId = useId();
  return <header className="certpath-header">
    <div className="header-title"><p className="header-eyebrow">{course} <span>Learning workspace</span></p><h1>{title}</h1></div>
    <div className="header-mobile-actions">
      <button type="button" className="reading-settings-toggle" aria-label="Theme, translate and text settings" aria-expanded={settingsOpen} aria-controls={controlsId} onClick={() => setSettingsOpen((open) => !open)}><SlidersHorizontal size={18} /><span>Style</span></button>
      <button type="button" className="account-button" aria-label="Open account" title="Open account" onClick={onAccount}><UserRound size={19} /></button>
    </div>
    <div id={controlsId} className={`study-controls ${settingsOpen ? "is-open" : ""}`}>
      <ThemeControl />
      <GoogleTranslateControl language={translationLanguage} onLanguageChange={onTranslationLanguage} />
      <div className="text-size-field"><span>Text size</span><FontSizeControl t={t} scale={fontScale} onChange={onFontScale} /></div>
    </div>
  </header>;
}
