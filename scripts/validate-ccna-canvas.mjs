import assert from "node:assert/strict";
import { cloneSimulationState, moveSimulationNode, updateSimulationViewport, zoomSimulationViewport, fitSimulationViewport, simulationCanvasHeight } from "../lib/ccna-sim/topology.ts";
import { simulationCableCurve } from "../lib/ccna-sim/cable-geometry.ts";
import { ccnaSimulationPackByLabId } from "../lib/content/ccna-simulation-packs.ts";

const viewport = { scale: 1, x: -900, y: 800 };
const anchor = { x: 380, y: 250 };
for (const scale of [.2, .5, 1.5, 3]) {
  const zoomed = zoomSimulationViewport(viewport, scale, anchor);
  assert.ok(Math.abs((anchor.x - zoomed.x) / zoomed.scale - (anchor.x - viewport.x)) < 1e-8);
  assert.ok(Math.abs((anchor.y - zoomed.y) / zoomed.scale - (anchor.y - viewport.y)) < 1e-8);
}
for (const pack of ccnaSimulationPackByLabId.values()) {
  let state = cloneSimulationState(pack);
  state = updateSimulationViewport(state, { x: 1200, y: -900, scale: .2 });
  assert.equal(state.viewport.x, 1200);
  assert.equal(state.viewport.y, -900);
  const node = state.nodes[0];
  state = moveSimulationNode(state, node.id, -400, 1000);
  assert.equal(state.nodes[0].x, -400);
  assert.equal(state.nodes[0].y, 1000);
  const fit = fitSimulationViewport(state.nodes, 760, simulationCanvasHeight(pack.devices));
  for (const item of state.nodes) {
    const x = item.x * fit.scale + fit.x;
    const y = item.y * fit.scale + fit.y;
    assert.ok(x >= 0 && x <= 760 && y >= 0 && y <= simulationCanvasHeight(pack.devices), pack.id);
  }
}
const first = simulationCableCurve({ x: 30, y: 30 }, { x: 350, y: 150 });
const moved = simulationCableCurve({ x: 30, y: 30 }, { x: -100, y: 450 });
assert.notEqual(first.path, moved.path);
assert.notDeepEqual(first.label, moved.label);
assert.ok(moved.path.endsWith("-100 450"));
console.log(`Canvas checks passed: centred zoom, unrestricted pan/move, fit for ${ccnaSimulationPackByLabId.size} packs, adaptive cable and label.`);
