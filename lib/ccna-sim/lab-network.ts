import { findInterface, normalizeIpv6, portAllowsVlan, sameIpv6Prefix, type SimDeviceState, type SimDeviceRole, type SimInterface } from "./device.ts";

/**
 * The lab network: the devices a lab publishes, the cables between them, and the only place where a
 * connectivity answer comes from. A ping is computed from the live model — access VLANs, trunk
 * allowed lists, 802.1Q subinterfaces, interface state and each host's default gateway — so an
 * unplugged cable, a missing VLAN or a wrong address can never produce a fixed reply.
 *
 * Routing is limited to directly connected networks. That limit is deliberate: a lab that needs
 * OSPF or static routes is reported as `no-route` instead of pretending the path works.
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
const isUp = (device: LabDevice, port: SimInterface) => port.adminUp && (port.parent === null || Boolean(portOf(device, port.parent)));

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
      if (device.state.role === "host" && port === device.state.interfaces[0]) hosts.add(device.id);
      continue;
    }
    if (device.state.role === "router") {
      const siblings = device.state.interfaces.filter((candidate) =>
        candidate.parent?.toLowerCase() === port.name.toLowerCase()
        || (candidate.kind === "subinterface" && candidate.parent && port.name.toLowerCase().startsWith(candidate.parent.toLowerCase())));
      const tagged = siblings.filter((candidate) => candidate.kind === "subinterface" && candidate.dot1q === vlan && candidate.adminUp);
      if (tagged.length) attachments.push(...tagged.map((candidate) => ({ device, port: candidate, vlan })));
      else if (port.mode === "routed") attachments.push({ device, port, vlan });
      continue;
    }
    // A switch passes one VLAN to every port that carries it, then out of the far side of each cable.
    for (const candidate of device.state.interfaces) {
      if (candidate.kind === "svi") continue;
      if (vlan !== null && !switchPortCarries(device, candidate, vlan)) continue;
      if (!isUp(device, candidate)) continue;
      const next = neighbourOf(network, device.id, candidate.name);
      if (next && (next.device.state.role === "switch" || next.device.state.role === "host" || next.device.state.role === "router")) {
        const nextPort = next.port;
        if (next.device.state.role === "switch" && vlan !== null && nextPort.kind !== "svi" && !switchPortCarries(next.device, nextPort, vlan)) continue;
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

function configuredRoute(network: LabNetwork, router: LabDevice, targetIp: string) {
  for (const port of router.state.interfaces) {
    if (!port.address || !port.adminUp) continue;
    if (sameSubnet(port.address.ip, targetIp, port.address.mask)) return port;
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

/**
 * One IPv6 ping, decided by the model exactly like the IPv4 one: the source prefix has to contain the
 * target, the Layer 2 path (access port, VLAN database, trunks) has to carry the VLAN, and an
 * off-prefix target needs a configured IPv6 gateway on a router that actually forwards IPv6.
 */
