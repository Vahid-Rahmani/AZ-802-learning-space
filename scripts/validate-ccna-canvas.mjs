import assert from "node:assert/strict";
import { cloneSimulationState, moveSimulationNode, updateSimulationViewport, zoomSimulationViewport, fitSimulationViewport, simulationCanvasHeight } from "../lib/ccna-sim/topology.ts";
import { simulationCableCurve } from "../lib/ccna-sim/cable-geometry.ts";
import { simulationEndpointPoint, simulationPortPoint } from "../lib/ccna-sim/port-geometry.ts";
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
  for (const link of state.links) {
    const source = simulationEndpointPoint(state, link.source);
    const target = simulationEndpointPoint(state, link.target);
    assert.ok(source && target, `${pack.id}: unresolved cable endpoint`);
    for (const point of [source, target]) assert.ok(Object.values(point).every(Number.isFinite));
    const node = state.nodes.find((item) => item.id === link.source.deviceId);
    assert.deepEqual(source, simulationPortPoint(state, node, node.ports.findIndex((port) => port.id === link.source.portId)));
    const curve = simulationCableCurve(source, target);
    assert.ok(curve.path.startsWith(`M ${source.x} ${source.y} C `));
    assert.ok(curve.path.endsWith(`${target.x} ${target.y}`));
    const reverseLabel = simulationCableCurve(target, source).label;
    assert.ok(Math.abs(curve.label.x - reverseLabel.x) < 1e-8 && Math.abs(curve.label.y - reverseLabel.y) < 1e-8);
    const rightPeer = moveSimulationNode(state, link.target.deviceId, node.x + 500, node.y);
    const leftPeer = moveSimulationNode(state, link.target.deviceId, node.x - 500, node.y);
    assert.equal(simulationEndpointPoint(rightPeer, link.source).nx, 1, 'port must face its peer to the right');
    assert.equal(simulationEndpointPoint(leftPeer, link.source).nx, -1, 'port must follow its peer to the left');
  }
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
for (const target of [{ x: 30, y: 500 }, { x: 20, y: -450 }, { x: 600, y: 30 }, { x: -400, y: -120 }]) {
  const curve = simulationCableCurve({ x: 30, y: 30 }, target);
  assert.ok(curve.path.startsWith("M 30 30 C "));
  assert.ok(curve.path.endsWith(`${target.x} ${target.y}`));
  assert.ok(Number.isFinite(curve.label.x) && Number.isFinite(curve.label.y));
}
const forward = simulationCableCurve({ x: 30, y: 30 }, { x: 30, y: 500 });
const reverse = simulationCableCurve({ x: 30, y: 500 }, { x: 30, y: 30 });
assert.deepEqual(forward.label, reverse.label, "reversing a cable flipped its route to the other side");
console.log(`Canvas checks passed: centred zoom, unrestricted pan/move, fit for ${ccnaSimulationPackByLabId.size} packs, adaptive cable and label.`);
