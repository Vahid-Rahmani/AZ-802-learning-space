import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simCommands, simKeywordHelp } from "../lib/ccna-sim/commands.ts";
import { isSingleLanguage } from "../lib/ccna-sim/language.ts";
import { createLabSession, IosSession } from "../lib/ccna-sim/session.ts";
import { completedInput, historyPosition } from "../lib/ccna-sim/terminal-controls.ts";
import { buildLabModel } from "../lib/ccna-sim/lab.ts";
import { ccnaLabs } from "../lib/content/ccna.ts";
import { listAuthoredLabPacks } from "../lib/content/ccna-sim/index.ts";

/** Built once here: the authored packs are graded from state in section 5 and drive the fixtures above. */
const authoredLabPacks = listAuthoredLabPacks();

/**
 * Guardrails for the CCNA in-browser simulator (content/ccna-simulator-plan.md):
 *
 *   1. the command catalog is complete and unique — every entry has a mode, a help line and
 *      single-language text, so `?` can never list more than the engine implements;
 *   2. the simulator surface is authored in exactly one language: no Persian/Arabic script and no
 *      second-language field anywhere in the engine, the packs or the simulator components;
 *   3. every transcript in content/ccna-sim/transcripts replays byte-identically, twice, through the
 *      same engine the browser uses — a fixture can never silently drift from the terminal;
 *   4. a pack may only exist for a real, already-reviewed lab in the manifest;
 *   5. an authored pack is graded from device state only: its solution must satisfy every graded
 *      step, and the negative runs below must not — typing the same read command twice earns
 *      nothing, the right commands on the wrong console earn nothing, and one wrong VLAN breaks
 *      both the trunk step and the end-to-end ping.
 *
 * `--print <file>` is a development helper: it prints the transcript with the engine's actual
 * output, which is how a fixture is authored. It is not a way to pass the replay check.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transcriptDir = path.join(projectRoot, "content/ccna-sim/transcripts");
const packDir = path.join(projectRoot, "lib/content/ccna-sim");
const engineDir = path.join(projectRoot, "lib/ccna-sim");
const simulatorSurfaces = [
  "app/components/ccna-sim.tsx",
  "app/components/ccna-simulation-workspace.tsx",
  "app/ccna/sim/page.tsx",
  "app/ccna-sim.css",
  "app/ccna/simulator.css",
];
const bannedSecondLanguageFields = [/^\s*fa\s*:/m, /^\s*de\s*:/m, /^\s*translation\s*:/m, /^\s*subtitle\s*:/m];
const args = process.argv.slice(2);
const printIndex = args.indexOf("--print");

const tsFilesIn = (directory) => existsSync(directory)
  ? readdirSync(directory).filter((name) => name.endsWith(".ts") || name.endsWith(".tsx")).map((name) => path.join(directory, name))
  : [];

const ethernetLabels = (node) => node.ports
  .filter((port) => port.kind !== "console" && port.kind !== "wireless")
  .map((port) => port.label);

/** The browser workspace is the other caller of `createLabSession`, and it must stay that way: a
 * second, hand-rolled device builder is how a graded step once read different state than the
 * terminal on screen (a router port that starts admin-up verified "bring the port up" for free). */
function assertWorkspaceSharesTheConsoleBuilder() {
  const source = readFileSync(path.join(projectRoot, "app/components/ccna-simulation-workspace.tsx"), "utf8");
  assert.ok(source.includes("createLabSession("), "the simulator workspace no longer builds its consoles with createLabSession");
  assert.ok(!/adminUp:\s*(true|false)/.test(source), "the simulator workspace hand-builds port state instead of using createLabSession");
}

const portLabelOf = (pack, endpoint) => pack.devices
  .find((node) => node.id === endpoint.deviceId)?.ports.find((port) => port.id === endpoint.portId)?.label
  ?? endpoint.portId;

const parseTranscript = (file) => {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  const blocks = [];
  let device = null;
  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (line.startsWith("@ ")) { device = line.slice(2).trim(); continue; }
    if (line.startsWith("> ")) blocks.push({ device, input: line.slice(2), expected: [] });
    else {
      assert.ok(blocks.length, `${file}: output before the first "> " input line`);
      blocks[blocks.length - 1].expected.push(line);
    }
  }
  return blocks;
};