function pingV6(network: LabNetwork, source: LabDevice, nic: SimInterface | undefined, targetIp: string): PingOutcome {
  if (!nic?.ipv6) return fail(targetIp, `${source.label} has no IPv6 address on ${nic?.name ?? "its NIC"}.`);
  if (!nic.adminUp) return fail(targetIp, `${source.label} ${nic.name} is administratively down.`);
  const firstHop = neighbourOf(network, source.id, nic.name);
  if (firstHop && !firstHop.port.adminUp) return fail(targetIp, `${firstHop.device.label} ${firstHop.port.name} is administratively down.`);
  const sourceVlan = hostVlan(network, source.id);
  if (sourceVlan === null) return fail(targetIp, `${source.label} is not cabled to a switch access port, so it has no VLAN.`);
  const local = reachableInVlan(network, source.id, nic.name, sourceVlan);
  const wanted = normalizeIpv6(targetIp);
  const destinationHost = network.devices.find((device) => device.state.role === "host" && device.state.interfaces[0]?.ipv6
    && normalizeIpv6(device.state.interfaces[0].ipv6!.address) === wanted) ?? null;
  const destinationOwner = destinationHost ? { device: destinationHost, port: destinationHost.state.interfaces[0] } : ipv6Owner(network, targetIp);
  if (!destinationOwner?.port) return fail(targetIp, `No device in this lab has the IPv6 address ${targetIp}.`);
  const destination = destinationOwner.port;
  const onLink = Boolean(destination.ipv6
    && sameIpv6Prefix(nic.ipv6.address, destination.ipv6.address, nic.ipv6.prefix)
    && sameIpv6Prefix(nic.ipv6.address, destination.ipv6.address, destination.ipv6.prefix));
  if (onLink) {
    if (!destination.adminUp) return fail(targetIp, `${destinationOwner.device.label} ${destination.name} is administratively down.`);
    if (destinationHost) {
      return local.hosts.has(destinationHost.id)
        ? { ok: true, lines: reply(true, targetIp), reason: `${source.label} and ${destinationHost.label} share IPv6 prefix ${nic.ipv6.address}/${nic.ipv6.prefix} in VLAN ${sourceVlan}.` }
        : fail(targetIp, `${source.label} and ${destinationHost.label} share the IPv6 prefix of VLAN ${sourceVlan}, but no cable and trunk path carries it between them.`);
    }
    const attachment = local.attachments.find((candidate) => candidate.device.id === destinationOwner.device.id && candidate.port.name === destination.name);
    return attachment
      ? { ok: true, lines: reply(true, targetIp), reason: `${targetIp} is the ${destinationOwner.device.label} ${destination.name} address, reachable in VLAN ${sourceVlan}.` }
      : fail(targetIp, `${targetIp} is inside ${source.label}'s own IPv6 prefix but does not answer on the local segment.`);
  }
  if (!source.state.ipv6Gateway) return fail(targetIp, `${source.label} has no IPv6 default gateway, so it cannot reach another IPv6 prefix.`);
  const gateway = ipv6Owner(network, source.state.ipv6Gateway);
  const gatewayAttachment = gateway
    ? local.attachments.find((candidate) => candidate.device.id === gateway.device.id && candidate.port.name === gateway.port.name)
    : undefined;
  if (!gateway || !gateway.port.adminUp || !gatewayAttachment) {
    return fail(targetIp, `${source.label}'s IPv6 gateway ${source.state.ipv6Gateway} is not configured on an up router interface in VLAN ${sourceVlan}.`);
  }
  const router = gateway.device;
  if (!router.state.ipv6Routing) return fail(targetIp, `${router.label} has IPv6 addresses but IPv6 unicast routing is off, so it does not forward IPv6 packets.`);
  const egress = destination.ipv6
    ? router.state.interfaces.find((port) => port.ipv6 && port.adminUp && sameIpv6Prefix(port.ipv6.address, destination.ipv6!.address, port.ipv6.prefix)) ?? null
    : null;
  if (!egress) return fail(targetIp, `${router.label} has no directly connected IPv6 interface for ${targetIp}. IPv6 routing protocols are outside this lab.`);
  if (destinationHost) {
    if (!destinationHost.state.ipv6Gateway) return fail(targetIp, `${destinationHost.label} has no IPv6 default gateway, so the reply cannot leave its own prefix.`);
    const remoteVlan = hostVlan(network, destinationHost.id);
    const remote = remoteVlan === null ? null : reachableInVlan(network, router.id, egress.name, remoteVlan);
    if (!remote || !remote.hosts.has(destinationHost.id)) {
      return fail(targetIp, `${router.label} cannot reach ${destinationHost.label}: the switch path for its IPv6 prefix is incomplete.`);
    }
  }
  return { ok: true, lines: reply(true, targetIp), reason: `${router.label} forwards IPv6 from ${source.label} to ${targetIp}.` };
}

