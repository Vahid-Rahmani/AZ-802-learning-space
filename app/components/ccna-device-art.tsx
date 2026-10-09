import type { SimulationDeviceKind } from "@/lib/ccna-sim/topology";

/** Original vector silhouettes, not screenshots or vendor artwork. */
export function DeviceGlyph({ kind, large = false }: { kind: SimulationDeviceKind; large?: boolean }) {
  const common = { className: `ccna-simulation-device-art is-${kind}${large ? " is-large" : ""}`, viewBox: "0 0 120 90", width: large ? 132 : 32, height: large ? 99 : 24, "aria-hidden": true } as const;
  const top = "var(--device-top, #285569)";
  const face = "var(--device-face, #173c50)";
  const side = "var(--device-side, #102b3a)";
  const detail = "var(--device-detail, #a0e7f4)";
  if (kind === "router") return <svg {...common}>
    <path fill={face} d="M20 32v23c0 11 18 20 40 20s40-9 40-20V32Z" />
    <ellipse fill={top} cx="60" cy="32" rx="40" ry="20" />
    <path className="device-detail" d="m43 23 10 5-10 5m10-5H31m46 13-10-5 10-5m-10 5h22M55 17l5 5 5-5m-5 5v-9M65 47l-5-5-5 5m5-5v9" />
    <path className="device-seam" d="M26 54c9 13 59 13 68 0" />
    <circle fill={detail} cx="80" cy="60" r="2" />
  </svg>;
  if (kind === "switch") return <svg {...common}>
    <path fill={side} d="m12 31 23 15v23L12 54Z" />
    <path fill={face} d="m35 46 73-14v23L35 69Z" />
    <path fill={top} d="m12 31 73-14 23 15-73 14Z" />
    {[0, 1, 2, 3, 4, 5].map((index) => <path key={index} fill="#081b28" d={`m${42 + index * 10} ${49 - index * 2} 6-1v7l-6 1Z`} />)}
    <path className="device-detail" d="m35 30 15-3m-7-4 7 4-5 5m19 2-15 3m7 4-7-4 5-5" />
    <circle fill={detail} cx="98" cy="47" r="2" />
  </svg>;
  if (kind === "pc") return <svg {...common}>
    <path fill={side} d="m25 12 9-5 66 5v48l-9 5-66-5Z" />
    <rect fill={face} x="24" y="12" width="67" height="48" rx="4" />
    <rect fill="#102a3b" x="29" y="17" width="57" height="37" rx="2" />
    <path fill={top} stroke="none" d="m30 18 55 0-55 35Z" />
    <path fill={side} d="M51 60v12l-18 7 31 5 21-7-22-5V60Z" />
    <path className="device-detail" d="m39 30 7 6-7 6m14 0h12" />
    <circle fill={detail} cx="83" cy="57" r="1.3" />
  </svg>;
  if (kind === "server") return <svg {...common}>
    <path fill={top} d="m34 14 17-8 38 8-17 8Z" />
    <path fill={side} d="m72 22 17-8v59l-17 9Z" />
    <path fill={face} d="m34 14 38 8v60l-38-8Z" />
    {[0, 1, 2].map((index) => <g key={index}>
      <path fill={side} d={`m40 ${23 + index * 16} 25 5v10l-25-5Z`} />
      <circle fill={detail} cx="45" cy={28 + index * 16} r="1.6" />
      <path className="device-detail" d={`m51 ${28 + index * 16} 9 2`} />
    </g>)}
  </svg>;
  if (kind === "access-point") return <svg {...common}>
    <path fill={side} d="m22 53 35-8 39 13v11l-35 8-39-13Z" />
    <path fill={top} d="m22 53 35-8 39 13-35 8Z" />
    <path className="device-detail" d="M34 49V28m47 26V33M43 29a24 24 0 0 1 34 0M49 36a15 15 0 0 1 22 0M55 43a7 7 0 0 1 10 0" />
    <circle fill={detail} cx="60" cy="49" r="2" />
  </svg>;
  if (kind === "firewall") return <svg {...common}>
    <path fill={top} d="m26 22 15-9 53 15-15 9Z" />
    <path fill={side} d="m79 37 15-9v41l-15 9Z" />
    <path fill={face} d="m26 22 53 15v41L26 63Z" />
    <path className="device-seam" d="m27 36 51 15m-51 0 51 15M44 27v14m19-9v14M36 40v14m20-9v15M44 57v11m19-6v11" />
    <path fill={side} d="m59 31 12 7v12c0 8-5 12-12 15-7-6-11-11-11-18V34Z" />
    <path className="device-detail" d="m54 46 5 6 7-10" />
  </svg>;
  return <svg {...common}>
    <path fill={face} d="M29 69h58c15 0 21-12 17-23-3-8-9-12-17-12-3-19-29-27-42-11-16-7-29 6-28 19-18 5-17 27 12 27Z" />
    <path className="device-detail" d="m45 49 8-8 8 8m-8-8v19m18-16v19m-8-8 8 8 8-8" />
  </svg>;
}
