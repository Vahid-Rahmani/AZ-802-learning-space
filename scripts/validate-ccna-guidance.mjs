import assert from "node:assert/strict";
import { completedSimulationStages } from "../lib/ccna-sim/guidance.ts";
import { ccnaSimulationPacks } from "../lib/content/ccna-simulation-packs.ts";

for (const pack of ccnaSimulationPacks) {
  const diagnosticKeys = new Set();
  for (const stage of pack.stages) {
    const node = pack.devices.find((node) => node.id === stage.deviceId);
    assert.ok(node, `${pack.labId}: missing stage device`);
    if (pack.devices.some((device) => device.kind === "switch" || device.kind === "router")) {
      assert.ok(node.kind === "switch" || node.kind === "router", `${pack.labId}: IOS check assigned to ${node.kind}`);
    }
    assert.ok(stage.expected.includes(node.label));
    const key = `${stage.deviceId}:${stage.command}`;
    if (stage.id.startsWith("verify-")) assert.ok(!diagnosticKeys.has(key), `${pack.labId}: duplicate diagnostic stage`);
    diagnosticKeys.add(key);
  }
}
const stages = [1, 2].map((id) => ({ id: String(id), deviceId: "SW1", command: "show ip interface brief" }));
const valid = { input: "sh ip int br", matched: "show ip interface brief", output: ["Interface IP-Address Status", "Gi0/1 unassigned up"] };
assert.equal(completedSimulationStages(stages, { "PC-A": { entries: [valid] } }).size, 0, "Wrong device must not pass");
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid] } }).size, 1, "One command must not tick two steps");
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid, valid, valid] } }).size, 1, "Three unchanged checks are still one achievement");
const changed = { ...valid, output: ["Interface IP-Address Status", "Gi0/1 192.168.1.1 up"] };
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid, valid, changed] } }).size, 2, "Rechecking changed device state is fresh evidence");
const canonical = { ...valid, input: "show ip interface brief" };
assert.equal(completedSimulationStages(stages, { SW1: { entries: [valid, canonical] } }).size, 1, "Abbreviations cannot bypass duplicate evidence protection");
assert.equal(completedSimulationStages([{ ...stages[0] }, { ...stages[1], deviceId: "SW2" }], { SW1: { entries: [valid] }, SW2: { entries: [valid] } }).size, 2, "Different devices have distinct evidence");
for (const output of [["% Invalid input detected"], ["Evidence target: show ip interface brief"], []]) {
  assert.equal(completedSimulationStages(stages, { SW1: { entries: [{ ...valid, output }] } }).size, 0);
}
console.log(`Device-aware guidance: ${ccnaSimulationPacks.length} packs and grading regressions passed.`);