/**
 * A lab transcript runs on the lab's own consoles, in the roles the pack declares, and each host
 * console answers `ping` from the same live model the browser uses.
 */
const sessionsFor = (pack) => {
  const sessions = new Map(pack.devices.map((node) => [node.id, createLabSession(node)]));
  for (const session of sessions.values()) {
    session.state.network = () => snapshotOf(pack, sessions);
  }
  return sessions;
};

const render = (blocks, options) => {
  const sessions = options.pack ? sessionsFor(options.pack) : null;
  const single = sessions ? null : new IosSession(options.hostname ?? "Switch");
  return blocks.map((block) => {
    const session = sessions ? sessions.get(block.device) : single;
    assert.ok(session, `transcript names device "${block.device}", which this lab does not publish`);
    const result = session.execute(block.input);
    return { device: block.device, input: block.input, actual: [...result.lines, ...(result.prompt ? [result.prompt] : [])] };
  });
};

const transcriptLine = ({ device, input, actual }) => [
  ...(device ? [`@ ${device}`] : []),
  `> ${input}`,
  ...actual,
].join("\n");
const transcripts = () => existsSync(transcriptDir)
  ? readdirSync(transcriptDir).filter((name) => name.endsWith(".txt")).sort().map((name) => path.join(transcriptDir, name))
  : [];

const labSessionPlan = (pack) => pack.solution.map((entry) => ({ ...entry, commands: [...entry.commands] }));

const snapshotOf = (pack, sessions) => ({
  devices: pack.devices.map((node) => {
    const session = sessions.get(node.id);
    return {
      id: node.id,
      label: node.label,
      role: session.state.device.role,
      state: session.state.device,
      startup: session.state.config.startup ? [...session.state.config.startup] : null,
    };
  }),
  links: pack.links.map((link) => ({
    id: link.id,
    a: { deviceId: link.source.deviceId, port: portLabelOf(pack, link.source) },
    b: { deviceId: link.target.deviceId, port: portLabelOf(pack, link.target) },
    status: link.status,
  })),
});

const runPlan = (pack, sessions, plan) => {
  for (const entry of plan) {
    const session = sessions.get(entry.deviceId);
    assert.ok(session, `the solution names device "${entry.deviceId}", which this lab does not publish`);
    for (const command of entry.commands) session.execute(command);
  }
  return buildLabModel(snapshotOf(pack, sessions));
};

const gradedOutcomes = (pack, model) => new Map(pack.objectives.flatMap((objective) => objective.steps)
  .filter((step) => step.check)
  .map((step) => [`${objectiveOf(pack, step)}`, step.check(model)]));

function objectiveOf(pack, step) {
  const objective = pack.objectives.find((candidate) => candidate.steps.includes(step));
  return `${objective?.id ?? "objective"}:${step.id}`;
}

/** `F0/24` and `G0/0` are the short forms this site publishes in its topology outlines. */
const fullPortName = (name) => name.replace(/^F(?=\d)/i, "Fa").replace(/^G(?=\d)/i, "Gi");

