import type { SimLabPack } from "../../ccna-sim/lab.ts";
import { createCcnaAddressingPack } from "./ccna-addressing.ts";
import { createCcnaVlansPack } from "./ccna-vlans.ts";
import { createCcnaTopology017Pack } from "./ccna-topology-017.ts";

/**
 * The authored lab packs, one file per lab, named after the lab it belongs to. A lab that has an
 * entry here is graded from device state by its own steps; every other lab keeps the starter-graph
 * adapter until its own pack is authored in its band's batch.
 *
 * The packs are built once and handed out through functions. A pack file exports a factory, not a
 * finished object, and this module does not export the built array: the repository's structural gate
 * walks these files and counts pack objects, so a lab must resolve to exactly one pack rather than
 * one per export path. `lib/content/ccna-simulation-packs.ts` is that one place, where the pack is
 * attached to the lab the workspace renders.
 *
 * Adding a pack is a two-line change: import its factory and call it here. `validate:ccna-sim` then
 * replays its solution headlessly and refuses to pass if any graded step, or any negative case,
 * disagrees.
 */
const packs: readonly SimLabPack[] = [createCcnaAddressingPack(), createCcnaVlansPack(), createCcnaTopology017Pack()];

const packsByLabId = new Map(packs.map((pack) => [pack.labId, pack]));

/** Every authored pack, for the headless replay and the pack-directory contract. */
export function listAuthoredLabPacks(): readonly SimLabPack[] {
  return packs;
}

/** The lab ids that own an authored pack, which is what the pack-directory contract compares. */
export const authoredPackLabIds: readonly string[] = packs.map((pack) => pack.labId);

export function getAuthoredLabPack(labId: string): SimLabPack | null {
  return packsByLabId.get(labId) ?? null;
}
