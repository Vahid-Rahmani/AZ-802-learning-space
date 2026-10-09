import type { LabModel } from "./lab.ts";
import type { SimulationStage } from "./topology.ts";

export type StageOutcome = { ok: boolean; detail: string };

/**
 * Stages that declare a check are graded from the live device model and nothing else. Typing the
 * same command twice, typing it on another console, or configuring the wrong port cannot satisfy
 * them, because the predicate reads the state the learner actually produced.
 *
 * There is deliberately no other way for a stage to be credited. The engine no longer credits a step
 * from a terminal transcript: a `show` command that changes nothing is evidence for the learner to
 * read, never proof that a lab requirement was met, and a lab without a predicate per step is shown
 * as unauthored rather than as completed.
 */
export function checkedStageResults(stages: SimulationStage[], lab: LabModel | null) {
  const results = new Map<string, StageOutcome>();
  if (!lab) return results;
  for (const stage of stages) {
    if (!stage.check) continue;
    try {
      results.set(stage.id, stage.check(lab));
    } catch (error) {
      results.set(stage.id, { ok: false, detail: `This check could not read the model: ${error instanceof Error ? error.message : String(error)}` });
    }
  }
  return results;
}
