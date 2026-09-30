"use client";

import { useEffect, useRef, useState } from "react";

const ENGINE_ID = "wincraft-google-translate-engine";
const SCRIPT_ID = "wincraft-google-translate-script";
const CALLBACK_NAME = "__wincraftGoogleTranslateInit";

const languages = [
  { code: "", label: "English (original)" },
  { code: "fa", label: "فارسی" },
  { code: "ur", label: "اردو / Urdu" },
  { code: "ar", label: "العربية / Arabic" },
  { code: "de", label: "Deutsch" },
];

type GoogleTranslateWindow = Window & {
  google?: {
    translate?: {
      Translate: new (options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean }, elementId: string) => unknown;
    };
  };
  [CALLBACK_NAME]?: () => void;
};

function engineSelect() {
  return document.querySelector("select.goog-te-combo") as unknown as HTMLSelectElement | null;
}

/**
 * A small, accessible wrapper around Google's browser translation widget.
 * The app remains English by default; translation changes only rendered text
 * and does not change question ids, answers, or saved progress.
 */
export function GoogleTranslateControl() {
  const [selected, setSelected] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const pendingLanguage = useRef("");

  useEffect(() => {
    let cancelled = false;
    const applyPending = () => {
      const combo = engineSelect();
      if (!combo) return false;
      if (cancelled) return true;
      setReady(true);
      const language = pendingLanguage.current;
      if (language !== combo.value) {
        combo.value = language;
        combo.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    };

    const initialize = () => {
      const browser = window as GoogleTranslateWindow;
      if (!browser.google?.translate?.Translate) return;
      const mount = document.getElementById(ENGINE_ID);
      if (!mount || mount.dataset.initialized === "true") {
        applyPending();
        return;
      }
      mount.dataset.initialized = "true";
      new browser.google.translate.Translate({
        pageLanguage: "en",
        includedLanguages: "fa,ur,ar,de",
        autoDisplay: false,
      }, ENGINE_ID);
      window.setTimeout(applyPending, 100);
    };

    const browser = window as GoogleTranslateWindow;
    browser[CALLBACK_NAME] = initialize;
    const script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      const nextScript = document.createElement("script");
      nextScript.id = SCRIPT_ID;
      nextScript.async = true;
      nextScript.src = `https://translate.google.com/translate_a/element.js?cb=${CALLBACK_NAME}`;
      document.head.appendChild(nextScript);
    } else {
      initialize();
    }

    const interval = window.setInterval(() => {
      if (applyPending()) window.clearInterval(interval);
    }, 250);
    const timeout = window.setTimeout(() => window.clearInterval(interval), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      if (browser[CALLBACK_NAME] === initialize) delete browser[CALLBACK_NAME];
    };
  }, []);

  const changeLanguage = (code: string) => {
    pendingLanguage.current = code;
    setSelected(code);
    const combo = engineSelect();
    if (!combo) {
      setMessage("Loading Google Translate…");
      return;
    }
    combo.value = code;
    combo.dispatchEvent(new Event("change", { bubbles: true }));
    setMessage("");
  };

  return <div className="google-translate-control" aria-label="Translate this page">
    <label htmlFor="wincraft-language" className="google-translate-label">Translate</label>
    <select id="wincraft-language" value={selected} onChange={(event) => changeLanguage(event.target.value)} aria-describedby="wincraft-translate-help">
      {languages.map((language) => <option key={language.code || "original"} value={language.code}>{language.label}</option>)}
    </select>
    <span id="wincraft-translate-help" className="google-translate-status" aria-live="polite">{message || (ready ? "" : "Loading…")}</span>
    <div id={ENGINE_ID} className="google-translate-engine" aria-hidden="true" />
  </div>;
}

