import taskData from "../../content/cisco-curriculum/tasks-001-010.json" with { type: "json" };
import curriculum from "../../content/cisco-curriculum/curriculum.json" with { type: "json" };
import extra from "../../content/cisco-curriculum/tasks-011-015.json" with { type: "json" };
import { met, unmet, reachesDevice, type LabModel, type LabStepOutcome } from "../ccna-sim/lab.ts";
import type { SimulationPack, SimulationNode } from "../ccna-sim/topology.ts";

export type CommandBlock = { deviceId: string; commands: string[] };
export type LearningTask = {
  id: string; stageIds: string[]; titleFa: string; type: string; minutes: number;
  scenarioFa: string; prerequisites: string[]; preLessonFa: string; topologyId: string;
  initialState: { afterTask: string | null; descriptionFa: string; setup: CommandBlock[] };
  goalFa: string; steps: { deviceId: string; instructionFa: string; whyFa: string }[];
  hintsFa: string[]; verification: { deviceId: string; commands: string[]; expectedFa: string }[];
  faults: { id: string; descriptionFa: string; commands: CommandBlock[]; repair: CommandBlock[]; expectedFailureFa: string; repairFa?: string; linkChanges?: { id: string; status: string }[] }[];
  solution: CommandBlock[]; explanationFa: string; assessment: string;
  passCriteria: { id: string; deviceId?: string; assertionFa: string; failureFa?: string }[];
  skills: string[]; sourceIds: string[]; reviewQuestions?: { questionFa: string; answerFa: string }[];
  simulatorMapping: { limitationFa: string; targetDeviceIds: string[] };
};

