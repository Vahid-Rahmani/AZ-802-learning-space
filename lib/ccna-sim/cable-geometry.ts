type Point = { x: number; y: number };

/** Both ports leave the underside of a card. Route away from it before bending. */
export function simulationCableCurve(source: Point, target: Point) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const escape = Math.min(150, Math.max(35, Math.hypot(dx, dy) * .25));
  const vertical = Math.abs(dy) > Math.abs(dx) * 1.2;
  const side = dx < 0 ? -1 : 1;
  const lateral = vertical ? side * escape : 0;
  const first = { x: source.x + lateral, y: source.y + escape };
  const second = { x: target.x + lateral, y: target.y + escape };
  return {
    path: `M ${source.x} ${source.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`,
    label: { x: (source.x + 3 * first.x + 3 * second.x + target.x) / 8, y: (source.y + 3 * first.y + 3 * second.y + target.y) / 8 },
  };
}
