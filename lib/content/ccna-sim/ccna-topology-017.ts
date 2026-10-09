import { met, reachesDevice, unmet, type LabModel, type SimLabPack, type SimLabStep } from "../../ccna-sim/lab.ts";
import type { SimulationNode, SimulationLink } from "../../ccna-sim/topology.ts";
import { ccnaLabPath } from "../ccna-lab-path.ts";

const port = (label: string) => ({ id: label.toLowerCase().replaceAll("/", "-"), label, kind: "ethernet" as const });
// The six labels and all five cables reproduce the published 017 diagram, not the generic adapter.
const devices: SimulationNode[] = [
  ...["Switch1", "Switch2"].map((label, i) => ({ id: `sw${i + 1}`, label, kind: "switch" as const, role: "switch" as const, x: 260 + i * 420, y: 140, ports: [port("Fa0/1"), port("Fa0/11"), port("Fa0/12")], subtitle: "802.1Q access switch" })),
  ...["Sales1", "Sales2", "HR1", "HR2"].map((label, i) => ({ id: label.toLowerCase(), label, kind: "pc" as const, role: "host" as const, x: [80, 860, 260, 680][i], y: i < 2 ? 140 : 370, ports: [port("Eth0")], subtitle: i < 2 ? "Sales · VLAN 10" : "HR · VLAN 20" })),
];
const link = (id: string, device: string, devicePort: string, target: string, targetPort: string): SimulationLink => ({ id, source: { deviceId: device, portId: port(devicePort).id }, target: { deviceId: target, portId: port(targetPort).id }, status: "up", label: `${devicePort} ↔ ${targetPort}` });
const links = [link("trunk", "sw1", "Fa0/1", "sw2", "Fa0/1"), link("sales1", "sales1", "Eth0", "sw1", "Fa0/11"), link("sales2", "sales2", "Eth0", "sw2", "Fa0/11"), link("hr1", "hr1", "Eth0", "sw1", "Fa0/12"), link("hr2", "hr2", "Eth0", "sw2", "Fa0/12")];
const hostPlans = [
  { id: "sales1", sw: "sw1", port: "Fa0/11", ip: "192.168.10.11", vlan: 10 },
  { id: "sales2", sw: "sw2", port: "Fa0/11", ip: "192.168.10.12", vlan: 10 },
  { id: "hr1", sw: "sw1", port: "Fa0/12", ip: "192.168.20.11", vlan: 20 },
  { id: "hr2", sw: "sw2", port: "Fa0/12", ip: "192.168.20.12", vlan: 20 },
];

function trunkCheck(model: LabModel, id: string) {
  const d = model.device(id), p = d.port("Fa0/1");
  if (p.mode !== "trunk") return unmet(`${d.label} Fa0/1 must be a trunk, not ${p.mode}.`);
  if (!p.adminUp) return unmet(`${d.label} Fa0/1 is shut down.`);
  if (p.allowed === "all" || !p.allowed || p.allowed.length !== 2 || ![10, 20].every(v => (p.allowed as number[]).includes(v))) return unmet(`${d.label} Fa0/1 must allow exactly VLANs 10 and 20.`);
  const other = id === "sw1" ? "sw2" : "sw1";
  if (!model.linked(`${id}:Fa0/1`, `${other}:Fa0/1`)) return unmet(`${d.label} Fa0/1 is not cabled to the other switch's Fa0/1.`);
  return met(`${d.label} Fa0/1 is an enabled trunk carrying exactly VLANs 10 and 20.`);
}

function hostCheck(model: LabModel, h: typeof hostPlans[number]) {
  const d = model.device(h.id), p = d.port("Eth0");
  if (p.address?.ip !== h.ip || p.address.mask !== "255.255.255.0") return unmet(`${d.label} needs ${h.ip} 255.255.255.0 on Eth0.`);
  if (!p.adminUp) return unmet(`${d.label} Eth0 is shut down.`);
  if (!model.linked(`${h.id}:Eth0`, `${h.sw}:${h.port}`)) return unmet(`${d.label} must be connected to ${model.device(h.sw).label} ${h.port}.`);
  return met(`${d.label} has the published /24 address and cable. No gateway is needed for its same-subnet peer.`);
}

