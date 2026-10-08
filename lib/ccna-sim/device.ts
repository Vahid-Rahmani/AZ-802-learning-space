/** The simulated device: one interface table, one VLAN database, and the canonical serializers the
 * `show` commands print. Slice S1 keeps Layer 2 state and addressing here; link and peer behaviour
 * arrives with slice S2, so nothing in this module guesses about a neighbour. */
export type SimPortMode = "access" | "trunk" | "routed";

export type SimInterface = {
  name: string;
  kind: "ethernet" | "svi";
  mode: SimPortMode;
  accessVlan: number;
  nativeVlan: number;
  allowedVlans: number[] | "all";
  description: string;
  /** True only when the mode was configured, so defaults stay out of the running configuration. */
  modeExplicit: boolean;
  adminUp: boolean;
  address: { ip: string; mask: string } | null;
};

export type SimVlan = { id: number; name: string };

export type SimDeviceState = {
  hostname: string;
  vlans: Map<number, SimVlan>;
  interfaces: SimInterface[];
};

const ethernetPorts = ["Gi0/1", "Gi0/2", "Gi0/3", "Gi0/4"];

export function createDevice(hostname = "Switch"): SimDeviceState {
  return {
    hostname,
    vlans: new Map([[1, { id: 1, name: "default" }]]),
    interfaces: [
      ...ethernetPorts.map((name) => ({
        name, kind: "ethernet" as const, mode: "access" as const, accessVlan: 1, nativeVlan: 1,
        allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp: true, address: null,
      })),
      { name: "Vlan1", kind: "svi" as const, mode: "routed" as const, accessVlan: 1, nativeVlan: 1, allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp: true, address: null },
    ],
  };
}

export function defaultVlanName(id: number) {
  return id === 1 ? "default" : `VLAN${String(id).padStart(4, "0")}`;
}

const prefixes: readonly (readonly [RegExp, string])[] = [
  [/^(gi|gigabitethernet)/i, "Gi"],
  [/^(fa|fastethernet)/i, "Fa"],
  [/^vl(an)?/i, "Vlan"],
];

export function normalizeInterfaceName(raw: string) {
  for (const [pattern, prefix] of prefixes) {
    const match = pattern.exec(raw);
    if (!match) continue;
    const rest = raw.slice(match[0].length).trim();
    if (rest) return `${prefix}${rest}`;
  }
  return null;
}

export function findInterface(device: SimDeviceState, raw: string) {
  const name = normalizeInterfaceName(raw);
  if (!name) return undefined;
  return device.interfaces.find((port) => port.name.toLowerCase() === name.toLowerCase());
}

/** `gi0/1-2,gi0/4` expands the way `interface range` does, and unknown ports are reported rather
 * than silently dropped, so a typo cannot look like a successful configuration. */
export function expandInterfaceRange(device: SimDeviceState, raw: string) {
  const names: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    const range = /^(.*?)(\d+)\s*-\s*(\d+)$/.exec(trimmed);
    if (!range) { names.push(trimmed); continue; }
    for (let index = Number(range[2]); index <= Number(range[3]); index++) names.push(`${range[1]}${index}`);
  }
  const ports: SimInterface[] = [];
  const unknown: string[] = [];
  for (const name of names) {
    const port = findInterface(device, name);
    if (!port) { unknown.push(name); continue; }
    if (!ports.includes(port)) ports.push(port);
  }
  return { ports, unknown };
}

export function createVlan(device: SimDeviceState, id: number) {
  const existing = device.vlans.get(id);
  if (existing) return existing;
  const vlan = { id, name: defaultVlanName(id) };
  device.vlans.set(id, vlan);
  return vlan;
}

export function allowedVlanText(port: SimInterface) {
  return port.allowedVlans === "all" ? "ALL" : port.allowedVlans.join(",");
}

function vlanLabel(device: SimDeviceState, id: number) {
  const vlan = device.vlans.get(id);
  return `${id} (${vlan ? vlan.name : defaultVlanName(id)})`;
}

export function portModeText(port: SimInterface) {
  if (port.kind === "svi") return "routed";
  return port.mode;
}

