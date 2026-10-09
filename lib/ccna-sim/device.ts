/** The simulated device: one interface table, one VLAN database, and the canonical serializers the
 * `show` commands print. Three roles exist because a lab's devices do not behave alike: a switch
 * sets switchport state, a router addresses routed ports and 802.1Q subinterfaces, and a host keeps
 * only its own address and default gateway. Nothing in this module guesses about a neighbour; the
 * link and reachability model lives in `lab-network.ts`. */
import { managementConfigLines, type SimManagement } from "./management.ts";

export type SimPortMode = "access" | "trunk" | "routed";
export type SimDeviceRole = "switch" | "router" | "host";
export type SimInterfaceKind = "ethernet" | "svi" | "subinterface";

export type SimInterface = {
  name: string;
  kind: SimInterfaceKind;
  mode: SimPortMode;
  accessVlan: number;
  nativeVlan: number;
  allowedVlans: number[] | "all";
  description: string;
  /** True only when the mode was configured, so defaults stay out of the running configuration. */
  modeExplicit: boolean;
  adminUp: boolean;
  address: { ip: string; mask: string } | null;
  /**
   * The IPv6 address of the interface, which is independent of its IPv4 address: a dual-stack
   * interface carries both, and IPv6 has a prefix length rather than a dotted mask.
   */
  ipv6: { address: string; prefix: number } | null;
  /** 802.1Q tag of a router subinterface; 0 when the interface is not a subinterface. */
  dot1q: number;
  /** Parent port of a subinterface, e.g. "Gi0/0" for "Gi0/0.10". */
  parent: string | null;
};

export type SimVlan = { id: number; name: string };
export type SimStaticRoute = { network: string; mask: string; nextHop: string };

export type SimDeviceState = {
  /**
   * The lab node this device belongs to, when the console came from a published topology
   * (`createLabSession`). A console finds itself in the lab model by this id, so `ping` and every
   * graded check agree on which device is which even though the model holds copies of the state.
   */
  id?: string;
  hostname: string;
  role: SimDeviceRole;
  vlans: Map<number, SimVlan>;
  interfaces: SimInterface[];
  /** Default gateway of a host (PC/server) endpoint, which is not an IOS device setting. */
  gateway: string | null;
  /**
   * `ipv6 unicast-routing`: a router forwards IPv6 packets only when this is configured. The flag
   * is part of the device state because a lab can require it, and a graded check has to read it.
   */
  ipv6Routing: boolean;
  /** IPv6 default gateway of a host endpoint, configured on its console like the IPv4 one. */
  ipv6Gateway: string | null;
  management?: SimManagement;
  staticRoutes?: SimStaticRoute[];
};

const switchPortDefaults = () => ({
  kind: "ethernet" as const, mode: "access" as const, accessVlan: 1, nativeVlan: 1,
  allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp: true,
  address: null, ipv6: null, dot1q: 0, parent: null,
});

const routerPortDefaults = (adminUp = false) => ({
  kind: "ethernet" as const, mode: "routed" as const, accessVlan: 1, nativeVlan: 1,
  allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp,
  address: null, ipv6: null, dot1q: 0, parent: null,
});

const hostNicDefaults = () => ({
  kind: "ethernet" as const, mode: "routed" as const, accessVlan: 1, nativeVlan: 1,
  allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp: true,
  address: null, ipv6: null, dot1q: 0, parent: null,
});

const DEFAULT_SWITCH_PORTS = ["Gi0/1", "Gi0/2", "Gi0/3", "Gi0/4"];
const DEFAULT_ROUTER_PORTS = ["Gi0/0", "Gi0/1"];

function vlanDatabase() {
  return new Map<number, SimVlan>([[1, { id: 1, name: "default" }]]);
}

export function createDevice(hostname = "Switch", role: SimDeviceRole = "switch"): SimDeviceState {
  return createDeviceWithPorts(hostname, role, role === "router" ? DEFAULT_ROUTER_PORTS : undefined);
}