export const learningStages = curriculum.stages;
export const learningSources = [...curriculum.sources, { id: "ssh", title: "Cisco · Configure SSH", url: "https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html" }];
export const learningTasks: LearningTask[] = [...taskData.tasks, ...extra.tasks] as LearningTask[];
const portId = (label: string) => label.toLowerCase().replace(/\//g, "-");
const save = (l: LabModel, id: string) => l.device(id).startupSaved && l.device(id).startupMatchesRunning;
const account = (l: LabModel, id: string) => {
  const u = l.device(id).management.users.netadmin;
  return Boolean(u?.kind === "secret" && u.privilege === 15 && u.credential);
};
const restricted = (l: LabModel, id: string) => account(l, id) && l.device(id).management.vty.length === 16
  && l.device(id).management.vty.every(v => v.loginLocal && v.transport.length === 0);
const access = (l: LabModel, id: string, name: string, vlan: number) => {
  const p = l.device(id).port(name); return p.exists && p.adminUp && p.mode === "access" && p.accessVlan === vlan;
};
const address = (l: LabModel, id: string, ip: string, mask: string) => {
  const p = l.device(id).port("Gi0/0");
  return p.adminUp && p.address?.ip === ip && p.address.mask === mask
    && l.network.devices.filter(d => d.state.interfaces.some(i => i.address?.ip === ip)).length === 1;
};
const v4 = (l: LabModel, mask: string, finance = false) => address(l, "pc-a", "192.168.10.10", mask)
  && address(l, "pc-b", finance ? "192.168.20.20" : "192.168.10.20", mask);
const v6 = (l: LabModel) => ["pc-a", "pc-b"].every((id, i) => {
  const ip = `2001:db8:10::${i ? "20" : "10"}`;
  const p = l.device(id).port("Gi0/0");
  return p.ipv6?.address === ip && p.ipv6.prefix === 64
    && l.network.devices.filter(d => d.state.interfaces.some(n => n.ipv6?.address === ip)).length === 1;
});
const cables = (l: LabModel, expanded = false) => l.linked("pc-a:Gi0/0", "sw1:Gi0/1")
  && (expanded ? l.linked("sw1:Gi0/3", "sw2:Gi0/1") && l.linked("pc-b:Gi0/0", "sw2:Gi0/2") : l.linked("pc-b:Gi0/0", "sw1:Gi0/2"));
const membership = (l: LabModel, vlan: number, expanded = false) => cables(l, expanded)
  && access(l, "sw1", "Gi0/1", vlan) && access(l, expanded ? "sw2" : "sw1", "Gi0/2", vlan);
const reach = (l: LabModel, dual = false) => {
  const addresses = dual ? ["192.168.10.10", "192.168.10.20", "2001:db8:10::10", "2001:db8:10::20"] : ["192.168.10.10", "192.168.10.20"];
  return addresses.every((ip, i) => reachesDevice(l, i % 2 ? "pc-a" : "pc-b", i % 2 ? "pc-b" : "pc-a", ip).ok);
};
const trunk = (l: LabModel) => [["sw1", "Gi0/3"], ["sw2", "Gi0/1"]].every(([id, name]) => {
  const p = l.device(id).port(name); return p.adminUp && p.mode === "trunk" && p.nativeVlan === 1
    && Array.isArray(p.allowed) && p.allowed.length === 1 && p.allowed[0] === 10;
});
const vlans = (l: LabModel) => l.device("sw1").vlan(10).name === "SALES" && l.device("sw1").vlan(20).name === "FINANCE";
const isolated = (l: LabModel) => !l.ping("pc-a", "192.168.20.20").ok && !l.ping("pc-b", "192.168.10.10").ok;
const security = (l: LabModel) => ["sw1", "sw2"].every(id => l.device(id).hostname === id.toUpperCase() && restricted(l, id));
const expandedVlan = (l: LabModel) => membership(l, 10, true) && ["sw1", "sw2"].every(id => l.device(id).vlan(10).name === "SALES");
const expandedDual = (l: LabModel) => v4(l, "255.255.255.192") && v6(l) && reach(l, true) && save(l, "sw1") && save(l, "sw2");
const ssh = (l: LabModel, id: string) => {
  const d = l.device(id); const m = d.management;
  return d.hostname === id.toUpperCase() && m.domain === "madar.lab" && m.rsaBits >= 2048 && m.sshVersion === 2 && account(l, id)
    && m.vty.length === 16 && m.vty.every(v => v.loginLocal && v.transport.length === 1 && v.transport[0] === "ssh");
};
const svi = (l: LabModel, id: string, ip: string) => {
  const p = l.device(id).port("Vlan10");
  return p.adminUp && p.address?.ip === ip && p.address.mask === "255.255.255.192"
    && l.network.devices.filter(d => d.state.interfaces.some(n => n.address?.ip === ip)).length === 1
    && reachesDevice(l, "pc-a", id, ip).ok;
};
const predicates: Record<string, (lab: LabModel) => boolean> = {
  "002-hostname": l => l.device("sw1").hostname === "SW1", "002-user": l => account(l, "sw1"),
  "002-vty": l => restricted(l, "sw1"), "002-save": l => save(l, "sw1"),
  "003-addresses": l => v4(l, "255.255.255.0"), "003-path": l => membership(l, 1), "003-reach": l => reach(l),
  "005-vlans": vlans, "005-access": l => cables(l) && access(l, "sw1", "Gi0/1", 10) && access(l, "sw1", "Gi0/2", 20),
  "005-address": l => v4(l, "255.255.255.0", true), "005-isolation-save": l => isolated(l) && save(l, "sw1"),
  "006-port": l => access(l, "sw1", "Gi0/2", 20) && l.linked("pc-b:Gi0/0", "sw1:Gi0/2"),
  "006-preserve": l => v4(l, "255.255.255.0", true) && access(l, "sw1", "Gi0/1", 10) && vlans(l) && isolated(l), "006-save": l => save(l, "sw1"),
  "007-address": l => v4(l, "255.255.255.192"), "007-membership": l => membership(l, 10), "007-connect-save": l => reach(l) && save(l, "sw1"),
  "008-v6": v6, "008-preserve": l => v4(l, "255.255.255.192") && membership(l, 10), "008-dual": l => reach(l, true),
  "009-topology": l => cables(l, true) && [l.device("sw1").port("Gi0/3"), l.device("sw2").port("Gi0/1")].every(p => p.adminUp),
  "009-vlan": expandedVlan, "009-trunk": trunk, "009-security": security, "009-dual-save": expandedDual,
  "010-state": l => cables(l, true) && expandedVlan(l) && trunk(l) && security(l) && expandedDual(l),
  "010-save": l => save(l, "sw1") && save(l, "sw2"),
  "011-sw1-svi": l => svi(l, "sw1", "192.168.10.2"), "011-sw2-svi": l => svi(l, "sw2", "192.168.10.3"),
  "011-sw1-ssh": l => ssh(l, "sw1"), "011-sw2-ssh": l => ssh(l, "sw2"),
  "011-preserve-save": l => expandedVlan(l) && trunk(l) && cables(l, true) && expandedDual(l),
};
export function learningCheck(id: string, lab: LabModel): LabStepOutcome {
  const criterion = learningTasks.flatMap(t => t.passCriteria).find(c => c.id === id);
  const check = predicates[id];
  return check?.(lab) ? met(criterion?.assertionFa ?? id) : unmet(criterion?.failureFa ?? "این بخش نیازمند بررسی پاسخ آموزشی است، نه تیک تنظیمات.");
}
function baseline(task: LearningTask): CommandBlock[] {
  if (!task.initialState.afterTask) return task.initialState.setup;
  const previous = learningTasks.find(t => t.id === task.initialState.afterTask);
  if (!previous) throw new Error(`Missing prerequisite ${task.initialState.afterTask}`);
  return [...baseline(previous), ...previous.solution, ...task.initialState.setup];
}
export function learningPack(task: LearningTask): SimulationPack {
  const topology = taskData.topologies[task.topologyId as keyof typeof taskData.topologies];
  const setup = baseline(task);
  const devices: SimulationNode[] = topology.devices.map((n, i) => ({
    id: n.id, label: n.label, role: n.role as "switch" | "host", kind: n.role === "host" ? "pc" : "switch",
    x: 130 + i * 180, y: n.role === "host" ? 130 : 350,
    initialHostname: "initialHostname" in n ? n.initialHostname : n.label,
    initialConfig: setup.filter(b => b.deviceId === n.id).map(b => b.commands),
    ports: n.ports.map(label => ({ id: portId(label), label, kind: "ethernet" })),
  }));
  return {
    id: `cisco-learning-${task.id}`, title: `${task.id} · ${task.titleFa}`, duration: String(task.minutes),
    scenario: { context: task.scenarioFa, objective: task.goalFa, requirement: task.preLessonFa, prerequisites: task.prerequisites }, devices,
    links: topology.links.map(l => ({ id: l.id, source: { deviceId: l.a.deviceId, portId: portId(l.a.port) }, target: { deviceId: l.b.deviceId, portId: portId(l.b.port) }, status: "up" })),
    checklist: task.steps.map((s, i) => ({ id: `instruction-${i}`, title: s.instructionFa, detail: s.whyFa, required: false })),
    stages: task.passCriteria.map(c => ({ id: c.id, title: c.assertionFa, deviceId: c.deviceId,
      instruction: task.steps.find(s => s.deviceId === c.deviceId)?.instructionFa ?? task.goalFa,
      why: task.steps.find(s => s.deviceId === c.deviceId)?.whyFa ?? task.explanationFa,
      command: task.verification.find(v => v.deviceId === c.deviceId)?.commands[0] ?? "show running-config",
      commands: task.solution.find(b => b.deviceId === c.deviceId)?.commands, expected: c.assertionFa,
      check: predicates[c.id] ? l => learningCheck(c.id, l) : undefined,
      ungraded: predicates[c.id] ? undefined : "بررسی فهم درس؛ این بخش نمرهٔ تنظیمات دستگاه نیست.",
    })),
    references: learningSources.filter(s => task.sourceIds.includes(s.id)).map(s => ({ title: s.title, url: s.url })),
  };
}
