import type { SimulationStage } from "./topology.ts";

type EvidenceEntry = { input: string; output: string[]; matched?: string | null };
type EvidenceView = { entries: EvidenceEntry[] };

/** Ordered, device-specific evidence; one command cannot tick several steps. */
export function completedSimulationStages(stages: SimulationStage[], views: Record<string, EvidenceView>) {
  const complete = new Set<string>();
  const consumed = new Map<string, number>();
  // Re-entering a check (including an IOS abbreviation) is not fresh evidence.
  // The same check may be useful after a configuration change, but its result
  // must then differ from the result already credited on this device.
  const creditedEvidence = new Set<string>();
  const evidenceKey = (deviceId: string, stage: SimulationStage, entry: EvidenceEntry) => JSON.stringify([
    deviceId, stage.command.trim().toLowerCase(),
    entry.output.map((line) => line.trim().replace(/\s+/g, " ")),
  ]);
  for (const stage of stages) {
    const candidates = stage.deviceId ? [stage.deviceId] : Object.keys(views);
    let found = false;
    for (const deviceId of candidates) {
      const entries = views[deviceId]?.entries ?? [];
      const index = entries.findIndex((entry, index) => {
        if (index < (consumed.get(deviceId) ?? 0)) return false;
        if (!entry.output.length || entry.output.some((line) => /^\s*%|Evidence target:|Run this check in the simulator/.test(line))) return false;
        const command = stage.command.trim().toLowerCase();
        if (creditedEvidence.has(evidenceKey(deviceId, stage, entry))) return false;
        return (entry.matched ?? entry.input).trim().toLowerCase() === command;
      });
      if (index >= 0) {
        consumed.set(deviceId, index + 1);
        creditedEvidence.add(evidenceKey(deviceId, stage, entries[index]));
        complete.add(stage.id);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return complete;
}
