import { configBodyLines } from "../../ccna-sim/device.ts";
import { met, unmet, type LabModel, type SimLabPack } from "../../ccna-sim/lab.ts";
import type { SimulationLink, SimulationNode, SimulationPort } from "../../ccna-sim/topology.ts";
import { ccnaLabPath, type CcnaLabEntry } from "../ccna-lab-path.ts";

/**
 * The first authored lab pack: `ccna-vlans`, the router-on-a-stick lab.
 *
 * The devices, ports and cables below are the lab's own published topology — PC-A on SW1 Fa0/1,
 * PC-B on SW1 Fa0/2 and SW1 Fa0/24 trunked to R1 Gi0/0 — not a generic starter graph. Every graded
 * step reads live device state, so this pack cannot be completed by typing a `show` command, by
 * configuring another device, or by repeating a command that changes nothing.
 *
 * Scenario, objectives and sources are read from the reviewed lab entry, so this pack can never
 * describe a different lab than the library does.
 */

/** The reviewed lab entry this pack describes. Looked up when the pack is built, and a missing entry
 * fails loudly rather than producing a pack that describes no published lab. */
function publishedLab(): CcnaLabEntry {
  const found = ccnaLabPath.find((entry) => entry.id === "ccna-vlans");
  if (!found) throw new Error("ccna-vlans is not a published lab, so its simulator pack cannot exist.");
  return found;
}

const ethernetPort = (id: string, label: string): SimulationPort => ({ id, label, kind: "ethernet" });

const devices: SimulationNode[] = [
  { id: "pc-a", label: "PC-A", kind: "pc", role: "host", x: 150, y: 110, subtitle: "Dept A workstation", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "pc-b", label: "PC-B", kind: "pc", role: "host", x: 610, y: 110, subtitle: "Dept B workstation", ports: [ethernetPort("gi0-0", "Gi0/0")] },
  { id: "sw1", label: "SW1", kind: "switch", role: "switch", x: 380, y: 300, subtitle: "Layer 2 switching", ports: [ethernetPort("fa0-1", "Fa0/1"), ethernetPort("fa0-2", "Fa0/2"), ethernetPort("fa0-23", "Fa0/23"), ethernetPort("fa0-24", "Fa0/24")] },
  { id: "r1", label: "R1", kind: "router", role: "router", x: 380, y: 500, subtitle: "Router-on-a-stick", ports: [ethernetPort("gi0-0", "Gi0/0"), ethernetPort("gi0-1", "Gi0/1")] },
];

