import assert from "node:assert/strict";
import { createLabSession, IosSession } from "../lib/ccna-sim/session.ts";
import { pingFrom } from "../lib/ccna-sim/lab-network.ts";

const nodes = [
  { id: "p1", label: "PC-A", role: "host", ports: [{ label: "Eth0" }] },
  { id: "r1", label: "R1", role: "router", ports: [{ label: "Gi0/0" }, { label: "Gi0/1" }] },
  { id: "r2", label: "R2", role: "router", ports: [{ label: "Gi0/0" }, { label: "Gi0/1" }] },
  { id: "s", label: "SW1", role: "switch", ports: [{ label: "Fa0/1" }, { label: "Fa0/2" }] },
  { id: "p2", label: "PC-B", role: "host", ports: [{ label: "Eth0" }] },
];
const sessions = Object.fromEntries(nodes.map((node) => [node.id, createLabSession(node)]));
const link = (id, a, portA, b, portB) => ({ id, a: { deviceId: a, port: portA }, b: { deviceId: b, port: portB } });
const network = {
  devices: nodes.map((node) => ({ ...node, state: sessions[node.id].state.device })),
  links: [link("a", "p1", "Eth0", "r1", "Gi0/0"), link("wan", "r1", "Gi0/1", "r2", "Gi0/0"), link("b", "r2", "Gi0/1", "s", "Fa0/1"), link("c", "s", "Fa0/2", "p2", "Eth0")],
};
const remoteFor = (id) => {
  const target = sessions[id];
  if (!target) return null;
  const remote = new IosSession(target.state.device.hostname, target.state.device.role);
  remote.state.device = target.state.device;
  remote.state.config = target.state.config;
  remote.state.network = () => network;
  remote.remoteSessionFor = remoteFor;
  return remote;
};
for (const session of Object.values(sessions)) {
  session.state.network = () => network;
  session.remoteSessionFor = remoteFor;
}
const run = (id, ...commands) => commands.map((command) => {
  const result = sessions[id].execute(command);
  assert.ok(result.matched, `${id} ${command}: ${result.lines.join("\n")}`);
  return result;
});
const ping = (from, target, expected, message) => {
  const outcome = pingFrom(network, from, target);
  assert.equal(outcome.ok, expected, `${message}: ${outcome.reason}`);
  const console = run(from, `ping ${target}`)[0];
  assert.equal(console.lines.some((line) => line.includes("100 percent")), expected, "console disagrees with the packet model");
};
run("p1", "ip address 192.168.1.10 255.255.255.0", "ip default-gateway 192.168.1.1");
run("p2", "ip address 192.168.2.10 255.255.255.0", "ip default-gateway 192.168.2.1");
run("r1", "enable", "conf t", "interface gi0/0", "ip address 192.168.1.1 255.255.255.0", "no shut", "exit", "interface gi0/1", "ip address 10.0.0.1 255.255.255.252", "no shut", "end");
run("r2", "enable", "conf t", "interface gi0/0", "ip address 10.0.0.2 255.255.255.252", "no shut", "exit", "interface gi0/1", "ip address 192.168.2.1 255.255.255.0", "no shut", "end");
ping("r1", "192.168.1.10", true, "router-originated ping to directly cabled PC");
ping("p1", "192.168.2.10", false, "no static route");
run("r1", "conf t", "ip route 192.168.2.0 255.255.255.0 10.0.0.2", "end");
run("r1", "conf t");
assert.equal(sessions.r1.execute("no ip route").matched, null, "incomplete route deletion reported success");
assert.equal(sessions.r1.execute("interface gi9/9.10").matched, null, "a nonexistent parent created a fake subinterface");
run("r1", "end");
ping("p1", "192.168.2.10", false, "forward route exists but return route is missing");
run("r2", "conf t", "ip route 192.168.1.0 255.255.255.0 10.0.0.1", "end");
ping("p1", "192.168.2.10", true, "two-router static routing in both directions");
ping("r1", "192.168.2.10", true, "router chooses its egress IP as source");
assert.match(run("r1", "show ip route")[0].lines.join("\n"), /S\s+192.168.2.0\/24 \[1\/0\] via 10.0.0.2/);
run("r1", "conf t", "ip route 192.168.2.0 255.255.255.128 10.0.0.3", "end");
ping("p1", "192.168.2.10", false, "longest-prefix wins even if its next-hop is unreachable");
run("r1", "conf t", "no ip route 192.168.2.0 255.255.255.128 10.0.0.3", "end", "write memory");
assert.match(run("r1", "show startup-config")[0].lines.join("\n"), /ip route 192.168.2.0 255.255.255.0 10.0.0.2/);
network.links[1].status = "down";
ping("p1", "192.168.2.10", false, "unplugged WAN cannot route");
assert.doesNotMatch(run("r1", "show ip route")[0].lines.join("\n"), /S\s+192.168.2.0/);
network.links[1].status = "up";
run("s", "enable", "conf t", "vlan 10", "exit", "interface range fa0/1-2", "switchport access vlan 10", "exit", "interface vlan 10", "ip address 192.168.2.2 255.255.255.0", "no shutdown", "exit", "ip default-gateway 192.168.2.1", "do show ip interface brief", "end");
ping("s", "192.168.1.10", true, "switch SVI/default gateway can originate routed ping");
run("s", "conf t", "interface vlan 10", "shutdown", "end");
ping("s", "192.168.1.10", false, "down SVI cannot originate ping");
run("s", "conf t", "interface vlan 10", "no shutdown", "end");
for (const id of ["r1", "r2", "s"]) run(id, "conf t", "ip domain-name lab.example", "username learner secret LabOnly123", "crypto key generate rsa modulus 2048", "line vty 0 4", "login local", "transport input ssh", "end");
run("r1", "ssh -l learner 192.168.2.2");
sessions.r1.execute("LabOnly123");
assert.equal(sessions.r1.prompt, "SW1>", "router-originated SSH failed");
run("r1", "ssh -l learner 192.168.2.1");
assert.equal(sessions.r1.inputHidden, true, "nested SSH password is not hidden");
sessions.r1.execute("LabOnly123");
assert.equal(sessions.r1.prompt, "R2>");
run("r1", "enable", "conf t", "hostname Remote-R2", "end", "disable", "exit");
assert.equal(sessions.r2.state.device.hostname, "Remote-R2", "nested SSH did not edit target state");
assert.equal(sessions.r1.prompt, "SW1>");
run("r1", "exit");
assert.equal(sessions.r1.prompt, "R1#");
run("s", "ssh -l learner 192.168.1.1");
sessions.s.execute("LabOnly123");
assert.equal(sessions.s.prompt, "R1>", "switch-originated SSH failed");
run("s", "exit");
run("r1", "conf t", "no ip route 192.168.2.0 255.255.255.0 10.0.0.2", "ip route 0.0.0.0 0.0.0.0 10.0.0.2", "end");
run("r2", "conf t", "no ip route 192.168.1.0 255.255.255.0 10.0.0.1", "ip route 0.0.0.0 0.0.0.0 10.0.0.1", "end");
assert.match(pingFrom(network, "p1", "192.168.2.10").reason, /return path verified/);
// A disconnected destination segment must not be rescued by reciprocal default routes.
network.links[2].status = "down";
assert.match(pingFrom(network, "p1", "192.168.2.10").reason, /Routing loop/);
network.links[2].status = "up";
run("r1", "conf t", "interface gi0/0", "ipv6 address 2001:db8:1::1/64", "exit", "interface gi0/1", "ipv6 address 2001:db8:12::1/64", "exit", "ipv6 unicast-routing", "end");
run("r2", "conf t", "interface gi0/0", "ipv6 address 2001:db8:12::2/64", "end");
run("p1", "ipv6 address 2001:db8:1::10/64", "ipv6 default-gateway 2001:db8:1::1");
ping("r1", "2001:db8:1::10", true, "router-originated IPv6 ping");
ping("p1", "2001:db8:12::2", false, "IPv6 reply requires forwarding on R2");
console.log("Routing checks passed: all console roles, direct cable, multi-router static/default routing, longest-prefix, return path, WAN loss, SVI, IPv6, router/switch/nested SSH, live config and loop protection.");
