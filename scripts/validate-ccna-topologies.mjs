import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ccnaDomains } from "../lib/content/ccna.ts";
import { ccnaTopologyLabs, ccnaTopologyLevels, ccnaTopologySource, ccnaTopologyStats } from "../lib/content/ccna-topologies.ts";

/** The five catalog labs that ship without a topology diagram. Kept explicit so an extraction
 * regression cannot silently look like a "concept-only" lab. */
const conceptLabsWithoutDiagram = [
  "Explore and Configure FTP",
  "Compare a Traditional Network to a Controller-Based Network",
  "Explore HTTP Server Verbs",
  "Submit and Explore Ansible, Chef, and Puppet Queries",
  "Obtain and Interpret JSON Output",
];
/** Level sizes and diagram counts of the 2026-10-08 extraction. */
const expectedLevelSizes = [15, 16, 23, 19, 24, 4];
const expectedDiagramsPerLevel = [15, 16, 23, 18, 24, 0];

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(projectRoot, "public");
const publicFile = (src) => path.join(publicRoot, src.replace(/^\//, ""));

assert.equal(ccnaTopologyLevels.length, 6);
assert.deepEqual(ccnaTopologyLevels.map((level) => level.title), ccnaDomains.map((domain) => domain.title));
assert.deepEqual(ccnaTopologyLevels.map((level) => level.weight), ccnaDomains.map((domain) => domain.weight));
assert.deepEqual(ccnaTopologyLevels.map((level) => level.labs.length), expectedLevelSizes);
assert.deepEqual(ccnaTopologyLevels.map((level) => level.withDiagram), expectedDiagramsPerLevel);
assert.equal(ccnaTopologyLevels.reduce((sum, level) => sum + level.labs.length, 0), 101);
assert.equal(ccnaTopologyStats.labs, 101);
assert.equal(ccnaTopologyStats.diagrams, 96);
assert.equal(ccnaTopologyStats.levels, 6);
assert.equal(ccnaTopologyLabs.length, 101);
assert.ok(existsSync(publicFile(ccnaTopologySource.notice)), "the attribution notice must be published");

const ids = new Set();
const names = new Set();
const seenSummaries = new Map();
const referenced = new Set();
let diagrams = 0;
const withoutDiagram = [];
for (const [index, lab] of ccnaTopologyLabs.entries()) {
  assert.equal(lab.number, index + 1, `catalog numbers must stay contiguous: ${lab.id}`);
  assert.equal(lab.id, `ccna-topology-${String(lab.number).padStart(3, "0")}`);
  assert.ok(!ids.has(lab.id), `duplicate id ${lab.id}`); ids.add(lab.id);
  assert.ok(!names.has(lab.name), `duplicate lab name ${lab.name}`); names.add(lab.name);
  assert.ok(lab.summary.length >= 40, `${lab.name}: summary looks truncated`);
  assert.equal(seenSummaries.has(lab.summary) && !lab.summaryIssue, false, `${lab.name}: a summary the catalog repeats for another lab must carry summaryIssue`);
  seenSummaries.set(lab.summary, lab.number);
  if (!lab.diagram) { withoutDiagram.push(lab.name); continue; }
  diagrams++;
  const file = publicFile(lab.diagram.src);
  assert.ok(existsSync(file), `missing diagram ${lab.diagram.src}`);
  referenced.add(path.resolve(file));
  const buffer = readFileSync(file);
  assert.deepEqual([...buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${lab.diagram.src}: not a PNG`);
  assert.equal(buffer.readUInt32BE(16), lab.diagram.width, `${lab.diagram.src}: declared width`);
  assert.equal(buffer.readUInt32BE(20), lab.diagram.height, `${lab.diagram.src}: declared height`);
  assert.equal(statSync(file).size, lab.diagram.bytes, `${lab.diagram.src}: declared byte length`);
  assert.ok(lab.diagram.src.startsWith("/ccna-topologies/"), `${lab.diagram.src}: must stay inside the library folder`);
}
assert.equal(diagrams, 96);
assert.deepEqual([...withoutDiagram].sort(), [...conceptLabsWithoutDiagram].sort());
const marked = ccnaTopologyLabs.filter((lab) => lab.summaryIssue);
assert.equal(marked.length, 1, "exactly one entry carries the summary the source catalog duplicates");
assert.equal(marked[0].name, "Configure DHCP for IPv4 Networks");
assert.equal(ccnaTopologyStats.summaryIssues, 1);

// Published images must be exactly the referenced ones: no orphan file may survive a regeneration.
const libraryRoot = path.join(publicRoot, "ccna-topologies");
const onDisk = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".png")) onDisk.push(path.resolve(full));
  }
};
walk(libraryRoot);
assert.deepEqual(onDisk.sort(), [...referenced].sort(), "published diagrams and referenced diagrams must match one to one");

console.log(JSON.stringify({ status: "ok", levels: 6, labs: 101, diagrams, conceptOnly: withoutDiagram.length, summaryIssues: 1, files: onDisk.length, source: ccnaTopologySource.catalog }));
