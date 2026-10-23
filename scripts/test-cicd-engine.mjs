import assert from "node:assert/strict";
import { createCicdSession, isCicdSession, runCicdCommand, writeCicdFile, describeCicdSession, cicdMissionResults } from "../lib/cicd-sim/engine.ts";
import { cicdMissions, cicdSources, cicdWalkthroughs } from "../lib/content/cicd-learning.ts";

// Every command below is input to the pure virtual engine, never a host shell.
let checks = 0;
function test(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const view = describeCicdSession;
const file = (s, path) => view(s).files.find(f => f.path === path).content;
const command = command => ({ kind: "command", command });
const write = (path, content) => ({ kind: "write", path, content });
const app = (title = "Northstar delivery", discount = 0, health = "ok", api = "/api/orders") => `export const title = "${title}";\nexport const discount = ${discount};\nexport const api = "${api}";\nexport const health = "${health}";\n`;
const cfg = (stages = "basic", cache = "none", packages = "none", triggers = ["manual", "pull_request", "push"], contents = "read") => JSON.stringify({ triggers, runner: "linux", stages: ["install", "lint", "unit", ...(stages === "basic" ? [] : ["integration"]), ...(stages === "secure" ? ["scan"] : []), "build"], cache, permissions: { contents, packages } }, null, 2);
const pkg = (version = "1.0.0", dependency = "1.0.1") => JSON.stringify({ name: "northstar-shop", version, dependencies: { "@northstar/kit": dependency } });
const lock = JSON.stringify({ name: "northstar-shop", lockfileVersion: 3, packages: { "": { dependencies: { "@northstar/kit": "1.0.1" } }, "node_modules/@northstar/kit": { version: "1.0.1" } } });
const commit = message => [command("git add ."), command(`git commit -m "${message}"`)];
const docker = 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node","src/app.js"]\n';
const gold = cicdWalkthroughs.map(w => w.actions.map((a, index) => ({
  ...a,
  fail: a.kind === "command" && (
    (["lint-break", "unit-break"].includes(w.missionId) && a.command === "git push") ||
    (w.missionId === "lockfile" && index === 1) ||
    (w.missionId === "resilience" && a.command === "ci run manual")
  ),
})));
function action(s, a) {
  const before = JSON.stringify(s); let result;
  if (a.kind === "write") result = writeCicdFile(s, a.path, a.content);
  else result = runCicdCommand(s, a.command.replace("CURRENT", view(s).pipeline?.id ?? "missing"));
  assert.equal(result.exitCode, a.fail ? 1 : 0, `${a.kind === "command" ? a.command : a.path}: ${result.output.join("\n")}`);
  assert.equal(JSON.stringify(s), before, "Input session mutated");
  assert.ok(isCicdSession(result.session), "Engine returned invalid session");
  return result.session;
}
function run(s, cmd) { return action(s, command(cmd)); }
function edit(s, path, content) { return action(s, write(path, content)); }
function reject(s, cmd, pattern) {
  const before = JSON.stringify(s), result = runCicdCommand(s, cmd);
  assert.equal(result.exitCode, 1, `${cmd} unexpectedly passed`);
  assert.equal(JSON.stringify(s), before, "Rejected command mutated input");
  assert.equal(JSON.stringify(result.session), before, "Rejected command changed saved state");
  if (pattern) assert.match(result.output.join("\n"), pattern);
  return result;
}
const snapshots = [];
test("all 24 missions start unearned with useful content and real checks", () => {
  const s = createCicdSession();
  assert.equal(cicdMissions.length, 24); assert.equal(gold.length, 24);
  assert.deepEqual(view(s).completedMissionIds, []);
  for (const m of cicdMissions) {
    assert.equal(m.steps.length, 2); assert.ok(m.scenario.length > 40 && m.why.length > 40 && m.goal.length > 20);
    assert.ok(m.solution.length && m.verify.length && m.fault.length > 40 && m.prerequisites.length >= 2);
    assert.ok(m.steps.every(st => st.hints.length === 3 && st.detail.length > 20));
    assert.ok(cicdMissionResults(s, m.id).every(r => !r.passed), `${m.id} starts solved`);
  }
  assert.ok(cicdSources.every(s => s.url.startsWith("https://")));
});
test("complete machine-readable golden path earns every mission in sequence", () => {
  let s = createCicdSession();
  gold.forEach((actions, index) => {
    snapshots.push(structuredClone(s)); const m = cicdMissions[index];
    assert.ok(cicdMissionResults(s, m.id).some(r => !r.passed), `${m.id} was solved at entry`);
    for (const a of actions) {
      const beforeCount = view(s).completedMissionIds.length;
      s = action(s, a);
      assert.ok(view(s).completedMissionIds.length - beforeCount <= 1, "One action awarded multiple missions");
      assert.ok(view(s).completedMissionIds.length <= index + 1, "Future mission awarded early");
    }
    assert.deepEqual(view(s).completedMissionIds, cicdMissions.slice(0, index + 1).map(m => m.id), `${m.id} not earned`);
    assert.ok(cicdMissionResults(s, m.id).every(r => r.passed), `${m.id} evidence not current`);
  });
  snapshots.push(s);
  console.log(`  Golden path: ${s.actions.length} virtual actions, all 24 missions earned`);
});
test("read-only help/status/files/logs cannot earn or alter missions", () => {
  for (const start of [snapshots[0], snapshots[6], snapshots[18], snapshots[24]]) {
    let s = start;
    for (let n = 0; n < 4; n++) for (const cmd of ["help", "git status", "git diff", "git log", "ci status", "ci files", "ci artifacts", "ci environments", "ci secrets", "gh pr checks", "ci show src/app.js"]) s = run(s, cmd);
    assert.deepEqual(s, start);
  }
  assert.match(runCicdCommand(snapshots[0], "help").output.join("\n"), /educational JSON, not GitHub Actions YAML/);
});
test("unknown commands, options, shell evaluation and malformed quoting fail unchanged", () => {
  for (const cmd of ["whoami", "git status --short", "git add --all", "git commit --amend", "git switch -c", "git push origin main", "npm install", "npm run unit --watch", "ci run manual extra", "ci runner paused", "ci deploy production latest", "ci secret set DEPLOY_TOKEN REAL_TOKEN", "git status; whoami", "git status && whoami", "$(whoami)", "`whoami`", "git status | more", "git status\nwhoami", 'git commit -m "unterminated', "", " ", "x".repeat(301)]) reject(snapshots[0], cmd);
  reject(snapshots[0], 'git"status"'); reject(snapshots[0], '"npm ci"');
});
test("editor is allowlisted and bounded, with no host filesystem paths", () => {
  for (const path of ["../package.json", "C:/Windows/test", "/tmp/test", "src/../../test", "__proto__", ".github/workflows/ci.yml", ".env"]) {
    const result = writeCicdFile(snapshots[0], path, "test"); assert.equal(result.exitCode, 1); assert.deepEqual(result.session, snapshots[0]);
  }
  for (const content of ["x".repeat(12001), "a\0b"]) { const r = writeCicdFile(snapshots[0], "README.md", content); assert.equal(r.exitCode, 1); }
});
test("Git stages content snapshots and refuses clean commits or dirty switches", () => {
  let s = createCicdSession(); reject(s, 'git commit -m "empty"');
  s = edit(s, "README.md", "Owner: Delivery team\n"); s = run(s, "git add README.md"); s = edit(s, "README.md", "Owner: Different team\n");
  s = run(s, 'git commit -m "Staged owner snapshot"');
  assert.deepEqual(view(s).completedMissionIds, [], "Dirty staged snapshot incorrectly completed baseline");
  assert.equal(view(s).files.find(f => f.path === "README.md").modified, true);
  reject(s, "git switch -c feature/dirty");
});
test("git diff shows index-to-working before/after and stays read-only", () => {
  let s = edit(snapshots[0], "README.md", "First edit\n"); const before = structuredClone(s);
  let r = runCicdCommand(s, "git diff"); assert.equal(r.exitCode, 0); assert.match(r.output.join("\n"), /--- index\/README.md/); assert.match(r.output.join("\n"), /- # Northstar shop/); assert.match(r.output.join("\n"), /\+ First edit/); assert.deepEqual(r.session, before);
  s = run(s, "git add README.md"); assert.match(runCicdCommand(s, "git diff").output.join("\n"), /No unstaged changes/);
  s = edit(s, "README.md", "Second edit\n"); r = runCicdCommand(s, "git diff"); assert.match(r.output.join("\n"), /- First edit/); assert.match(r.output.join("\n"), /\+ Second edit/);
});
test("correct title on wrong branch never completes feature mission", () => {
  let s = snapshots[1]; s = edit(s, "src/app.js", app()); for (const a of commit("Wrong branch")) s = action(s, a);
  assert.equal(view(s).branch, "main"); assert.equal(view(s).completedMissionIds.length, 1);
});
test("later local checks and pipeline missions reject evidence from wrong branches", () => {
  let s = run(snapshots[2], "git switch -c feature/wrong");
  for (const cmd of ["npm ci", "npm run lint", "npm run unit", "npm run build"]) s = run(s, cmd);
  assert.equal(view(s).completedMissionIds.length, 2); assert.ok(cicdMissionResults(s, "local").every(r => !r.passed && /requires feature\/welcome/.test(r.reason)));
  s = run(snapshots[3], "git switch -c feature/wrong");
  for (const a of gold[3]) s = action(s, a);
  assert.equal(view(s).pipeline.status, "success"); assert.equal(view(s).completedMissionIds.length, 3);
});
test("local scripts require the current frozen dependency install", () => {
  reject(snapshots[2], "npm run unit", /npm ci/);
  let s = run(snapshots[2], "npm ci"); s = edit(s, "package.json", pkg());
  reject(s, "npm run unit", /mismatch/);
});
test("unknown YAML-like configuration or stage names fail explicitly", () => {
  let s = edit(snapshots[3], "ci/pipeline.json", "on: push\njobs: {}"); for (const a of commit("Invalid config")) s = action(s, a); reject(s, "ci run manual", /JSON/);
  for (const contents of [JSON.stringify({ ...JSON.parse(cfg()), surprise: true }), cfg().replace('"linux"', '"windows"'), cfg().replace('"unit"', '"shell"'), cfg().replace('"manual"', '"schedule"'), cfg().replace('"none"', '"wildcard"')]) {
    s = edit(snapshots[3], "ci/pipeline.json", contents); for (const a of commit("Unsupported config")) s = action(s, a); reject(s, "ci run manual", /Unsupported|Only|Cache|Stages/);
  }
});
test("fake scripts in source are parsed and never executed", () => {
  let s = edit(snapshots[3], "src/app.js", 'globalThis.compromised = true;\n'); s = run(s, "npm ci");
  reject(s, "npm run lint", /Unsupported app syntax/); assert.equal(globalThis.compromised, undefined);
});
test("PR creation requires pushed feature and latest PR checks control merge", () => {
  reject(snapshots[0], 'gh pr create --title "Wrong"');
  reject(snapshots[4], 'gh pr create --title "Not pushed"');
  reject(snapshots[5], "gh pr merge", /checks/);
  let s = edit(snapshots[6], "README.md", `${file(snapshots[6], "README.md")}Another revision\n`); for (const a of commit("New unchecked head")) s = action(s, a);
  reject(s, "gh pr merge");
  s = run(s, "ci run manual"); reject(s, "gh pr merge", /pushed|PR|checks/);
});
test("failing pipelines stop downstream stages and cannot build artifacts", () => {
  const s = snapshots[7]; assert.equal(view(s).pipeline.status, "failure");
  assert.equal(view(s).pipeline.stages.find(st => st.name === "lint").status, "failure");
  assert.equal(view(s).pipeline.stages.find(st => st.name === "build").status, "skipped");
  reject(s, "ci artifact build"); reject(s, `ci retry ${view(s).pipeline.id}`, /Code failures/);
});
test("commit messages cannot impersonate a fault or the intended business value", () => {
  let s = snapshots[8]; s = edit(s, "README.md", `${file(s, "README.md")}Unit failed?\n`); for (const a of commit("unit failed invalid discount")) s = action(s, a); s = run(s, "git push");
  assert.equal(view(s).completedMissionIds.length, 8);
  s = snapshots[9]; s = edit(s, "src/app.js", app("Northstar delivery", 20)); for (const a of commit("Fix discount to ten")) s = action(s, a); s = run(s, "git push");
  assert.equal(view(s).completedMissionIds.length, 9);
  s = edit(snapshots[8], "src/app.js", app("Northstar delivery", -1)); for (const a of commit("Different invalid value")) s = action(s, a);
  const r = runCicdCommand(s, "git push"); assert.equal(r.exitCode, 1); assert.equal(view(r.session).completedMissionIds.length, 8, "A different invalid value satisfied the specified 125 reproduction");
});
test("integration fails for disabled orders and incorrect API routes", () => {
  for (const wrongApi of [false, true]) {
    let s = snapshots[10]; s = edit(s, "ci/pipeline.json", cfg("integration"));
    if (wrongApi) { s = edit(s, "ci/services.json", '{"orders":true}'); s = edit(s, "src/app.js", app("Northstar delivery", 10, "ok", "/api/missing")); }
    for (const a of commit("Broken integration")) s = action(s, a);
    const r = runCicdCommand(s, "git push"); assert.equal(r.exitCode, 1); assert.match(r.output.join("\n"), /integration/); assert.equal(view(r.session).completedMissionIds.length, 10);
  }
});
test("cache hits do not skip any gate and lock changes cause cache misses", () => {
  const s = snapshots[12]; assert.ok(view(s).pipeline.stages.every(st => st.status === "success")); assert.match(runCicdCommand(s, "ci logs").output.join("\n"), /cache=hit/);
  let next = edit(s, "package.json", pkg()); next = edit(next, "package-lock.json", lock); for (const a of commit("New dependency")) next = action(next, a); next = run(next, "git push");
  assert.match(runCicdCommand(next, "ci logs").output.join("\n"), /cache=miss/);
});
test("security checks catch excess permissions, advisories and fake leaked secrets", () => {
  let s = snapshots[13]; s = edit(s, "ci/pipeline.json", cfg("secure", "lockfile", "none", undefined, "write")); reject(s, "ci scan", /excessive/);
  s = edit(snapshots[13], "ci/pipeline.json", cfg("secure", "lockfile")); s = edit(s, "src/app.js", app("FAKE_SECRET_do_not_log", 10));
  reject(s, "ci scan", /secret literal/);
  const shown = runCicdCommand(s, "ci show src/app.js").output.join("\n"); assert.ok(!shown.includes("FAKE_SECRET_do_not_log")); assert.match(shown, /\*\*\*/);
  s = edit(snapshots[12], "ci/pipeline.json", cfg("secure", "lockfile")); reject(s, "ci scan", /advisory/);
  s = run(snapshots[13], "ci secret set DEPLOY_TOKEN training-only"); const stored = JSON.stringify(s); assert.ok(!stored.includes("FAKE_SECRET")); assert.match(runCicdCommand(s, "ci secrets").output.join("\n"), /DEPLOY_TOKEN=\*\*\*/);
});
test("artifact provenance is immutable and stable when rebuilding same commit", () => {
  let s = snapshots[16]; const old = view(s).artifacts; s = run(s, "ci artifact build"); assert.deepEqual(view(s).artifacts, old);
  assert.equal(old[0].commit, view(s).commit); assert.match(runCicdCommand(s, "ci artifacts").output.join("\n"), /pipeline=run-/);
});
test("removing established quality gates cannot bypass merge or release policy", () => {
  let s = edit(snapshots[14], "ci/pipeline.json", cfg("basic", "lockfile")); for (const a of commit("Remove scan and integration")) s = action(s, a); s = run(s, "git push");
  assert.equal(view(s).pipeline.status, "success"); reject(s, "gh pr merge", /release gates/);
  s = edit(snapshots[17], "ci/pipeline.json", cfg("basic", "lockfile", "write")); for (const a of commit("Remove release checks")) s = action(s, a); s = run(s, "git push");
  reject(s, "ci artifact build", /release gates/);
});
test("same source restored in a new revision has distinct provenance without hash collision", () => {
  let s = snapshots[17]; const original = file(s, "README.md"), first = view(s).artifacts.at(-1).id;
  s = edit(s, "README.md", `${original}Temporary change\n`); for (const a of commit("Temporary revision")) s = action(s, a); s = run(s, "git push"); s = run(s, "ci artifact build");
  s = edit(s, "README.md", original); for (const a of commit("Restore original source")) s = action(s, a); s = run(s, "git push"); s = run(s, "ci artifact build");
  assert.notEqual(view(s).artifacts.at(-1).id, first); assert.equal(view(s).artifacts.at(-1).commit, view(s).commit);
});
test("dirty, stale and wrong-branch artifacts cannot publish or deploy", () => {
  const stale = view(snapshots[17]).artifacts[0].id;
  reject(snapshots[17], `ci image push ${stale}`, /current main/);
  reject(snapshots[17], `ci deploy staging ${stale}`, /stale/);
  let s = edit(snapshots[17], "README.md", `${file(snapshots[17], "README.md")}Dirty\n`); reject(s, "ci deploy staging latest", /stale/); reject(s, "ci artifact build");
  s = run(snapshots[17], "git switch -c feature/wrong"); reject(s, "ci deploy staging latest", /branch/);
});
test("registry requires supported recipe, minimal permission and virtual secret", () => {
  reject(snapshots[16], "ci image push latest", /recipe/);
  let s = edit(snapshots[16], "Dockerfile", docker); for (const a of commit("Recipe only")) s = action(s, a); s = run(s, "git push"); s = run(s, "ci artifact build");
  reject(s, "ci image push latest", /packages write/);
});
test("production is gated by staging smoke, current candidate and consumed approval", () => {
  reject(snapshots[17], "ci approve production latest", /smoke/); reject(snapshots[18], "ci promote production latest", /approval/);
  let s = run(snapshots[19], "ci deploy staging latest"); reject(s, "ci promote production latest", /approval/);
  s = run(s, "ci smoke staging"); reject(s, "ci promote production latest", /approval/);
  s = snapshots[20]; reject(s, "ci promote production latest", /approval|already/);
});
test("a passing build with unhealthy deployment fails staging smoke and blocks production", () => {
  let s = edit(snapshots[17], "src/app.js", app("Northstar delivery", 10, "fail")); for (const a of commit("Runtime health defect")) s = action(s, a);
  s = run(s, "git push"); assert.equal(view(s).pipeline.status, "success"); s = run(s, "ci artifact build"); s = run(s, "ci image push latest"); s = run(s, "ci deploy staging latest");
  const r = runCicdCommand(s, "ci smoke staging"); assert.equal(r.exitCode, 1); assert.equal(view(r.session).environments[0].status, "degraded"); reject(r.session, "ci approve production latest", /smoke/);
});
test("production promotes identical immutable artifact and rollback does not move Git", () => {
  const first = view(snapshots[20]), second = view(snapshots[21]), restored = view(snapshots[22]);
  assert.equal(first.environments[0].artifact, first.environments[1].artifact);
  assert.notEqual(first.environments[1].artifact, second.environments[1].artifact);
  assert.equal(restored.environments[1].artifact, first.environments[1].artifact); assert.equal(restored.commit, second.commit); assert.equal(restored.environments[1].status, "healthy");
  reject(snapshots[20], "ci rollback production");
  const incident = run(snapshots[21], "ci incident production"); reject(incident, "ci rollback production", /Observe/);
});
test("retry is revision-bound and cancelled work cannot finish as latest", () => {
  let s = run(snapshots[22], "ci runner offline"); const failed = runCicdCommand(s, "ci run manual"); assert.equal(failed.exitCode, 1); s = failed.session;
  const id = view(s).pipeline.id; s = run(s, "ci runner online"); s = edit(s, "README.md", `${file(s, "README.md")}Changed head\n`); for (const a of commit("Different source")) s = action(s, a); reject(s, `ci retry ${id}`, /current/);
  s = run(snapshots[22], "ci queue manual"); const first = view(s).pipeline.id; s = run(s, "ci queue manual"); assert.match(runCicdCommand(s, `ci logs ${first}`).output.join("\n"), /cancelled/); s = run(s, "ci tick"); assert.equal(view(s).pipeline.status, "success"); reject(s, "ci tick", /No queued/);
});
test("release audit rejects rollback state, wrong tags and dirty working files", () => {
  reject(snapshots[23], "ci release verify", /Release audit/);
  let s = snapshots[23]; for (const a of gold[23].slice(0, 5)) s = action(s, a); s = run(s, "git tag v9.9.9"); reject(s, "ci release verify", /Release audit/);
  s = edit(snapshots[24], "README.md", `${file(snapshots[24], "README.md")}Dirty release\n`); reject(s, "ci release verify", /Release audit/);
});
test("earned achievements survive later state changes while current checks stay honest", () => {
  const s = snapshots[24]; assert.equal(view(s).completedMissionIds.length, 24);
  const old = cicdMissionResults(s, "lint-break"); assert.ok(old.some(r => !r.passed)); assert.ok(old.filter(r => !r.passed).every(r => /Achievement retained/.test(r.reason)));
});
test("each unmet criterion gives concrete next actions rather than generic advice", () => {
  for (const m of cicdMissions) for (const r of cicdMissionResults(snapshots[0], m.id)) { assert.ok(r.reason.length > 40); assert.doesNotMatch(r.reason, /Follow the objective|Not yet validated/); assert.match(r.reason, /README|feature|npm|pipeline|PR|title|discount|integration|cache|lock|scan|main|artifact|staging|production|runner|release|git|ci /i); }
});
test("save restore validates every mission snapshot by deterministic replay", () => {
  for (const s of snapshots) { const restored = JSON.parse(JSON.stringify(s)); assert.ok(isCicdSession(restored)); assert.deepEqual(view(restored), view(s)); }
  assert.deepEqual(cicdMissionResults(snapshots[24], "not-a-mission"), []);
});
test("malformed, hostile and forged saves are rejected without executing anything", () => {
  for (const bad of [null, [], {}, { version: 2, actions: [] }, { version: 1, actions: [], completedMissionIds: ["capstone"] }, { version: 1, actions: [{ kind: "command", command: "whoami" }] }, { version: 1, actions: [{ kind: "command", command: "git status" }] }, { version: 1, actions: [{ kind: "write", path: "../.env", content: "x" }] }, { version: 1, actions: [{ kind: "write", path: "README.md", content: "x", artifact: "forged" }] }, { version: 1, actions: [{ kind: "write", path: "README.md", content: "a\0b" }] }, { version: 1, actions: Array(481).fill(command("ci runner online")) }, { version: 1, actions: [command("git push; exfiltrate")] }]) assert.equal(isCicdSession(bad), false, JSON.stringify(bad).slice(0, 120));
  const fake = structuredClone(snapshots[24]); fake.actions.push(command("ci promote production forged")); assert.equal(isCicdSession(fake), false);
  assert.equal(isCicdSession(Object.create({ version: 1, actions: [] })), false);
});
test("returned views and sessions do not alias earlier saved sessions", () => {
  const s = createCicdSession(), next = run(s, "ci runner offline"); next.actions[0].command = "invalid"; assert.deepEqual(s, createCicdSession());
  const v = view(snapshots[24]); v.files[0].content = "mutated"; v.artifacts[0].commit = "fake"; v.completedMissionIds.length = 0; assert.equal(view(snapshots[24]).completedMissionIds.length, 24);
});
test("runtime action and aggregate text limits preserve the last valid session", () => {
  let s = createCicdSession();
  for (let i = 0; i < 480; i++) { const r = runCicdCommand(s, "ci runner online"); assert.equal(r.exitCode, 0); s = r.session; }
  reject(s, "ci runner online", /limit/); assert.ok(isCicdSession(s));
  s = createCicdSession();
  for (let i = 0; i < 58; i++) { const r = writeCicdFile(s, "README.md", `${i}`.padEnd(12000, "x")); assert.equal(r.exitCode, 0); s = r.session; }
  const rejected = writeCicdFile(s, "README.md", "overflow".padEnd(12000, "x")); assert.equal(rejected.exitCode, 1); assert.deepEqual(rejected.session, s); assert.ok(isCicdSession(s));
});
console.log(`\n${checks} CI/CD engine test groups passed; 24/24 project missions verified.`);