export function vlanBriefLines(device: SimDeviceState): string[] {
  const header = ["VLAN Name                             Status    Ports", "---- -------------------------------- --------- -------------------------------"];
  const rows = [...device.vlans.values()].sort((left, right) => left.id - right.id).map((vlan) => {
    const ports = device.interfaces.filter((port) => port.kind === "ethernet" && port.mode === "access" && port.accessVlan === vlan.id).map((port) => port.name);
    return `${String(vlan.id).padEnd(5)}${vlan.name.padEnd(33)}active    ${ports.join(", ")}`;
  });
  return [...header, ...rows];
}

export function interfaceStatusLines(device: SimDeviceState): string[] {
  const header = ["Port      Name               Status       Vlan       Duplex  Speed Type", "-------------------------------------------------------------------------------"];
  const rows = device.interfaces.map((port) => {
    const status = port.adminUp ? "connected" : "disabled";
    const vlan = port.kind === "svi" ? "routed" : port.mode === "trunk" ? "trunk" : String(port.accessVlan);
    return [
      port.name.padEnd(10),
      (port.description || "").slice(0, 18).padEnd(19),
      status.padEnd(13),
      vlan.padEnd(11),
      "auto".padEnd(8),
      "auto".padEnd(6),
      port.kind === "svi" ? "SVI" : "10/100/1000BaseTX",
    ].join("");
  });
  return [...header, ...rows];
}

export function switchportDetailLines(device: SimDeviceState, port: SimInterface): string[] {
  return [
    `Name: ${port.name}`,
    "Switchport: Enabled",
    `Administrative Mode: ${port.mode === "trunk" ? "trunk" : "static access"}`,
    `Operational Mode: ${port.mode === "trunk" ? "trunk" : "static access"}`,
    "Administrative Trunking Encapsulation: dot1q",
    "Operational Trunking Encapsulation: dot1q",
    "Negotiation of Trunking: Off",
    `Access Mode VLAN: ${vlanLabel(device, port.accessVlan)}`,
    `Trunking Native Mode VLAN: ${vlanLabel(device, port.nativeVlan)}`,
    `Trunking VLANs Enabled: ${allowedVlanText(port)}`,
  ];
}

export function ipInterfaceBriefLines(device: SimDeviceState): string[] {
  const header = ["Interface              IP-Address      OK? Method Status                Protocol"];
  const rows = device.interfaces.map((port) => [
    port.name.padEnd(23),
    (port.address?.ip ?? "unassigned").padEnd(16),
    port.address ? "YES" : "YES",
    (port.address ? "manual" : "unset").padEnd(12),
    (port.adminUp ? "up" : "administratively down").padEnd(22),
    port.adminUp ? "up" : "down",
  ].join(""));
  return [...header, ...rows];
}

/** The canonical running configuration, byte-stable for the same state, which is what the golden
 * transcripts compare. */
export function configBodyLines(device: SimDeviceState): string[] {
  const body: string[] = ["version 15.2", "no service password-encryption", "!", `hostname ${device.hostname}`, "!"];
  for (const vlan of [...device.vlans.values()].sort((left, right) => left.id - right.id)) {
    if (vlan.id === 1 && vlan.name === "default") continue;
    body.push(`vlan ${vlan.id}`, ` name ${vlan.name}`);
  }
  if (body[body.length - 1] !== "!") body.push("!");
  for (const port of device.interfaces) {
    body.push(`interface ${port.name}`);
    if (port.description) body.push(` description ${port.description}`);
    if (port.kind === "ethernet") {
      if (port.mode === "trunk" || port.modeExplicit) body.push(` switchport mode ${port.mode === "trunk" ? "trunk" : "access"}`);
      if (port.mode === "trunk") {
        if (port.nativeVlan !== 1) body.push(` switchport trunk native vlan ${port.nativeVlan}`);
        if (port.allowedVlans !== "all") body.push(` switchport trunk allowed vlan ${port.allowedVlans.join(",")}`);
      } else if (port.accessVlan !== 1) {
        body.push(` switchport access vlan ${port.accessVlan}`);
      }
    }
    if (port.address) body.push(` ip address ${port.address.ip} ${port.address.mask}`);
    if (!port.adminUp) body.push(" shutdown");
    body.push("!");
  }
  body.push("end");
  return body;
}

export function configByteCount(lines: readonly string[]) {
  return lines.reduce((total, line) => total + line.length + 1, 0);
}

export function runningConfigLines(device: SimDeviceState): string[] {
  const body = configBodyLines(device);
  return ["Building configuration...", "", `Current configuration : ${configByteCount(body)} bytes`, "!", ...body];
}
