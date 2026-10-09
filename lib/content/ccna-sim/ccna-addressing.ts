import { met, reachesDevice, unmet, type LabModel, type SimLabPack, type SimLabStep } from "../../ccna-sim/lab.ts";
import type { SimulationLink, SimulationNode, SimulationPort } from "../../ccna-sim/topology.ts";
import { ccnaLabs } from "../ccna.ts";
import { ccnaLabPath } from "../ccna-lab-path.ts";

/**
 * The authored pack for `ccna-addressing`, the stage-1 dual-stack LAN.
 *
 * Every device, port and cable below is the one this lab publishes in `lib/content/ccna.ts`
 * ("Connect PCs to SW1 F0/1 and F0/2; SW1 F0/24 to R1 G0/0"), and every graded step reads live
 * device state: an address and mask, a default gateway, an interface's administrative state, the
 * IPv6 address of an interface, `ipv6 unicast-routing`, a ping the model computes, or the saved
 * startup configuration.
 */

function publishedLab() {
  const entry = ccnaLabPath.find((candidate) => candidate.id === "ccna-addressing");
  if (!entry) throw new Error("ccna-addressing is not a published lab, so its simulator pack cannot exist.");
  return entry;
}

const ethernetPort = (id: string, label: string): SimulationPort => ({ id, label, kind: "ethernet" });

