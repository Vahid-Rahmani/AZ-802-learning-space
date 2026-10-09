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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const sync = () => setOpen(desktop.matches);
    sync();
    desktop.addEventListener("change", sync);
    const closeOnNavigation = (event: MouseEvent) => {
      if (!desktop.matches && event.target instanceof Element && event.target.closest(".app-sidebar a, .app-sidebar nav button")) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("click", closeOnNavigation);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      desktop.removeEventListener("change", sync);
      document.removeEventListener("click", closeOnNavigation);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.sidebarState = open ? "open" : "collapsed";
    document.querySelectorAll<HTMLElement>(".app-sidebar").forEach((sidebar) => { sidebar.inert = !open; });
    return () => {
      delete document.body.dataset.sidebarState;
      document.querySelectorAll<HTMLElement>(".app-sidebar").forEach((sidebar) => { sidebar.inert = false; });
    };
  }, [open]);

  return <><button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} /><button
    type="button"
    className="sidebar-toggle-button"
    aria-label={open ? "Collapse navigation" : "Expand navigation"}
    aria-expanded={open}
    title={open ? "Collapse navigation" : "Expand navigation"}
    onClick={() => setOpen((value) => !value)}
  >
    <Menu size={18} aria-hidden="true" />
    <span>Menu</span>
  </button></>;
}

export function StudyHeader({ title, course, t, fontScale, onFontScale, translationLanguage, onTranslationLanguage, onAccount }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controlsId = useId();
  const activeCourse: "az802" | "az900" | "docker" | "ccna" = course === "AZ-900" ? "az900" : course === "Docker" ? "docker" : course === "CCNA" ? "ccna" : "az802";
  return <header className={`certpath-header${course === "CCNA" && title !== "CCNA Foundations" ? " certpath-header--lab" : ""}`}>
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