/** The pack's cables have to be the cables the lab publishes in its own topology outline. */
function assertPackMatchesPublishedTopology(pack, outlineNodes) {
  const nodes = outlineNodes ?? [];
  assert.ok(nodes.length, `${pack.labId}: the lab publishes no topology outline to compare against`);
  const label = (id) => pack.devices.find((node) => node.id === id)?.label ?? id;
  const pair = (left, leftPort, right, rightPort) => pack.links.some((link) => {
    const a = `${label(link.source.deviceId)}:${portLabelOf(pack, link.source)}`.toLowerCase();
    const b = `${label(link.target.deviceId)}:${portLabelOf(pack, link.target)}`.toLowerCase();
    const wanted = [`${left}:${leftPort}`.toLowerCase(), `${right}:${rightPort}`.toLowerCase()];
    return (a === wanted[0] && b === wanted[1]) || (a === wanted[1] && b === wanted[0]);
  });
  for (const node of nodes) {
    const name = typeof node === "string" ? node : node.title;
    const detail = typeof node === "string" ? "" : node.detail;
    assert.ok(name && detail, `${pack.labId}: every published topology node needs a title and a detail`);
    // Port tokens such as F0/1 or G0/0 are not device names.
    const withoutPorts = name.replace(/[A-Za-z]\d\/\d+/g, " ");
    for (const device of new Set(withoutPorts.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? [])) {
      assert.ok(pack.devices.some((candidate) => candidate.label.toLowerCase() === device.toLowerCase()), `${pack.labId}: "${name}" names ${device}, which the pack does not publish`);
    }
    const trunk = /^([A-Za-z][A-Za-z0-9-]*)\s+([FG]\d\/\d+)\s*↔\s*([A-Za-z][A-Za-z0-9-]*)\s+([FG]\d\/\d+)$/.exec(name);
    if (trunk) {
      assert.ok(pair(trunk[1], fullPortName(trunk[2]), trunk[3], fullPortName(trunk[4])), `${pack.labId}: the published cable "${name}" is not in the pack`);
      continue;
    }
    const hostToSwitch = /^([A-Za-z][A-Za-z0-9-]*)\s*→\s*([A-Za-z][A-Za-z0-9-]*)\s+([FG]\d\/\d+)$/.exec(name);
    if (hostToSwitch) {
      const host = pack.devices.find((node) => node.label.toLowerCase() === hostToSwitch[1].toLowerCase());
      assert.ok(host, `${pack.labId}: the published host "${hostToSwitch[1]}" is not in the pack`);
      assert.ok(pair(hostToSwitch[1], ethernetLabels(host)[0], hostToSwitch[2], fullPortName(hostToSwitch[3])), `${pack.labId}: the published cable "${name}" is not in the pack`);
    }
  }
}

