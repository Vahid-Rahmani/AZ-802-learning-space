type Point = { x: number; y: number; nx?: number; ny?: number };

/** Follow each port's outward direction; retain legacy bottom-port routing for callers without normals. */
export function simulationCableCurve(source: Point, target: Point) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  if (source.nx !== undefined && target.nx !== undefined) {
    const bend = Math.min(72, Math.max(24, Math.hypot(dx, dy) * .18));
    const first = { x: source.x + source.nx * bend, y: source.y + (source.ny ?? 0) * bend };
    const second = { x: target.x + target.nx * bend, y: target.y + (target.ny ?? 0) * bend };
    return {
      path: `M ${source.x} ${source.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`,
      label: { x: (source.x + 3 * first.x + 3 * second.x + target.x) / 8, y: (source.y + 3 * first.y + 3 * second.y + target.y) / 8 },
    };
  }
  const escape = Math.min(150, Math.max(35, Math.hypot(dx, dy) * .25));
  const vertical = Math.abs(dy) > Math.abs(dx) * 1.2;
  // Keep vertical runs outside the cards instead of cutting through the lower
  // device. Choose the same side even when source/target order is reversed.
  const upper = source.y <= target.y ? source : target;
  const lower = source.y <= target.y ? target : source;
  const side = lower.x < upper.x ? -1 : 1;
  const lateral = vertical ? side * Math.max(160, escape) : 0;
  const first = { x: source.x + lateral, y: source.y + escape };
  const second = { x: target.x + lateral, y: target.y + escape };
  return {
    path: `M ${source.x} ${source.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`,
    label: { x: (source.x + 3 * first.x + 3 * second.x + target.x) / 8, y: (source.y + 3 * first.y + 3 * second.y + target.y) / 8 },
  };
}
