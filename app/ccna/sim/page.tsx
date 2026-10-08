"use client";

import { useSearchParams } from "next/navigation";
import { CcnaSimulator } from "@/app/components/ccna-sim";
import { ccnaLabPath, ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { simulatorText } from "@/lib/ccna-sim/language";

/** The simulator route. The terminal works for any published lab; a lab pack (objectives, topology
 * and grading) arrives with a later slice, so this page states exactly what exists today. */
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
  return <CcnaSimulator key={lab.id} lab={lab} backHref="/ccna/library" />;
}
