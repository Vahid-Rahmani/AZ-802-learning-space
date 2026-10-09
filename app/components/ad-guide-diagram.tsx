"use client";

import { useId } from "react";
import type { AdVisualDiagram } from "@/lib/content/ad-visual-guide-types";

/** Authored learning diagrams, never presented as screenshots or live server state. */
export function AdGuideDiagram({ diagram }: { diagram: AdVisualDiagram }) {
  const marker = useId();
  const lines = (value: string, limit: number) => {
    const result: string[] = [];
    for (const word of value.split(/\s+/).flatMap(word => word.match(new RegExp(`.{1,${limit}}`, "g")) ?? [])) {
      if (!result.length || result[result.length - 1].length + word.length + 1 > limit) result.push(word);
      else result[result.length - 1] += ` ${word}`;
    }
    return result;
  };
  const measured = diagram.nodes.map(node => {
    const label = lines(node.label, 29);
    const detail = node.detail ? lines(node.detail, 39) : [];
    return { node, label, detail, height: Math.max(72, 30 + label.length * 18 + detail.length * 14) };
  });
  const boxes = measured.map((box, index) => ({ ...box, y: 24 + measured.slice(0, index).reduce((sum, previous) => sum + previous.height + 32, 0) }));
  const height = 24 + measured.reduce((sum, box) => sum + box.height + 32, 0);
  const positions = new Map(boxes.map(box => [box.node.id, box.y + box.height / 2]));
  return <figure className="ad-guide-diagram">
    <figcaption>{diagram.title}<span>Learning diagram · not a server screenshot</span></figcaption>
    <svg viewBox={`0 0 360 ${height}`} role="img" aria-label={diagram.title}>
      <title>{diagram.title}</title>
      <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#5eead4" /></marker></defs>
      {diagram.edges.map((edge, index) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (from === undefined || to === undefined) return null;
        const bend = 332 + (index % 3) * 7;
        return <path key={`${index}:${edge.from}:${edge.to}`} d={`M 308 ${from} C ${bend} ${from}, ${bend} ${to}, 308 ${to}`} stroke="#5eead4" strokeWidth="2" fill="none" markerEnd={`url(#${marker})`} />;
      })}
      {boxes.map(box => <g key={box.node.id}>
        <rect x="12" y={box.y} width="296" height={box.height} rx="12" fill="#132535" stroke="#5eead480" />
        <text x="26" y={box.y + 26} fill="#e8edf5" fontSize="16" fontWeight="600">
          {box.label.map((line, row) => <tspan key={row} x="26" dy={row ? 18 : 0}>{line}</tspan>)}
        </text>
        {box.detail.length > 0 && <text x="26" y={box.y + 38 + box.label.length * 18} fill="#a8c1cf" fontSize="12">{box.detail.map((line, row) => <tspan key={row} x="26" dy={row ? 14 : 0}>{line}</tspan>)}</text>}
      </g>)}
    </svg>
    <ul className="ad-guide-connections">{diagram.edges.map((edge, index) => <li key={index}>
      <strong>{diagram.nodes.find(node => node.id === edge.from)?.label}</strong> → <strong>{diagram.nodes.find(node => node.id === edge.to)?.label}</strong>{edge.label ? ` · ${edge.label}` : ""}
    </li>)}</ul>
  </figure>;
}
