"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { adStepImage, getAdVisualGuide, type AdVisualStep } from "@/lib/content/ad-visual-guides";

type Binding = NonNullable<ReturnType<typeof getAdVisualGuide>>;

function StepImage({ step, onExpand }: { step: AdVisualStep; onExpand: () => void }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="ad-guide-image-fallback" role="status">Screenshot unavailable. Follow the path below or open Microsoft Learn.</p> : <button className="ad-guide-image" type="button" onClick={onExpand} aria-label={`Enlarge screenshot: ${step.title}`}>
    {/* Source-hosted official media, not a screenshot fabricated by this application. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={adStepImage(step)} alt={step.alt} loading="lazy" decoding="async" width={840} height={630} onError={() => setFailed(true)} />
    <span>Enlarge screenshot ↗</span>
  </button>;
}

export function AdVisualGuide({ binding, showTranslations }: { binding: Binding; showTranslations: boolean }) {
  const { guide, startStep, context } = binding;
  const [index, setIndex] = useState(() => Math.max(0, guide.steps.findIndex(step => step.id === startStep)));
  const dialog = useRef<HTMLDialogElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 1100px)");
    const sync = () => { if (details.current) details.current.open = breakpoint.matches; };
    sync();
    breakpoint.addEventListener("change", sync);
    return () => breakpoint.removeEventListener("change", sync);
  }, []);
  const step = guide.steps[index];
  const caption = (text: string) => <GoogleSubtitle text={text} enabled={showTranslations} />;
  return <aside className="ad-visual-rail" aria-label="Active Directory visual guide">
    <details ref={details} className="ad-visual-guide">
      <summary><span>AD DS · visual walkthrough</span><span className="ad-guide-toggle-hint">Open / close</span></summary>
      <div className="ad-guide-body">
        <h3>{guide.title}</h3>
        <p className="ad-guide-context">{caption(context)}</p>
        <p className="ad-guide-disclaimer">Learning reference · not an interactive server or a completion check.</p>
        <label className="ad-guide-step-picker">Jump to step
          <select value={index} onChange={event => setIndex(Number(event.target.value))} aria-label="Visual guide step">
            {guide.steps.map((item, position) => <option key={item.id} value={position}>{position + 1}. {item.title}</option>)}
          </select>
        </label>
        <article aria-label={`Step ${index + 1}: ${step.title}`}>
          <p className="ad-guide-step-count" aria-live="polite">Step {index + 1} / {guide.steps.length}</p>
          <h4>{caption(step.title)}</h4>
          {step.imageNote && <p className="ad-guide-image-note">{caption(step.imageNote)}</p>}
          <StepImage key={step.id} step={step} onExpand={() => dialog.current?.showModal()} />
          <ol className="ad-guide-path" aria-label="Windows Server navigation path">{step.path.map((part, position) => <li key={`${position}:${part}`}>{part}</li>)}</ol>
          <p className="ad-guide-instruction">{caption(step.instruction)}</p>
        </article>
        <nav className="ad-guide-actions" aria-label="Visual guide navigation">
          <button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)}>← Previous step</button>
          <button type="button" disabled={index === guide.steps.length - 1} onClick={() => setIndex(value => value + 1)}>Next step →</button>
        </nav>
        <details className="ad-guide-notes"><summary>Version and prerequisites</summary><p>{caption(guide.versionNote)}</p><p>{caption(guide.prerequisites)}</p></details>
        <a className="ad-guide-source" href={guide.source} target="_blank" rel="noreferrer">Microsoft Learn · original screenshots ↗</a>
      </div>
    </details>
    <dialog className="ad-guide-dialog" ref={dialog} aria-label={step.title} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <header><strong>{step.title}</strong><button type="button" onClick={() => dialog.current?.close()} autoFocus aria-label="Close screenshot">Close ×</button></header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={adStepImage(step)} alt={step.alt} width={840} height={630} loading="lazy" decoding="async" />
      <a href={guide.source} target="_blank" rel="noreferrer">View source on Microsoft Learn ↗</a>
    </dialog>
  </aside>;
}
