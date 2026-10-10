"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleSubtitle } from "@/app/components/google-translate";
import { AdGuideDiagram } from "@/app/components/ad-guide-diagram";
import { adStepImage, getAdVisualGuide, type AdVisualStep } from "@/lib/content/ad-visual-guides";

type Binding = NonNullable<ReturnType<typeof getAdVisualGuide>>;

function StepImage({ step, onExpand }: { step: AdVisualStep; onExpand: () => void }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="ad-guide-image-fallback" role="status">Screenshot unavailable. Follow the path below or open the source.</p> : <button className="ad-guide-image" type="button" onClick={onExpand} aria-label={`Enlarge screenshot: ${step.title}`}>
    {/* Real source captures, locally hosted when licensed; never generated Windows UI. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={adStepImage(step)} alt={step.alt} loading="lazy" decoding="async" width={step.imageReference?.width} height={step.imageReference?.height} onError={() => setFailed(true)} />
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
  return <aside className="ad-visual-rail" aria-label={`${guide.category ?? "Active Directory"} visual guide`}>
    <details ref={details} className="ad-visual-guide">
      <summary><span>{guide.category ?? "AD DS"} · visual walkthrough</span><span className="ad-guide-toggle-hint">Open / close</span></summary>
      <div className="ad-guide-body">
        <h3>{guide.title}</h3>
        <p className="ad-guide-context">{caption(context)}</p>
        <p className="ad-guide-disclaimer">Learning reference · not an interactive server or a completion check.</p>
        {guide.walkthroughs?.map(item => <a key={item.url} className="ad-guide-source" href={item.url} target="_blank" rel="noreferrer">{item.version} · {item.title} ↗ <small>(external illustrated walkthrough)</small></a>)}
        <label className="ad-guide-step-picker">Jump to step
          <select value={index} onChange={event => setIndex(Number(event.target.value))} aria-label="Visual guide step">
            {guide.steps.map((item, position) => <option key={item.id} value={position}>{position + 1}. {item.title}</option>)}
          </select>
        </label>
        <article aria-label={`Step ${index + 1}: ${step.title}`}>
          <p className="ad-guide-step-count" aria-live="polite">Step {index + 1} / {guide.steps.length}</p>
          <h4>{caption(step.title)}</h4>
          {step.imageNote && <p className="ad-guide-image-note">{caption(step.imageNote)}</p>}
          {step.image && <>
            <p className="ad-guide-image-note">{step.imageReference ? `${step.imageReference.version} · real lab screenshot` : step.screenshotLabel ?? "Older Microsoft reference image · not a verified Windows Server 2025 capture."}</p>
            <StepImage key={step.id} step={step} onExpand={() => dialog.current?.showModal()} />
            {step.imageReference ? <>
              <p className="ad-guide-image-note">{caption(step.imageReference.note)}</p>
              <p className="ad-guide-credit"><a href={step.imageReference.source} target="_blank" rel="noreferrer">{step.imageReference.credit}</a> · <a href={step.imageReference.license} target="_blank" rel="noreferrer">License</a></p>
            </> : <p className="ad-guide-credit"><a href={step.screenshotSource ?? step.source ?? guide.source} target="_blank" rel="noreferrer">{step.screenshotCredit ?? "Microsoft · reference screenshot"}</a></p>}
          </>}
          {step.diagram && (step.image ? <details className="ad-guide-notes"><summary>Concept diagram</summary><AdGuideDiagram diagram={step.diagram} /></details> : <AdGuideDiagram diagram={step.diagram} />)}
          <ol className="ad-guide-path" aria-label="Windows Server navigation path">{step.path.map((part, position) => <li key={`${position}:${part}`}>{part}</li>)}</ol>
          <p className="ad-guide-instruction">{caption(step.instruction)}</p>
          {step.command && <pre className="ad-guide-command"><code>{step.command}</code></pre>}
          {step.source && <a className="ad-guide-source" href={step.source} target="_blank" rel="noreferrer">Microsoft Learn · this step ↗</a>}
        </article>
        <nav className="ad-guide-actions" aria-label="Visual guide navigation">
          <button type="button" disabled={index === 0} onClick={() => setIndex(value => value - 1)}>← Previous step</button>
          <button type="button" disabled={index === guide.steps.length - 1} onClick={() => setIndex(value => value + 1)}>Next step →</button>
        </nav>
        <details className="ad-guide-notes"><summary>Version and prerequisites</summary><p>{caption(guide.versionNote)}</p><p>{caption(guide.prerequisites)}</p></details>
        <a className="ad-guide-source" href={guide.source} target="_blank" rel="noreferrer">Microsoft Learn · official guidance ↗</a>
      </div>
    </details>
    {step.image && <dialog className="ad-guide-dialog" ref={dialog} aria-label={step.title} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      <header><strong>{step.title}</strong><button type="button" onClick={() => dialog.current?.close()} autoFocus aria-label="Close screenshot">Close ×</button></header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={adStepImage(step)} alt={step.alt} width={step.imageReference?.width} height={step.imageReference?.height} decoding="async" />
      <a href={step.imageReference?.source ?? step.screenshotSource ?? step.source ?? guide.source} target="_blank" rel="noreferrer">View screenshot source ↗</a>
      <p><a href={adStepImage(step)} target="_blank" rel="noreferrer">Open full-size image ↗</a></p>
    </dialog>}
  </aside>;
}