/** Every graded step of an authored pack, proven from state and never from typing. */
function assertAuthoredPack(pack) {
  assert.ok(pack.devices.length >= 2, `${pack.labId}: a lab pack needs the lab's devices`);
  assert.ok(pack.links.length >= 1, `${pack.labId}: a lab pack needs the lab's cables`);
  assert.ok(pack.objectives.length >= 1, `${pack.labId}: a lab pack needs at least one objective`);
  const handsOn = ccnaLabs.find((lab) => lab.id === pack.labId);
  if (handsOn) assertPackMatchesPublishedTopology(pack, handsOn.topology?.nodes ?? []);
  else assert.ok(pack.diagramNote?.trim(), `${pack.labId}: a catalog pack must explain its diagram mapping`);
  for (const objective of pack.objectives) {
    assert.ok(objective.steps.length >= 1, `${pack.labId}/${objective.id}: objective has no steps`);
    for (const step of objective.steps) {
      assert.ok(step.title?.trim() && step.instruction?.trim() && step.why?.trim(), `${pack.labId}/${objective.id}/${step.id}: a step needs a title, an instruction and a reason`);
      assert.ok(Boolean(step.check) !== Boolean(step.ungraded), `${pack.labId}/${objective.id}/${step.id}: a step is either graded by a check or declared ungraded, never both and never neither`);
      if (step.check) {
        assert.equal(typeof step.check, "function", `${pack.labId}/${objective.id}/${step.id}: check must be a predicate over the lab model`);
        assert.ok(step.deviceId && pack.devices.some((node) => node.id === step.deviceId), `${pack.labId}/${objective.id}/${step.id}: graded steps name the console they belong to`);
      }
      for (const command of step.commands ?? []) {
        assert.ok(typeof command === "string" && command.trim(), `${pack.labId}/${objective.id}/${step.id}: commands must be non-empty strings`);
      }
    }
  }

  // The success run: the pack's own solution, replayed headlessly, satisfies every graded step.
  const solutionSessions = sessionsFor(pack);
  const solved = runPlan(pack, solutionSessions, labSessionPlan(pack));
  const solvedOutcomes = gradedOutcomes(pack, solved);
  const failed = [...solvedOutcomes.entries()].filter(([, outcome]) => !outcome.ok);
  assert.deepEqual(failed.map(([id, outcome]) => `${id} → ${outcome.detail}`), [], `${pack.labId}: the committed solution does not satisfy every graded step`);

  // A lab may not start solved: with no input at all, not one graded step may already pass. This is
  // the check the browser taught us to need — a device whose ports started up verified a step the
  // learner never did — and it now runs through the same console builder the workspace uses.
  const freshPassing = [...gradedOutcomes(pack, buildLabModel(snapshotOf(pack, sessionsFor(pack)))).entries()]
    .filter(([, outcome]) => outcome.ok)
    .map(([id]) => id);
  assert.deepEqual(freshPassing, [], `${pack.labId}: ${freshPassing.join(", ")} already passes before a single command is typed`);

  // Running the same read-only commands twice earns nothing: grading reads state, not typing.
  const idleSessions = sessionsFor(pack);
  [0, 1].forEach(() => {
    for (const node of pack.devices) {
      const session = idleSessions.get(node.id);
      for (const command of node.role === "host" ? ["ipconfig"] : ["show running-config", "show ip interface brief", "show vlan brief", "show interfaces status"]) {
        session.execute(command);
      }
    }
  });
  const idleModel = buildLabModel(snapshotOf(pack, idleSessions));
  const idlePassing = [...gradedOutcomes(pack, idleModel).values()].filter((outcome) => outcome.ok);
  assert.equal(idlePassing.length, 0, `${pack.labId}: a read-only session completed ${idlePassing.length} graded steps`);

  // The right commands on the wrong console earn nothing for the other devices' steps.
  const wrongSessions = sessionsFor(pack);
  const wrongCommands = labSessionPlan(pack).flatMap((entry) => entry.commands);
  for (const command of wrongCommands) wrongSessions.get(pack.devices[0].id).execute(command);
  const wrongModel = buildLabModel(snapshotOf(pack, wrongSessions));
  const wrongOutcomes = gradedOutcomes(pack, wrongModel);
  for (const objective of pack.objectives) {
    for (const step of objective.steps) {
      if (!step.check || step.deviceId === pack.devices[0].id) continue;
      assert.equal(wrongOutcomes.get(`${objective.id}:${step.id}`)?.ok, false, `${pack.labId}/${objective.id}/${step.id}: a step for another console passed while every command went to ${pack.devices[0].label}`);
    }
  }

  // One wrong configuration has to fail its own step and the lab's end-to-end proof.
  const broken = labSessionPlan(pack).map((entry) => ({ ...entry, commands: entry.commands.map((command) => command === "switchport trunk allowed vlan 10,20" ? "switchport trunk allowed vlan 10" : command) }));
  assert.notDeepEqual(broken, labSessionPlan(pack), `${pack.labId}: the negative run needs a configuration this pack actually uses`);
  const brokenModel = runPlan(pack, sessionsFor(pack), broken);
  const brokenOutcomes = gradedOutcomes(pack, brokenModel);
  const brokenFailures = [...brokenOutcomes.entries()].filter(([, outcome]) => !outcome.ok).map(([id]) => id);
  assert.ok(brokenFailures.length >= 2, `${pack.labId}: a wrong trunk VLAN broke only ${brokenFailures.length} step(s): ${brokenFailures.join(", ")}`);
  return { labId: pack.labId, steps: solvedOutcomes.size, negativeFailures: brokenFailures.length };
}