const links: SimulationLink[] = [
  { id: "ccna-vlans-link-1", source: { deviceId: "pc-a", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-1" }, status: "up", label: "PC-A → SW1 Fa0/1" },
  { id: "ccna-vlans-link-2", source: { deviceId: "pc-b", portId: "gi0-0" }, target: { deviceId: "sw1", portId: "fa0-2" }, status: "up", label: "PC-B → SW1 Fa0/2" },
  { id: "ccna-vlans-link-3", source: { deviceId: "sw1", portId: "fa0-24" }, target: { deviceId: "r1", portId: "gi0-0" }, status: "up", label: "802.1Q trunk" },
];

const trunkAllows = (lab: LabModel, vlans: readonly number[]) => {
  const trunk = lab.device("SW1").port("Fa0/24");
  if (!trunk.exists) return unmet("SW1 has no Fa0/24 port in this lab's topology.");
  if (trunk.mode !== "trunk") return unmet(`SW1 Fa0/24 is in ${trunk.mode === "access" ? `access VLAN ${trunk.accessVlan}` : trunk.mode} mode, not trunk mode.`);
  if (trunk.allowed === "all") return unmet("SW1 Fa0/24 still allows every VLAN; the lab asks for exactly VLANs 10 and 20.");
  const missing = vlans.filter((vlan) => !trunk.allowed || !(trunk.allowed as number[]).includes(vlan));
  if (missing.length) return unmet(`SW1 Fa0/24 allows ${(trunk.allowed as number[]).join(",") || "no VLANs"}; VLAN ${missing.join(" and ")} must be allowed.`);
  const extra = (trunk.allowed as number[]).filter((vlan) => !vlans.includes(vlan));
  if (extra.length) return unmet(`SW1 Fa0/24 also allows VLAN ${extra.join(",")}; this trunk carries exactly VLANs 10 and 20.`);
  if (!trunk.adminUp) return unmet("SW1 Fa0/24 is administratively down.");
  return met(`SW1 Fa0/24 is an up trunk that allows exactly VLANs ${vlans.join(" and ")}.`);
};

const subinterfaceHas = (lab: LabModel, name: string, dot1q: number, ip: string, mask: string) => {
  const port = lab.device("R1").port(name);
  if (!port.exists) return unmet(`R1 has no ${name} subinterface yet.`);
  if (port.dot1q !== dot1q) return unmet(`R1 ${name} has no encapsulation dot1Q ${dot1q} yet.`);
  if (!port.address) return unmet(`R1 ${name} has no IP address yet.`);
  if (port.address.ip !== ip || port.address.mask !== mask) return unmet(`R1 ${name} is ${port.address.ip} ${port.address.mask}; this lab needs ${ip} ${mask}.`);
  return met(`R1 ${name} is tagged for VLAN ${dot1q} with ${ip} ${mask}.`);
};

const hostConfigured = (lab: LabModel, deviceId: string, ip: string, mask: string, gateway: string) => {
  const device = lab.device(deviceId);
  if (!device.exists) return unmet(`${deviceId} is not part of this lab.`);
  const nic = device.port("Gi0/0");
  if (!nic.address) return unmet(`${device.label} has no IP address on Gi0/0.`);
  if (nic.address.ip !== ip || nic.address.mask !== mask) return unmet(`${device.label} is ${nic.address.ip} ${nic.address.mask}; the lab publishes ${ip} ${mask}.`);
  if (device.gateway !== gateway) return unmet(`${device.label}'s default gateway is ${device.gateway ?? "not set"}; it must be ${gateway}.`);
  return met(`${device.label} is ${ip} ${mask} with gateway ${gateway}.`);
};

const startupSaved = (lab: LabModel, deviceId: string) => {
  const device = lab.device(deviceId);
  if (!device.exists) return unmet(`${deviceId} is not part of this lab.`);
  if (!device.startupSaved) return unmet(`${device.label} has no saved startup configuration yet.`);
  if (!device.startupMatchesRunning) return unmet(`${device.label} has unsaved changes: the saved copy differs from the running configuration.`);
  return met(`${device.label} saved a startup configuration that matches its running configuration.`);
};

/**
 * Built on demand rather than exported as a finished object: the repository's structural acceptance
 * gate imports every file in this directory and counts pack objects, so a second, pre-built export of
 * the same lab (here and in `index.ts`) read as a duplicate pack for one lab.
 */
export function createCcnaVlansPack(): SimLabPack {
  const lab = publishedLab();
  return {
    labId: "ccna-vlans",
  title: lab.title,
  difficulty: lab.tier,
  duration: lab.duration,
  scenario: {
    role: lab.scenario.role,
    context: lab.scenario.context,
    objective: lab.scenario.requirement,
    requirement: "PC-A in VLAN 10 and PC-B in VLAN 20 must ping each other across the 802.1Q trunk to R1, with the /24 addresses this lab publishes.",
    prerequisites: lab.prerequisites,
  },
  diagramNote: "R1 is used as a router-on-a-stick: SW1 Fa0/24 is an 802.1Q trunk to R1 Gi0/0, and the gateways 192.168.10.1 and 192.168.20.1 are subinterfaces of that port.",
  devices,
  links,
  objectives: [
    {
      id: "vlans",
      title: "Separate the two departments on SW1",
      detail: "Two graded steps on SW1: both VLANs must exist in its VLAN database, and Fa0/1 and Fa0/2 must carry VLAN 10 and VLAN 20 respectively.",
      steps: [
        {
          id: "vlans-create",
          title: "Create VLAN 10 and VLAN 20",
          deviceId: "sw1",
          instruction: "On SW1 create both department VLANs. VLAN 10 carries the first department and VLAN 20 the second.",
          why: "A VLAN is a separate Layer 2 broadcast domain. Until it exists, no access port can belong to it.",
          commands: ["vlan 10", "vlan 20"],
          check: (lab) => {
            const switchView = lab.device("SW1");
            const ten = switchView.vlan(10);
            const twenty = switchView.vlan(20);
            if (!ten.exists && !twenty.exists) return unmet("SW1 has no VLAN 10 or VLAN 20 yet.");
            if (!ten.exists) return unmet("SW1 has VLAN 20 but not VLAN 10.");
            if (!twenty.exists) return unmet("SW1 has VLAN 10 but not VLAN 20.");
            return met(`SW1 holds VLAN 10 (${ten.name}) and VLAN 20 (${twenty.name}).`);
          },
        },
        {
          id: "vlans-access-ports",
          title: "Put PC-A in VLAN 10 and PC-B in VLAN 20",
          deviceId: "sw1",
          instruction: "On SW1 make Fa0/1 and Fa0/2 access ports, then assign Fa0/1 to VLAN 10 and Fa0/2 to VLAN 20. These are the ports cabled to PC-A and PC-B.",
          why: "An access port places every untagged frame from its attached host into exactly one VLAN, so the port and the VLAN have to agree with the cable.",
          commands: ["interface fa0/1", "switchport mode access", "switchport access vlan 10"],
          check: (lab) => {
            const switchView = lab.device("SW1");
            const first = switchView.port("Fa0/1");
            const second = switchView.port("Fa0/2");
            if (!first.exists || !second.exists) return unmet("SW1 does not publish both Fa0/1 and Fa0/2 in this lab.");
            if (first.mode !== "access") return unmet(`SW1 Fa0/1 is in ${first.mode} mode; PC-A's port must be an access port.`);
            if (second.mode !== "access") return unmet(`SW1 Fa0/2 is in ${second.mode} mode; PC-B's port must be an access port.`);
            if (first.accessVlan !== 10) return unmet(`SW1 Fa0/1 is in VLAN ${first.accessVlan}; PC-A's port must be VLAN 10.`);
            if (second.accessVlan !== 20) return unmet(`SW1 Fa0/2 is in VLAN ${second.accessVlan}; PC-B's port must be VLAN 20.`);
            if (!first.adminUp || !second.adminUp) return unmet(`SW1 ${!first.adminUp ? "Fa0/1" : "Fa0/2"} is administratively down.`);
            return met("SW1 Fa0/1 carries VLAN 10 to PC-A and Fa0/2 carries VLAN 20 to PC-B.");
          },
        },
      ],
    },
    {
      id: "trunk",
      title: "Trunk the switch to the router",
      detail: "One graded step on SW1: Fa0/24 must be an up 802.1Q trunk whose allowed list is exactly VLAN 10 and VLAN 20.",
      steps: [
        {
          id: "trunk-up",
          title: "Make SW1 Fa0/24 an 802.1Q trunk that carries only VLAN 10 and 20",
          deviceId: "sw1",
          instruction: "On SW1 set Fa0/24 to trunk mode, then limit the allowed VLAN list to 10 and 20. This is the single cable to R1, so both departments have to travel it.",
          why: "A trunk tags each frame with its VLAN. Both departments reach the router through one cable, and an allowed-VLAN list that omits one of them breaks that department silently.",
          commands: ["interface fa0/24", "switchport mode trunk", "switchport trunk allowed vlan 10,20"],
          check: (lab) => trunkAllows(lab, [10, 20]),
        },
      ],
    },
    {
      id: "router-on-a-stick",
      title: "Route between the VLANs on R1",
      detail: "Three graded steps on R1: Gi0/0 comes up with no address of its own, and Gi0/0.10 and Gi0/0.20 carry the 802.1Q tag and address of their department.",
      steps: [
        {
          id: "r1-physical",
          title: "Bring up R1 Gi0/0",
          deviceId: "r1",
          instruction: "On R1 the physical port Gi0/0 starts administratively down. Bring it up, but do not put an address on it: the addresses belong to the subinterfaces.",
          why: "Every router interface is shut down until it is enabled, and subinterfaces only work when their parent port is up.",
          commands: ["interface gi0/0", "no shutdown"],
          check: (lab) => {
            const port = lab.device("R1").port("Gi0/0");
            if (!port.exists) return unmet("R1 has no Gi0/0 port in this lab.");
            if (!port.adminUp) return unmet("R1 Gi0/0 is still administratively down, and its subinterfaces cannot pass traffic.");
            if (port.address) return unmet("R1 Gi0/0 carries an address; this lab puts the addresses on the subinterfaces instead.");
            return met("R1 Gi0/0 is up with no address of its own.");
          },
        },
        {
          id: "r1-sub10",
          title: "Create the VLAN 10 gateway on Gi0/0.10",
          deviceId: "r1",
          instruction: "On R1 create subinterface Gi0/0.10 with encapsulation dot1q 10 and the address 192.168.10.1 255.255.255.0.",
          why: "A router subinterface terminates one tagged VLAN, which is how a single physical port becomes the default gateway for two departments.",
          commands: ["interface gi0/0.10", "encapsulation dot1q 10", "ip address 192.168.10.1 255.255.255.0"],
          check: (lab) => subinterfaceHas(lab, "Gi0/0.10", 10, "192.168.10.1", "255.255.255.0"),
        },
        {
          id: "r1-sub20",
          title: "Create the VLAN 20 gateway on Gi0/0.20",
          deviceId: "r1",
          instruction: "On R1 create subinterface Gi0/0.20 with encapsulation dot1q 20 and the address 192.168.20.1 255.255.255.0.",
          why: "The second department needs its own tagged subinterface; one subinterface cannot serve two VLANs.",
          commands: ["interface gi0/0.20", "encapsulation dot1q 20", "ip address 192.168.20.1 255.255.255.0"],
          check: (lab) => subinterfaceHas(lab, "Gi0/0.20", 20, "192.168.20.1", "255.255.255.0"),
        },
      ],
    },
    {
      id: "hosts",
      title: "Address the two endpoints",
      detail: "Two graded steps, one per PC: each endpoint needs the address and mask the lab publishes plus a default gateway inside its own VLAN.",
      steps: [
        {
          id: "host-a",
          title: "Configure PC-A",
          deviceId: "pc-a",
          instruction: "On the PC-A console set 192.168.10.10 255.255.255.0, then set its default gateway to 192.168.10.1. This replaces the Desktop → IP Configuration window of Packet Tracer.",
          why: "A host needs an address inside its VLAN and a gateway that is reachable in that same VLAN, or its off-subnet traffic is dropped.",
          commands: ["ip address 192.168.10.10 255.255.255.0", "ip default-gateway 192.168.10.1"],
          check: (lab) => hostConfigured(lab, "pc-a", "192.168.10.10", "255.255.255.0", "192.168.10.1"),
        },
        {
          id: "host-b",
          title: "Configure PC-B",
          deviceId: "pc-b",
          instruction: "On the PC-B console set 192.168.20.10 255.255.255.0 and its default gateway 192.168.20.1.",
          why: "Reachability is bidirectional: the reply from PC-B has to leave its own subnet through its own gateway.",
          commands: ["ip address 192.168.20.10 255.255.255.0", "ip default-gateway 192.168.20.1"],
          check: (lab) => hostConfigured(lab, "pc-b", "192.168.20.10", "255.255.255.0", "192.168.20.1"),
        },
      ],
    },
    {
      id: "proof",
      title: "Prove the path and save the work",
      detail: "Two graded steps: a ping from PC-A to PC-B that the live model has to allow, and a saved startup configuration on SW1 that matches its running configuration. The Packet Tracer repeat is stated as ungraded.",
      steps: [
        {
          id: "proof-ping",
          title: "Ping PC-B from PC-A",
          deviceId: "pc-a",
          instruction: "On the PC-A console run ping 192.168.20.10. This is the lab's success condition: the two departments must reach each other through R1.",
          why: "The ping is computed from the live model — VLANs, access ports, the trunk allowed list, the subinterfaces and both gateways — so it fails with the reason whenever any one of them is wrong.",
          commands: ["ping 192.168.20.10"],
          check: (lab) => {
            const result = lab.ping("pc-a", "192.168.20.10");
            if (!result.ok && !lab.device("pc-a").port("Gi0/0").address) return unmet("PC-A has no address yet, so there is nothing to source a ping from.");
            return result;
          },
        },
        {
          id: "proof-save",
          title: "Save the running configuration on SW1",
          deviceId: "sw1",
          instruction: "On SW1 save the running configuration to startup-config, the way you would before leaving a real site.",
          why: "An unsaved configuration disappears at the next reload, and this site's check reads the saved copy rather than the fact that you typed a save command.",
          commands: ["copy running-config startup-config"],
          check: (lab) => startupSaved(lab, "sw1"),
        },
        {
          id: "proof-outside",
          title: "Repeat the build in your own Packet Tracer file",
          deviceId: "sw1",
          instruction: "Open the published diagram, build the same four devices and three cables in Packet Tracer, and repeat the configuration there.",
          why: "The browser console is a practice model. The transferable skill is doing the same work on a real device image.",
          ungraded: "Not evaluated here: this site cannot read your Packet Tracer file, and it will not pretend your .pkt was checked.",
        },
      ],
    },
  ],
    references: [
      ...lab.sourceRefs.map((source) => ({ title: source.title, url: source.url })),
    ],
  solution: [
    {
      deviceId: "sw1",
      commands: [
        "enable", "configure terminal", "hostname SW1",
        "vlan 10", "name DEPT-A", "exit",
        "vlan 20", "name DEPT-B", "exit",
        "interface fa0/1", "switchport mode access", "switchport access vlan 10", "exit",
        "interface fa0/2", "switchport mode access", "switchport access vlan 20", "exit",
        "interface fa0/24", "switchport mode trunk", "switchport trunk allowed vlan 10,20", "exit",
        "end", "copy running-config startup-config",
      ],
    },
    {
      deviceId: "r1",
      commands: [
        "enable", "configure terminal", "hostname R1",
        "interface gi0/0", "no shutdown", "exit",
        "interface gi0/0.10", "encapsulation dot1q 10", "ip address 192.168.10.1 255.255.255.0", "exit",
        "interface gi0/0.20", "encapsulation dot1q 20", "ip address 192.168.20.1 255.255.255.0", "exit",
        "end",
      ],
    },
    {
      deviceId: "pc-a",
      commands: ["ip address 192.168.10.10 255.255.255.0", "ip default-gateway 192.168.10.1", "ipconfig"],
    },
    {
      deviceId: "pc-b",
      commands: ["ip address 192.168.20.10 255.255.255.0", "ip default-gateway 192.168.20.1", "ipconfig"],
    },
  ],
  };
}

/** The saved configuration body of a device, which the pack's save step compares. */
export const runningBodyOf = configBodyLines;
