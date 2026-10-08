import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { simCommands, simKeywordHelp } from "../lib/ccna-sim/commands.ts";
import { isSingleLanguage } from "../lib/ccna-sim/language.ts";
import { IosSession } from "../lib/ccna-sim/session.ts";
import { completedInput, historyPosition } from "../lib/ccna-sim/terminal-controls.ts";

/**
 * Slice S0 guardrails for the CCNA in-browser simulator (content/ccna-simulator-plan.md):
 *
 *   1. the command catalog is complete and unique — every entry has a mode, a help line and
 *      single-language text, so `?` can never list more than the engine implements;
 *   2. the simulator surface is authored in exactly one language: no Persian/Arabic script and no
 *      second-language field anywhere in the engine, the packs or the simulator components;
 *   3. every transcript in content/ccna-sim/transcripts replays byte-identically, twice, through the
 *      same engine the browser uses — a fixture can never silently drift from the terminal;
 *   4. a pack may only exist for a real, already-reviewed lab in the manifest, so a simulator cannot
 *      paper over content the catalog itself marks needs-review.
 *
 * `--print <file>` is a development helper: it prints the transcript with the engine's actual
 * output, which is how a fixture is authored. It is not a way to pass the replay check.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transcriptDir = path.join(projectRoot, "content/ccna-sim/transcripts");
const packDir = path.join(projectRoot, "lib/content/ccna-sim");
const engineDir = path.join(projectRoot, "lib/ccna-sim");
const simulatorSurfaces = ["app/components/ccna-sim.tsx", "app/ccna/sim/page.tsx", "app/ccna-sim.css"];
const bannedSecondLanguageFields = [/^\s*fa\s*:/m, /^\s*de\s*:/m, /^\s*translation\s*:/m, /^\s*subtitle\s*:/m];
const args = process.argv.slice(2);
const printIndex = args.indexOf("--print");

const languagesOf = (file) => readFileSync(file, "utf8");
const tsFilesIn = (directory) => existsSync(directory)
  ? readdirSync(directory).filter((name) => name.endsWith(".ts") || name.endsWith(".tsx")).map((name) => path.join(directory, name))
  : [];

const parseTranscript = (file) => {
  const raw = readFileSync(file, "utf8");
  const lines = raw.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  const blocks = [];
  for (const line of lines) {
    if (line.startsWith("> ")) blocks.push({ input: line.slice(2), expected: [] });
    else if (line.startsWith("#")) continue;
    else {
      assert.ok(blocks.length, `${file}: output before the first "> " input line`);
      blocks[blocks.length - 1].expected.push(line);
    }
  }
  return blocks;
};

const render = (blocks, hostname) => {
  const session = new IosSession(hostname);
  return blocks.map((block) => {
    const result = session.execute(block.input);
    return { input: block.input, actual: [...result.lines, ...(result.prompt ? [result.prompt] : [])] };
  });
};

const transcriptLine = ({ input, actual }) => [`> ${input}`, ...actual].join("\n");
const transcripts = () => existsSync(transcriptDir)
  ? readdirSync(transcriptDir).filter((name) => name.endsWith(".txt")).sort().map((name) => path.join(transcriptDir, name))
  : [];

if (printIndex !== -1) {
  const file = args[printIndex + 1];
  assert.ok(file && existsSync(file), `--print needs an existing transcript file, received "${file}"`);
  console.log(render(parseTranscript(file), "Switch").map(transcriptLine).join("\n"));
  process.exit(0);
}else{

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
  const source = languagesOf(file);
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

// 4. Golden transcripts: the browser engine and the committed expectation must agree, twice.
const files = transcripts();
assert.ok(files.length >= 1, "no simulator transcript exists, so nothing proves the engine output");
let replayed = 0;
let expectations = 0;
for (const file of files) {
  const transcriptName = path.basename(file, ".txt");
  const raw = readFileSync(file, "utf8");
  assert.ok(isSingleLanguage(raw), `${path.relative(projectRoot, file)} contains non-Latin simulator script`);
  if (!transcriptName.startsWith("session-")) {
    const lab = labsById.get(transcriptName);
    assert.ok(lab, `${transcriptName}.txt does not name a published lab`);
    assert.notEqual(lab.reviewStatus, "needs-review", `${transcriptName}.txt belongs to a lab the catalog still marks needs-review`);
  }
  const blocks = parseTranscript(file);
  assert.ok(blocks.length >= 1, `${path.relative(projectRoot, file)} has no input lines`);
  assert.ok(blocks.some((block) => block.expected.length), `${path.relative(projectRoot, file)} has no expected output — author it with --print`);
  const first = render(blocks, "Switch");
  const second = render(blocks, "Switch");
  assert.deepEqual(second, first, `${path.relative(projectRoot, file)} is not deterministic`);
  first.forEach((entry, index) => {
    assert.deepEqual(entry.actual, blocks[index].expected, `${path.relative(projectRoot, file)}: "> ${entry.input}" produced different output than the committed expectation`);
    replayed += entry.actual.length;
    expectations += 1;
  });
}

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

console.log(JSON.stringify({
  catalog: simCommands.length,
  transcripts: files.map((file) => path.basename(file)), labTranscripts: files.filter((file) => !path.basename(file).startsWith("session-")).length,
  inputsReplayed: expectations,
  linesMatched: replayed,
  singleLanguageFiles: surfaceFiles.length,
  packs: packs.length,
  note: packs.length ? undefined : "no objective packs yet: the lab transcripts carry the end states until slice S3",
}));

}