function assertTrunk017(pack) {
  // Independent contract transcribed from the reference PNG (including port labels).
  assert.deepEqual(pack.devices.map(n => n.label).sort(), ["HR1", "HR2", "Sales1", "Sales2", "Switch1", "Switch2"]);
  const cable = link => [link.source, link.target].map(e => `${pack.devices.find(n => n.id === e.deviceId).label}:${portLabelOf(pack, e)}`).sort().join("|");
  assert.deepEqual(pack.links.map(cable).sort(), ["Switch1:Fa0/1|Switch2:Fa0/1", "Sales1:Eth0|Switch1:Fa0/11", "Sales2:Eth0|Switch2:Fa0/11", "HR1:Eth0|Switch1:Fa0/12", "HR2:Eth0|Switch2:Fa0/12"].sort());
  const sessions = sessionsFor(pack);
  runPlan(pack, sessions, pack.solution);
  const current = () => buildLabModel(snapshotOf(pack, sessions));
  const outcome = key => gradedOutcomes(pack, current()).get(key);
  const consolePing = (from, target, ok) => {
    const result = sessions.get(from).execute(`ping ${target}`);
    assert.ok(result.lines.some(line => line.includes(ok ? "100 percent (5/5)" : "0 percent (0/5)")), result.lines.join("\n"));
    assert.equal(current().ping(from, target).ok, ok, "console and grader disagree");
  };
  consolePing("sales1", "192.168.10.12", true);
  consolePing("hr1", "192.168.20.12", true);
  consolePing("sales1", "192.168.20.12", false); // no router in the picture
  const sw2 = sessions.get("sw2");
  for (const command of ["conf t", "interface fa0/1", "switchport trunk allowed vlan 10", "end"]) sw2.execute(command);
  assert.equal(outcome("switches:sw2-trunk").ok, false);
  consolePing("sales1", "192.168.10.12", true);
  consolePing("hr1", "192.168.20.12", false);
  for (const command of ["conf t", "interface fa0/1", "switchport trunk allowed vlan 10,20", "switchport trunk native vlan 1", "end"]) sw2.execute(command);
  assert.equal(outcome("switches:sw2-native").ok, false);
  // Native mismatch must fail its own objective, not invent a failure of tagged VLAN 10.
  consolePing("sales1", "192.168.10.12", true);
  assert.equal(outcome("verify:save-sw2").ok, false, "an outdated saved config must fail");
  for (const command of ["conf t", "interface fa0/1", "switchport trunk native vlan 99", "shutdown", "end"]) sw2.execute(command);
  consolePing("sales1", "192.168.10.12", false);
  for (const command of ["conf t", "interface fa0/1", "no shutdown", "exit", "interface fa0/11", "shutdown", "end"]) sw2.execute(command);
  consolePing("sales1", "192.168.10.12", false);
  for (const command of ["conf t", "interface fa0/11", "no shutdown", "end"]) sw2.execute(command);
  const disconnected = snapshotOf(pack, sessions);
  disconnected.links = disconnected.links.filter(l => l.id !== "trunk");
  assert.equal(buildLabModel(disconnected).ping("sales1", "192.168.10.12").ok, false);
  assert.equal(pack.objectives[0].steps.find(s => s.id === "sw1-trunk").check(buildLabModel(disconnected)).ok, false);
  sessions.get("sales2").execute("ip address 192.168.30.12 255.255.255.0");
  consolePing("sales1", "192.168.30.12", false); // same VLAN alone does not make a subnet
  sessions.get("sales2").execute("ip address 192.168.10.12 255.255.255.0");
  consolePing("sales1", "192.168.10.12", true);
  // Reset exactly the same sessions the UI uses, retaining identity but losing all solved state.
  for (const node of pack.devices) {
    sessions.get(node.id).reset();
    assert.equal(sessions.get(node.id).state.device.id, node.id);
  }
  assert.equal([...gradedOutcomes(pack, current()).values()].filter(o => o.ok).length, 0);
  return { labId: pack.labId, referenceNodes: 6, referenceCables: 5, resetPassing: 0, linkAndAddressNegatives: "passed", consoleGraderParity: "passed" };
}