/** The four devices of the published picture: two PCs, one 2960 and one 2911. */
const devices: SimulationNode[] = [
  { id: "pc-a", label: "PC-A", kind: "pc", role: "host", x: 140, y: 110, subtitle: "192.168.10.10/26 · 2001:db8:10::10/64", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "pc-b", label: "PC-B", kind: "pc", role: "host", x: 620, y: 110, subtitle: "192.168.10.20/26 · 2001:db8:10::20/64", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "sw1", label: "SW1", kind: "switch", role: "switch", x: 380, y: 300, subtitle: "2960 · VLAN 1 access ports", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-24", "Fa0/24")] },
  { id: "r1", label: "R1", kind: "router", role: "router", x: 380, y: 500, subtitle: "2911 · dual-stack gateway", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")] },
];

/** The three cables the outline names, including the switch uplink port F0/24 → G0/0. */
const links: SimulationLink[] = [
  { id: "ccna-addressing-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-1" }, status: "up", label: "PC-A → SW1 F0/1" },
  { id: "ccna-addressing-link-2", source: { deviceId: "pc-b", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-2" }, status: "up", label: "PC-B → SW1 F0/2" },
  { id: "ccna-addressing-link-3", source: { deviceId: "sw1", portId: "fa0-24" }, target: { deviceId: "r1", portId: "gi0-0" }, status: "up", label: "SW1 F0/24 ↔ R1 G0/0" },
];

const V4_MASK = "255.255.255.192";
const V4_GATEWAY = "192.168.10.1";
const V6_GATEWAY = "2001:db8:10::1";
const plan = [
  { id: "pc-a", label: "PC-A", ip: "192.168.10.10", gateway: V4_GATEWAY, ipv6: "2001:db8:10::10", switchPort: "Fa0/1" },
  { id: "pc-b", label: "PC-B", ip: "192.168.10.20", gateway: V4_GATEWAY, ipv6: "2001:db8:10::20", switchPort: "Fa0/2" },
];

/** One endpoint's published address plan, read from the live device the learner configured. */
function hostPlanCheck(lab: LabModel, host: typeof plan[number]): ReturnType<typeof met> {
  const device = lab.device(host.id);
  if (!device.exists) return unmet(`${host.label} is not part of this lab.`);
  const nic = device.port("Gi0/0");
  if (!nic.exists) return unmet(`${host.label} has no Gi0/0 in this lab's topology.`);
  if (!nic.adminUp) return unmet(`${host.label} Gi0/0 is administratively down.`);
  if (!lab.linked(`${host.id}:Gi0/0`, `sw1:${host.switchPort}`)) return unmet(`${host.label} Gi0/0 is not cabled to SW1 ${host.switchPort}.`);
  if (!nic.address) return unmet(`${host.label} has no IPv4 address on Gi0/0 yet.`);
  if (nic.address.ip !== host.ip || nic.address.mask !== V4_MASK) {
    return unmet(`${host.label} is ${nic.address.ip} ${nic.address.mask}; this lab publishes ${host.ip} ${V4_MASK}.`);
  }
  if (device.gateway !== host.gateway) return unmet(`${host.label}'s default gateway is ${device.gateway ?? "not set"}; it must be ${host.gateway}, inside the same /26.`);
  return met(`${host.label} is ${host.ip} ${V4_MASK} with gateway ${host.gateway}.`);
}

/** The IPv6 half of the same endpoint: its own address and its own gateway field. */
function hostIpv6Check(lab: LabModel, host: typeof plan[number]): ReturnType<typeof met> {
  const device = lab.device(host.id);
  if (!device.exists) return unmet(`${host.label} is not part of this lab.`);
  const nic = device.port("Gi0/0");
  if (!nic.ipv6) return unmet(`${host.label} has no IPv6 address on Gi0/0 yet.`);
  if (nic.ipv6.address !== host.ipv6 || nic.ipv6.prefix !== 64) {
    return unmet(`${host.label} IPv6 is ${nic.ipv6.address}/${nic.ipv6.prefix}; this lab publishes ${host.ipv6}/64.`);
  }
  if (device.ipv6Gateway !== V6_GATEWAY) return unmet(`${host.label}'s IPv6 gateway is ${device.ipv6Gateway ?? "not set"}; it must be ${V6_GATEWAY}.`);
  return met(`${host.label} is ${host.ipv6}/64 with IPv6 gateway ${V6_GATEWAY}.`);
}

/** The router's own interfaces, read one at a time so a step names exactly what is still missing. */
function routerCheck(lab: LabModel): ReturnType<typeof met> {
  const port = lab.device("R1").port("Gi0/0");
  if (!port.exists) return unmet("R1 has no Gi0/0 in this lab's topology.");
  if (!port.adminUp) return unmet("R1 Gi0/0 is administratively down, so the gateway address does not answer yet.");
  if (!port.address) return unmet("R1 Gi0/0 has no IPv4 address yet. The lab publishes 192.168.10.1 with the /26 mask.");
  if (port.address.ip !== V4_GATEWAY || port.address.mask !== V4_MASK) {
    return unmet(`R1 Gi0/0 is ${port.address.ip} ${port.address.mask}; it must be ${V4_GATEWAY} ${V4_MASK} for this /26 LAN.`);
  }
  const other = lab.device("R1").port("Gi0/1");
  if (other.address) return unmet("R1 Gi0/1 carries an address; this lab addresses Gi0/0 only.");
  return met(`R1 Gi0/0 is up at ${V4_GATEWAY} ${V4_MASK}.`);
}

function routerIpv6Check(lab: LabModel): ReturnType<typeof met> {
  const port = lab.device("R1").port("Gi0/0");
  if (!port.ipv6) return unmet("R1 Gi0/0 has no IPv6 address yet. The lab publishes 2001:db8:10::1/64.");
  if (port.ipv6.address !== V6_GATEWAY || port.ipv6.prefix !== 64) {
    return unmet(`R1 Gi0/0 IPv6 is ${port.ipv6.address}/${port.ipv6.prefix}; it must be ${V6_GATEWAY}/64.`);
  }
  return met(`R1 Gi0/0 carries ${V6_GATEWAY}/64 next to its IPv4 address.`);
}

function ipv6RoutingCheck(lab: LabModel): ReturnType<typeof met> {
  const router = lab.device("R1");
  if (!router.exists) return unmet("R1 is not part of this lab.");
  if (!router.ipv6Routing) return unmet("R1 has no IPv6 addresses forwarded: configure `ipv6 unicast-routing` in global configuration. Addresses alone do not route.");
  return met("R1 forwards IPv6 unicast traffic (`ipv6 unicast-routing` is configured).");
}

const saveCheck = (lab: LabModel, deviceId: string): ReturnType<typeof met> => {
  const device = lab.device(deviceId);
  if (!device.startupSaved) return unmet(`${device.label} has no saved startup configuration yet.`);
  if (!device.startupMatchesRunning) return unmet(`${device.label} has unsaved changes: its startup configuration differs from the running one.`);
  return met(`${device.label} saved a startup configuration that matches its running configuration.`);
};

const steps: SimLabStep[] = [
  {
    id: "pc-a-v4", title: "Address and cable PC-A", deviceId: "pc-a",
    instruction: "On the PC-A console set 192.168.10.10 255.255.255.192, then set its default gateway 192.168.10.1. In Packet Tracer these are the Desktop → IP Configuration fields.",
    why: "The /26 mask decides which addresses are neighbours. PC-A and PC-B are both inside 192.168.10.0–192.168.10.63, so PC-A reaches PC-B directly, without the router.",
    commands: ["ip address 192.168.10.10 255.255.255.192", "ip default-gateway 192.168.10.1"],
    check: (lab) => hostPlanCheck(lab, plan[0]),
  },
  {
    id: "pc-b-v4", title: "Address and cable PC-B", deviceId: "pc-b",
    instruction: "On the PC-B console set 192.168.10.20 255.255.255.192 and the same gateway 192.168.10.1.",
    why: "A host outside its own block — .64, for example — is in the next /26 and cannot share a broadcast domain with PC-A.",
    commands: ["ip address 192.168.10.20 255.255.255.192", "ip default-gateway 192.168.10.1"],
    check: (lab) => hostPlanCheck(lab, plan[1]),
  },
  {
    id: "pc-a-v6", title: "Address PC-A for IPv6", deviceId: "pc-a",
    instruction: "On PC-A set the IPv6 address 2001:db8:10::10/64 and the IPv6 gateway 2001:db8:10::1. IPv6 is a second address on the same NIC, not a replacement for the IPv4 one.",
    why: "IPv4 and IPv6 have independent addresses and independent gateways; a dual-stack host answers on both.",
    commands: ["ipv6 address 2001:db8:10::10/64", "ipv6 default-gateway 2001:db8:10::1"],
    check: (lab) => hostIpv6Check(lab, plan[0]),
  },
  {
    id: "pc-b-v6", title: "Address PC-B for IPv6", deviceId: "pc-b",
    instruction: "On PC-B set 2001:db8:10::20/64 and the IPv6 gateway 2001:db8:10::1.",
    why: "Both hosts share the 2001:db8:10::/64 prefix through SW1, exactly as they share the /26 in IPv4.",
    commands: ["ipv6 address 2001:db8:10::20/64", "ipv6 default-gateway 2001:db8:10::1"],
    check: (lab) => hostIpv6Check(lab, plan[1]),
  },
  {
    id: "r1-interface", title: "Bring up R1 Gi0/0 with the /26 gateway", deviceId: "r1",
    instruction: "On R1 configure interface gi0/0 with ip address 192.168.10.1 255.255.255.192 and enable it. A router interface starts administratively down.",
    why: "The gateway has to be the first usable address of the same /26 the hosts are in, or their off-subnet traffic is dropped.",
    commands: ["interface gi0/0", "ip address 192.168.10.1 255.255.255.192", "no shutdown"],
    check: routerCheck,
  },
  {
    id: "r1-ipv6", title: "Add the IPv6 gateway address", deviceId: "r1",
    instruction: "On R1, on the same interface, add ipv6 address 2001:db8:10::1/64.",
    why: "One interface can carry both protocol families; the IPv6 address is configured with a prefix length, not a dotted mask.",
    commands: ["interface gi0/0", "ipv6 address 2001:db8:10::1/64"],
    check: routerIpv6Check,
  },
  {
    id: "r1-ipv6-routing", title: "Turn on IPv6 unicast routing", deviceId: "r1",
    instruction: "On R1 enter global configuration and configure ipv6 unicast-routing.",
    why: "An addressed interface is not the same as a forwarding router. Until this command is configured, R1 drops IPv6 packets it receives.",
    commands: ["ipv6 unicast-routing"],
    check: ipv6RoutingCheck,
  },
  {
    id: "ping-ipv4-local", title: "Prove the local /26 path", deviceId: "pc-a",
    instruction: "From PC-A run ping 192.168.10.20 and read the reply: five of five.",
    why: "The check recomputes the path from the cables, the switch ports and both addresses, so an address outside the /26 block fails here with the reason instead of a false success.",
    commands: ["ping 192.168.10.20"],
    check: (lab) => reachesDevice(lab, "pc-a", "pc-b", "192.168.10.20"),
  },
  {
    id: "ping-gateway", title: "Prove the gateway answers on the LAN", deviceId: "pc-a",
    instruction: "From PC-A run ping 192.168.10.1. This is R1's own interface on the same segment.",
    why: "A gateway that is not in the host's subnet, or an interface that is still shut down, cannot answer; the reply is computed from the interface state.",
    commands: ["ping 192.168.10.1"],
    check: (lab) => reachesDevice(lab, "pc-a", "r1", V4_GATEWAY),
  },
  {
    id: "ping-ipv6", title: "Prove the local IPv6 path", deviceId: "pc-a",
    instruction: "From PC-A run ping 2001:db8:10::20.",
    why: "The IPv6 reply comes from the same model: both endpoints must be inside the same /64 on an up switch path.",
    commands: ["ping 2001:db8:10::20"],
    check: (lab) => reachesDevice(lab, "pc-a", "pc-b", "2001:db8:10::20"),
  },
  {
    id: "save-r1", title: "Save R1's configuration", deviceId: "r1",
    instruction: "On R1 enter end, then copy running-config startup-config so the gateway configuration survives a reload.",
    why: "The check reads the saved copy and compares it with the running configuration; typing the save command is not itself the proof.",
    commands: ["end", "copy running-config startup-config"],
    check: (lab) => saveCheck(lab, "r1"),
  },
  {
    id: "packet-tracer", title: "Repeat the build in Packet Tracer", deviceId: "sw1",
    instruction: "Open ccna-01.pkt with two PCs, one 2960 and one 2911, cable the picture ports, and repeat both address families there.",
    why: "The browser console is this site's practice model; the transferable skill is doing the same work on a real device image.",
    ungraded: "Not evaluated here: this site cannot read your Packet Tracer file, and it will not pretend your .pkt was checked.",
  },
];

export function createCcnaAddressingPack(): SimLabPack {
  const lab = publishedLab();
  const handsOn = ccnaLabs.find((entry) => entry.id === "ccna-addressing");
  if (!handsOn) throw new Error("ccna-addressing has no hands-on build record, so its published steps cannot be read.");
  return {
    labId: "ccna-addressing",
    title: lab.title,
    difficulty: lab.tier,
    duration: lab.duration,
    scenario: {
      role: lab.scenario.role,
      context: lab.scenario.context,
      objective: lab.scenario.requirement,
      requirement: "PC-A and PC-B must ping each other and their gateway over IPv4 in 192.168.10.0/26, and over IPv6 in 2001:db8:10::/64. The /26 mask is part of the requirement: an address outside the block is a wrong answer, not a routing problem.",
      prerequisites: lab.prerequisites,
    },
    diagramNote:
      "The published outline names PC-A (192.168.10.10/26 · 2001:db8:10::10/64), PC-B (192.168.10.20/26 · 2001:db8:10::20/64) and the gateway SW1 → R1 G0/0 (192.168.10.1/26 · 2001:db8:10::1/64), and its note cables the PCs to SW1 F0/1 and F0/2 with SW1 F0/24 to R1 G0/0. Those four devices, three cables and the addresses are what this pack implements. The browser console stands in for Packet Tracer's command line and IP Configuration window; no extra device or address was invented for it.",
    devices,
    links,
    objectives: [
      {
        id: "hosts",
        title: "Put both endpoints inside the published /26 and IPv6 prefix",
        detail: "Four live checks, one per address family per host: each endpoint's address, mask or prefix, default gateway and published cable.",
        steps: steps.filter((step) => step.id.startsWith("pc-")),
      },
      {
        id: "gateway",
        title: "Make R1 the dual-stack default gateway",
        detail: "Three live checks on R1: the /26 address on an enabled Gi0/0, the IPv6 address on the same interface, and IPv6 unicast routing.",
        steps: steps.filter((step) => step.id.startsWith("r1-")),
      },
      {
        id: "proof",
        title: "Prove both paths and save the work",
        detail: "Four checks the model computes: the local IPv4 ping, the gateway ping, the local IPv6 ping, and R1's saved startup configuration. The Packet Tracer repeat is stated as ungraded.",
        steps: steps.filter((step) => step.id.startsWith("ping-") || step.id === "save-r1" || step.id === "packet-tracer"),
      },
    ],
    references: lab.sourceRefs.map((source) => ({ title: source.title, url: source.url })),
    solution: [
      {
        deviceId: "sw1",
        // The two access ports are already in VLAN 1 in this lab, so the switch only needs a name.
        commands: ["enable", "configure terminal", "hostname SW1", "end"],
      },
      {
        deviceId: "pc-a",
        commands: ["ip address 192.168.10.10 255.255.255.192", "ip default-gateway 192.168.10.1", "ipv6 address 2001:db8:10::10/64", "ipv6 default-gateway 2001:db8:10::1", "ipconfig"],
      },
      {
        deviceId: "pc-b",
        commands: ["ip address 192.168.10.20 255.255.255.192", "ip default-gateway 192.168.10.1", "ipv6 address 2001:db8:10::20/64", "ipv6 default-gateway 2001:db8:10::1", "ipconfig"],
      },
      {
        deviceId: "r1",
        commands: [
          "enable", "configure terminal", "hostname R1",
          "interface gi0/0", "ip address 192.168.10.1 255.255.255.192", "ipv6 address 2001:db8:10::1/64", "no shutdown", "exit",
          "ipv6 unicast-routing",
          "end", "copy running-config startup-config",
        ],
      },
    ],
  };
}
