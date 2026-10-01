"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "fluent" | "classic";
const STORAGE_KEY = "certpath-theme";
const AppearanceContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: "fluent", setTheme: () => undefined });

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setCurrentTheme] = useState<Theme>("fluent");

  useEffect(() => {
    const sync = () => {
      let stored: string | null = document.documentElement.dataset.theme ?? null;
      try { stored = localStorage.getItem(STORAGE_KEY) ?? stored; } catch { /* Use the current theme when storage is disabled. */ }
      const next = stored === "classic" ? "classic" : "fluent";
      document.documentElement.dataset.theme = next;
      setCurrentTheme(next);
    };
    sync();
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) sync(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.dataset.theme = next;
    setCurrentTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* The preference still works for this visit. */ }
  }, []);

  return <AppearanceContext.Provider value={{ theme, setTheme }}>{children}</AppearanceContext.Provider>;
}

export function ThemeControl() {
  const { theme, setTheme } = useContext(AppearanceContext);
  return <label className="theme-control">
    <span>Theme</span>
    <select aria-label="Theme" value={theme} onChange={(event) => setTheme(event.target.value === "classic" ? "classic" : "fluent")}>
      <option value="fluent">Fluent · New</option>
      <option value="classic">Classic · Dark</option>
    </select>
  </label>;
}