/**
 * Build a device whose ports are the ones the lab publishes, so the console can only configure
 * ports that exist in the topology the learner sees.
 */
export function createDeviceWithPorts(hostname: string, role: SimDeviceRole, portLabels?: readonly string[]): SimDeviceState {
  if (role === "host") {
    return { hostname, role, vlans: vlanDatabase(), gateway: null, ipv6Routing: false, ipv6Gateway: null, interfaces: [{ name: portLabels?.[0] ?? "Gi0/0", ...hostNicDefaults() }] };
  }
  if (role === "router") {
    const labels = portLabels?.length ? portLabels : DEFAULT_ROUTER_PORTS;
    return {
      hostname, role, vlans: vlanDatabase(), gateway: null, ipv6Routing: false, ipv6Gateway: null,
      interfaces: labels.map((name) => ({ name, ...routerPortDefaults() })),
    };
  }
  const labels = portLabels?.length ? portLabels : DEFAULT_SWITCH_PORTS;
  return {
    hostname, role, vlans: vlanDatabase(), gateway: null, ipv6Routing: false, ipv6Gateway: null,
    interfaces: [
      ...labels.map((name) => ({ name, ...switchPortDefaults() })),
      { name: "Vlan1", kind: "svi" as const, mode: "routed" as const, accessVlan: 1, nativeVlan: 1, allowedVlans: "all" as const, description: "", modeExplicit: false, adminUp: true, address: null, ipv6: null, dot1q: 0, parent: null },
    ],
  };
}

export function defaultVlanName(id: number) {
  return id === 1 ? "default" : `VLAN${String(id).padStart(4, "0")}`;
}

