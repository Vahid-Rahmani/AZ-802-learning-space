import type { SimulationStage } from "./topology.ts";

type EvidenceEntry = { input: string; output: string[]; matched?: string | null };
type EvidenceView = { entries: EvidenceEntry[] };

/** Ordered, device-specific evidence; one command cannot tick several steps. */
export function completedSimulationStages(stages: SimulationStage[], views: Record<string, EvidenceView>) {
  const complete = new Set<string>();
  const consumed = new Map<string, number>();
  for (const stage of stages) {
    const candidates = stage.deviceId ? [stage.deviceId] : Object.keys(views);
    let found = false;
    for (const deviceId of candidates) {
      const entries = views[deviceId]?.entries ?? [];
      const index = entries.findIndex((entry, index) => {
        if (index < (consumed.get(deviceId) ?? 0)) return false;
        if (!entry.output.length || entry.output.some((line) => /^\s*%|Evidence target:|Run this check in the simulator/.test(line))) return false;
        const command = stage.command.trim().toLowerCase();
        return (entry.matched ?? entry.input).trim().toLowerCase() === command;
      });
      if (index >= 0) {
        consumed.set(deviceId, index + 1);
        complete.add(stage.id);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return complete;
}
