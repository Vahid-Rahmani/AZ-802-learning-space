import assert from "node:assert/strict";
import { completedSimulationStages } from "../lib/ccna-sim/guidance.ts";
import { ccnaSimulationPacks } from "../lib/content/ccna-simulation-packs.ts";

for (const pack of ccnaSimulationPacks) {
  for (const stage of pack.stages) {
    const node = pack.devices.find((node) => node.id === stage.deviceId);
    assert.ok(node, `${pack.labId}: missing stage device`);
    if (pack.devices.some((device) => device.kind === "switch" || device.kind === "router")) {
      assert.ok(node.kind === "switch" || node.kind === "router", `${pack.labId}: IOS check assigned to ${node.kind}`);
    }
    assert.ok(stage.expected.includes(node.label));
  }
}
const stages = [1, 2].map((id) => ({ id: String(id), deviceId: "SW1", command: "show ip interface brief" }));
const valid = { input: "sh ip int br", matched: "show ip interface brief", output: ["Interface IP-Address Status", "Gi0/1 unassigned up"] };
assert.equal(completedSimulationStages(stages, { "PC-A": { entries: [valid] } }).size, 0, "Wrong device must not pass");
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid] } }).size, 1, "One command must not tick two steps");
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid, valid] } }).size, 2);
for (const output of [["% Invalid input detected"], ["Evidence target: show ip interface brief"], []]) {
  assert.equal(completedSimulationStages(stages, { SW1: { entries: [{ ...valid, output }] } }).size, 0);
}
console.log(`Device-aware guidance: ${ccnaSimulationPacks.length} packs and grading regressions passed.`);