const prefixes: readonly (readonly [RegExp, string])[] = [
  [/^(ethernet|eth)/i, "Eth"],
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

/**
 * A router subinterface (`Gi0/0.10`) does not exist until it is configured. It is created from its
 * parent, and only a router can own one, so a typo still fails instead of inventing a port.
 */
export function openInterfaceForConfig(device: SimDeviceState, raw: string): { port: SimInterface; created: boolean } | null {
  const existing = findInterface(device, raw);
  if (existing) return { port: existing, created: false };
  const name = normalizeInterfaceName(raw);
  if (!name) return null;
  if (device.role === "switch" && /^Vlan\d{1,4}$/i.test(name)) {
    const id = Number(name.slice(4));
    if (id < 1 || id > 4094) return null;
    const port: SimInterface = { name: `Vlan${id}`, ...routerPortDefaults(), kind: "svi" };
    device.interfaces.push(port);
    return { port, created: true };
  }
  if (device.role !== "router") return null;
  const match = /^(.*)\.(\d{1,4})$/.exec(name);
  if (!match) return null;
  const parent = findInterface(device, match[1]);
  const vlan = Number(match[2]);
  if (!parent || parent.kind !== "ethernet" || vlan < 1 || vlan > 4094) return null;
  const port: SimInterface = {
    name, kind: "subinterface", mode: "routed", accessVlan: 1, nativeVlan: 1, allowedVlans: "all",
    description: "", modeExplicit: false, adminUp: true, address: null, ipv6: null, dot1q: 0, parent: parent.name,
  };
  device.interfaces.push(port);
  return { port, created: true };
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

/** True when a port's allowed list carries the VLAN, which is what a trunk forwards. */
export function portAllowsVlan(port: SimInterface, vlan: number) {
  if (port.mode === "trunk") return port.allowedVlans === "all" || port.allowedVlans.includes(vlan);
  if (port.kind === "ethernet" && port.mode === "access") return port.accessVlan === vlan;
  if (port.kind === "svi") return false;
  return false;
}

function vlanLabel(device: SimDeviceState, id: number) {
  const vlan = device.vlans.get(id);
  return `${id} (${vlan ? vlan.name : defaultVlanName(id)})`;
}

export function portModeText(port: SimInterface) {
  if (port.kind === "svi" || port.mode === "routed") return "routed";
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

/**
 * The cable an interface has, or null when nothing is plugged into it. The lab model supplies this,
 * so a `show` command, the device table on screen and a graded check all read the same link state
 * instead of each guessing from the administrative state.
 */
export type SimCableState = "up" | "down" | "fault" | null;
export type SimCableLookup = (portName: string) => SimCableState;

/** The `show interfaces status` word for a port: admin state first, then its real cable. */
export function portLinkStatus(port: { kind: SimInterfaceKind; adminUp: boolean }, cable: SimCableState): string {
  if (port.kind !== "ethernet") return "connected";
  if (!port.adminUp) return "disabled";
  if (cable === "up") return "connected";
  if (cable === "fault") return "err-disabled";
  return "notconnect";
}

/**
 * `show interfaces trunk`: the ports this device actually trunks, with the native VLAN, the allowed
 * list and the VLANs they carry. It is derived from the port state, so a trunk that lost a VLAN from
 * its allowed list shows that immediately, which is what makes it usable as evidence.
 */
export function trunkLines(device: SimDeviceState): string[] {
  const trunks = device.interfaces.filter((port) => port.kind === "ethernet" && port.mode === "trunk");
  const header = ["Mode     Encapsulation  Status        Native vlan", ...trunks.map((port) => `${port.adminUp && port.mode === "trunk" ? "on" : "off"}      802.1q         ${port.adminUp ? "trunking" : "not-trunking"}      ${port.nativeVlan}`)];
  if (!trunks.length) return ["No ports are in trunk mode on this device."];
  const detail = trunks.flatMap((port) => [
    `Port        Vlans allowed on trunk`,
    `${port.name.padEnd(12)}${port.allowedVlans === "all" ? "1-4094" : port.allowedVlans.map((vlan) => String(vlan)).join(",")}`,
  ]);
  return [...header, "", ...detail];
}

/** The line and protocol columns of `show ip interface brief`, with no cable counted as down. */
export function portLineProtocol(port: { kind: SimInterfaceKind; adminUp: boolean }, cable: SimCableState) {
  if (!port.adminUp) return { line: "administratively down", protocol: "down" };
  if (port.kind !== "ethernet") return { line: "up", protocol: "up" };
  return cable === "up" ? { line: "up", protocol: "up" } : { line: "down", protocol: "down" };
}

export function interfaceStatusLines(device: SimDeviceState, cableOf?: SimCableLookup): string[] {
  const header = ["Port      Name               Status       Vlan       Duplex  Speed Type", "-------------------------------------------------------------------------------"];
  const rows = device.interfaces.map((port) => {
    const status = portLinkStatus(port, cableOf ? cableOf(port.name) : port.adminUp ? "up" : null);
    const vlan = port.kind === "svi" ? "routed" : port.dot1q > 0 ? String(port.dot1q) : port.mode === "trunk" ? "trunk" : String(port.accessVlan);
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

export function ipInterfaceBriefLines(device: SimDeviceState, cableOf?: SimCableLookup): string[] {
  const header = ["Interface              IP-Address      OK? Method Status                Protocol"];
  const rows = device.interfaces.map((port) => {
    const state = portLineProtocol(port, cableOf ? cableOf(port.name) : port.adminUp ? "up" : null);
    return [
      port.name.padEnd(23),
      (port.address?.ip ?? "unassigned").padEnd(16),
      // The OK? column is four characters wide in IOS output, so YES and its method read apart.
      "YES ".padEnd(4),
      (port.address ? "manual" : "unset").padEnd(12),
      state.line.padEnd(22),
      state.protocol,
    ].join("");
  });
  return [...header, ...rows];
}

/**
 * IPv6 arithmetic. An address is parsed to its 128-bit value, so `2001:db8:10::1` and
 * `2001:0db8:0010:0000:0000:0000:0000:0001` are the same address and a prefix comparison is a
 * numeric mask, never a string prefix. Returns null for anything that is not an IPv6 address.
 */
const IPV6_GROUPS = 8;

/** An IPv6 address as its eight 16-bit groups, or null when the text is not an address. */
export function ipv6Groups(value: string): number[] | null {
  const text = value.trim().toLowerCase();
  if (!text || !text.includes(":")) return null;
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) => {
    if (!part) return [] as number[];
    const groups = part.split(":");
    if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
    return groups.map((group) => parseInt(group, 16));
  };
  const left = parse(halves[0]);
  const right = halves.length === 2 ? parse(halves[1]) : null;
  if (!left || (halves.length === 2 && !right)) return null;
  const groups = halves.length === 2
    ? [...left, ...new Array(Math.max(0, IPV6_GROUPS - left.length - right!.length)).fill(0), ...right!]
    : left;
  return groups.length === IPV6_GROUPS ? groups : null;
}

/** The canonical compressed form of an IPv6 address, or null when it is not one. */
export function normalizeIpv6(value: string): string | null {
  const parsed = ipv6Groups(value);
  if (!parsed) return null;
  const groups = parsed;
  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < groups.length; start++) {
    if (groups[start] !== 0) continue;
    let end = start;
    while (end + 1 < groups.length && groups[end + 1] === 0) end++;
    if (end - start + 1 > bestLength) { bestStart = start; bestLength = end - start + 1; }
    start = end;
  }
  const text = (list: number[]) => list.map((group) => group.toString(16)).join(":");
  if (bestLength < 2) return text(groups);
  const left = text(groups.slice(0, bestStart));
  const right = text(groups.slice(bestStart + bestLength));
  return `${left}::${right}`;
}

/** `2001:db8:10::1/64` → the address and its prefix length; null when the text is not one. */
export function parseIpv6Cidr(value: string): { address: string; prefix: number } | null {
  const match = /^([^/]+)\/(\d{1,3})$/.exec(value.trim());
  if (!match) return null;
  const prefix = Number(match[2]);
  if (prefix < 0 || prefix > 128) return null;
  const address = normalizeIpv6(match[1]);
  return address ? { address, prefix } : null;
}

/**
 * True when both addresses are inside the prefix. The comparison is done group by group on the
 * parsed address, so it is a real bitwise prefix test and never a string comparison.
 */
export function sameIpv6Prefix(left: string, right: string, prefix: number) {
  const leftGroups = ipv6Groups(left);
  const rightGroups = ipv6Groups(right);
  if (!leftGroups || !rightGroups || prefix < 0 || prefix > 128) return false;
  const wholeGroups = Math.floor(prefix / 16);
  for (let index = 0; index < wholeGroups; index++) if (leftGroups[index] !== rightGroups[index]) return false;
  const remainder = prefix % 16;
  if (!remainder || wholeGroups >= IPV6_GROUPS) return true;
  const mask = (0xffff << (16 - remainder)) & 0xffff;
  return (leftGroups[wholeGroups] & mask) === (rightGroups[wholeGroups] & mask);
}

/** The IPv6 text of one interface, in the `address/prefix` form IOS prints and accepts. */
export function ipv6Text(port: { ipv6: { address: string; prefix: number } | null }) {
  return port.ipv6 ? `${port.ipv6.address}/${port.ipv6.prefix}` : null;
}

/** `show ipv6 interface brief`: an interface without an IPv6 address prints unassigned, and the
 * link/protocol columns follow the same cable-and-admin rule as the IPv4 brief. */
export function ipv6InterfaceBriefLines(device: SimDeviceState, cableOf?: SimCableLookup): string[] {
  const header = ["Interface              Status                Protocol"];
  const rows = device.interfaces.map((port) => {
    const state = portLineProtocol(port, cableOf ? cableOf(port.name) : port.adminUp ? "up" : null);
    const address = ipv6Text(port);
    return [
      (address ? `${port.name} [${address}]` : port.name).padEnd(23),
      state.line.padEnd(22),
      state.protocol,
    ].join("");
  });
  return [...header, ...rows];
}

/**
 * `show ip route connected`: only the networks this device itself terminates. The table is derived
 * from the interfaces, so a route appears when an address and an up port exist and disappears when
 * the port is shut down — which is what makes it usable as evidence in an addressing lab.
 */
export function connectedRouteLines(device: SimDeviceState): string[] {
  const routes = device.interfaces
    .filter((port) => port.address && port.adminUp)
    .map((port) => ({
      network: networkOf(port.address!.ip, port.address!.mask),
      port: port.name,
    }));
  const header = ["Codes: C - connected, L - local", "", "Gateway of last resort is not set", ""];
  if (!routes.length) return [...header, "% No connected routes: no interface has an address and is up."];
  return [
    ...header,
    ...routes.map((route) => `C    ${route.network} is directly connected, ${route.port}`),
  ];
}

const ipv4ToInt = (ip: string) => ip.split(".").reduce((total, part) => (total << 8) + Number(part), 0) >>> 0;

/** The network address of `ip mask`, used by the connected-route table. */
export function networkOf(ip: string, mask: string) {
  const maskValue = ipv4ToInt(mask);
  const value = (ipv4ToInt(ip) & maskValue) >>> 0;
  return `${(value >>> 24) & 255}.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255} ${mask}`;
}



/** `show ipv6 route connected`, derived from the interfaces the same way as the IPv4 table. */
export function ipv6ConnectedRouteLines(device: SimDeviceState): string[] {
  const routes = device.interfaces.filter((port) => port.ipv6 && port.adminUp).map((port) => ({ prefix: ipv6Text(port)!, port: port.name }));
  const header = ["IPv6 Routing Table - default - connected routes", "Codes: C - Connected, L - Local", ""];
  if (!device.ipv6Routing) return [...header, "% IPv6 routing is not enabled: configure `ipv6 unicast-routing` first."];
  if (!routes.length) return [...header, "% No connected IPv6 routes: no interface has an IPv6 address and is up."];
  return [
    ...header,
    ...routes.map((route) => `C    ${route.prefix} is directly connected, ${route.port}`),
  ];
}

/** The canonical running configuration, byte-stable for the same state, which is what the golden
 * transcripts compare. */
export function configBodyLines(device: SimDeviceState): string[] {
  const body: string[] = ["version 15.2", "no service password-encryption", "!", `hostname ${device.hostname}`, "!"];
  if (device.ipv6Routing) body.push("ipv6 unicast-routing", "!");
  for (const vlan of [...device.vlans.values()].sort((left, right) => left.id - right.id)) {
    if (vlan.id === 1 && vlan.name === "default") continue;
    body.push(`vlan ${vlan.id}`, ` name ${vlan.name}`);
  }
  if (body[body.length - 1] !== "!") body.push("!");
  for (const port of device.interfaces) {
    body.push(`interface ${port.name}`);
    if (port.description) body.push(` description ${port.description}`);
    if (port.kind === "subinterface" && port.dot1q > 0) body.push(` encapsulation dot1Q ${port.dot1q}`);
    if (port.kind === "ethernet" || port.kind === "subinterface") {
      if (port.mode === "trunk" || port.modeExplicit) body.push(` switchport mode ${port.mode === "trunk" ? "trunk" : "access"}`);
      if (port.mode === "trunk") {
        if (port.nativeVlan !== 1) body.push(` switchport trunk native vlan ${port.nativeVlan}`);
        if (port.allowedVlans !== "all") body.push(` switchport trunk allowed vlan ${port.allowedVlans.join(",")}`);
      } else if (port.mode === "access" && port.accessVlan !== 1) {
        body.push(` switchport access vlan ${port.accessVlan}`);
      }
    }
    if (port.address) body.push(` ip address ${port.address.ip} ${port.address.mask}`);
    if (port.ipv6) body.push(` ipv6 address ${port.ipv6.address}/${port.ipv6.prefix}`);
    if (!port.adminUp) body.push(" shutdown");
    body.push("!");
  }
  body.push(...managementConfigLines(device.management));
  if (device.gateway) body.push(`ip default-gateway ${device.gateway}`);
  for (const route of device.staticRoutes ?? []) body.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`);
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
