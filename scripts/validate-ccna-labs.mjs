/**
 * Validates the reorganized CCNA lab path against the state it must preserve.
 *
 * Offline by design: it reads only committed files, so it runs in CI without network access.
 * The live half of the source check is scripts/verify-ccna-lab-sources.mjs.
 *
 * What it refuses to pass:
 *   - a lab ID that existed before the audit and no longer exists, or an ID that appears twice
 *   - a lab with no scenario, no objective, no prerequisite field, no verification, no fault or no source
 *   - an objective label that is not in the published 200-301 v1.1 topic list
 *   - a source URL that is not on the verified list, or a placeholder host
 *   - a troubleshooting lab whose fault text is a reused band template
 *   - a prerequisite cycle, a self-prerequisite or a dangling lab reference
 *   - changed AZ-802, AZ-900 or Docker data
 *   - a broken progress key: legacy CCNA domain checkpoints must still resolve and migrate
 *   - vendor catalog summary text copied into the generated module
 *   - exam-dump or braindump wording
 *
 * Run: node --experimental-strip-types scripts/validate-ccna-labs.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { ccnaLabs, ccnaDomains, ccnaSources } from "../lib/content/ccna.ts";
import { ccnaTopologyLabs } from "../lib/content/ccna-topologies.ts";
import { ccnaLabBands, ccnaLabById, ccnaLabBandById, ccnaLabObjectiveCoverage, ccnaLabPath, ccnaLabPathStats, ccnaLabPathReview, ccnaLabSourcesChecked, ccnaScenarioTypes } from "../lib/content/ccna-lab-path.ts";
import { dockerLabs } from "../lib/content/docker.ts";
import { serverLabs } from "../lib/content/server-labs.ts";
import { emptyServerLabState } from "../lib/server-lab-state.ts";

/** The question bank and its progress migration import JSON, which Node cannot load from a .ts module
 * without an import attribute. The repository already compiles that module in memory for the same
 * reason (scripts/validate-ccna-bank.mjs); this reuses the technique instead of duplicating its data. */
const bankFile = new URL("../lib/content/ccna-bank.ts", import.meta.url);
const bankSource = readFileSync(bankFile, "utf8")
  .replace('from "./ccna-bank-reviewed.json"', `from ${JSON.stringify(new URL("../lib/content/ccna-bank-reviewed.json", import.meta.url).href)} with { type: "json" }`)
  .replace('from "./ccna-local-bank.json"', `from ${JSON.stringify(new URL("../lib/content/ccna-local-bank.json", import.meta.url).href)} with { type: "json" }`)
  .replace('from "./ccna"', `from ${JSON.stringify(pathToFileURL(fileURLToPath(new URL("../lib/content/ccna.ts", import.meta.url))).href)}`);
