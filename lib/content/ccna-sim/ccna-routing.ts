import { met, reachesDevice, unmet, type LabModel, type SimLabPack, type SimLabStep } from "../../ccna-sim/lab.ts";
import type { SimulationLink, SimulationNode, SimulationPort } from "../../ccna-sim/topology.ts";
import { ccnaLabPath } from "../ccna-lab-path.ts";

/**
 * The authored pack for `ccna-routing`, the two-LAN static-routing and OSPF stage.
 *
 * Devices, ports and addresses are the ones this lab publishes in `lib/content/ccna.ts`: the outline
 * names `PC-A → R1 G0/0` (10.1.1.10/24 · gateway 10.1.1.1), `R1 G0/1 ↔ R2 G0/1`
 * (10.0.12.1/30 ↔ 10.0.12.2/30 · area 0) and `R2 G0/0 → PC-B` (10.2.2.10/24 · gateway 10.2.2.1), and
 * those three cables are exactly what this pack connects. The outline's note places a 2960 between
 * each PC and its router; a 2960 in one VLAN forwards untagged frames transparently, so this practice
 * model collapses each access switch into the direct host-to-router link the outline draws and says
 * so in its diagram note rather than inventing a fifth device.
 *
 * Every graded step reads live device state — an interface's address and administrative state, the
 * static routes the device actually holds, the saved startup configuration, or a ping the network
 * model computes from both routers' tables. Nothing is credited from a typed command, so typing the
 * lab's solution commands twice on the wrong console cannot complete anything.
 *
 * OSPF is deliberately *not* graded: this engine implements connected and static IPv4 routing only,
 * so it has no adjacency, no learned route and no area to read. The OSPF steps carry `ungraded` with
 * the limitation stated, because a pack that ticked them would be inventing a result.
 */

function publishedLab() {
  const entry = ccnaLabPath.find((candidate) => candidate.id === "ccna-routing");
  if (!entry) throw new Error("ccna-routing is not a published lab, so its simulator pack cannot exist.");
  return entry;
}

const ethernetPort = (id: string, label: string): SimulationPort => ({ id, label, kind: "ethernet" });

