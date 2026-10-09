import { findInterface, normalizeIpv6, portAllowsVlan, sameIpv6Prefix, type SimDeviceState, type SimDeviceRole, type SimInterface } from "./device.ts";

/**
 * The lab network: the devices a lab publishes, the cables between them, and the only place where a
 * connectivity answer comes from. A ping is computed from the live model — access VLANs, trunk
 * allowed lists, 802.1Q subinterfaces, interface state and each host's default gateway — so an
 * unplugged cable, a missing VLAN or a wrong address can never produce a fixed reply.
 *
 * IPv4 supports connected and static routes; IPv6 supports connected routing. Unsupported
 * protocols never fabricate an adjacency, a learned route or a successful packet.
 */
export type LabLink = {
  id: string;
  a: { deviceId: string; port: string };
  b: { deviceId: string; port: string };
  status?: "up" | "down" | "fault";
};

export type LabDevice = {
  id: string;
  label: string;
  role: SimDeviceRole;
  state: SimDeviceState;
  /** The saved startup configuration of this console, when it has one. */
  startup?: string[] | null;
};
export type LabNetwork = { devices: LabDevice[]; links: LabLink[] };

export type PingOutcome = {
  ok: boolean;
  /** IOS-shaped reply lines the console prints. */
  lines: string[];
  /** Why the path failed, in one sentence, for the guide to show beside the step. */
  reason: string;
};

const ipToInt = (ip: string) => ip.split(".").reduce((total, part) => (total << 8) + Number(part), 0) >>> 0;

/**
 * True when both addresses are inside the same subnet described by `mask`.
 *
 * The mask is used as the dotted value it is. Counting only full 255 octets would turn every mask
 * that is not /8, /16, /24 or /32 into a shorter one, so a /26 lab computed its neighbours as if the
 * boundary sat at /24 and an address outside the block looked reachable.
 */
export function sameSubnet(left: string, right: string, mask: string) {
  const maskValue = ipToInt(mask);
  return ((ipToInt(left) & maskValue) >>> 0) === ((ipToInt(right) & maskValue) >>> 0);
}

const deviceOf = (network: LabNetwork, id: string) => network.devices.find((device) => device.id === id);
const portOf = (device: LabDevice, name: string) => findInterface(device.state, name);
const isUp = (device: LabDevice, port: SimInterface) => port.adminUp && (port.parent === null || Boolean(portOf(device, port.parent)?.adminUp));

/**
 * A switch forwards a VLAN only when the port carries it and the switch actually holds that VLAN in
 * its database. A port assigned to a VLAN the switch never created does not pass traffic.
 */
const switchPortCarries = (device: LabDevice, port: SimInterface, vlan: number) =>
  device.state.role === "switch" && device.state.vlans.has(vlan) && portAllowsVlan(port, vlan);

function linkFor(network: LabNetwork, deviceId: string, portName: string) {
  return network.links.find((link) =>
    (link.id && link.a.deviceId === deviceId && link.a.port.toLowerCase() === portName.toLowerCase())
    || (link.a.deviceId === deviceId && link.a.port.toLowerCase() === portName.toLowerCase())
    || (link.b.deviceId === deviceId && link.b.port.toLowerCase() === portName.toLowerCase())) ?? null;
}

/** The device and port on the far side of the cable plugged into this endpoint. */
export function neighbourOf(network: LabNetwork, deviceId: string, portName: string) {
  const link = linkFor(network, deviceId, portName);
  if (!link || link.status === "down" || link.status === "fault") return null;
  const onA = link.a.deviceId === deviceId && link.a.port.toLowerCase() === portName.toLowerCase();
  const far = onA ? link.b : link.a;
  const device = deviceOf(network, far.deviceId);
  const port = device ? portOf(device, far.port) : undefined;
  if (!device || !port) return null;
  return { device, port, link };
}

/** The VLAN a host endpoint lands in, determined by the switch port it is cabled to. */
export function hostVlan(network: LabNetwork, deviceId: string): number | null {
  const device = deviceOf(network, deviceId);
  if (!device || device.state.role !== "host") return null;
  const nic = device.state.interfaces[0];
  if (!nic) return null;
  const neighbour = neighbourOf(network, deviceId, nic.name);
  if (!neighbour) return null;
  const port = neighbour.port;
  if (port.mode === "trunk") return port.nativeVlan;
  if (port.kind === "ethernet" && port.mode === "access") return port.accessVlan;
  return null;
}

type Attachment = { device: LabDevice; port: SimInterface; vlan: number | null };

/**
 * Every Layer 2 attachment that can answer for one VLAN: the host endpoints that are really in it,
 * and the router ports (802.1Q subinterfaces or routed ports) that terminate it. A trunk forwards a
 * tagged VLAN only when both ends allow it, so an allowed-VLAN mismatch stops the walk.
 */
