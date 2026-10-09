import { findInterface, portAllowsVlan, type SimDeviceState, type SimDeviceRole, type SimInterface } from "./device.ts";

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

function maskToInt(mask: string) {
  const value = ipToInt(mask);
  return value === 0 ? 0 : (0xffffffff << (32 - mask.split(".").filter((part) => Number(part) === 255).length * 8)) >>> 0;
}

/** True when both addresses are inside the same subnet described by `mask`. */
export function sameSubnet(left: string, right: string, mask: string) {
  const maskValue = maskToInt(mask);
  return (ipToInt(left) & maskValue) >>> 0 === (ipToInt(right) & maskValue) >>> 0;
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
    if (!isUp(device, port)) {
      if (device.state.role === "router") continue;
    }
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

/** One ping, decided by the model and nothing else. */
export function pingFrom(network: LabNetwork, fromDeviceId: string, targetIp: string): PingOutcome {
  const source = deviceOf(network, fromDeviceId);
  if (!source || source.state.role !== "host") return fail(targetIp, "Only an endpoint console can start a ping in this lab.");
  const nic = source.state.interfaces[0];
  if (!nic?.address) return fail(targetIp, `${source.label} has no IP address on ${nic?.name ?? "its NIC"}.`);
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
  const destinationInterface = destinationHost ? destinationHost.state.interfaces[0] : addressOwner(network, targetIp)?.port ?? null;
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
      return local.hosts.has(destinationHost.id)
        ? { ok: true, lines: reply(true, targetIp), reason: `${source.label} and ${destinationHost.label} share VLAN ${sourceVlan}.` }
        : fail(targetIp, `${source.label} and ${destinationHost.label} are both in VLAN ${sourceVlan}, but no cable and trunk path carries it between them.`);
    }
  } else if (destinationInterface.address && sameSubnet(nic.address.ip, targetIp, nic.address.mask)) {
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