/** One ping, decided by the model and nothing else. */
export function pingFrom(network: LabNetwork, fromDeviceId: string, targetIp: string): PingOutcome {
  const source = deviceOf(network, fromDeviceId);
  if (!source || source.state.role !== "host") return fail(targetIp, "Only an endpoint console can start a ping in this lab.");
  const nic = source.state.interfaces[0];
  if (normalizeIpv6(targetIp)) return pingV6(network, source, nic, targetIp);
  if (!nic?.address) return fail(targetIp, `${source.label} has no IP address on ${nic?.name ?? "its NIC"}.`);
  if (!nic.adminUp) return fail(targetIp, `${source.label} ${nic.name} is administratively down.`);
  const firstHop = neighbourOf(network, source.id, nic.name);
  if (firstHop && !firstHop.port.adminUp) return fail(targetIp, `${firstHop.device.label} ${firstHop.port.name} is administratively down.`);
  const sourceVlan = hostVlan(network, source.id);
  if (sourceVlan === null) return fail(targetIp, `${source.label} is not cabled to a switch access port, so it has no VLAN.`);
  const attachedSwitch = (deviceId: string) => {
    const device = deviceOf(network, deviceId);
    const nic = device?.state.interfaces[0];
    if (!device || !nic) return null;
    const neighbour = neighbourOf(network, deviceId, nic.name);
    return neighbour?.device.state.role === "switch" ? neighbour.device : null;
  };
  const sourceSwitch = attachedSwitch(source.id);
  if (sourceSwitch && !sourceSwitch.state.vlans.has(sourceVlan)) {
    return fail(targetIp, `${sourceSwitch.label} has no VLAN ${sourceVlan} in its VLAN database, so ${source.label}'s port cannot pass traffic.`);
  }

  const destinationHost = network.devices.find((device) => device.state.role === "host" && device.state.interfaces[0]?.address?.ip === targetIp) ?? null;
  const destinationOwner = destinationHost
    ? { device: destinationHost, port: destinationHost.state.interfaces[0] }
    : addressOwner(network, targetIp);
  const destinationInterface = destinationOwner?.port ?? null;
  if (!destinationInterface) return fail(targetIp, `No device in this lab has the address ${targetIp}.`);

  const start = nic.name;
  const local = reachableInVlan(network, source.id, start, sourceVlan);
  if (destinationHost) {
    const destinationVlan = hostVlan(network, destinationHost.id);
    const destinationSwitch = attachedSwitch(destinationHost.id);
    if (destinationVlan !== null && destinationSwitch && !destinationSwitch.state.vlans.has(destinationVlan)) {
      return fail(targetIp, `${destinationSwitch.label} has no VLAN ${destinationVlan} in its VLAN database, so ${destinationHost.label}'s port cannot pass traffic.`);
    }
    if (destinationVlan === sourceVlan) {
      if (!destinationInterface.adminUp) return fail(targetIp, `${destinationHost.label}'s interface is administratively down.`);
      if (!destinationInterface.address || !sameSubnet(nic.address.ip, targetIp, nic.address.mask)
        || !sameSubnet(targetIp, nic.address.ip, destinationInterface.address.mask)) {
        return fail(targetIp, `${source.label} and ${destinationHost.label} do not share a bidirectional IP subnet; VLAN membership alone does not provide routing.`);
      }
      return local.hosts.has(destinationHost.id)
        ? { ok: true, lines: reply(true, targetIp), reason: `${source.label} and ${destinationHost.label} share VLAN ${sourceVlan}.` }
        : fail(targetIp, `${source.label} and ${destinationHost.label} are both in VLAN ${sourceVlan}, but no cable and trunk path carries it between them.`);
    }
  } else if (destinationInterface.address && sameSubnet(nic.address.ip, targetIp, nic.address.mask)) {
    // A router's own interface does answer a ping from the segment it terminates. Anything else in
    // the source's own subnet that the model cannot reach is reported as silent, never as success.
    const owner = destinationOwner;
    const attachment = owner
      ? local.attachments.find((candidate) => candidate.device.id === owner.device.id && candidate.port.name === destinationInterface.name)
      : undefined;
    if (attachment && owner && destinationInterface.adminUp) {
      return { ok: true, lines: reply(true, targetIp), reason: `${targetIp} is the ${owner.device.label} ${destinationInterface.name} address, reachable in VLAN ${sourceVlan}.` };
    }
    return fail(targetIp, `${targetIp} is in ${source.label}'s own subnet but does not answer on the local segment.`);
  }

  if (!source.state.gateway) return fail(targetIp, `${source.label} has no default gateway, so it cannot reach another subnet.`);
  const gatewayAttachment = local.attachments.find((attachment) => attachment.port.address?.ip === source.state.gateway);
  if (!gatewayAttachment) {
    return fail(targetIp, `${source.label}'s gateway ${source.state.gateway} is not configured on a router interface in VLAN ${sourceVlan}.`);
  }
  const router = gatewayAttachment.device;
  const egress = configuredRoute(network, router, targetIp);
  if (!egress) return fail(targetIp, `${router.label} has no directly connected interface for ${targetIp}. Routing protocols are outside this lab.`);
  if (!egress.parent && egress.kind === "subinterface") return fail(targetIp, `${router.label} ${egress.name} has no parent port.`);

  if (destinationHost) {
    const destinationVlan = hostVlan(network, destinationHost.id);
    if (egress.dot1q !== destinationVlan) {
      return fail(targetIp, `${router.label} reaches VLAN ${destinationVlan} on ${egress.name} but its 802.1Q tag is ${egress.dot1q || "missing"}.`);
    }
    const remote = reachableInVlan(network, router.id, egress.parent ?? egress.name, destinationVlan);
    if (!remote.hosts.has(destinationHost.id)) {
      return fail(targetIp, `${router.label} cannot reach ${destinationHost.label} in VLAN ${destinationVlan}: the switch path or trunk allowed list is incomplete.`);
    }
    if (!destinationHost.state.gateway) return fail(targetIp, `${destinationHost.label} has no default gateway, so the reply cannot leave its subnet.`);
    const returnPath = reachableInVlan(network, destinationHost.id, destinationHost.state.interfaces[0].name, destinationVlan);
    const returnRouter = returnPath.attachments.find((attachment) => attachment.port.address?.ip === destinationHost.state.gateway);
    if (!returnRouter) {
      return fail(targetIp, `${destinationHost.label}'s gateway ${destinationHost.state.gateway} is not configured on a router interface in VLAN ${destinationVlan}.`);
    }
    if (!configuredRoute(network, returnRouter.device, nic.address.ip)) {
      return fail(targetIp, `${returnRouter.device.label} has no directly connected interface back to ${source.label}.`);
    }
  }
  return { ok: true, lines: reply(true, targetIp), reason: `${router.label} routes from VLAN ${sourceVlan} to the destination network.` };
}
