import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { learningTasks, learningStages, learningSources, learningPack, knowledgePassed } from "../lib/content/cisco-learning.ts";
import { createLabSession, IosSession } from "../lib/ccna-sim/session.ts";
import { buildLabModel } from "../lib/ccna-sim/lab.ts";
import { checkedStageResults } from "../lib/ccna-sim/guidance.ts";

assert.equal(learningTasks.length, 48);
assert.equal(new Set(learningTasks.map(t => t.id)).size, 48);
assert.equal(learningStages.length, 13);
for (const stage of learningStages) assert.ok(learningTasks.some(t => t.stageIds.includes(stage.id)), `${stage.id} empty`);
for (const t of learningTasks) {
  for (const p of t.prerequisites) assert.ok(learningTasks.some(t => t.id === p), `${t.id}: missing prerequisite ${p}`);
  for (const s of t.sourceIds) assert.ok(learningSources.some(source => source.id === s), `${t.id}: missing source ${s}`);
  for (const field of ["scenarioFa", "preLessonFa", "goalFa", "explanationFa"]) assert.ok(t[field]?.length > 20, `${t.id}: ${field}`);
  assert.ok(t.steps.length && t.hintsFa.length >= 3 && t.verification.length && t.faults.length && t.passCriteria.length && t.skills.length);
  assert.ok(t.simulatorMapping.limitationFa);
  if (t.assessment.startsWith("guided")) {
    assert.ok(t.reviewQuestions.length >= 2);
    assert.equal(knowledgePassed(t, []), false);
    assert.equal(knowledgePassed(t, t.reviewQuestions.map(() => "wrong")), false);
    assert.equal(knowledgePassed(t, t.reviewQuestions.map(q => q.answerFa)), true);
    assert.equal(knowledgePassed(t, t.reviewQuestions.map((q, i) => i ? q.answerFa : "wrong")), false);
  }
}
function fixture(t) {
  const pack = learningPack(t);
  const sessions = new Map(pack.devices.map(n => [n.id, createLabSession(n)]));
  const label = e => pack.devices.find(n => n.id === e.deviceId).ports.find(p => p.id === e.portId).label;
  const links = pack.links.map(l => ({ id: l.id, a: { deviceId: l.source.deviceId, port: label(l.source) }, b: { deviceId: l.target.deviceId, port: label(l.target) }, status: l.status }));
  const network = () => ({ devices: pack.devices.map(n => ({ id: n.id, label: n.label, state: sessions.get(n.id).state.device, startup: sessions.get(n.id).state.config.startup })), links });
  const remoteFor = id => {
    const target = sessions.get(id);
    if (!target) return null;
    const remote = new IosSession(target.state.device.hostname, target.state.device.role);
    remote.state.device = target.state.device; remote.state.config = target.state.config;
    remote.state.network = network; remote.remoteSessionFor = remoteFor;
    return remote;
  };
  for (const s of sessions.values()) { s.state.network = network; s.remoteSessionFor = remoteFor; }
  const outcomes = () => checkedStageResults(pack.stages, buildLabModel(network()));
  const run = blocks => {
    for (const b of blocks) {
      const s = sessions.get(b.deviceId);
      assert.ok(s, `${t.id}: unknown ${b.deviceId}`); s.state.mode = "user";
      for (const c of b.commands) {
        const r = s.execute(c);
        assert.ok(r.matched, `${t.id}/${b.deviceId} ${c}: ${r.lines.join(" ")}`);
      }
      s.state.mode = "user";
    }
  };
  return { pack, sessions, network, links, outcomes, run };
}
let graded = 0, negatives = 0, steps = 0;
for (const t of learningTasks.filter(t => t.assessment === "live-state")) {
  const f = fixture(t); const before = [...f.outcomes()];
  assert.ok(before.some(([, o]) => !o.ok), `${t.id} starts solved`);
  for (const s of f.sessions.values()) if (s.state.device.role !== "host") {
    s.execute("enable");
    for (let i = 0; i < 3; i++) for (const c of ["show ip interface brief", "show running-config"]) assert.ok(s.execute(c).matched);
    s.state.mode = "user";
  }
  assert.deepEqual([...f.outcomes()], before, `${t.id}: repeating shows granted credit`);
  f.run(t.solution);
  for (const [id, o] of f.outcomes()) assert.ok(o.ok, `${t.id}/${id}: ${o.detail}`);
  graded++; steps += f.outcomes().size;
  for (const fault of t.faults) {
    const broken = fixture(t); broken.run(t.solution); broken.run(fault.commands);
    for (const l of fault.linkChanges ?? []) broken.links.find(n => n.id === l.id).status = l.status;
    assert.ok([...broken.outcomes().values()].some(o => !o.ok), `${t.id}/${fault.id}: fault passed`);
    broken.run(fault.repair);
    for (const l of fault.linkChanges ?? []) broken.links.find(n => n.id === l.id).status = "up";
    for (const [id, o] of broken.outcomes()) assert.ok(o.ok, `${t.id}/${fault.id} repair ${id}: ${o.detail}`);
    negatives++;
  }
}
const sshTask = learningTasks.find(t => t.id === "011");
const s = fixture(sshTask); s.run(sshTask.solution);
for (const [ip, prompt] of [["192.168.10.2", "SW1#"], ["192.168.10.3", "SW2#"]]) {
  const pc = s.sessions.get("pc-a");
  pc.execute(`ssh -l netadmin ${ip}`); assert.equal(pc.inputHidden, true);
  pc.execute("wrong"); assert.equal(pc.prompt, "PC-A>");
  pc.execute(`ssh -l netadmin ${ip}`); pc.execute("LabOnly-SSH011");
  assert.equal(pc.prompt, prompt);
  pc.execute("exit"); assert.equal(pc.prompt, prompt.replace("#", ">"));
  pc.execute("exit"); assert.equal(pc.prompt, "PC-A>");
}
const wrong = fixture(learningTasks.find(t => t.id === "012"));
const r = wrong.sessions.get("r1"); r.execute("enable"); r.execute("configure terminal");
assert.equal(r.execute("vlan 10").matched, null); assert.equal(r.execute("interface gi9/9").matched, null);
assert.ok([...wrong.outcomes().values()].some(o => !o.ok));
const self = fixture(learningTasks.find(t => t.id === "003")); self.run(learningTasks.find(t => t.id === "003").solution);
self.run([{ deviceId: "pc-a", commands: ["ip address 192.168.10.20 255.255.255.0"] }]);
assert.equal(self.outcomes().get("003-reach").ok, false, "self/duplicate address gave peer reach credit");
assert.equal(self.outcomes().get("003-addresses").ok, false);
const component = readFileSync(new URL("../app/components/cisco-learning.tsx", import.meta.url), "utf8");
assert.ok(component.includes("cisco-learning:v1:${userId}:${task.id}"));
assert.ok(component.includes("knowledgePassed(task, nextAnswers)"));
assert.ok(component.includes('task.assessment === "guided-knowledge" ? null : learningPack(task)'));
console.log(`Cisco learning: 48 tasks / 13 stages; ${graded} practical tasks, ${steps} live criteria, ${negatives} fault/repair cases; guided knowledge, initial-unsolved, show repetition, wrong device, duplicate/self-ping, SSH correct/wrong login and independent progress keys passed.`);
