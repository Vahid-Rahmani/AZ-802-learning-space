"use client";

import { useEffect, useId, useState } from "react";
import { Menu, SlidersHorizontal, UserRound } from "lucide-react";
import { ThemeControl } from "@/app/components/appearance-provider";
import { FontSizeControl } from "@/app/components/training-views";
import { GoogleTranslateControl } from "@/app/components/google-translate";
import { CourseSwitcher } from "@/app/components/course-switcher";

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

function SidebarToggle() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.body.dataset.sidebarState = open ? "open" : "collapsed";
    return () => {
      delete document.body.dataset.sidebarState;
    };
  }, [open]);

  return <button
    type="button"
    className="sidebar-toggle-button"
    aria-label={open ? "Collapse navigation" : "Expand navigation"}
    aria-expanded={open}
    title={open ? "Collapse navigation" : "Expand navigation"}
    onClick={() => setOpen((value) => !value)}
  >
    <Menu size={18} aria-hidden="true" />
    <span>Menu</span>
  </button>;
}

export function StudyHeader({ title, course, t, fontScale, onFontScale, translationLanguage, onTranslationLanguage, onAccount }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controlsId = useId();
  const activeCourse: "az802" | "az900" | "docker" | "ccna" = course === "AZ-900" ? "az900" : course === "Docker" ? "docker" : course === "CCNA" ? "ccna" : "az802";
  return <header className="certpath-header">
    <div className="header-title"><p className="header-eyebrow">{course} <span>Learning workspace</span></p><h1>{title}</h1></div>
    <div className="header-mobile-actions">
      <SidebarToggle />
      <CourseSwitcher active={activeCourse} />
      <button type="button" className="reading-settings-toggle" aria-label="Theme, translate and text settings" aria-expanded={settingsOpen} aria-controls={controlsId} onClick={() => setSettingsOpen((open) => !open)}><SlidersHorizontal size={18} /><span>Settings</span></button>
      <button type="button" className="account-button" aria-label="Open account" title="Open account" onClick={onAccount}><UserRound size={19} /></button>
    </div>
    <div id={controlsId} className={`study-controls ${settingsOpen ? "is-open" : ""}`}>
      <ThemeControl />
      <GoogleTranslateControl language={translationLanguage} onLanguageChange={onTranslationLanguage} />
      <div className="text-size-field"><span>Text size</span><FontSizeControl t={t} scale={fontScale} onChange={onFontScale} /></div>
    </div>
  </header>;
}
