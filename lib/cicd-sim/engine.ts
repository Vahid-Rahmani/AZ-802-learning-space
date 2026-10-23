/** Browser-only educational CI/CD model. No shell, JavaScript, YAML, Docker,
 * network requests or credentials are executed. The ci commands are teaching
 * commands, not a vendor CLI. Stored state is replayed from bounded actions.
 * Deterministic model IDs are NOT cryptographic hashes or real image digests. */
import { cicdMissions } from "../content/cicd-learning.ts";

type Action = { kind: "command"; command: string } | { kind: "write"; path: string; content: string };
export type CicdSession = { version: 1; actions: Action[] };
export type CicdCommandResult = { session: CicdSession; output: string[]; exitCode: number };
type Files = Record<string, string>;
type Commit = { id: string; parent: string; files: Files; message: string };
type Pipeline = { id: string; status: string; commit: string; branch: string; event: string; stages: { name: string; status: string }[]; cache: string; error: string };
type Artifact = { id: string; commit: string; version: string; pipeline: string; registry: boolean; healthy: boolean };
type Environment = { name: string; artifact: string; status: string; smoke: boolean; observed: boolean; previous: string };
type Mark = { mission: string; commit: string; value: string };
type State = {
  files: Files; staged: Files; commits: Commit[]; branches: Record<string, string>; branch: string;
  pushed: Record<string, string>; pr: null | { branch: string; base: string; head: string; merged: boolean };
  pipelines: Pipeline[]; artifacts: Artifact[]; environments: Environment[]; approved: string;
  installed: string; cache: string[]; secrets: string[]; runner: boolean; tags: Record<string, string>;
  marks: Record<string, Mark>; completed: string[];
};
const MAX_ACTIONS = 480;
const MAX_CONTENT = 12000;
const MAX_TOTAL_CONTENT = 700000;
const PATHS = ["README.md", "src/app.js", "package.json", "package-lock.json", "ci/pipeline.json", "ci/services.json", "Dockerfile"];
export const cicdInitialApp = 'export const title = "Northstar shop";\nexport const discount = 0;\nexport const api = "/api/orders";\nexport const health = "ok";\n';
export const cicdPipelineTemplate = JSON.stringify({ triggers: ["manual"], runner: "linux", stages: ["install", "lint", "unit", "build"], cache: "none", permissions: { contents: "read", packages: "none" } }, null, 2);
function initial(): State {
  const files = { "README.md": "# Northstar shop\nDelivery practice project.\n", "src/app.js": cicdInitialApp, "package.json": '{"name":"northstar-shop","version":"1.0.0","dependencies":{"@northstar/kit":"1.0.0"}}\n', "package-lock.json": '{"name":"northstar-shop","lockfileVersion":3,"packages":{"":{"dependencies":{"@northstar/kit":"1.0.0"}},"node_modules/@northstar/kit":{"version":"1.0.0"}}}\n', "ci/pipeline.json": "{}\n", "ci/services.json": '{"orders":false}\n', Dockerfile: "# Add the supported container recipe in mission 17.\n" };
  return { files: { ...files }, staged: {}, commits: [{ id: "c0", parent: "", files, message: "Starter snapshot" }], branches: { main: "c0" }, branch: "main", pushed: {}, pr: null, pipelines: [], artifacts: [], environments: ["staging", "production"].map(name => ({ name, artifact: "", status: "empty", smoke: false, observed: false, previous: "" })), approved: "", installed: "", cache: [], secrets: [], runner: true, tags: {}, marks: {}, completed: [] };
}
export function createCicdSession(): CicdSession { return { version: 1, actions: [] }; }
function hash(text: string): string { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, "0"); }
function head(s: State): string { return s.branches[s.branch]; }
function commit(s: State, id = head(s)): Commit { return s.commits.find(c => c.id === id)!; }
function clean(s: State): boolean { return PATHS.every(p => s.files[p] === commit(s).files[p]) && Object.keys(s.staged).length === 0; }
function current(s: State): string { return cicdMissions[s.completed.length]?.id ?? "finished"; }
function mark(s: State, key: string, value = ""): void { s.marks[key] = { mission: current(s), commit: head(s), value }; }
function marked(s: State, key: string, mission: string, revision = true): boolean { const m = s.marks[key]; return !!m && m.mission === mission && (!revision || m.commit === head(s)); }
class ModelError extends Error {}
function requireThat(condition: unknown, message: string): asserts condition { if (!condition) throw new ModelError(message); }
function object(text: string): Record<string, unknown> { let v: unknown; try { v = JSON.parse(text); } catch { throw new ModelError("Invalid JSON. Use the editor and a complete JSON object."); } requireThat(v && typeof v === "object" && !Array.isArray(v), "Expected a JSON object."); return v as Record<string, unknown>; }
function exactKeys(o: Record<string, unknown>, keys: string[]): boolean { return Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k)); }
function app(files: Files): { title: string; discount: number; api: string; health: string } {
  const match = files["src/app.js"].match(/^\s*export const title = ("[^"\n]*");\s*export const discount = (-?\d+);\s*export const api = ("[^"\n]*");\s*export const health = ("(?:ok|fail)");\s*$/);
  requireThat(match, 'Unsupported app syntax. Exactly four export const declarations are supported: title (double-quoted text), discount (integer), api (double-quoted path), health ("ok" or "fail").');
  return { title: JSON.parse(match[1]), discount: Number(match[2]), api: JSON.parse(match[3]), health: JSON.parse(match[4]) };
}
type Config = { triggers: string[]; runner: string; stages: string[]; cache: string; permissions: { contents: string; packages: string } };
function config(files: Files): Config {
  const p = object(files["ci/pipeline.json"]);
  requireThat(exactKeys(p, ["triggers", "runner", "stages", "cache", "permissions"]), "Unsupported pipeline schema. Use exactly triggers, runner, stages, cache, permissions (see help). This is educational JSON, not GitHub Actions YAML.");
  requireThat(Array.isArray(p.triggers) && p.triggers.length > 0 && p.triggers.length <= 3 && new Set(p.triggers).size === p.triggers.length && p.triggers.every(x => ["manual", "pull_request", "push"].includes(x)), "Unsupported triggers. Choose unique manual, pull_request, push.");
  requireThat(p.runner === "linux", 'Only the simulated "linux" runner is supported.');
  const stages = ["install", "lint", "unit", "integration", "scan", "build"];
  requireThat(Array.isArray(p.stages) && p.stages.length >= 4 && p.stages.length <= 6 && p.stages.every((x, i, a) => stages.includes(x) && (i === 0 || stages.indexOf(a[i - 1]) < stages.indexOf(x))) && ["install", "lint", "unit", "build"].every(x => (p.stages as unknown[]).includes(x)), "Stages must include install, lint, unit, build in that order; optional integration and scan go before build.");
  requireThat(p.cache === "none" || p.cache === "lockfile", "Cache must be none or lockfile.");
  requireThat(p.permissions && typeof p.permissions === "object" && !Array.isArray(p.permissions), "Missing permissions object.");
  const permissions = p.permissions as Record<string, unknown>;
  requireThat(exactKeys(permissions, ["contents", "packages"]) && ["read", "write"].includes(permissions.contents as string) && ["none", "write"].includes(permissions.packages as string), "Permissions support only contents: read|write and packages: none|write.");
  return p as Config;
}
function lockKey(files: Files): string {
  const pkg = object(files["package.json"]), lock = object(files["package-lock.json"]);
  requireThat(exactKeys(pkg, ["name", "version", "dependencies"]) && pkg.name === "northstar-shop" && typeof pkg.version === "string" && /^\d+\.\d+\.\d+$/.test(pkg.version), "package.json supports name northstar-shop, a numeric x.y.z version and dependencies only.");
  const deps = pkg.dependencies as Record<string, unknown>;
  requireThat(deps && exactKeys(deps, ["@northstar/kit"]) && ["1.0.0", "1.0.1"].includes(deps["@northstar/kit"] as string), "Only the fictional pinned @northstar/kit 1.0.0 or 1.0.1 is modeled. No packages are downloaded.");
  const packages = lock.packages as Record<string, Record<string, unknown>>;
  requireThat(exactKeys(lock, ["name", "lockfileVersion", "packages"]) && lock.name === pkg.name && lock.lockfileVersion === 3 && packages && exactKeys(packages, ["", "node_modules/@northstar/kit"]) && packages[""] && exactKeys(packages[""], ["dependencies"]) && packages["node_modules/@northstar/kit"] && exactKeys(packages["node_modules/@northstar/kit"], ["version"]) && JSON.stringify(packages[""].dependencies) === JSON.stringify(deps) && packages["node_modules/@northstar/kit"].version === deps["@northstar/kit"], "npm ci: dependency/lockfile mismatch or unsupported lockfile. Synchronize the root dependency and node_modules version; npm ci does not repair locks.");
  return `lock-${hash(files["package-lock.json"])}`;
}
function check(files: Files, stage: string): void {
  if (stage === "install") { lockKey(files); return; }
  if (stage === "scan") {
    const p = config(files);
    requireThat(p.permissions.contents === "read", "scan: contents write is excessive; use read.");
    requireThat(!Object.values(files).some(f => /(?:FAKE_SECRET_|TRAINING_TOKEN_)[A-Za-z0-9_-]+/.test(f)), "scan: simulated secret literal detected. Remove it from source and use the virtual secret store.");
    requireThat((object(files["package.json"]).dependencies as Record<string, unknown>)["@northstar/kit"] === "1.0.1", "scan: fictional @northstar/kit 1.0.0 has a modeled advisory; pin 1.0.1 and update its lock."); return;
  }
  const a = app(files);
  if (stage === "lint") requireThat(a.title.length > 0 && a.title === a.title.trim(), "lint: title must be nonempty without leading/trailing whitespace.");
  if (stage === "unit") requireThat(a.discount >= 0 && a.discount <= 50, "unit: discount must be in the inclusive range 0..50.");
  if (stage === "integration") { const services = object(files["ci/services.json"]); requireThat(exactKeys(services, ["orders"]) && services.orders === true && a.api === "/api/orders", "integration: orders service must be true and app api must be /api/orders."); }
}
function lastPipeline(s: State): Pipeline | undefined { return s.pipelines.at(-1); }
function passed(s: State): boolean { const p = lastPipeline(s); return !!p && p.commit === head(s) && p.branch === s.branch && p.status === "success" && clean(s); }
function releaseGates(p: Pipeline | undefined): boolean { return !!p && ["install", "lint", "unit", "integration", "scan", "build"].every(name => p.stages.some(stage => stage.name === name && stage.status === "success")); }
function startPipeline(s: State, event: string, queue = false): Pipeline {
  const files = commit(s).files, cfg = config(files);
  requireThat(cfg.triggers.includes(event), `No ${event} trigger configured. Commit a pipeline with that event.`);
  requireThat(clean(s), "Commit all edits before running CI; pipelines test committed snapshots.");
  for (const p of s.pipelines) if (p.status === "running") { p.status = "cancelled"; p.stages.forEach(st => { if (st.status === "pending") st.status = "cancelled"; }); mark(s, "cancelled"); }
  const p: Pipeline = { id: `run-${s.pipelines.length + 1}`, status: "running", commit: head(s), branch: s.branch, event, stages: cfg.stages.map(name => ({ name, status: "pending" })), cache: "disabled", error: "" };
  s.pipelines.push(p); if (!queue) finishPipeline(s, p); return p;
}
function finishPipeline(s: State, p: Pipeline): void {
  const files = commit(s, p.commit).files, cfg = config(files);
  if (!s.runner) { p.status = "failure"; p.error = "runner: transient offline failure"; mark(s, "runner-failed"); return; }
  let failed = false;
  for (const stage of p.stages) {
    if (failed) { stage.status = "skipped"; continue; }
    try {
      check(files, stage.name);
      if (stage.name === "install" && cfg.cache === "lockfile") { const key = lockKey(files); p.cache = s.cache.includes(key) ? "hit" : "miss"; if (!s.cache.includes(key)) s.cache.push(key); if (p.cache === "hit") mark(s, "cache-hit", key); }
      stage.status = "success";
    } catch (e) { stage.status = "failure"; p.error = e instanceof Error ? e.message : "Check failed"; failed = true; mark(s, `${stage.name}-failed`); }
  }
  p.status = failed ? "failure" : "success";
  if (!failed) mark(s, "pipeline-success");
}
function artifact(s: State, id: string): Artifact { const a = id === "latest" ? s.artifacts.at(-1) : s.artifacts.find(x => x.id === id); requireThat(a, "Artifact not found. Build a tested immutable artifact first."); return a; }
function env(s: State, name: string): Environment { const e = s.environments.find(e => e.name === name); requireThat(e, "Environment must be staging or production."); return e; }
function publishable(s: State, a: Artifact): void { requireThat(s.branch === "main" && a.commit === head(s) && clean(s), "Artifact is stale or branch is not main. Build the current committed main revision."); requireThat(a.registry, "Push the container artifact to the simulated registry first."); }
function tokens(command: string): string[] {
  requireThat(typeof command === "string" && command.length > 0 && command.length <= 300 && !/[\n\r\x00-\x1f;$`|&<>\\]/.test(command), "Unsupported command text. One command only; shell operators, expansion and control characters are not supported.");
  const result: string[] = []; const pattern = /\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^\s"']+))/gy; let offset = 0;
  while (offset < command.length) { if (!command.slice(offset).trim()) break; requireThat(offset === 0 || /\s/.test(command[offset]), "Separate arguments with spaces; concatenated quoted tokens are unsupported."); pattern.lastIndex = offset; const match = pattern.exec(command); requireThat(match, "Unterminated or unsupported quoting."); result.push(match[1] ?? match[2] ?? match[3]); offset = pattern.lastIndex; }
  requireThat(result.length > 0 && result.length <= 8, "Unsupported number of arguments."); return result;
}
export const cicdHelp = [
  "EDUCATIONAL SIMULATION — all files, Git, runners, packages, secrets and environments are virtual. Nothing is executed or deployed.",
  "One command at a time. Exact supported subset (no other options, shell operators or expansions):",
  "help | git status | git diff | git log | git add <allowlisted-path|.> | git commit -m \"message\" | git switch -c <branch> | git switch <branch> | git push | git tag <vX.Y.Z>",
  "npm ci | npm run lint | npm run unit | npm run integration | npm run build",
  "gh pr create --title \"title\" | gh pr checks | gh pr merge",
  "ci status | ci files | ci show <path> | ci logs [run-ID] | ci artifacts | ci environments | ci secrets | ci scan",
  "ci run <manual|push|pull_request> | ci queue <manual|push|pull_request> | ci tick | ci runner <offline|online> | ci retry <run-ID|latest>",
  "ci secret set DEPLOY_TOKEN training-only | ci artifact build | ci image push <artifact-ID|latest>",
  "ci deploy staging <artifact-ID|latest> | ci smoke <staging|production> | ci approve production <artifact-ID|latest> | ci promote production <artifact-ID|latest>",
  "ci observe production | ci incident production | ci rollback production | ci release verify",
  "Editor files: README.md, src/app.js, package.json, package-lock.json, ci/pipeline.json, ci/services.json, Dockerfile.",
  "Pipeline is educational JSON, not GitHub Actions YAML. Exact keys: triggers (unique manual/push/pull_request), runner: linux, stages: install/lint/unit/[integration]/[scan]/build in order, cache: none|lockfile, permissions: {contents: read|write, packages: none|write}. Unknown syntax fails explicitly.",
  "App grammar: four export const declarations in order: title = double-quoted text; discount = integer; api = double-quoted path; health = \"ok\"|\"fail\". Services JSON: {\"orders\":true|false}.",
  "Package and lock schemas are the bounded fictional Northstar fixture; only @northstar/kit 1.0.0/1.0.1. Container recipe: FROM node:22-alpine / WORKDIR /app / COPY . . / CMD [\"node\",\"src/app.js\"] (one line each).",
  "PR merges, release artifacts and release audit require all six current release gates: install, lint, unit, integration, scan, build. Removing a gate cannot bypass release policy.",
  "IDs use a deterministic teaching hash, not cryptographic verification. Read-only commands never award missions. Logs contain no secret values."
];
type Outcome = { output: string[]; exitCode: number; changed: boolean };
function execute(s: State, command: string): Outcome {
  const t = tokens(command), cmd = t.join(" "); requireThat(["help", "git", "npm", "gh", "ci"].includes(t[0]), "Unsupported command. Enter help for the exact educational subset."); const output: string[] = []; let changed = true; let exitCode = 0;
  if (cmd === "help") return { output: cicdHelp, exitCode: 0, changed: false };
  if (cmd === "git diff") {
    for (const path of PATHS) {
      const before = s.staged[path] ?? commit(s).files[path];
      if (before === s.files[path]) continue;
      output.push(`--- index/${path}`, `+++ working/${path}`, ...before.split("\n").map(line => `- ${line}`), ...s.files[path].split("\n").map(line => `+ ${line}`));
    }
    return { output: output.length ? output : ["No unstaged changes. git diff compares the staged index with working files; git status also shows staged changes."], exitCode: 0, changed: false };
  }
  if (["git status", "git diff", "git log", "ci status", "ci files", "ci artifacts", "ci environments", "ci secrets", "gh pr checks"].includes(cmd)) {
    if (cmd === "git status" || cmd === "git diff" || cmd === "ci files") output.push(`Branch ${s.branch}; HEAD ${head(s)}`, ...PATHS.map(p => `${Object.hasOwn(s.staged, p) ? "staged" : s.files[p] !== commit(s).files[p] ? "modified" : "clean"} ${p}`));
    if (cmd === "git log") output.push(...s.commits.slice().reverse().map(c => `${c.id} ${redact(c.message)}`));
    if (cmd === "ci status") output.push(`Mission ${current(s)}; branch ${s.branch}; commit ${head(s)}`, ...s.pipelines.slice(-5).map(p => `${p.id}: ${p.status} ${p.commit} ${p.event} cache=${p.cache}`));
    if (cmd === "ci artifacts") output.push(...s.artifacts.map(a => `${a.id} commit=${a.commit} version=${a.version} pipeline=${a.pipeline} registry=${a.registry}`));
    if (cmd === "ci environments") output.push(...s.environments.map(e => `${e.name}: ${e.artifact || "empty"} ${e.status} smoke=${e.smoke} observed=${e.observed}`));
    if (cmd === "ci secrets") output.push(...s.secrets.map(name => `${name}=*** (virtual placeholder only)`));
    if (cmd === "gh pr checks") output.push(s.pr ? `PR ${s.pr.branch} ${s.pr.head}; checks=${s.pipelines.findLast(p => p.commit === s.pr!.head && p.branch === s.pr!.branch && p.event === "pull_request")?.status ?? "missing"}` : "No pull request.");
    return { output: output.length ? output : ["No records yet."], exitCode: 0, changed: false };
  }
  if (t[0] === "ci" && t[1] === "show" && t.length === 3) { requireThat(PATHS.includes(t[2]), "Unknown virtual file."); return { output: [redact(s.files[t[2]])], exitCode: 0, changed: false }; }
  if (t[0] === "ci" && t[1] === "logs" && t.length <= 3) { const p = t[2] ? s.pipelines.find(p => p.id === t[2]) : lastPipeline(s); requireThat(p, "Pipeline not found."); return { output: [`${p.id} ${p.status} commit=${p.commit} branch=${p.branch} cache=${p.cache}`, ...p.stages.map(st => `${st.name}: ${st.status}`), redact(p.error)], exitCode: 0, changed: false }; }
  if (t[0] === "git" && t[1] === "add" && t.length === 3) { requireThat(t[2] === "." || PATHS.includes(t[2]), "Unknown path; only allowlisted virtual files can be staged."); for (const p of t[2] === "." ? PATHS : [t[2]]) { if (s.files[p] !== commit(s).files[p]) s.staged[p] = s.files[p]; else delete s.staged[p]; } output.push("Staged the current file content. Later edits need git add again."); }
  else if (t[0] === "git" && t[1] === "commit" && t[2] === "-m" && t.length === 4) { requireThat(t[3].trim().length > 0 && t[3].length <= 100, "Commit message must contain 1..100 characters."); requireThat(Object.keys(s.staged).length > 0, "Nothing staged. Edit a file, then git add."); const c = { id: `c${s.commits.length}`, parent: head(s), files: { ...commit(s).files, ...s.staged }, message: redact(t[3]) }; s.commits.push(c); s.branches[s.branch] = c.id; s.staged = {}; s.installed = ""; if (s.pr && s.pr.branch === s.branch && !s.pr.merged) s.pr.head = c.id; mark(s, "commit"); output.push(`Created ${c.id} on ${s.branch}.`); }
  else if (t[0] === "git" && t[1] === "switch" && (t.length === 3 || (t.length === 4 && t[2] === "-c"))) { requireThat(clean(s), "Commit all edits before switching branches."); const name = t.at(-1)!; requireThat(/^[a-z][a-z0-9/-]{0,39}$/.test(name) && !name.includes("..") && !name.endsWith("/"), "Unsupported branch name."); if (t.length === 4) { requireThat(!Object.hasOwn(s.branches, name) && Object.keys(s.branches).length < 12, "Branch exists or branch limit reached."); s.branches[name] = head(s); } else requireThat(Object.hasOwn(s.branches, name), "Branch not found."); s.branch = name; s.files = { ...commit(s).files }; s.installed = ""; mark(s, "branch"); output.push(`Switched to ${name}.`); }
  else if (cmd === "git push") { requireThat(clean(s), "Commit edits before pushing."); s.pushed[s.branch] = head(s); mark(s, "push"); if (s.pr?.branch === s.branch && !s.pr.merged) { s.pr.head = head(s); if (config(s.files).triggers.includes("pull_request")) { const p = startPipeline(s, "pull_request"); output.push(`${p.id}: ${p.status}`, p.error); exitCode = p.status === "failure" ? 1 : 0; } } else { try { if (config(s.files).triggers.includes("push")) { const p = startPipeline(s, "push"); output.push(`${p.id}: ${p.status}`, p.error); exitCode = p.status === "failure" ? 1 : 0; } } catch (e) { output.push(e instanceof Error ? e.message : "Invalid pipeline"); } } output.push(`Virtual remote ${s.branch} now points to ${head(s)}.`); }
  else if (t[0] === "git" && t[1] === "tag" && t.length === 3) { requireThat(/^v\d+\.\d+\.\d+$/.test(t[2]) && !Object.hasOwn(s.tags, t[2]), "Use a new vX.Y.Z tag."); requireThat(s.branch === "main" && clean(s), "Tag a clean main revision."); s.tags[t[2]] = head(s); mark(s, "tag", t[2]); output.push(`Release tag ${t[2]} -> ${head(s)}.`); }
  else if (cmd === "npm ci") { try { s.installed = lockKey(s.files); mark(s, "install", s.installed); output.push("Virtual frozen install succeeded; no packages downloaded."); } catch (e) { mark(s, "lock-failed"); output.push(e instanceof Error ? e.message : "Install failed"); exitCode = 1; } }
  else if (t[0] === "npm" && t[1] === "run" && t.length === 3 && ["lint", "unit", "integration", "build"].includes(t[2])) { requireThat(s.installed === lockKey(s.files), "Run npm ci for the current lockfile first."); check(s.files, t[2]); mark(s, `local-${t[2]}`); output.push(`Virtual ${t[2]} check passed. This parses the supported fixture; no scripts execute.`); }
  else if (t[0] === "gh" && t[1] === "pr" && t[2] === "create" && t[3] === "--title" && t.length === 5) { requireThat(s.branch !== "main" && clean(s) && s.pushed[s.branch] === head(s) && head(s) !== s.branches.main, "Push a committed feature branch different from main first."); requireThat(!s.pr || s.pr.merged, "There is already an open pull request."); requireThat(t[4].trim().length > 0, "A PR title is required."); s.pr = { branch: s.branch, base: s.branches.main, head: head(s), merged: false }; mark(s, "pr"); if (config(s.files).triggers.includes("pull_request")) { const p = startPipeline(s, "pull_request"); output.push(`${p.id}: ${p.status}`); exitCode = p.status === "failure" ? 1 : 0; } output.push("Virtual PR opened against main. Nothing sent to GitHub."); }
  else if (cmd === "gh pr merge") { const pr = s.pr; requireThat(pr && !pr.merged && s.branch === pr.branch && head(s) === pr.head && clean(s) && s.pushed[s.branch] === head(s), "Merge the pushed, clean current PR branch."); const p = s.pipelines.findLast(p => p.commit === pr.head && p.branch === pr.branch && p.event === "pull_request"); requireThat(p?.status === "success" && releaseGates(p) && pr.base === s.branches.main, "Latest checks for this PR head must pass all release gates (install, lint, unit, integration, scan, build), and main must match its base."); s.branches.main = head(s); pr.merged = true; s.branch = "main"; s.files = { ...commit(s).files }; mark(s, "merged"); const run = startPipeline(s, "push"); output.push(`Fast-forwarded main to ${head(s)}; ${run.id}: ${run.status}.`); exitCode = run.status === "failure" ? 1 : 0; }
  else if (t[0] === "ci" && ["run", "queue"].includes(t[1]) && t.length === 3 && ["manual", "push", "pull_request"].includes(t[2])) { if (t[2] === "pull_request") requireThat(s.pr && !s.pr.merged && s.pr.branch === s.branch && s.pushed[s.branch] === head(s), "A pushed open PR for this branch is required."); const p = startPipeline(s, t[2], t[1] === "queue"); output.push(`${p.id}: ${p.status}`, p.error); exitCode = p.status === "failure" ? 1 : 0; }
  else if (cmd === "ci tick") { const p = lastPipeline(s); requireThat(p?.status === "running", "No queued pipeline to advance."); finishPipeline(s, p); output.push(`${p.id}: ${p.status}`, p.error); exitCode = String(p.status) === "failure" ? 1 : 0; }
  else if (t[0] === "ci" && t[1] === "runner" && t.length === 3 && ["offline", "online"].includes(t[2])) { s.runner = t[2] === "online"; output.push(`Virtual runner ${t[2]}.`); }
  else if (t[0] === "ci" && t[1] === "retry" && t.length === 3) { const old = t[2] === "latest" ? lastPipeline(s) : s.pipelines.find(p => p.id === t[2]); requireThat(old?.status === "failure" && old.error.startsWith("runner:") && old.commit === head(s) && old.branch === s.branch, "Retry only a transient runner failure for the current branch and revision. Code failures need a new commit."); const p = startPipeline(s, old.event); if (p.status === "success") mark(s, "retry-success"); output.push(`${p.id}: ${p.status}`); exitCode = p.status === "failure" ? 1 : 0; }
  else if (cmd === "ci scan") { check(s.files, "scan"); mark(s, "scan"); output.push("Modeled secret, dependency advisory and least-privilege checks passed."); }
  else if (cmd === "ci secret set DEPLOY_TOKEN training-only") { if (!s.secrets.includes("DEPLOY_TOKEN")) s.secrets.push("DEPLOY_TOKEN"); mark(s, "secret"); output.push("DEPLOY_TOKEN=*** stored as a virtual presence flag. Never enter real credentials."); }
  else if (cmd === "ci artifact build") { requireThat(s.branch === "main" && passed(s) && releaseGates(lastPipeline(s)), "Build artifacts only from the latest passing pipeline of a clean main revision with all release gates (install, lint, unit, integration, scan, build)."); const p = lastPipeline(s)!; const id = `artifact-${hash(`${head(s)}:${JSON.stringify(commit(s).files)}`)}`; let a = s.artifacts.find(a => a.id === id); if (!a) { a = { id, commit: head(s), version: object(s.files["package.json"]).version as string, pipeline: p.id, registry: false, healthy: app(s.files).health === "ok" }; s.artifacts.push(a); } requireThat(a.commit === head(s), "Teaching hash collision detected; edit the project before rebuilding."); mark(s, "artifact", a.id); output.push(`Immutable ${a.id}; commit=${a.commit}; pipeline=${a.pipeline}.`); }
  else if (t[0] === "ci" && t[1] === "image" && t[2] === "push" && t.length === 4) { const a = artifact(s, t[3]); requireThat(s.branch === "main" && a.commit === head(s) && clean(s) && passed(s), "Push a tested artifact for clean current main."); requireThat(s.files.Dockerfile.trim() === 'FROM node:22-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node","src/app.js"]', "Unsupported container recipe. Use the exact four-line educational Dockerfile from the mission."); requireThat(config(s.files).permissions.packages === "write" && s.secrets.includes("DEPLOY_TOKEN"), "Registry publication needs packages write and the virtual DEPLOY_TOKEN."); check(s.files, "scan"); a.registry = true; mark(s, "registry", a.id); output.push(`Published ${a.id} to the in-memory registry; no image is executed.`); }
  else if (t[0] === "ci" && t[1] === "deploy" && t[2] === "staging" && t.length === 4) { const a = artifact(s, t[3]); publishable(s, a); const e = env(s, "staging"); e.previous = e.artifact; e.artifact = a.id; e.status = a.healthy ? "running" : "degraded"; e.smoke = false; e.observed = false; s.approved = ""; mark(s, "staging", a.id); output.push(`Staging now runs ${a.id}. Run a smoke check.`); }
  else if (t[0] === "ci" && t[1] === "smoke" && t.length === 3 && ["staging", "production"].includes(t[2])) { const e = env(s, t[2]); requireThat(e.artifact, "Environment is empty."); const a = artifact(s, e.artifact); e.smoke = a.healthy && e.status !== "degraded"; e.status = e.smoke ? "healthy" : "degraded"; mark(s, `smoke-${e.name}`, e.artifact); output.push(`Smoke ${e.name}: ${e.smoke ? "pass" : "fail"}; artifact=${a.id}.`); exitCode = e.smoke ? 0 : 1; }
  else if (t[0] === "ci" && t[1] === "approve" && t[2] === "production" && t.length === 4) { const a = artifact(s, t[3]), stage = env(s, "staging"); publishable(s, a); requireThat(stage.artifact === a.id && stage.smoke && stage.status === "healthy" && s.secrets.includes("DEPLOY_TOKEN"), "Approve only the current healthy smoke-tested staging artifact with the virtual deploy secret."); s.approved = a.id; mark(s, "approval", a.id); output.push(`Simulated reviewer approved ${a.id} for production. No real identity verification.`); }
  else if (t[0] === "ci" && t[1] === "promote" && t[2] === "production" && t.length === 4) { const a = artifact(s, t[3]), stage = env(s, "staging"), prod = env(s, "production"); publishable(s, a); requireThat(s.approved === a.id && stage.artifact === a.id && stage.smoke && stage.status === "healthy", "Production requires approval and successful staging smoke checks for this exact artifact."); requireThat(prod.artifact !== a.id, "Production already runs this artifact."); prod.previous = prod.artifact; prod.artifact = a.id; prod.status = a.healthy ? "running" : "degraded"; prod.smoke = false; prod.observed = false; s.approved = ""; mark(s, "promotion", a.id); output.push(`Promoted the SAME artifact ${a.id}; no rebuild.`); }
  else if (cmd === "ci observe production") { const e = env(s, "production"); requireThat(e.artifact, "Production is empty."); e.observed = true; e.status = e.status === "degraded" ? "degraded" : artifact(s, e.artifact).healthy ? "healthy" : "degraded"; mark(s, e.status === "healthy" ? "observed-healthy" : "observed-degraded", e.artifact); output.push(`Production ${e.status}; simulated error rate ${e.status === "healthy" ? "0%" : "35%"}; artifact=${e.artifact}.`); }
  else if (cmd === "ci incident production") { const e = env(s, "production"); requireThat(e.status === "healthy" && e.previous, "Need an observed healthy production release and a previous deployment before the incident drill."); e.status = "degraded"; e.observed = false; mark(s, "incident", e.artifact); output.push("Injected a virtual runtime dependency outage. Observe production before rollback."); }
  else if (cmd === "ci rollback production") { const e = env(s, "production"); requireThat(e.status === "degraded" && e.observed && e.previous, "Observe a degraded release with a previous production artifact before rollback."); const a = artifact(s, e.previous); requireThat(a.registry && a.healthy, "Previous immutable artifact is not a healthy registry release."); const bad = e.artifact; e.artifact = a.id; e.previous = bad; e.status = "running"; e.smoke = false; e.observed = false; mark(s, "rollback", a.id); output.push(`Restored previous artifact ${a.id}; no checkout or rebuild. Observe recovery.`); }
  else if (cmd === "ci release verify") { const e = env(s, "production"), a = artifact(s, e.artifact), p = lastPipeline(s); requireThat(s.branch === "main" && clean(s) && a.commit === head(s) && a.registry && e.status === "healthy" && e.observed && passed(s) && releaseGates(p) && s.tags[`v${a.version}`] === a.commit, "Release audit needs current clean main, all passing release gates in the current pipeline, matching v<package.version> tag and observed healthy production of that revision's registry artifact."); mark(s, "release", a.id); output.push(`Release audit passed: v${a.version} -> ${a.commit} -> ${a.id} -> production.`); }
  else { changed = false; throw new ModelError("Unsupported command or option. Enter help for the exact educational subset."); }
  return { output, exitCode, changed };
}
function redact(text: string): string { return text.replace(/(?:FAKE_SECRET_|TRAINING_TOKEN_)[A-Za-z0-9_-]+/g, "***"); }
function results(s: State, id: string): boolean[] {
  const missionIndex = cicdMissions.findIndex(mission => mission.id === id);
  if (missionIndex < 0) return [];
  const expectedBranch = missionIndex > 0 && missionIndex < 14 ? "feature/welcome" : "main";
  if (s.branch !== expectedBranch) return [false, false];
  const m = (key: string, revision = true) => marked(s, key, id, revision), p = lastPipeline(s), stage = env(s, "staging"), prod = env(s, "production");
  const same = (key: string, a: string) => s.marks[key]?.value === a;
  switch (id) {
    case "baseline": return [m("commit"), s.branch === "main" && commit(s).files["README.md"].includes("Owner: Delivery team") && clean(s)];
    case "branch": return [m("commit"), s.branch === "feature/welcome" && appSafe(s)?.title === "Northstar delivery" && clean(s)];
    case "local": return [m("install"), m("local-lint") && m("local-unit") && m("local-build")];
    case "pipeline": return [m("pipeline-success"), passed(s) && p?.event === "manual"];
    case "pr": return [m("pr"), !!s.pr && !s.pr.merged && s.pr.head === head(s) && s.pushed[s.branch] === head(s)];
    case "triggers": return [m("pipeline-success"), passed(s) && p?.event === "pull_request" && configSafe(s)?.triggers.includes("push") === true];
    case "lint-break": return [m("lint-failed"), p?.commit === head(s) && p?.status === "failure" && p.stages.find(x => x.name === "lint")?.status === "failure" && appSafe(s)?.title === "Northstar delivery " && clean(s)];
    case "lint-fix": return [m("pipeline-success"), passed(s) && appSafe(s)?.title === "Northstar delivery"];
    case "unit-break": return [m("unit-failed"), p?.commit === head(s) && p?.status === "failure" && p.stages.find(x => x.name === "unit")?.status === "failure" && appSafe(s)?.discount === 125 && clean(s)];
    case "unit-fix": return [m("pipeline-success"), passed(s) && appSafe(s)?.discount === 10];
    case "integration": return [m("pipeline-success"), passed(s) && p?.stages.find(x => x.name === "integration")?.status === "success"];
    case "cache": return [m("cache-hit"), passed(s) && p?.cache === "hit" && configSafe(s)?.cache === "lockfile"];
    case "lockfile": return [m("lock-failed", false), m("install", false) && m("pipeline-success") && passed(s) && lockSafe(s) && s.marks.install?.value === lockKey(s.files)];
    case "security": return [m("secret") && m("scan"), m("pipeline-success") && passed(s) && p?.stages.find(x => x.name === "scan")?.status === "success"];
    case "merge": return [m("merged"), s.branch === "main" && !!s.pr?.merged && passed(s)];
    case "artifact": return [m("artifact"), s.artifacts.some(a => a.commit === head(s) && same("artifact", a.id)) && passed(s)];
    case "registry": return [m("registry"), s.artifacts.some(a => a.commit === head(s) && a.registry && same("registry", a.id)) && passed(s)];
    case "staging": return [m("staging"), m("smoke-staging") && stage.smoke && stage.status === "healthy" && artifact(s, stage.artifact).commit === head(s)];
    case "approval": return [m("approval"), s.approved === stage.artifact && !!s.approved && stage.smoke && artifact(s, stage.artifact).commit === head(s)];
    case "production": return [m("promotion"), m("observed-healthy") && prod.observed && prod.status === "healthy" && prod.artifact === stage.artifact && artifact(s, prod.artifact).commit === head(s)];
    case "release-two": return [m("commit") && m("promotion"), m("observed-healthy") && prod.status === "healthy" && !!prod.previous && prod.artifact !== prod.previous && artifact(s, prod.artifact).version === "2.0.0" && artifact(s, prod.artifact).commit === head(s)];
    case "rollback": return [m("incident") && m("observed-degraded"), m("rollback") && m("observed-healthy") && prod.status === "healthy" && same("rollback", prod.artifact) && prod.artifact !== s.marks.incident?.value];
    case "resilience": return [m("runner-failed") && m("retry-success"), m("cancelled") && m("pipeline-success") && passed(s)];
    case "capstone": return [m("tag") && m("promotion"), m("release") && prod.status === "healthy" && prod.observed && same("release", prod.artifact) && artifact(s, prod.artifact).commit === head(s)];
    default: return [];
  }
}
function appSafe(s: State) { try { return app(s.files); } catch { return undefined; } }
function configSafe(s: State) { try { return config(s.files); } catch { return undefined; } }
function lockSafe(s: State) { try { return !!lockKey(s.files) && (object(s.files["package.json"]).dependencies as Record<string, unknown>)["@northstar/kit"] === "1.0.1"; } catch { return false; } }
function missingReasons(s: State, id: string): string[] {
  const location = `Current ${s.branch}@${head(s)}.`, p = lastPipeline(s);
  const run = p ? `Latest ${p.id}: ${p.status} at ${p.commit}.${p.error ? ` ${p.error}` : ""}` : "No pipeline has run.";
  const dirty = clean(s) ? "Working tree is clean." : "Stage and commit all saved file edits first.";
  const stage = env(s, "staging"), prod = env(s, "production");
  switch (id) {
    case "baseline": return ["Edit README.md, then git add README.md and git commit -m a message during this mission.", `Need clean main with the exact README line Owner: Delivery team. ${location} ${dirty}`];
    case "branch": return ["Create feature/welcome, edit the title and commit that change during this mission.", `Need clean feature/welcome with title exactly Northstar delivery. ${location} ${dirty}`];
    case "local": return ["Run npm ci successfully for the current locked dependencies during this mission.", "Run npm run lint, npm run unit and npm run build for this revision during this mission."];
    case "pipeline": return ["Commit ci/pipeline.json, then run ci run manual successfully during this mission.", `Need a passing manual run for clean current HEAD. ${location} ${dirty} ${run}`];
    case "pr": return ["Use git push on feature/welcome, then gh pr create --title a title during this mission.", `Need an open feature PR whose head equals the pushed current commit. ${location}`];
    case "triggers": return ["Commit pull_request and push triggers, then git push to earn a new passing PR run.", `Need the current clean PR head to pass a pull_request run with push also configured. ${run}`];
    case "lint-break": return ["Put trailing whitespace inside the title, commit and git push to reproduce a lint failure during this mission.", `Need lint failure on the latest run at current HEAD. ${location} ${run}`];
    case "lint-fix": return ["Remove the title whitespace, commit and git push a passing revision during this mission.", `Need exact title Northstar delivery and successful current CI. ${dirty} ${run}`];
    case "unit-break": return ["Set discount to 125, commit and git push to produce a unit failure during this mission.", `Need unit failure on the latest run at current HEAD. ${location} ${run}`];
    case "unit-fix": return ["Set discount to 10, commit and git push a passing revision during this mission.", `Need discount exactly 10 plus successful CI at current clean HEAD. ${dirty} ${run}`];
    case "integration": return ["Enable orders, add integration before build, commit and git push during this mission.", `Need the integration stage to pass with orders true and api /api/orders. ${run}`];
    case "cache": return ["Commit cache lockfile, then run twice with the same lock to earn cache=hit during this mission.", `Need a successful current run with a lockfile cache hit. ${run}`];
    case "lockfile": return ["Change package.json to kit 1.0.1 alone, then run npm ci once to record the expected mismatch during this mission.", `Synchronize BOTH lock entries to 1.0.1, run npm ci, commit and push green CI. ${dirty} ${run}`];
    case "security": return ["During this mission run ci secret set DEPLOY_TOKEN training-only and ci scan successfully.", `Commit a scan stage after integration, contents read, kit 1.0.1 and no fake-secret literals; git push must pass. ${run}`];
    case "merge": return ["Use gh pr merge on the pushed feature head after all six release gates pass during this mission.", `Need clean main, a merged PR and its successful main push pipeline. ${location} ${run}`];
    case "artifact": return ["On clean tested main, run ci artifact build during this mission.", `Need an immutable artifact for current HEAD with a passing current pipeline. ${location} ${run}`];
    case "registry": return ["Commit the supported Dockerfile and packages write; push, rebuild, then ci image push latest during this mission.", `Need a published registry artifact from clean current main with passing CI. ${location} ${run}`];
    case "staging": return ["Run ci deploy staging latest during this mission using the published current main artifact.", `Run ci smoke staging during this mission; need healthy current staging. Staging is ${stage.status} (${stage.artifact || "empty"}).`];
    case "approval": return ["Run ci approve production latest during this mission after staging smoke passes.", `Need unconsumed approval for this exact healthy staging/current-main artifact. Approval: ${s.approved || "missing"}; staging: ${stage.status}.`];
    case "production": return ["Run ci promote production latest during this mission with exact staging approval.", `Run ci observe production during this mission; need observed healthy production matching staging and current HEAD. Production: ${prod.status}.`];
    case "release-two": return ["Commit package version 2.0.0 and complete its new artifact→staging→approval→production flow during this mission.", `Need observed healthy production version 2.0.0 at current HEAD, with a distinct previous deployment. Production: ${prod.status}. ${location}`];
    case "rollback": return ["Run ci incident production, then ci observe production to record degraded health during this mission.", `Run ci rollback production, then ci observe production; need healthy previous artifact distinct from the incident release. Production: ${prod.status}.`];
    case "resilience": return ["Set runner offline, run manual to fail, set runner online, then ci retry latest successfully during this mission.", `Use ci queue manual twice, then ci tick to complete the newest run and retain a cancelled older run. ${run}`];
    case "capstone": return ["Promote current main again and create matching git tag v2.0.0 during this mission.", `Run ci release verify after observing healthy current production, all six green gates and a matching package-version tag. Production: ${prod.status}. ${run}`];
    default: return ["Unknown mission.", "Unknown mission."];
  }
}
function award(s: State): void { const id = current(s); let checks: boolean[] = []; try { checks = results(s, id); } catch { /* Incomplete fixtures are unsolved, never execution. */ } if (checks.length && checks.every(Boolean)) s.completed.push(id); }
function apply(s: State, a: Action): Outcome {
  let outcome: Outcome;
  if (a.kind === "write") { requireThat(PATHS.includes(a.path) && typeof a.content === "string" && a.content.length <= MAX_CONTENT && !a.content.includes("\0"), "Only allowlisted virtual files, up to 12,000 characters without NUL, can be edited."); if (s.files[a.path] === a.content) return { output: ["File unchanged."], exitCode: 0, changed: false }; s.files[a.path] = a.content; outcome = { output: [`Saved virtual ${a.path}. Stage and commit to include it in CI.`], exitCode: 0, changed: true }; }
  else outcome = execute(s, a.command);
  if (outcome.changed) award(s); return outcome;
}
function plain(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null); }
function validAction(v: unknown): v is Action {
  if (!plain(v)) return false;
  if (v.kind === "command") return exactKeys(v, ["kind", "command"]) && typeof v.command === "string" && v.command.length <= 300;
  return v.kind === "write" && exactKeys(v, ["kind", "path", "content"]) && typeof v.path === "string" && PATHS.includes(v.path) && typeof v.content === "string" && v.content.length <= MAX_CONTENT;
}
function replay(value: unknown): State {
  requireThat(plain(value) && exactKeys(value, ["version", "actions"]) && value.version === 1 && Array.isArray(value.actions) && value.actions.length <= MAX_ACTIONS, "Invalid or incompatible saved session.");
  const s = initial(); let total = 0;
  for (const a of value.actions) { requireThat(validAction(a), "Corrupt saved action."); total += a.kind === "write" ? a.content.length : a.command.length; requireThat(total <= MAX_TOTAL_CONTENT, "Saved session content exceeds the supported limit."); const result = apply(s, a); requireThat(result.changed, "Saved sessions may contain only supported state-changing actions."); }
  return s;
}
export function isCicdSession(value: unknown): value is CicdSession { try { replay(value); return true; } catch { return false; } }
function transition(session: CicdSession, action: Action): CicdCommandResult {
  try {
    const state = replay(session); const outcome = apply(state, action);
    requireThat(!outcome.changed || session.actions.length < MAX_ACTIONS, "Session action limit reached. Reset the practice session to continue.");
    const total = session.actions.reduce((size, a) => size + (a.kind === "write" ? a.content.length : a.command.length), 0) + (action.kind === "write" ? action.content.length : action.command.length);
    requireThat(!outcome.changed || total <= MAX_TOTAL_CONTENT, "Session text limit reached. Reset the practice session to continue.");
    const next: CicdSession = outcome.changed ? { version: 1, actions: [...session.actions.map(a => ({ ...a })), { ...action }] } : { version: 1, actions: session.actions.map(a => ({ ...a })) };
    return { session: next, output: ["[Educational simulation]", ...outcome.output.map(redact)], exitCode: outcome.exitCode };
  } catch (error) { return { session, output: ["[Educational simulation]", redact(error instanceof Error ? error.message : "Invalid simulation input.")], exitCode: 1 }; }
}
export function runCicdCommand(session: CicdSession, command: string): CicdCommandResult { return transition(session, { kind: "command", command }); }
export function writeCicdFile(session: CicdSession, path: string, content: string): CicdCommandResult { return transition(session, { kind: "write", path, content }); }
export function describeCicdSession(session: CicdSession) {
  const s = replay(session), p = lastPipeline(s);
  return { branch: s.branch, commit: head(s), files: PATHS.map(path => ({ path, content: s.files[path], modified: s.files[path] !== commit(s).files[path], staged: Object.hasOwn(s.staged, path) })), pipeline: p ? { id: p.id, status: p.status, commit: p.commit, stages: p.stages.map(st => ({ ...st })) } : null, environments: s.environments.map(e => ({ name: e.name, artifact: e.artifact, status: e.status })), artifacts: s.artifacts.map(a => ({ id: a.id, commit: a.commit, version: a.version })), completedMissionIds: [...s.completed] };
}
export function cicdMissionResults(session: CicdSession, missionId: string): { id: string; title: string; passed: boolean; reason: string }[] {
  const s = replay(session), mission = cicdMissions.find(m => m.id === missionId); if (!mission) return [];
  let checks: boolean[] = []; try { checks = results(s, missionId); } catch { /* Show unmet checks for incomplete/degraded state. */ }
  const missing = missingReasons(s, missionId);
  const index = cicdMissions.indexOf(mission), expectedBranch = index > 0 && index < 14 ? "feature/welcome" : "main";
  const branchReason = s.branch === expectedBranch ? "" : `This mission requires ${expectedBranch}; current branch is ${s.branch}. `;
  return mission.steps.map((step, i) => ({ id: step.id, title: step.title, passed: checks[i] === true, reason: checks[i] === true ? "Validated against the current virtual project state." : redact(`${s.completed.includes(missionId) ? "Achievement retained. " : ""}${branchReason}${missing[i]}`) }));
}