/** The four devices the published outline names, with the ports its cables use. */
const devices: SimulationNode[] = [
  { id: "pc-a", label: "PC-A", kind: "pc", role: "host", x: 130, y: 120, subtitle: "10.1.1.10/24 · gateway 10.1.1.1", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "r1", label: "R1", kind: "router", role: "router", x: 380, y: 120, subtitle: "2911 · 10.1.1.1/24 · 10.0.12.1/30", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")] },
  { id: "r2", label: "R2", kind: "router", role: "router", x: 380, y: 380, subtitle: "2911 · 10.2.2.1/24 · 10.0.12.2/30", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")] },
  { id: "pc-b", label: "PC-B", kind: "pc", role: "host", x: 630, y: 380, subtitle: "10.2.2.10/24 · gateway 10.2.2.1", ports: [ethernetPort("gi0-0", "Gi0/0")] },
];

/** The outline's three cables: PC-A → R1 G0/0, R1 G0/1 ↔ R2 G0/1, R2 G0/0 → PC-B. */
const links: SimulationLink[] = [
  { id: "ccna-routing-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "r1", portId: "gi0-0" }, status: "up", label: "PC-A → R1 G0/0" },
  { id: "ccna-routing-link-2", source: { deviceId: "r1", portId: "gi0-1" }, target: { deviceId: "r2", portId: "gi0-1" }, status: "up", label: "R1 G0/1 ↔ R2 G0/1" },
  { id: "ccna-routing-link-3", source: { deviceId: "r2", portId: "gi0-0" }, target: { deviceId: "pc-b", portId: "gi0-0" }, status: "up", label: "R2 G0/0 → PC-B" },
];

type RouterPlan = {
  id: string;
  label: string;
  lan: { port: string; ip: string; mask: string };
  transit: { port: string; ip: string; mask: string };
  peerLan: string;
  peerMask: string;
  transitPeer: string;
};

const routers: RouterPlan[] = [
  { id: "r1", label: "R1", lan: { port: "Gi0/0", ip: "10.1.1.1", mask: "255.255.255.0" }, transit: { port: "Gi0/1", ip: "10.0.12.1", mask: "255.255.255.252" }, peerLan: "10.2.2.0", peerMask: "255.255.255.0", transitPeer: "10.0.12.2" },
  { id: "r2", label: "R2", lan: { port: "Gi0/0", ip: "10.2.2.1", mask: "255.255.255.0" }, transit: { port: "Gi0/1", ip: "10.0.12.2", mask: "255.255.255.252" }, peerLan: "10.1.1.0", peerMask: "255.255.255.0", transitPeer: "10.0.12.1" },
];

const hosts = [
  { id: "pc-a", label: "PC-A", ip: "10.1.1.10", mask: "255.255.255.0", gateway: "10.1.1.1", router: "r1", port: "Gi0/0" },
  { id: "pc-b", label: "PC-B", ip: "10.2.2.10", mask: "255.255.255.0", gateway: "10.2.2.1", router: "r2", port: "Gi0/0" },
];

/** One router's two published interfaces, read separately so a step names exactly what is missing. */
function interfaceCheck(lab: LabModel, plan: RouterPlan): ReturnType<typeof met> {
  const router = lab.device(plan.label);
  if (!router.exists) return unmet(`${plan.label} is not part of this lab.`);
  for (const expected of [plan.lan, plan.transit]) {
    const port = router.port(expected.port);
    if (!port.exists) return unmet(`${plan.label} has no ${expected.port} in this lab's topology.`);
    if (!port.adminUp) return unmet(`${plan.label} ${expected.port} is administratively down, so its network is unreachable.`);
    if (!port.address) return unmet(`${plan.label} ${expected.port} has no IPv4 address yet. The lab publishes ${expected.ip} ${expected.mask}.`);
    if (port.address.ip !== expected.ip || port.address.mask !== expected.mask) {
      return unmet(`${plan.label} ${expected.port} is ${port.address.ip} ${port.address.mask}; this lab publishes ${expected.ip} ${expected.mask}.`);
    }
  }
  return met(`${plan.label} is up on ${plan.lan.port} ${plan.lan.ip} ${plan.lan.mask} and ${plan.transit.port} ${plan.transit.ip} ${plan.transit.mask}.`);
}

/**
 * A return-aware static path is two requirements, not one: the route this router holds for the far
 * LAN, and the route the far router holds back. Each step reads only its own router, so a learner who
 * configures one side keeps the other side's step open and its reason visible.
 */
function routeCheck(lab: LabModel, plan: RouterPlan, required: boolean, peerLabel: string): ReturnType<typeof met> {
  const router = lab.device(plan.label);
  if (!router.exists) return unmet(`${plan.label} is not part of this lab.`);
  const route = router.routes.find((candidate) => candidate.network === plan.peerLan && candidate.mask === plan.peerMask);
  if (!route) {
    return unmet(`${plan.label} holds no route for ${plan.peerLan}/${maskToPrefix(plan.peerMask)} yet. Without it, ${plan.label} drops every packet for the far LAN.`);
  }
  if (route.nextHop !== plan.transitPeer) {
    return unmet(`${plan.label}'s route for ${plan.peerLan} points at ${route.nextHop}; this lab's next hop across the /30 is ${plan.transitPeer} (${peerLabel}'s transit address).`);
  }
  if (required && !router.port(plan.transit.port).adminUp) {
    return unmet(`${plan.label}'s route for ${plan.peerLan} is present but ${plan.transit.port} is down, so the path it names does not exist.`);
  }
  return met(`${plan.label} routes ${plan.peerLan}/${maskToPrefix(plan.peerMask)} via ${route.nextHop} on ${plan.transit.port}.`);
}

const maskToPrefix = (mask: string) => mask.split(".").reduce((total, octet) => total + (Number(octet).toString(2).match(/1/g) ?? []).length, 0);

function hostCheck(lab: LabModel, host: typeof hosts[number]): ReturnType<typeof met> {
  const device = lab.device(host.id);
  if (!device.exists) return unmet(`${host.label} is not part of this lab.`);
  const nic = device.port("Gi0/0");
  if (!nic.exists) return unmet(`${host.label} has no Gi0/0 in this lab's topology.`);
  if (!nic.adminUp) return unmet(`${host.label} Gi0/0 is administratively down.`);
  if (!lab.linked(`${host.id}:Gi0/0`, `${host.router}:${host.port}`)) {
    return unmet(`${host.label} Gi0/0 is not cabled to ${lab.device(host.router).label} ${host.port}, so its gateway is on the far side of no cable.`);
  }
  if (!nic.address) return unmet(`${host.label} has no IPv4 address on Gi0/0 yet.`);
  if (nic.address.ip !== host.ip || nic.address.mask !== host.mask) {
    return unmet(`${host.label} is ${nic.address.ip} ${nic.address.mask}; this lab publishes ${host.ip} ${host.mask}.`);
  }
  if (device.gateway !== host.gateway) {
    return unmet(`${host.label}'s default gateway is ${device.gateway ?? "not set"}; off-subnet traffic needs ${host.gateway}, the router interface on its own LAN.`);
  }
  return met(`${host.label} is ${host.ip} ${host.mask} with gateway ${host.gateway} on a published cable.`);
}

function saveCheck(lab: LabModel): ReturnType<typeof met> {
  for (const plan of routers) {
    const router = lab.device(plan.label);
    if (!router.startupSaved) return unmet(`${plan.label} has no saved startup configuration yet, so its configuration would not survive a reload.`);
    if (!router.startupMatchesRunning) return unmet(`${plan.label} has unsaved changes: its startup configuration differs from its running configuration.`);
  }
  return met("R1 and R2 both saved a startup configuration that matches their running configuration.");
}

const steps: SimLabStep[] = [
  {
    id: "r1-interfaces", title: "Address R1 on both of its published networks", deviceId: "r1",
    instruction: "On R1 configure interface gi0/0 with ip address 10.1.1.1 255.255.255.0 and interface gi0/1 with ip address 10.0.12.1 255.255.255.252, then enable both. Router ports start administratively down.",
    why: "A route can only name a next hop that exists on an addressed, enabled interface. The /30 between the routers needs a 255.255.255.252 mask, not a /24.",
    commands: ["interface gi0/0", "ip address 10.1.1.1 255.255.255.0", "no shutdown", "exit", "interface gi0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown"],
    check: (lab) => interfaceCheck(lab, routers[0]),
  },
  {
    id: "r2-interfaces", title: "Address R2 on both of its published networks", deviceId: "r2",
    instruction: "On R2 configure interface gi0/0 with ip address 10.2.2.1 255.255.255.0 and interface gi0/1 with ip address 10.0.12.2 255.255.255.252, then enable both.",
    why: "Each router needs its own address on the shared transit /30 before the pair can be neighbours on that link.",
    commands: ["interface gi0/0", "ip address 10.2.2.1 255.255.255.0", "no shutdown", "exit", "interface gi0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown"],
    check: (lab) => interfaceCheck(lab, routers[1]),
  },
  {
    id: "r1-route", title: "Add R1's route for the far LAN", deviceId: "r1",
    instruction: "On R1 in global configuration configure ip route 10.2.2.0 255.255.255.0 10.0.12.2. The next hop is R2's address on the shared /30, not PC-B's address.",
    why: "The check reads R1's own routing table, so a route typed with the wrong next hop is reported with the next hop it actually holds instead of being accepted.",
    commands: ["ip route 10.2.2.0 255.255.255.0 10.0.12.2"],
    check: (lab) => routeCheck(lab, routers[0], true, "R2"),
  },
  {
    id: "r2-route", title: "Add R2's return route for the near LAN", deviceId: "r2",
    instruction: "On R2 configure ip route 10.1.1.0 255.255.255.0 10.0.12.1 so replies have a way back to PC-A's LAN.",
    why: "Reachability is bidirectional: a forward-only static path still fails, and this step is graded separately so the missing direction is named.",
    commands: ["ip route 10.1.1.0 255.255.255.0 10.0.12.1"],
    check: (lab) => routeCheck(lab, routers[1], true, "R1"),
  },
  {
    id: "pc-a", title: "Address and cable PC-A", deviceId: "pc-a",
    instruction: "On the PC-A console set 10.1.1.10 255.255.255.0, then set its default gateway 10.1.1.1, the R1 interface on this LAN.",
    why: "The gateway must be an address inside the host's own subnet on an enabled port; a host with no gateway cannot reach the far LAN at all.",
    commands: ["ip address 10.1.1.10 255.255.255.0", "ip default-gateway 10.1.1.1"],
    check: (lab) => hostCheck(lab, hosts[0]),
  },
  {
    id: "pc-b", title: "Address and cable PC-B", deviceId: "pc-b",
    instruction: "On the PC-B console set 10.2.2.10 255.255.255.0 and its default gateway 10.2.2.1.",
    why: "PC-B's replies leave through its own gateway, so its address and gateway are part of the same requirement as PC-A's.",
    commands: ["ip address 10.2.2.10 255.255.255.0", "ip default-gateway 10.2.2.1"],
    check: (lab) => hostCheck(lab, hosts[1]),
  },
  {
    id: "ping-end-to-end", title: "Prove PC-A can reach PC-B across both routers", deviceId: "pc-a",
    instruction: "From PC-A run ping 10.2.2.10 and read the reply. A reply needs PC-A's gateway, both enabled interfaces on each router, and a route in each direction.",
    why: "The reply is computed from the live model, so removing either static route, shutting a port or cutting a cable changes this result with the reason instead of a fixed answer.",
    commands: ["ping 10.2.2.10"],
    check: (lab) => reachesDevice(lab, "pc-a", "pc-b", "10.2.2.10"),
  },
  {
    id: "save-routers", title: "Save both routers' configurations", deviceId: "r1",
    instruction: "On each router enter end, then copy running-config startup-config. Save again if you change a route afterwards.",
    why: "The check compares the saved copy with the running configuration on both routers, so an outdated saved file is reported as unsaved work rather than counted.",
    commands: ["end", "copy running-config startup-config"],
    check: saveCheck,
  },
  {
    id: "ospf", title: "Replace the static routes with single-area OSPF", deviceId: "r1",
    instruction: "Remove each static route, then configure router ospf 1 with router-id 1.1.1.1 on R1 (2.2.2.2 on R2), network 10.1.1.0 0.0.0.255 area 0, network 10.0.12.0 0.0.0.3 area 0 and passive-interface gi0/0.",
    why: "Removing the static paths is what makes an OSPF-learned route the only explanation for a working ping on a real device.",
    commands: ["no ip route 10.2.2.0 255.255.255.0 10.0.12.2", "router ospf 1", "router-id 1.1.1.1", "network 10.1.1.0 0.0.0.255 area 0", "network 10.0.12.0 0.0.0.3 area 0", "passive-interface gi0/0"],
    ungraded: "Not evaluated here: this practice model implements connected and static IPv4 routing only. It has no OSPF process, adjacency or learned route, so it cannot read a neighbour state of FULL or an O route, and it will not tick this step for you.",
  },
  {
    id: "area-mismatch", title: "Introduce and repair an area mismatch", deviceId: "r2",
    instruction: "On R2 replace only the transit network's area 0 statement with area 1 and watch adjacency and learned routes disappear, then restore area 0. Do not leave the lab in the broken state.",
    why: "This is the lab's own incident exercise: the same statement that caused the fault has to be restored, so the evidence is the repaired adjacency rather than a claim about it.",
    ungraded: "Not evaluated here: without an OSPF engine this model cannot lose or restore an adjacency, so it states the exercise instead of grading it.",
  },
  {
    id: "packet-tracer", title: "Repeat the build in your own Packet Tracer file", deviceId: "r1",
    instruction: "Open ccna-04.pkt, place the two 2960 switches and the two 2911 routers, cable the ports in the published outline, and repeat the addressing, the static routes, the OSPF conversion and the area-mismatch repair there.",
    why: "The browser console is this site's practice model. The transferable skill is doing the same work on a real device image, and the access switches of that file are the part this model collapses.",
    ungraded: "Not evaluated here: this site cannot read your Packet Tracer file, and it will not pretend your .pkt was checked.",
  },
];

export function createCcnaRoutingPack(): SimLabPack {
  const lab = publishedLab();
  return {
    labId: "ccna-routing",
    title: lab.title,
    difficulty: lab.tier,
    duration: lab.duration,
    scenario: {
      role: lab.scenario.role,
      context: lab.scenario.context,
      objective: lab.scenario.requirement,
      requirement: "PC-A (10.1.1.10/24) must ping PC-B (10.2.2.10/24) across R1 and R2, with a route for each LAN on the router that does not own it. Both transit interfaces are 10.0.12.1/30 and 10.0.12.2/30. A forward-only static path is not a completed lab.",
      prerequisites: lab.prerequisites,
    },
    diagramNote:
      "The published outline names PC-A → R1 G0/0, R1 G0/1 ↔ R2 G0/1 and R2 G0/0 → PC-B, with 10.1.1.10/24, 10.0.12.1/30, 10.0.12.2/30 and 10.2.2.10/24. Those four devices, those three cables and those addresses are what this pack implements. The outline's note also places a 2960 between each PC and its router; a 2960 in a single VLAN forwards untagged frames transparently, so this practice model collapses each access switch into the direct host-to-router link the outline draws. The addresses, ports and gateway roles are unchanged.",
    devices,
    links,
    objectives: [
      {
        id: "addressing",
        title: "Address both LANS and the transit link",
        detail: "Four live steps: each router's two published interfaces, and both hosts' address, mask, gateway and published cable. Each reads the interface state the learner produced.",
        steps: steps.filter((step) => ["r1-interfaces", "r2-interfaces", "pc-a", "pc-b"].includes(step.id)),
      },
      {
        id: "routes",
        title: "Give each direction a static path",
        detail: "One graded step per router, read from the routing table that router actually holds: R1 needs 10.2.2.0/24 via 10.0.12.2 and R2 needs 10.1.1.0/24 via 10.0.12.1.",
        steps: steps.filter((step) => step.id === "r1-route" || step.id === "r2-route"),
      },
      {
        id: "proof",
        title: "Prove the path and save the work",
        detail: "A ping the model computes from both routing tables plus the cables, and a saved startup configuration on both routers. The OSPF conversion, the area-mismatch repair and the Packet Tracer repeat are stated as ungraded rather than ticked.",
        steps: steps.filter((step) => ["ping-end-to-end", "save-routers", "ospf", "area-mismatch", "packet-tracer"].includes(step.id)),
      },
    ],
    references: lab.sourceRefs.map((source) => ({ title: source.title, url: source.url })),
    solution: [
      {
        deviceId: "r1",
        commands: [
          "enable", "configure terminal", "hostname R1",
          "interface gi0/0", "ip address 10.1.1.1 255.255.255.0", "no shutdown", "exit",
          "interface gi0/1", "ip address 10.0.12.1 255.255.255.252", "no shutdown", "exit",
          "ip route 10.2.2.0 255.255.255.0 10.0.12.2",
          "end", "copy running-config startup-config",
        ],
      },
      {
        deviceId: "r2",
        commands: [
          "enable", "configure terminal", "hostname R2",
          "interface gi0/0", "ip address 10.2.2.1 255.255.255.0", "no shutdown", "exit",
          "interface gi0/1", "ip address 10.0.12.2 255.255.255.252", "no shutdown", "exit",
          "ip route 10.1.1.0 255.255.255.0 10.0.12.1",
          "end", "copy running-config startup-config",
        ],
      },
      { deviceId: "pc-a", commands: ["ip address 10.1.1.10 255.255.255.0", "ip default-gateway 10.1.1.1", "ipconfig"] },
      { deviceId: "pc-b", commands: ["ip address 10.2.2.10 255.255.255.0", "ip default-gateway 10.2.2.1", "ipconfig"] },
    ],
  };
}