function reachableInVlan(network: LabNetwork, startDeviceId: string, startPortName: string, vlan: number | null) {
  const hosts = new Set<string>();
  const attachments: Attachment[] = [];
  const visited = new Set<string>();
  const queue: Array<{ deviceId: string; portName: string }> = [{ deviceId: startDeviceId, portName: startPortName }];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const key = `${current.deviceId}:${current.portName.toLowerCase()}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const neighbour = neighbourOf(network, current.deviceId, current.portName);
    if (!neighbour) continue;
    const { device, port } = neighbour;
    if (!isUp(device, port)) continue;
    if (device.state.role === "host") {
      const sender = deviceOf(network, current.deviceId);
      const senderPort = sender && portOf(sender, current.portName);
      if (sender?.state.role === "switch" && senderPort?.mode === "trunk" && senderPort.nativeVlan !== vlan) continue;
      if (device.state.role === "host" && port === device.state.interfaces[0]) hosts.add(device.id);
      continue;
    }
    if (device.state.role === "router") {
      const siblings = device.state.interfaces.filter((candidate) =>
        candidate.parent?.toLowerCase() === port.name.toLowerCase()
        || (candidate.kind === "subinterface" && candidate.parent && port.name.toLowerCase().startsWith(candidate.parent.toLowerCase())));
      const tagged = siblings.filter((candidate) => candidate.kind === "subinterface" && candidate.dot1q === vlan && candidate.adminUp);
      if (tagged.length) attachments.push(...tagged.map((candidate) => ({ device, port: candidate, vlan })));
      else if (port.mode === "routed") {
        const sender = deviceOf(network, current.deviceId);
        const senderPort = sender && portOf(sender, current.portName);
        if (sender?.state.role !== "switch" || senderPort?.mode !== "trunk" || senderPort.nativeVlan === vlan) attachments.push({ device, port, vlan });
      }
      continue;
    }
    if (vlan !== null && !switchPortCarries(device, port, vlan)) continue;
    // A switch passes one VLAN to every port that carries it, then out of the far side of each cable.
    for (const svi of device.state.interfaces.filter((candidate) => candidate.kind === "svi" && candidate.adminUp && Number(candidate.name.replace(/^Vlan/i, "")) === vlan)) {
      attachments.push({ device, port: svi, vlan });
    }
    for (const candidate of device.state.interfaces) {
      if (candidate.kind === "svi") continue;
      if (vlan !== null && !switchPortCarries(device, candidate, vlan)) continue;
      if (!isUp(device, candidate)) continue;
      const next = neighbourOf(network, device.id, candidate.name);
      if (next && (next.device.state.role === "switch" || next.device.state.role === "host" || next.device.state.role === "router")) {
        const nextPort = next.port;
        if (next.device.state.role === "switch" && vlan !== null && nextPort.kind !== "svi" && !switchPortCarries(next.device, nextPort, vlan)) continue;
        if (next.device.state.role === "switch" && candidate.mode === "trunk" && nextPort.mode === "trunk"
          && ((candidate.nativeVlan === vlan) !== (nextPort.nativeVlan === vlan))) continue;
        queue.push({ deviceId: device.id, portName: candidate.name });
      }
    }
  }
  return { hosts, attachments };
}

/** The interface that owns an address, so a ping can also target a router port. */
export function addressOwner(network: LabNetwork, address: string) {
  for (const device of network.devices) {
    for (const port of device.state.interfaces) {
      if (port.address?.ip === address) return { device, port };
    }
  }
  return null;
}

/** The interface that owns an IPv6 address, addressed the same way as the IPv4 owner above. */
export function ipv6Owner(network: LabNetwork, address: string) {
  const wanted = normalizeIpv6(address);
  if (!wanted) return null;
  for (const device of network.devices) {
    for (const port of device.state.interfaces) {
      if (port.ipv6 && normalizeIpv6(port.ipv6.address) === wanted) return { device, port };
    }
  }
  return null;
}

const reply = (ok: boolean, targetIp: string): string[] => [
  "Type escape sequence to abort.",
  `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
  ok ? "!!!!!" : ".....",
  ok ? "Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms" : "Success rate is 0 percent (0/5)",
];
const fail = (targetIp: string, reason: string): PingOutcome => ({ ok: false, lines: reply(false, targetIp), reason });