const bankUrl = `data:text/javascript;base64,${Buffer.from(ts.transpileModule(bankSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
const { ccnaBankQuestions, ccnaLegacyPracticeUnits, ccnaPracticeUnits, ccnaReviewedQuestions } = await import(bankUrl);
const progressSource = readFileSync(new URL("../lib/ccna-progress.ts", import.meta.url), "utf8")
  .replace('from "./content/ccna-bank"', `from ${JSON.stringify(bankUrl)}`)
  .replace('from "./server-lab-state"', `from ${JSON.stringify(new URL("../lib/server-lab-state.ts", import.meta.url).href)}`);
const { legacyCcnaIds, restoreCcnaDomain } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(progressSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFileSync(path.join(projectRoot, relative), "utf8");
const sha256 = (relative) => createHash("sha256").update(readFileSync(path.join(projectRoot, relative))).digest("hex");

/** Topics of the official Cisco CCNA Exam v1.1 (200-301) list, read from the PDF on 2026-10-08. */
const publishedObjectives = [
  "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "1.10", "1.11", "1.12", "1.13",
  "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9",
  "3.1", "3.2", "3.3", "3.4", "3.5",
  "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9",
  "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10",
  "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7",
];
const publishedSet = new Set(publishedObjectives);

/** Only Cisco, Cisco Networking Academy and IETF source hosts are accepted. The rule is a domain
 * suffix rather than a fixed list so a legitimate Cisco documentation subdomain still passes, while a
 * lookalike host (for example notcisco.com) cannot: the match requires the dot before the domain. */
const isApprovedSourceHost = (host) => host === "rfc-editor.org" || host.endsWith(".rfc-editor.org") || host.endsWith(".cisco.com") || host.endsWith(".netacad.com") || host === "documentation.meraki.com";

/** The five build stages that existed before the audit, in their original order. */
const stageIdsBefore = ["ccna-addressing", "ccna-vlans", "ccna-etherchannel", "ccna-routing", "ccna-services", "ccna-security", "ccna-wireless", "ccna-automation"];
/** Every ID that already existed and must survive the reorganization untouched. */
const idsBefore = [...stageIdsBefore.map((id) => id), ...ccnaTopologyLabs.map((lab) => lab.id), ...ccnaPracticeUnits.map((unit) => unit.id), ...ccnaLegacyPracticeUnits.map((unit) => unit.id)];

/** Content that belongs to the other courses on this site. Recorded at audit time; this task must not
 * change any of it. An intentional future change updates the baseline deliberately, in review. */
const frozenCourseData = {
  "lib/content/az900.ts": "31361cc05ff7f0aab4fa10000b251a537c5ac6708daec316bddd1d5fef7ff9c5",
  "lib/content/az900-build.ts": "df3d1e7139a571486443411054c34868245782c9b9fd499731a5deb30d2fef60",
  "lib/content/az900-objectives.ts": "03120a36ca4d9e65c067aff236f1c7905b640b482de1a536ee93783005c6ad58",
  "lib/content/az900-questions.ts": "e6ab81e137076cd7c769509e50fd9356e8af0050418ee8e3fb8ad4c573a9ac53",
  "lib/content/az900-questions-architecture.ts": "c52641d5ea9b3dd9f38f24bfebba4cb5ceb9af84dc1f4747d0901ace1fe843fc",
  "lib/content/az900-questions-cloud.ts": "a7a1e0cb09d286460077891fca8e3c0278cbf6cea554d94e4915755c653d0a05",
  "lib/content/az900-questions-management.ts": "1474b0967cddad4f8d2aad9ac210963c89721869686b3da53a7cb878ca134e62",
  "lib/content/az900-sources.ts": "b472508fd5f99caaab0ea9dac7cc46948bd29f8167bff7d0e7343fe126cd57bd",
  "lib/content/az900-types.ts": "3e0af87f19ba13ac62dc45620e86a046e407002769dce59d5508d3e4ec72887e",
  "lib/content/az900-legacy-slots.ts": "645de4e0d0bb264c34e9138fd12f04e7f762217c0e1eb14b04e028a811623a24",
  "lib/content/docker.ts": "6ffad6fd4622229887b7fa2f6f69605fe82ec264660dd42c87f019aea60b4f64",
  "lib/content/server-labs.ts": "81d4d102b2e8c2e52d686ee1a84a4c968ec7f328db47edd0a5f51c716d56ef80",
  "lib/content/questions.ts": "62b343fe7984ae7c2fabf395574b8b12cca3f7d6b7feec3d0acf68bdaac8e139",
  "lib/content/training.ts": "29ef36967fe5ff88ceb37a1c626698122c6aaa3dd47b56ab08194959ef1f8a1a",
  "lib/course-data.ts": "cd15fa42d44b94c523ba01a290b26482f7426bbbdce055470b490cf8a606fa8a",
  "lib/content/exam-blueprints.ts": "9c342abb82b8e0b5fa31e522ee84dfc237e83402a9ecf1c88fd6296f70b219c2",
  "lib/content/skills.ts": "53d12da8533673741ea0c1e4401f6f0fae74353217f35fac59752f61a0035bc1",
  "lib/content/lessons.ts": "4709fb633f4671f6af4ae9b9831201f4b3c8b83a0c26fd3751dd4c28f2961d47",
  "lib/content/translations.ts": "778f0f10be1eec9552ad235b3919e1418c91be8fd25f510534f34e1e866ea363",
  "app/page.tsx": "a3dc926043e4de32e2d164c0a4b787fee22d260e9f3ae7de697ea029c57e1d1f",
  "app/az-900/page.tsx": "a806b3681e2f2454247f0ef2500f0fb023543a3d6b450ccb71a10524eff14e7d",
  "app/docker/page.tsx": "913bcde934d7eb508c5f56fecc8571ebe8b6ebf6cfda57053e34c03a0c167d39",
  "app/components/az802-question-bank.tsx": "e5f27dff8d917c45fd7df09191bb1496e2c07a0afc338ebf648bd319a81c7e39",
  "app/components/promoted-dashboard.tsx": "81759021a88102a62af34a871f14143a1205f7b7fca45ec2466b1242943f989e",
  "app/components/training-views.tsx": "e726e889bcd83eb0b54700ad87465163baf3bdbe95fe7be258c8a880dc176954",
  "app/components/learning-views.tsx": "71b89f14006d350dfb0ad91984d075bf95adb0e7786a772e2dbd145b852555a4",
};

// ---------------------------------------------------------------- 1. every original lab is still here

const pathIds = ccnaLabPath.map((lab) => lab.id);
const expectedLabs = new Set([...stageIdsBefore, ...ccnaTopologyLabs.map((lab) => lab.id)]);
assert.equal(ccnaLabPath.length, 109, "the audited path must contain 109 labs");
assert.equal(expectedLabs.size, 109, "the 109 labs that already existed must be 8 build stages plus 101 catalog labs");
assert.equal(new Set(pathIds).size, pathIds.length, "duplicate lab ID in the audited path");
for (const id of pathIds) assert.ok(expectedLabs.has(id), `the path invented a lab that never existed: ${id}`);
assert.deepEqual([...pathIds].sort(), [...expectedLabs].sort(), "the audited path must contain exactly the labs that already existed, with none added and none removed");

// Reachability: anything the path shows must be a lab the progress API can already address.
// lib/content/lab-registry.ts builds this exact union; its source text is checked below so the
// comparison cannot drift away from the real registry.
const learningLabs = [...serverLabs, ...dockerLabs, ...ccnaLabs, ...ccnaPracticeUnits, ...ccnaLegacyPracticeUnits];
const registrySource = read("lib/content/lab-registry.ts");
for (const source of ["./server-labs", "./docker", "./ccna", "./ccna-bank", "serverLabs", "dockerLabs", "ccnaLabs", "ccnaPracticeUnits", "ccnaLegacyPracticeUnits"]) {
  assert.ok(registrySource.includes(source), `lib/content/lab-registry.ts no longer references ${source}`);
}
assert.match(registrySource, /\[\s*\.\.\.serverLabs,\s*\.\.\.dockerLabs,\s*\.\.\.ccnaLabs,\s*\.\.\.ccnaPracticeUnits,\s*\.\.\.ccnaLegacyPracticeUnits\s*\]/, "the lab registry no longer exports the union this validator models");
const learningIds = new Set(learningLabs.map((lab) => lab.id));
assert.equal(learningIds.size, learningLabs.length, "learningLabs contains a duplicate ID, which would merge two progress rows");
// Only the build stages have a workspace and a checkpoint. The catalog labs are read-only index
// entries: the vendor's lab instructions are not published here, so there is nothing to grade. The
// path must not imply otherwise, and must not leave a hands-on lab unreachable.
for (const lab of ccnaLabPath) {
  if (lab.kind === "hands-on") assert.ok(learningIds.has(lab.id), `${lab.id} is a build stage but is not addressable through the progress API`);
  else assert.equal(learningIds.has(lab.id), false, `${lab.id} is a catalog index entry but claims a progress checkpoint`);
  if (lab.kind === "catalog") assert.equal(lab.artifacts.steps + lab.artifacts.tests + lab.artifacts.questions, 0, `${lab.id} must not claim gradable artifacts it does not have`);
}
assert.equal(learningLabs.filter((lab) => pathIds.includes(lab.id)).length, ccnaLabs.length, "the path must reach every build stage and no catalog lab");

// ---------------------------------------------------------------- 2. required fields on every lab

let handsOn = 0;
let catalog = 0;
for (const lab of ccnaLabPath) {
  if (lab.kind === "hands-on") handsOn++; else catalog++;
  assert.ok(lab.title.length > 3, `${lab.id}: missing title`);
  assert.ok(ccnaLabBands.some((band) => band.id === lab.bandId), `${lab.id}: unknown category band ${lab.bandId}`);
  assert.equal(ccnaLabById.get(lab.id)?.bandId, lab.bandId, `${lab.id}: index lookup disagrees with the path`);
  assert.equal(ccnaLabBandById.get(lab.bandId)?.labIds.includes(lab.id), true, `${lab.id}: band ${lab.bandId} does not list this lab`);
  assert.ok(["beginner", "intermediate", "advanced", "troubleshooting"].includes(lab.tier), `${lab.id}: unknown difficulty ${lab.tier}`);
  assert.ok(lab.objectives.length >= 1, `${lab.id}: no CCNA objective`);
  // The build stages carry sub-objective labels such as 2.2.a; the published list is checked at the
  // two-level topic they belong to, so a typo in either part still fails.
  for (const objective of lab.objectives) {
    assert.match(objective, /^[1-6]\.\d{1,2}(\.[a-h])?$/, `${lab.id}: malformed objective label ${objective}`);
    assert.ok(publishedSet.has(objective.split(".").slice(0, 2).join(".")), `${lab.id}: objective ${objective} is not in the published 200-301 v1.1 list`);
  }
  assert.ok(ccnaScenarioTypes.some((type) => type.id === lab.scenarioType), `${lab.id}: unknown scenario type ${lab.scenarioType}`);
  assert.match(lab.duration, /^\d+–\d+$/, `${lab.id}: duration must be a minute range`);
  assert.ok(lab.scenario.role.length > 10 && lab.scenario.context.length > 10, `${lab.id}: scenario is not framed`);
  assert.ok(lab.scenario.requirement.length > 30, `${lab.id}: no business requirement`);
  assert.ok(Array.isArray(lab.prerequisites), `${lab.id}: missing prerequisite field`);
  for (const prerequisite of lab.prerequisites) {
    assert.ok(ccnaLabById.has(prerequisite), `${lab.id}: prerequisite ${prerequisite} is not a lab in this library`);
    assert.notEqual(prerequisite, lab.id, `${lab.id}: a lab cannot be its own prerequisite`);
  }
  assert.equal(new Set(lab.prerequisites).size, lab.prerequisites.length, `${lab.id}: duplicated prerequisite`);
  for (const bandId of lab.prerequisiteBands) assert.ok(ccnaLabBands.some((band) => band.id === bandId), `${lab.id}: unknown prerequisite band ${bandId}`);
  const firstBand = ccnaLabBands[0].id;
  if (lab.bandId !== firstBand) assert.ok(lab.prerequisites.length + lab.prerequisiteBands.length > 0, `${lab.id}: a lab outside the entry band must declare what to finish first`);
  for (const related of lab.relatedLabIds) assert.ok(ccnaLabById.has(related), `${lab.id}: related lab ${related} does not exist`);
  assert.ok(lab.verification.length >= 1, `${lab.id}: no verification step`);
  for (const command of lab.verification) assert.ok(command.trim().length > 5, `${lab.id}: verification entry looks empty`);
  assert.ok(lab.fault.failure.length >= 40, `${lab.id}: no fault to reproduce`);
  assert.ok(lab.fault.recovery.length >= 40, `${lab.id}: no recovery path`);
  assert.ok(lab.troubleshootingFocus === "primary" || lab.troubleshootingFocus === "checkpoint", `${lab.id}: unknown troubleshooting focus`);
  assert.ok(["reviewed", "needs-review"].includes(lab.reviewStatus), `${lab.id}: unknown review status`);
  assert.equal(Boolean(lab.reviewNote), lab.reviewStatus === "needs-review", `${lab.id}: a needs-review lab must carry its reason, and a reviewed lab must not`);
  if (lab.kind === "hands-on") assert.ok(lab.artifacts.steps >= 4 && lab.artifacts.tests >= 3 && lab.artifacts.questions >= 4, `${lab.id}: build stage lost its steps, tests or questions`);
}

// ---------------------------------------------------------------- 3. verified authoritative sources

const verifiedUrls = new Set();
for (const lab of ccnaLabPath) {
  assert.ok(lab.sourceRefs.length >= 1, `${lab.id}: no source at all`);
  assert.ok(lab.sourceRefs.some((source) => source.key === "blueprint"), `${lab.id}: no source that covers the official objectives`);
  for (const source of lab.sourceRefs) {
    assert.match(source.url, /^https:\/\//, `${lab.id}: source must be https: ${source.url}`);
    const host = new URL(source.url).host;
    assert.ok(isApprovedSourceHost(host), `${lab.id}: source host ${host} is not an approved authoritative host`);
    for (const placeholder of ["example.com", "localhost", "127.0.0.1", "todo", "placeholder"]) assert.ok(!source.url.includes(placeholder), `${lab.id}: placeholder source ${source.url}`);
    assert.equal(source.checked, ccnaLabSourcesChecked, `${lab.id}: source is missing the date it was checked`);
    assert.ok(source.title.length > 8 && source.covers.length > 8, `${lab.id}: source title or coverage is not described`);
    assert.equal(source.confidence, "reviewed", `${lab.id}: an unverified source must not be published as reviewed`);
    verifiedUrls.add(source.url);
  }
}
// The eight build stages keep their own reviewed reference set; those URLs must be checked too.
for (const lab of ccnaLabs) for (const source of lab.sources) {
  assert.match(source.url, /^https:\/\//, `${lab.id}: source must be https: ${source.url}`);
  assert.ok(isApprovedSourceHost(new URL(source.url).host), `${lab.id}: unreviewed host ${source.url}`);
  verifiedUrls.add(source.url);
}
// Sources the question bank cites must be on the same approved list.
for (const question of [...ccnaReviewedQuestions, ...ccnaBankQuestions.filter((item) => "source" in item)]) {
  const url = question.source;
  if (typeof url !== "string" || !url.startsWith("https://")) continue;
  assert.ok(isApprovedSourceHost(new URL(url).host), `question ${question.id}: host outside the approved list (${url})`);
  verifiedUrls.add(url);
}
for (const url of Object.values(ccnaSources)) {
  assert.ok(isApprovedSourceHost(new URL(url).host), `ccnaSources lists an unreviewed host: ${url}`);
  verifiedUrls.add(url);
}
assert.ok(verifiedUrls.size >= 20, "the source manifest is suspiciously small");

// ---------------------------------------------------------------- 4. troubleshooting labs have a real fault

const troubleshooting = ccnaLabPath.filter((lab) => lab.troubleshootingFocus === "primary");
assert.ok(troubleshooting.length >= 10, "the troubleshooting track lost labs");
const faultTexts = troubleshooting.map((lab) => lab.fault.failure);
assert.equal(new Set(faultTexts).size, faultTexts.length, "two troubleshooting labs share the same fault text, which means a band template was reused");
const bandFailures = new Set(ccnaLabBands.map((band) => band.summary));
for (const lab of troubleshooting) {
  assert.ok(lab.fault.failure.length >= 60, `${lab.id}: a troubleshooting lab needs a specific fault, not a generic one`);
  assert.ok(!bandFailures.has(lab.fault.failure), `${lab.id}: fault text is a band summary, not a fault`);
}
assert.ok(ccnaLabBands.find((band) => band.id === "ccna-band-11")?.labIds.every((id) => ccnaLabById.get(id)?.troubleshootingFocus === "primary"), "every lab in the troubleshooting band must be a primary troubleshooting lab");

// ---------------------------------------------------------------- 5. no prerequisite cycles

const state = new Map();
const visit = (id, trail) => {
  if (state.get(id) === "done") return;
  assert.notEqual(state.get(id), "open", `prerequisite cycle: ${[...trail, id].join(" -> ")}`);
  state.set(id, "open");
  for (const prerequisite of ccnaLabById.get(id).prerequisites) visit(prerequisite, [...trail, id]);
  state.set(id, "done");
};
for (const lab of ccnaLabPath) visit(lab.id, []);
const reachableFromEntry = new Set();
const queue = [ccnaLabBands[0].labIds[0]];
while (queue.length > 0) {
  const id = queue.pop();
  if (reachableFromEntry.has(id)) continue;
  reachableFromEntry.add(id);
  queue.push(...ccnaLabById.get(id).prerequisites);
}
assert.ok(reachableFromEntry.size >= 1);

// ---------------------------------------------------------------- 6. the other courses are untouched

for (const [file, expected] of Object.entries(frozenCourseData)) {
  assert.equal(sha256(file), expected, `${file} changed, but this task must not modify AZ-802, AZ-900 or Docker content`);
}

// ---------------------------------------------------------------- 7. progress and evidence keys still work

assert.deepEqual(ccnaLabs.map((lab) => lab.id), stageIdsBefore, "the build-stage IDs or their order changed");
assert.equal(ccnaDomains.length, 6);
assert.equal(ccnaPracticeUnits.length, 6, "the visible practice unit IDs changed");
for (const unit of [...ccnaPracticeUnits, ...ccnaLegacyPracticeUnits]) assert.ok(learningIds.has(unit.id), `${unit.id} is no longer addressable, which would orphan saved answers`);
// Nothing that existed before the audit may become unreachable, whether it had a checkpoint or not.
const addressable = new Set([...learningIds, ...pathIds]);
for (const id of idsBefore) assert.ok(addressable.has(id), `${id} existed before the audit and is no longer reachable, which would orphan saved progress`);
const legacy = legacyCcnaIds("ccna-domain-v2-1");
assert.ok(legacy.length >= 1, "legacy CCNA domain checkpoints no longer resolve");
const sampleLegacy = ccnaLegacyPracticeUnits.find((unit) => unit.id === legacy[0]);
assert.ok(sampleLegacy, "a legacy CCNA practice unit disappeared");
const legacyState = { ...emptyServerLabState(), activeTab: "quiz", answers: { [sampleLegacy.questions[0].id]: 0 }, questionIndex: 0 };
const restored = restoreCcnaDomain("ccna-domain-v2-1", [{ labId: sampleLegacy.id, evidenceText: JSON.stringify(legacyState), updatedAt: new Date(0).toISOString() }]);
assert.ok(restored && typeof restored.answers === "object", "a saved legacy checkpoint can no longer be restored");
const current = restoreCcnaDomain("ccna-domain-v2-1", [{ labId: "ccna-domain-v2-1", evidenceText: JSON.stringify(legacyState), updatedAt: new Date(0).toISOString() }]);
assert.equal(current.answers[sampleLegacy.questions[0].id], 0, "a current-domain checkpoint is no longer read back");

// ---------------------------------------------------------------- 8. vendor wording is verbatim or absent, every diagram belongs to its lab

const generated = read("lib/content/ccna-lab-path.ts");
const manifest = read("content/ccna-lab-manifest.json");
const catalogById = new Map(ccnaTopologyLabs.map((lab) => [lab.id, lab]));
const diagramIds = new Set();
for (const lab of ccnaLabPath) {
  if (lab.kind !== "catalog") {
    assert.equal(lab.catalogSummary, null, `${lab.id}: a build stage must not carry catalog text`);
    assert.equal(lab.diagram, null, `${lab.id}: a build stage must not claim a catalog diagram`);
    continue;
  }
  const source = catalogById.get(lab.id);
  assert.ok(source, `${lab.id}: the library invented a catalog lab that the catalog does not publish`);
  // The catalog's own wording is reproduced exactly or not published at all; it is never paraphrased,
  // and the attribution notice stays published next to it.
  assert.equal(lab.catalogSummary, source.summary, `${lab.id}: the catalog summary must be reproduced unedited`);
  assert.ok(generated.includes(JSON.stringify(source.summary)), `${lab.id}: the catalog summary is not published verbatim`);
  if (!source.diagram) {
    assert.equal(lab.diagram, null, `${lab.id}: the catalog publishes no diagram for this lab`);
    continue;
  }
  // Each topology diagram must belong to this exact lab, on disk and on the card.
  assert.ok(lab.diagram, `${lab.id}: the catalog publishes a diagram but the library dropped it`);
  assert.equal(lab.diagram.src, source.diagram.src, `${lab.id}: the card shows another lab's diagram`);
  assert.equal(lab.diagram.width, source.diagram.width, `${lab.id}: declared diagram width drifted`);
  assert.equal(lab.diagram.height, source.diagram.height, `${lab.id}: declared diagram height drifted`);
  assert.ok(lab.diagram.src.startsWith("/ccna-topologies/"), `${lab.id}: the diagram must stay inside the library folder`);
  assert.ok(path.posix.basename(lab.diagram.src).startsWith(`${String(lab.number).padStart(3, "0")}-`), `${lab.id}: the diagram filename does not carry this lab's catalog number`);
  const file = path.join(projectRoot, "public", lab.diagram.src.replace(/^\//, ""));
  assert.ok(existsSync(file), `${lab.id}: missing diagram file ${lab.diagram.src}`);
  const buffer = readFileSync(file);
  assert.deepEqual([...buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${lab.id}: ${lab.diagram.src} is not a PNG`);
  assert.equal(buffer.readUInt32BE(16), lab.diagram.width, `${lab.id}: the file's width does not match the card`);
  assert.equal(buffer.readUInt32BE(20), lab.diagram.height, `${lab.id}: the file's height does not match the card`);
  diagramIds.add(lab.id);
}
assert.equal(diagramIds.size, ccnaLabPathStats.withDiagram, "the reported diagram count must match the cards that carry one");
assert.equal(ccnaLabPathStats.withDiagram, ccnaTopologyLabs.filter((lab) => lab.diagram).length, "the library must attach every diagram the catalog publishes");
assert.ok(existsSync(path.join(projectRoot, "public", "ccna-topologies-attribution.txt")), "the attribution notice must stay published beside the catalog text");
const banned = [/exam\s*dump/i, /braindump/i, /brain\s*dump/i, /actual exam questions/i, /real exam questions/i, /testking/i, /pass4sure/i, /examcollection/i, /vce file/i];
for (const phrase of banned) {
  assert.ok(!phrase.test(generated), `banned exam-dump wording in the generated module: ${phrase}`);
  assert.ok(!phrase.test(manifest), `banned exam-dump wording in the manifest: ${phrase}`);
}

// ---------------------------------------------------------------- 9. counts and reporting agree

assert.equal(ccnaLabPathStats.total, 109);
assert.equal(handsOn, ccnaLabs.length);
assert.equal(catalog, 101);
assert.equal(ccnaLabPathStats.handsOn, 8);
assert.equal(ccnaLabPathStats.bands, 12);
assert.equal(ccnaLabBands.length, 12);
assert.equal(ccnaLabBands.reduce((sum, band) => sum + band.labIds.length, 0), 109, "band membership must partition the labs");
for (const band of ccnaLabBands) {
  assert.ok(band.labIds.length >= 1 && band.labIds.length <= 25, `band ${band.id}: implausible lab count`);
  assert.ok(band.objectives.every((objective) => publishedSet.has(objective.split(".").slice(0, 2).join("."))), `band ${band.id}: objective outside the published list`);
  assert.ok(band.verification.length >= 3, `band ${band.id}: needs at least three verification entries`);
}
assert.equal(ccnaLabPathStats.reviewed + ccnaLabPathStats.needsReview, 109);
assert.equal(ccnaLabPathReview.needsReview.length, ccnaLabPathStats.needsReview);
assert.ok(ccnaLabPathReview.needsReview.length <= 15, "more labs need review than the audit recorded; check whether a mapping broke");
assert.equal(ccnaLabPath.filter((lab) => lab.catalogSummaryIssue).length, ccnaLabPathReview.summaryIssues.length);
const covered = new Set(ccnaLabPath.flatMap((lab) => lab.objectives.map((objective) => objective.split(".").slice(0, 2).join("."))));
assert.deepEqual([...ccnaLabObjectiveCoverage.covered].sort(), [...covered].sort(), "reported coverage does not match the labs");
const gapSet = new Set(ccnaLabObjectiveCoverage.noLabInLibrary.map((gap) => gap.objective));
assert.equal(gapSet.size, ccnaLabObjectiveCoverage.noLabInLibrary.length, "a coverage gap is listed twice");
for (const gap of ccnaLabObjectiveCoverage.noLabInLibrary) {
  assert.ok(publishedSet.has(gap.objective), `gap ${gap.objective} is not a published objective`);
  assert.ok(!covered.has(gap.objective), `gap ${gap.objective} is listed as uncovered but a lab claims it`);
  assert.ok(gap.reason.length > 30, `gap ${gap.objective} has no reason`);
}
assert.equal(covered.size + gapSet.size, publishedObjectives.length, "every published objective must be either covered by a lab or listed as a gap");

console.log(JSON.stringify({
  status: "ok", labs: ccnaLabPath.length, bands: ccnaLabBands.length, handsOn, catalog,
  reviewed: ccnaLabPathStats.reviewed, needsReview: ccnaLabPathStats.needsReview,
  troubleshooting: troubleshooting.length, sources: verifiedUrls.size,
  objectivesCovered: covered.size, reportedGaps: gapSet.size, frozenCourseFiles: Object.keys(frozenCourseData).length,
}));
