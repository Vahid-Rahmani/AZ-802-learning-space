"use client";

import { useSearchParams } from "next/navigation";
import { CcnaSimulationWorkspace } from "@/app/components/ccna-simulation-workspace";
import { ccnaLabPath, ccnaLabPathStats } from "@/lib/content/ccna-lab-path";
import { getCcnaSimulationPack } from "@/lib/content/ccna-simulation-packs";
import { simulatorText } from "@/lib/ccna-sim/language";
import { CiscoLearningTask } from "@/app/components/cisco-learning";
import { learningTasks } from "@/lib/content/cisco-learning";

/** The simulator route. Each lab has one workspace: topology, device tabs and its console dock. */
export default function CcnaSimPage() {
  const params = useSearchParams();
  const requested = params.get("lab");
  const taskId = params.get("task");
  if (taskId) {
    const task = learningTasks.find(t => t.id === taskId);
    return <section className="ccna-sim-page">{task ? <CiscoLearningTask key={task.id} task={task} /> : <p>تمرین پیدا نشد. <a href="/ccna/learning">مسیر آموزشی</a></p>}</section>;
  }
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
    {pack ? <CcnaSimulationWorkspace key={`graph-${lab.id}`} pack={pack} persistKey={`ccna:${lab.id}`} /> : <p className="ccna-sim-meta">This lab does not have an interactive pack yet.</p>}
  </section>;
}