/** Operational interfaces, not merely configured addresses. SVIs need an active VLAN member. */
function interfaceLive(network: LabNetwork, device: LabDevice, port: SimInterface): boolean {
  if (!port.adminUp) return false;
  if (port.kind === "svi") {
    const vlan = Number(port.name.replace(/^Vlan/i, ""));
    return device.state.vlans.has(vlan) && device.state.interfaces.some((member) => {
      const peer = neighbourOf(network, device.id, member.name);
      return member.kind === "ethernet" && member.adminUp && switchPortCarries(device, member, vlan)
        && Boolean(peer?.port.adminUp);
    });
  }
  const physical = port.parent ? portOf(device, port.parent) : port;
  if (!physical?.adminUp || (port.kind === "subinterface" && !port.dot1q)) return false;
  const peer = neighbourOf(network, device.id, physical.name);
  return Boolean(peer?.port.adminUp);
}

/** Discover adjacent IP speakers over the live VLAN/cable graph. Never jumps between VLANs. */
function segmentPeers(network: LabNetwork, device: LabDevice, port: SimInterface): Attachment[] {
  if (!interfaceLive(network, device, port)) return [];
  const physical = port.parent ? portOf(device, port.parent)! : port;
  const neighbour = neighbourOf(network, device.id, physical.name);
  const vlan = port.kind === "svi" ? Number(port.name.replace(/^Vlan/i, ""))
    : port.kind === "subinterface" ? port.dot1q
    : neighbour?.device.state.role === "switch"
      ? neighbour.port.mode === "trunk" ? neighbour.port.nativeVlan : neighbour.port.accessVlan
      : null;
  if (port.kind === "subinterface" && (neighbour?.device.state.role !== "switch"
    || neighbour.port.mode !== "trunk" || !switchPortCarries(neighbour.device, neighbour.port, port.dot1q))) return [];
  const starts = port.kind === "svi"
    ? device.state.interfaces.filter((member) => member.kind === "ethernet" && member.adminUp && switchPortCarries(device, member, vlan!))
    : [physical];
  const peers: Attachment[] = [];
  for (const start of starts) {
    const reachable = reachableInVlan(network, device.id, start.name, vlan);
    peers.push(...reachable.attachments);
    for (const id of reachable.hosts) {
      const host = deviceOf(network, id)!;
      peers.push({ device: host, port: host.state.interfaces[0], vlan });
    }
  }
  return peers.filter((peer) => peer.device.id !== device.id && interfaceLive(network, peer.device, peer.port));
}

type Route = { port: SimInterface; nextHop: string | null; prefix: number; distance: number };
const prefixOf = (mask: string) => (ipToInt(mask).toString(2).match(/1/g) ?? []).length;
const matches = (port: SimInterface, address: string, v6: boolean) => v6
  ? Boolean(port.ipv6 && sameIpv6Prefix(port.ipv6.address, address, port.ipv6.prefix))
  : Boolean(port.address && sameSubnet(port.address.ip, address, port.address.mask));

/** Connected + static longest-prefix lookup; recursive next hops have a bounded, cycle-safe walk. */
function routeFor(network: LabNetwork, device: LabDevice, address: string, v6: boolean, resolving = new Set<string>()): Route | null {
  if (resolving.has(address)) return null;
  const visited = new Set(resolving).add(address);
  const candidates: Route[] = device.state.interfaces
    .filter((port) => interfaceLive(network, device, port) && matches(port, address, v6))
    .map((port) => ({ port, nextHop: null, prefix: v6 ? port.ipv6!.prefix : prefixOf(port.address!.mask), distance: 0 }));
  if (!v6 && device.state.role === "router") {
    for (const route of device.state.staticRoutes ?? []) {
      if (!sameSubnet(route.network, address, route.mask)) continue;
      const via = routeFor(network, device, route.nextHop, false, visited);
      if (via) candidates.push({ port: via.port, nextHop: via.nextHop ?? route.nextHop, prefix: prefixOf(route.mask), distance: 1 });
    }
  }
  return candidates.sort((a, b) => b.prefix - a.prefix || a.distance - b.distance)[0] ?? null;
}

export function ipv4RouteLines(network: LabNetwork | null, state: SimDeviceState, connectedOnly = false): string[] {
  const device = network?.devices.find((entry) => entry.id === state.id || entry.state === state);
  const active = state.interfaces.filter((port) => port.address && port.adminUp && (!network || !device || interfaceLive(network, device, port)));
  const routes = connectedOnly ? [] : (state.staticRoutes ?? []).filter((route) => !network || !device || routeFor(network, device, route.nextHop, false));
  const defaultRoute = routes.find((route) => route.network === "0.0.0.0" && route.mask === "0.0.0.0");
  return [
    "Codes: C - connected, L - local, S - static",
    "",
    defaultRoute ? `Gateway of last resort is ${defaultRoute.nextHop} to network 0.0.0.0` : "Gateway of last resort is not set",
    "",
    ...active.map((port) => `C    ${port.address!.ip.split('.').map((octet, index) => Number(octet) & Number(port.address!.mask.split('.')[index])).join('.')}/${prefixOf(port.address!.mask)} is directly connected, ${port.name}`),
    ...routes.map((route) => `S${route.mask === '0.0.0.0' ? '*' : ' '}   ${route.network}/${prefixOf(route.mask)} [1/0] via ${route.nextHop}`),
    ...(!active.length && !routes.length ? ["% No active IPv4 routes."] : []),
  ];
}

