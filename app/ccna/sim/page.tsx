"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CcnaSimulator } from "@/app/components/ccna-sim";
import { CcnaSimulationWorkspace } from "@/app/components/ccna-simulation-workspace";
import { ccnaLabPath, ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { getCcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";
import { simulatorText } from "@/lib/ccna-sim/language";

/** The simulator route. The terminal works for any published lab; a lab pack (objectives, topology
 * and grading) arrives with a later slice, so this page states exactly what exists today. */
export default function CcnaSimPage() {
  const requested = useSearchParams().get("lab");
  const fallback = ccnaLabPath.find((entry) => entry.kind === "hands-on") ?? ccnaLabPath[0];
  const lab = requested ? ccnaLabPath.find((entry) => entry.id === requested) : fallback;
  const [view, setView] = useState<"interactive" | "terminal">("interactive");
  if (!lab) {
    return <section className="ccna-sim-heading">
      <p className="ccna-sim-kicker">{simulatorText.kicker}</p>
      <h2>{simulatorText.labMissing}</h2>
      <p className="ccna-sim-meta">{ccnaLabPathStats.total} labs are published in the library.</p>
      <a href="/ccna/library" className="ccna-sim-back">{simulatorText.openLibrary}</a>
    </section>;
  }
  const pack = getCcnaSimulationPack(lab.id);
  return <section className="ccna-sim-page">
    <nav className="ccna-sim-view-tabs" aria-label="Lab simulator views">
      <button type="button" className={view === "interactive" ? "is-active" : ""} aria-pressed={view === "interactive"} onClick={() => setView("interactive")}>Interactive topology</button>
      <button type="button" className={view === "terminal" ? "is-active" : ""} aria-pressed={view === "terminal"} onClick={() => setView("terminal")}>IOS terminal</button>
      <a href="/ccna/library">Back to lab library</a>
    </nav>
    {view === "interactive" && pack ? <CcnaSimulationWorkspace key={`graph-${lab.id}`} pack={pack} persistKey={`ccna:${lab.id}`} /> : <CcnaSimulator key={`terminal-${lab.id}`} lab={lab} backHref="/ccna/library" />}
  </section>;
}