export function createCcnaTopology017Pack(): SimLabPack {
  const entry = ccnaLabPath.find(l => l.id === "ccna-topology-017");
  if (!entry) throw new Error("Missing published lab ccna-topology-017");
  const switchSteps: SimLabStep[] = ["sw1", "sw2"].flatMap(id => {
    const label = id === "sw1" ? "Switch1" : "Switch2";
    return [
      { id: `${id}-vlans`, title: `Create department VLANs on ${label}`, deviceId: id, instruction: `On ${label}, enter enable, configure terminal, then create VLAN 10 for Sales, VLAN 20 for HR and VLAN 99 for the unused native VLAN. Exit VLAN configuration between VLANs.`, why: "Each switch needs its own VLAN database; creating VLANs on the other switch does not configure this one.", commands: ["vlan 10", "vlan 20", "vlan 99"], check: model => { const d = model.device(id), missing = [10, 20, 99].filter(v => !d.vlan(v).exists); return missing.length ? unmet(`${label} is missing VLAN ${missing.join(", ")}.`) : met(`${label} has Sales, HR and native VLANs.`); } },
      { id: `${id}-access`, title: `Assign Sales and HR ports on ${label}`, deviceId: id, instruction: `Configure Fa0/11 as access VLAN 10 and Fa0/12 as access VLAN 20 on ${label}. These are the host cables in the reference picture.`, why: "An untagged host frame enters the VLAN assigned to its own access port.", commands: ["interface fa0/11", "switchport mode access", "switchport access vlan 10", "exit", "interface fa0/12", "switchport mode access", "switchport access vlan 20"], check: model => { for (const h of hostPlans.filter(h => h.sw === id)) { const p = model.device(id).port(h.port); if (p.mode !== "access" || p.accessVlan !== h.vlan || !p.adminUp) return unmet(`${label} ${h.port} must be enabled access VLAN ${h.vlan}.`); } return met(`${label} Fa0/11 carries Sales and Fa0/12 carries HR.`); } },
      { id: `${id}-trunk`, title: `Configure ${label} Fa0/1 trunk`, deviceId: id, instruction: `On ${label} configure Fa0/1 as a trunk and allow exactly 10,20. Do this on both switches; one end alone is not enough.`, why: "The shared switch-to-switch cable must carry both departments, not one access VLAN.", commands: ["interface fa0/1", "switchport mode trunk", "switchport trunk allowed vlan 10,20"], check: model => trunkCheck(model, id) },
      { id: `${id}-native`, title: `Set ${label}'s native VLAN to 99`, deviceId: id, instruction: `On ${label} Fa0/1 set switchport trunk native vlan 99. Keep the native VLAN identical at both ends. It has no host attached and is intentionally excluded from the allowed list.`, why: "The native VLAN identifies untagged trunk traffic. Matching it is a configuration requirement; a successful tagged Sales ping alone does not prove native VLAN agreement.", commands: ["interface fa0/1", "switchport trunk native vlan 99"], check: model => { const d = model.device(id); return d.port("Fa0/1").nativeVlan === 99 && d.vlan(99).exists ? met(`${label} uses existing VLAN 99 as native.`) : unmet(`${label} needs native VLAN 99 on Fa0/1 and VLAN 99 in its database.`); } },
    ];
  });
  return {
    labId: entry.id, title: entry.title, difficulty: entry.tier, duration: entry.duration,
    scenario: { role: "You are the clinic's network technician", context: "The clinic and its laboratory each have Sales and HR workstations. Keep the departments separate while extending each VLAN across two switches.", objective: "Build and verify a two-switch 802.1Q trunk using the published six-device diagram.", requirement: "Sales1 must reach Sales2 in VLAN 10 and HR1 must reach HR2 in VLAN 20. Both trunks allow exactly 10,20 and use native VLAN 99. There is no router: inter-VLAN communication is not part of this lab.", prerequisites: entry.prerequisites },
    diagramNote: "The reference picture names Switch1, Switch2, Sales1, Sales2, HR1 and HR2. The switches join at Fa0/1; Sales uses Fa0/11 and HR uses Fa0/12 on each switch. The /24 IP plan and VLAN 99 are this site's practice scenario, not claims about an original vendor solution.",
    devices, links,
    objectives: [
      { id: "switches", title: "Configure both switches", detail: "Eight state checks: each switch's VLAN database, access membership, trunk allowed list and native VLAN.", steps: switchSteps },
      { id: "hosts", title: "Address the four workstations", detail: "Four live host address and cable checks, using /24 subnets per department.", steps: hostPlans.map(h => ({ id: h.id, title: `Address ${devices.find(d => d.id === h.id)!.label}`, deviceId: h.id, instruction: `On this host enter ip address ${h.ip} 255.255.255.0. No default gateway is needed to reach its same-subnet departmental peer.`, why: "Sales uses 192.168.10.0/24; HR uses 192.168.20.0/24. IP addresses do not replace correct VLAN membership.", commands: [`ip address ${h.ip} 255.255.255.0`], check: model => hostCheck(model, h) })) },
      { id: "verify", title: "Prove both departments and save", detail: "Two live departmental connectivity checks and two startup configuration comparisons.", steps: [
        ...[{ from: "sales1", to: "sales2", name: "Sales" }, { from: "hr1", to: "hr2", name: "HR" }].map(pair => ({ id: `ping-${pair.name.toLowerCase()}`, title: `Prove ${pair.name} crosses the trunk`, deviceId: pair.from, instruction: `On ${devices.find(d => d.id === pair.from)!.label} ping ${hostPlans.find(h => h.id === pair.to)!.ip}. If it fails, check the host address, access port, VLAN database, both trunk lists and cables.`, why: "Both departments need a working path; a Sales-only allowed list cannot carry HR. The check also requires that address to be the peer's, not the sender's.", commands: [`ping ${hostPlans.find(h => h.id === pair.to)!.ip}`], check: (model: LabModel) => reachesDevice(model, pair.from, pair.to, hostPlans.find(h => h.id === pair.to)!.ip) })),
        ...["sw1", "sw2"].map(id => ({ id: `save-${id}`, title: `Save ${id === "sw1" ? "Switch1" : "Switch2"}`, deviceId: id, instruction: "Enter end, then copy running-config startup-config after finishing the switch. Save again if you change its configuration later.", why: "A saved but outdated configuration is not proof that the final settings survive reload.", commands: ["end", "copy running-config startup-config"], check: (model: LabModel) => model.device(id).startupSaved && model.device(id).startupMatchesRunning ? met("Startup configuration matches running configuration.") : unmet("Save this switch's current running configuration to startup-config.") })),
      ] },
    ],
    references: entry.sourceRefs.map(s => ({ title: s.title, url: s.url })),
    solution: [
      ...["sw1", "sw2"].map(deviceId => ({ deviceId, commands: ["enable", "configure terminal", "vlan 10", "name Sales", "exit", "vlan 20", "name HR", "exit", "vlan 99", "name UNUSED-NATIVE", "exit", "interface fa0/11", "switchport mode access", "switchport access vlan 10", "exit", "interface fa0/12", "switchport mode access", "switchport access vlan 20", "exit", "interface fa0/1", "switchport mode trunk", "switchport trunk allowed vlan 10,20", "switchport trunk native vlan 99", "end", "copy running-config startup-config"] })),
      ...hostPlans.map(h => ({ deviceId: h.id, commands: [`ip address ${h.ip} 255.255.255.0`] })),
    ],
  };
}