if (printIndex !== -1) {
  const file = args[printIndex + 1];
  assert.ok(file && existsSync(file), `--print needs an existing transcript file, received "${file}"`);
  const blocks = parseTranscript(file);
  const labId = path.basename(file, ".txt");
  const pack = authoredLabPacks.find((candidate) => candidate.labId === labId);
  let previousDevice = null;
  console.log(render(blocks, pack ? { pack } : { hostname: "Switch" })
    .map((entry) => {
      const line = transcriptLine(entry.device === previousDevice ? { ...entry, device: null } : entry);
      previousDevice = entry.device;
      return line;
    })
    .join("\n"));
  process.exit(0);
} else {

// 1. The catalog is the single source of `?` help, so an incomplete entry would be a promise the
// terminal cannot keep.
const names = new Set();
for (const command of simCommands) {
  assert.ok(command.name.trim() && command.name === command.name.trim().toLowerCase(), `unexpected command name "${command.name}"`);
  assert.ok(!names.has(command.name), `duplicate command "${command.name}"`);
  names.add(command.name);
  assert.ok(command.modes.length, `"${command.name}" declares no mode`);
  assert.ok(command.help.trim() && isSingleLanguage(command.help), `"${command.name}" needs one-language help`);
  for (const argument of command.args ?? []) assert.ok(isSingleLanguage(argument), `"${command.name}" argument "${argument}" is not single-language`);
}
assert.ok(simCommands.length >= 1, "the simulator catalog is empty");
for (const [keyword, help] of Object.entries(simKeywordHelp)) assert.ok(isSingleLanguage(help), `keyword help for "${keyword}" is not single-language`);

// 2. One language, proven mechanically rather than by convention.
const surfaceFiles = [...tsFilesIn(engineDir), ...tsFilesIn(packDir), ...simulatorSurfaces.map((file) => path.join(projectRoot, file)).filter((file) => existsSync(file))];
assert.ok(surfaceFiles.length >= 6, `expected the engine files to exist, found ${surfaceFiles.length}`);
for (const file of surfaceFiles) {
  const source = readFileSync(file, "utf8");
  assert.ok(isSingleLanguage(source), `${path.relative(projectRoot, file)} contains non-Latin simulator script`);
  const relative = path.relative(projectRoot, file);
  for (const pattern of bannedSecondLanguageFields) {
    assert.ok(!pattern.test(source), `${relative} declares a second-language field`);
  }
}

// 3. A pack may only exist for a real lab that is not waiting on a review.
const packs = existsSync(packDir) ? readdirSync(packDir).filter((name) => name.endsWith(".ts") && name !== "index.ts") : [];
const manifest = JSON.parse(readFileSync(path.join(projectRoot, "content/ccna-lab-manifest.json"), "utf8"));
const labsById = new Map(manifest.labs.map((lab) => [lab.id, lab]));
for (const name of packs) {
  const id = name.replace(/\.ts$/, "");
  const lab = labsById.get(id);
  assert.ok(lab, `pack ${name} does not name a published lab`);
  assert.notEqual(lab.reviewStatus, "needs-review", `pack ${name} belongs to a lab the catalog still marks needs-review`);
}
assert.deepEqual(authoredLabPacks.map((pack) => `${pack.labId}.ts`).sort(), [...packs].sort(), "every authored pack file must be registered in lib/content/ccna-sim/index.ts, and vice versa");

// 4. Golden transcripts: the browser engine and the committed expectation must agree, twice.
const files = transcripts();
assert.ok(files.length >= 1, "no simulator transcript exists, so nothing proves the engine output");
let replayed = 0;
let expectations = 0;
for (const file of files) {
  const transcriptName = path.basename(file, ".txt");
  const raw = readFileSync(file, "utf8");
  assert.ok(isSingleLanguage(raw), `${path.relative(projectRoot, file)} contains non-Latin simulator script`);
  const lab = labsById.get(transcriptName);
  const labPack = authoredLabPacks.find((pack) => pack.labId === transcriptName) ?? null;
  if (!transcriptName.startsWith("session-")) {
    assert.ok(lab, `${transcriptName}.txt does not name a published lab`);
    assert.notEqual(lab.reviewStatus, "needs-review", `${transcriptName}.txt belongs to a lab the catalog still marks needs-review`);
  }
  const options = labPack ? { pack: labPack } : { hostname: "Switch" };
  if (labPack) {
    const used = new Set(parseTranscript(file).filter((block) => block.device).map((block) => block.device));
    assert.ok(used.size >= 2, `${transcriptName}.txt drives ${used.size} console(s); a lab transcript must use the lab's own devices`);
  }
  const blocks = parseTranscript(file);
  assert.ok(blocks.length >= 1, `${path.relative(projectRoot, file)} has no input lines`);
  assert.ok(blocks.some((block) => block.expected.length), `${path.relative(projectRoot, file)} has no expected output — author it with --print`);
  const first = render(blocks, options);
  const second = render(blocks, options);
  assert.deepEqual(second, first, `${path.relative(projectRoot, file)} is not deterministic`);
  first.forEach((entry, index) => {
    assert.deepEqual(entry.actual, blocks[index].expected, `${path.relative(projectRoot, file)}: "> ${entry.input}" produced different output than the committed expectation`);
    replayed += entry.actual.length;
    expectations += 1;
  });
}

// 5. Authored packs are graded from state: nothing passes at startup, the solution passes, negatives do not.
assertWorkspaceSharesTheConsoleBuilder();
const packResults = authoredLabPacks.map((pack) => assertAuthoredPack(pack));
const trunk017 = assertTrunk017(authoredLabPacks.find(pack => pack.labId === "ccna-topology-017"));

// Regression checks for the interactive terminal, beyond the golden transcripts.
assert.equal(historyPosition(-1, 3, -1), 2);
assert.equal(historyPosition(0, 3, -1), 0);
assert.equal(historyPosition(2, 3, 1), 3);
assert.equal(historyPosition(3, 3, -1), 2);
assert.equal(completedInput("show ", "vlan"), "show vlan ");
assert.equal(completedInput("conf t", "terminal"), "conf terminal ");
const interactive = new IosSession();
assert.ok(interactive.complete("show ").includes("vlan"));
interactive.execute("enable"); interactive.execute("conf t"); interactive.execute("interface vlan1");
assert.equal(interactive.execute("ip address 192.168.1.1 255.255.255.0").matched, "ip address");
assert.deepEqual(interactive.state.selected.interfaces[0].address, { ip: "192.168.1.1", mask: "255.255.255.0" });
assert.equal(interactive.execute("ip address 999.1.1.1 255.255.255.0").matched, null);
assert.equal(interactive.state.selected.interfaces[0].address.ip, "192.168.1.1");
interactive.reset();
assert.equal(interactive.prompt, "Switch>");
assert.equal(interactive.commandHistory.length, 0);
assert.equal(interactive.execute("ENABLE").matched, "enable");
assert.equal(interactive.execute("CONF T").matched, "configure terminal");
assert.equal(interactive.execute("HOSTNAME Branch-SW1").matched, "hostname");
assert.equal(interactive.state.device.hostname, "Branch-SW1");
assert.ok(interactive.complete("INTERFACE ").includes("range"));

// Roles behave like the devices they model: a host has no VLAN database and a router has routed ports.
const router = new IosSession("R1", "router", ["Gi0/0", "Gi0/1"]);
assert.equal(router.execute("enable").matched, "enable");
assert.equal(router.execute("configure terminal").matched, "configure terminal");
assert.equal(router.execute("vlan 10").matched, null, "a router does not create VLANs from the global configuration");
assert.equal(router.execute("interface gi0/0.10").matched, "interface");
assert.equal(router.execute("encapsulation dot1q 10").matched, "encapsulation dot1q");
assert.equal(router.execute("ip address 192.168.10.1 255.255.255.0").matched, "ip address");
assert.equal(router.state.device.interfaces.find((port) => port.name === "Gi0/0.10").dot1q, 10);
assert.equal(router.execute("exit").matched, "exit");
assert.equal(router.execute("interface gi0/1").matched, "interface");
assert.equal(router.execute("switchport mode trunk").matched, null, "a routed port is not a switchport");
const host = new IosSession("PC-A", "host", ["Gi0/0"]);
assert.equal(host.execute("ip address 192.168.10.10 255.255.255.0").matched, "ip address");
assert.equal(host.execute("ip default-gateway 192.168.10.1").matched, "ip default-gateway");
assert.equal(host.state.device.gateway, "192.168.10.1");
assert.ok(host.execute("ipconfig").lines[0].includes("192.168.10.10"));
assert.equal(host.execute("configure terminal").matched, null, "a host console has no configuration mode");

console.log(JSON.stringify({
  catalog: simCommands.length,
  transcripts: files.map((file) => path.basename(file)),
  labTranscripts: files.filter((file) => !path.basename(file).startsWith("session-")).length,
  inputsReplayed: expectations,
  linesMatched: replayed,
  singleLanguageFiles: surfaceFiles.length,
  packs: packs.length,
  authoredPacks: packResults,
  trunk017,
  note: packs.length ? undefined : "no objective packs yet: the lab transcripts carry the end states until slice S3",
}));

}
