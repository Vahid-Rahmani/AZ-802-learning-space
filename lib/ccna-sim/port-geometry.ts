import type { SimulationEndpoint, SimulationNode, SimulationState } from "./topology.ts";

type Side = "left" | "right" | "top" | "bottom";

function sideFor(state: SimulationState, node: SimulationNode, portId: string): Side {
  const link = state.links.find((candidate) => (candidate.source.deviceId === node.id && candidate.source.portId === portId)
    || (candidate.target.deviceId === node.id && candidate.target.portId === portId));
  const far = link && (link.source.deviceId === node.id ? link.target : link.source);
  const peer = far && state.nodes.find((candidate) => candidate.id === far.deviceId);
  if (!peer) return "bottom";
  const dx = peer.x - node.x;
  const dy = peer.y - node.y;
  return Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "top" : "bottom";
}

/** Ports remain their original endpoints; only their visual anchoring follows device positions. */
export function simulationPortPoint(state: SimulationState, node: SimulationNode, index: number) {
  const side = sideFor(state, node, node.ports[index].id);
  const siblings = node.ports.filter((port) => sideFor(state, node, port.id) === side);
  const slot = siblings.findIndex((port) => port.id === node.ports[index].id);
  const columns = Math.min(4, siblings.length);
  const row = Math.floor(slot / columns);
  const offset = (slot % columns - (Math.min(columns, siblings.length - row * columns) - 1) / 2) * 48;
  if (side === "left" || side === "right") return { x: node.x + (side === "left" ? -94 : 94) + row * (side === "left" ? -48 : 48), y: node.y - 12 + offset * .5, nx: side === "left" ? -1 : 1, ny: 0 };
  return { x: node.x + offset, y: node.y + (side === "top" ? -72 - row * 22 : 78 + row * 22), nx: 0, ny: side === "top" ? -1 : 1 };
}

export function simulationEndpointPoint(state: SimulationState, endpoint: SimulationEndpoint) {
  const node = state.nodes.find((candidate) => candidate.id === endpoint.deviceId);
  const index = node?.ports.findIndex((port) => port.id === endpoint.portId) ?? -1;
  return !node || index < 0 ? null : simulationPortPoint(state, node, index);
}
