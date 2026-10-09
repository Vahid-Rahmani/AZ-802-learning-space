import assert from "node:assert/strict";
import { IosSession, createLabSession } from "../lib/ccna-sim/session.ts";
import { runningConfigLines } from "../lib/ccna-sim/device.ts";
import { copyManagement } from "../lib/ccna-sim/management.ts";
import { buildLabModel } from "../lib/ccna-sim/lab.ts";
import { checkedStageResults } from "../lib/ccna-sim/guidance.ts";

const nodes = [
  { id: "r", label: "R1", role: "router", ports: [{ label: "Gi0/0" }] },
  { id: "s", label: "SW1", role: "switch", ports: [{ label: "Fa0/1" }, { label: "Fa0/24" }] },
  { id: "p", label: "PC-A", role: "host", ports: [{ label: "Eth0" }] },
];
const sessions = Object.fromEntries(nodes.map((node) => [node.id, createLabSession(node)]));
const network = {
  devices: nodes.map((node) => ({ id: node.id, label: node.label, role: node.role, state: sessions[node.id].state.device })),
  links: [{ id: "ps", a: { deviceId: "p", port: "Eth0" }, b: { deviceId: "s", port: "Fa0/1" } },
    { id: "sr", a: { deviceId: "s", port: "Fa0/24" }, b: { deviceId: "r", port: "Gi0/0" } }],
};
for (const session of Object.values(sessions)) {
  session.state.network = () => network;
  session.remoteSessionFor = (id) => {
    const target = sessions[id];
    const remote = new IosSession(target.state.device.hostname, target.state.device.role);
    remote.state.device = target.state.device;
    remote.state.config = target.state.config;
    remote.state.network = () => network;
    return remote;
  };
}
const run = (session, ...commands) => commands.map((command) => {
  const result = session.execute(command);
  assert.ok(result.matched, `${command}: ${result.lines.join("\n")}`);
  return result;
});
const router = sessions.r;
run(router, "enable", "conf t");
assert.match(router.execute("crypto key generate rsa modulus 2048").lines.join("\n"), /No domain specified/);
assert.equal(router.state.device.management?.rsaBits, 0);
run(router, "ip domain-name lab.example", "username learner secret LabOnly123", "crypto key generate rsa", "2048", "ip ssh version 2", "line vty 0 4", "login local", "transport input ssh", "end");
assert.equal(router.state.device.management.rsaBits, 2048);
assert.equal(router.state.device.management.vty[0].loginLocal, true);
assert.equal(router.state.device.management.vty[5].loginLocal, false);
assert.match(router.execute("show ip ssh").lines.join("\n"), /SSH Enabled - version 2/);
assert.equal(sessions.s.state.device.management, undefined, "router configuration leaked into the switch");
assert.equal(sessions.p.execute("configure terminal").matched, null, "a PC accepted IOS config mode");
assert.equal(router.execute("show vlan brief").matched, null, "a router accepted switch commands");

const stages = [{ id: "address", deviceId: "r", check: (lab) => ({ ok: lab.device("r").port("Gi0/0").address?.ip === "192.168.1.1", detail: "Configure the router gateway" }) }];
const outcomes = () => checkedStageResults(stages, buildLabModel(network));
assert.equal(outcomes().get("address").ok, false, "unrelated SSH configuration passed the address task");
run(router, "show ip interface brief", "show ip interface brief", "show ip interface brief");
assert.equal(outcomes().get("address").ok, false, "repeated reads passed the task");
run(router, "conf t", "interface gi0/0", "ip address 192.168.1.1 255.255.255.0", "no shutdown", "end");
run(sessions.p, "ip address 192.168.1.10 255.255.255.0");
assert.equal(outcomes().get("address").ok, true);

const pc = sessions.p;
run(pc, "ssh -l learner 192.168.1.1");
assert.equal(pc.prompt, "Password:");
assert.equal(pc.inputHidden, true);
assert.match(pc.execute("wrong").lines.join("\n"), /Authentication failed/);
assert.equal(pc.prompt, "PC-A>");
run(pc, "ssh -l learner 192.168.1.1");
pc.execute("LabOnly123");
assert.equal(pc.prompt, "R1>");
assert.ok(!pc.commandHistory.includes("LabOnly123"), "SSH password leaked into command history");
run(pc, "enable", "conf t", "hostname Branch-Router", "end", "write memory");
assert.equal(router.state.device.hostname, "Branch-Router", "remote configuration did not reach the real target state");
assert.equal(pc.state.device.hostname, "PC-A", "SSH configured the PC instead of the router");
assert.match(router.execute("show startup-config").lines.join("\n"), /hostname Branch-Router/);
assert.equal(outcomes().get("address").ok, true, "extra configuration broke unrelated progress");
run(pc, "disable", "exit");
assert.equal(pc.prompt, "PC-A>");

run(sessions.s, "enable", "conf t", "interface vlan1", "ip address 192.168.1.2 255.255.255.0", "exit", "ip domain-name lab.example", "username learner secret SwitchOnly123", "crypto key generate rsa modulus 2048", "line vty 0 15", "login local", "transport input ssh", "end");
run(pc, "ssh -l learner 192.168.1.2");
pc.execute("SwitchOnly123");
assert.equal(pc.prompt, "SW1>", "switch management SVI is unreachable");
network.links[0].status = "down";
assert.match(pc.execute("enable").lines.join("\n"), /connection lost/);
assert.equal(pc.prompt, "PC-A>");
assert.equal(pc.execute("ssh -l learner 192.168.1.2").matched, null, "SSH succeeded through a disconnected cable");
network.links[0].status = "up";

const restored = copyManagement(JSON.parse(JSON.stringify(router.state.device.management)));
assert.deepEqual(restored, router.state.device.management);
restored.vty[0].loginLocal = false;
assert.equal(router.state.device.management.vty[0].loginLocal, true, "snapshot aliases live state");
run(router, "conf t", "no username learner", "crypto key zeroize rsa", "end");
assert.equal(Object.hasOwn(router.state.device.management.users, "learner"), false);
assert.equal(router.state.device.management.rsaBits, 0);
assert.doesNotMatch(runningConfigLines(router.state.device).join("\n"), /username learner/);
console.log("Management checks passed: device-specific CLI, free configuration, real-state grading, SSH authentication/remote config, cable loss, VTY ranges, save and snapshot isolation.");