/** Forward one direction, then independently validate the echo's return direction. */
function packetPath(network: LabNetwork, start: LabDevice, target: string, v6: boolean): { error?: string; path: string[] } {
  const path: string[] = [];
  let current = start;
  const visited = new Set<string>();
  const addressOf = (port: SimInterface) => v6 ? normalizeIpv6(port.ipv6?.address ?? "") : port.address?.ip;
  while (!visited.has(current.id)) {
    visited.add(current.id);
    path.push(current.label);
    if (current.state.role === "host") {
      const vlan = hostVlan(network, current.id);
      const peer = current.state.interfaces[0] && neighbourOf(network, current.id, current.state.interfaces[0].name);
      if (vlan !== null && peer?.device.state.role === "switch" && !peer.device.state.vlans.has(vlan)) {
        return { path, error: `${peer.device.label} has no VLAN ${vlan} in its VLAN database, so ${current.label}'s port cannot pass traffic.` };
      }
    }
    const owned = current.state.interfaces.find((port) => addressOf(port) === target);
    if (owned) return interfaceLive(network, current, owned) ? { path }
      : { path, error: `${current.label} ${owned.name} is down or has no active cable/VLAN path.` };
    if (current !== start && (current.state.role !== "router" || (v6 && !current.state.ipv6Routing))) {
      return { path, error: `${current.label} does not forward ${v6 ? 'IPv6' : 'IPv4'} packets.` };
    }
    let route = routeFor(network, current, target, v6);
    if (!route && current.state.role !== "router") {
      const gateway = v6 ? current.state.ipv6Gateway : current.state.gateway;
      if (!gateway) return { path, error: `${current.label} has no ${v6 ? 'IPv6 ' : ''}default gateway, so it cannot reach another subnet.` };
      const direct = routeFor(network, current, gateway, v6);
      if (direct) route = { ...direct, nextHop: gateway };
    }
    if (!route) return { path, error: `${current.label} has no active ${v6 ? 'IPv6 connected' : 'connected or static'} route for ${target}.` };
    const nextIp = route.nextHop ?? target;
    const peer = segmentPeers(network, current, route.port).find((entry) => addressOf(entry.port) === nextIp && matches(entry.port, v6 ? route!.port.ipv6!.address : route!.port.address!.ip, v6));
    if (!peer) return { path, error: `${current.label} cannot reach ${nextIp} on ${route.port.name}: check addresses, cables, VLAN database, trunk tags and allowed VLANs.` };
    current = peer.device;
  }
  return { path, error: `Routing loop detected at ${current.label}; no successful reply is fabricated.` };
}

/** Router, switch-SVI and endpoint consoles all use the same packet model. */
export function pingFrom(network: LabNetwork, fromDeviceId: string, targetIp: string): PingOutcome {
  const source = deviceOf(network, fromDeviceId);
  if (!source) return fail(targetIp, "The source device is missing from this lab.");
  const v6 = Boolean(normalizeIpv6(targetIp));
  const target = v6 ? normalizeIpv6(targetIp)! : targetIp;
  const destination = v6 ? ipv6Owner(network, target) : addressOwner(network, target);
  if (!destination) return fail(targetIp, `No device in this lab has the address ${targetIp}.`);
  const route = routeFor(network, source, target, v6)
    ?? routeFor(network, source, (v6 ? source.state.ipv6Gateway : source.state.gateway) ?? target, v6);
  const sourcePort = route?.port ?? source.state.interfaces.find((port) => interfaceLive(network, source, port) && (v6 ? port.ipv6 : port.address));
  const sourceIp = v6 ? sourcePort?.ipv6?.address : sourcePort?.address?.ip;
  if (!sourceIp) return fail(targetIp, `${source.label} has no active ${v6 ? 'IPv6' : 'IP'} address; check the address, no shutdown and cabling.`);
  const forward = packetPath(network, source, target, v6);
  if (forward.error) return fail(targetIp, forward.error);
  const backward = packetPath(network, destination.device, v6 ? normalizeIpv6(sourceIp)! : sourceIp, v6);
  if (backward.error) return fail(targetIp, `Reply path failed: ${backward.error}`);
  return { ok: true, lines: reply(true, targetIp), reason: `Live ${v6 ? 'IPv6' : 'IPv4'} path: ${forward.path.join(' → ')}; return path verified.` };
}
