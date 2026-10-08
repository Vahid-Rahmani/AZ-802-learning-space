"use client";

import { useSearchParams } from "next/navigation";
import { CcnaSimulationWorkspace } from "@/app/components/ccna-simulation-workspace";
import { ccnaLabPath, ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { getCcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";
import { simulatorText } from "@/lib/ccna-sim/language";

/** The simulator route. Each lab has one workspace: topology, device tabs and its console dock. */
export default function CcnaSimPage() {
  const requested = useSearchParams().get("lab");
  const fallback = ccnaLabPath.find((entry) => entry.kind === "hands-on") ?? ccnaLabPath[0];
  const lab = requested ? ccnaLabPath.find((entry) => entry.id === requested) : fallback;
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
    <nav className="ccna-sim-view-tabs" aria-label="Lab workspace">
      <span className="ccna-sim-view-label">Interactive topology · device consoles</span>
      <a href="/ccna/library">Back to lab library</a>
    </nav>
    {pack ? <CcnaSimulationWorkspace key={`graph-${lab.id}`} pack={pack} persistKey={`ccna:${lab.id}`} /> : <p className="ccna-sim-meta">This lab does not have an interactive pack yet.</p>}
  </section>;
}
