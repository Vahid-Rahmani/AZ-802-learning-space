import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ccnaLabs } from "../lib/content/ccna.ts";
import { ccnaLabBands, ccnaLabPath, ccnaLabPathStats } from "../lib/content/ccna-lab-path.ts";
import { ccnaTopologyLabs } from "../lib/content/ccna-topologies.ts";
import { ccnaSimulationPackByLabId } from "../lib/content/ccna-simulation-packs.ts";
import { simCommands } from "../lib/ccna-sim/commands.ts";

/**
 * Structural acceptance gate for the CCNA simulation workspace.
 *
 * This is intentionally separate from validate-ccna-sim.mjs. That validator proves the IOS
 * terminal and its transcripts; this one proves the learning path, topology references, optional
 * declarative packs, route entry points, and the static mobile/keyboard affordances around them.
 *
 * Pack loading is deliberately optional during the S0/S1 rollout: the current repository has
 * reference topologies but no content pack directory yet. Once a pack is present, every one is
 * validated strictly. This lets CI run before and after pack waves without hiding malformed data.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const warnings = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const file = (relative) => path.join(projectRoot, relative);
const read = (relative) => readFileSync(file(relative), "utf8");
const exists = (relative) => existsSync(file(relative));

const uniqueCount = (items) => new Set(items).size;
const byId = (items) => new Map(items.map((item) => [item.id, item]));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

// ---------------------------------------------------------------------------
// 1. Learning-path coverage: 12 bands, 109 labs, 101 catalog entries.

const labIds = ccnaLabPath.map((lab) => lab.id);
const pathLabById = byId(ccnaLabPath);
const catalogPathLabs = ccnaLabPath.filter((lab) => lab.kind === "catalog");
const handsOnPathLabs = ccnaLabPath.filter((lab) => lab.kind === "hands-on");

check(ccnaLabBands.length === 12, `expected 12 learning bands, found ${ccnaLabBands.length}`);
check(ccnaLabPath.length === 109, `expected 109 labs in the learning path, found ${ccnaLabPath.length}`);
check(catalogPathLabs.length === 101, `expected 101 catalog labs, found ${catalogPathLabs.length}`);
check(handsOnPathLabs.length === 8, `expected 8 hands-on labs, found ${handsOnPathLabs.length}`);
check(uniqueCount(labIds) === labIds.length, "duplicate lab ID in ccnaLabPath");
check(ccnaLabPathStats.total === ccnaLabPath.length, `ccnaLabPathStats.total=${ccnaLabPathStats.total} disagrees with ${ccnaLabPath.length} labs`);
check(ccnaLabPathStats.catalog === catalogPathLabs.length, `ccnaLabPathStats.catalog=${ccnaLabPathStats.catalog} disagrees with ${catalogPathLabs.length}`);
check(ccnaLabPathStats.handsOn === handsOnPathLabs.length, `ccnaLabPathStats.handsOn=${ccnaLabPathStats.handsOn} disagrees with ${handsOnPathLabs.length}`);

const bandIds = ccnaLabBands.map((band) => band.id);
check(uniqueCount(bandIds) === bandIds.length, "duplicate band ID");
const bandMembership = new Map();
ccnaLabBands.forEach((band, index) => {
  check(band.order === index + 1, `${band.id}: order must be ${index + 1}, found ${band.order}`);
  check(nonEmptyString(band.title), `${band.id}: missing title`);
  check(Array.isArray(band.labIds) && band.labIds.length > 0, `${band.id}: no lab IDs`);
  check(Array.isArray(band.verification) && band.verification.length >= 1, `${band.id}: no verification checklist`);
  const localIds = new Set();
  for (const id of band.labIds ?? []) {
    check(!localIds.has(id), `${band.id}: duplicate lab ${id} inside band`);
    localIds.add(id);
    check(pathLabById.has(id), `${band.id}: references missing lab ${id}`);
    if (pathLabById.has(id)) {
      check(!bandMembership.has(id), `${id}: appears in both ${bandMembership.get(id)} and ${band.id}`);
      bandMembership.set(id, band.id);
    }
  }
});
for (const lab of ccnaLabPath) check(bandMembership.get(lab.id), `${lab.id}: not assigned to any of the 12 bands`);
check(bandMembership.size === ccnaLabPath.length, `band membership covers ${bandMembership.size} of ${ccnaLabPath.length} labs`);

// ---------------------------------------------------------------------------
// 2. Catalog topology references and hands-on topology outlines.

check(ccnaTopologyLabs.length === 101, `expected 101 catalog topology records, found ${ccnaTopologyLabs.length}`);
const topologyById = byId(ccnaTopologyLabs);
check(uniqueCount(ccnaTopologyLabs.map((lab) => lab.id)) === ccnaTopologyLabs.length, "duplicate catalog topology ID");

const publicFile = (src) => path.join(projectRoot, "public", String(src).replace(/^\//, ""));
const isPng = (fullPath) => {
  if (!existsSync(fullPath)) return false;
  const bytes = readFileSync(fullPath);
  return bytes.length >= 24 && [...bytes.subarray(0, 8)].join(",") === "137,80,78,71,13,10,26,10";
};
let diagramCount = 0;
let conceptOnlyCount = 0;
for (const lab of catalogPathLabs) {
  const catalog = topologyById.get(lab.id);
  check(catalog, `${lab.id}: catalog lab has no matching topology record`);
  if (!catalog) continue;
  if (catalog.diagram) {
    diagramCount++;
    check(lab.diagram !== null, `${lab.id}: catalog diagram was dropped from the learning path`);
    check(lab.diagram?.src === catalog.diagram.src, `${lab.id}: learning-path diagram does not match catalog diagram`);
    check(String(catalog.diagram.src).startsWith("/ccna-topologies/"), `${lab.id}: diagram escapes /ccna-topologies/`);
    check(isPng(publicFile(catalog.diagram.src)), `${lab.id}: missing or invalid PNG ${catalog.diagram.src}`);
  } else {
    conceptOnlyCount++;
    check(lab.diagram === null, `${lab.id}: learning path claims a diagram the catalog does not publish`);
  }
}
check(diagramCount === ccnaLabPathStats.withDiagram - handsOnPathLabs.filter((lab) => lab.diagram).length, `catalog diagram count ${diagramCount} disagrees with the published ${ccnaLabPathStats.withDiagram} total`);
warn(conceptOnlyCount === 0, `${conceptOnlyCount} catalog labs are concept-only and intentionally have no published topology diagram`);

const buildById = byId(ccnaLabs);
for (const lab of handsOnPathLabs) {
  const build = buildById.get(lab.id);
  check(build, `${lab.id}: hands-on path entry has no build-stage record`);
  const topology = build?.topology;
  check(isObject(topology), `${lab.id}: hands-on lab has no topology outline`);
  const nodes = topology?.nodes;
  check(Array.isArray(nodes) && nodes.length >= 2, `${lab.id}: topology outline needs at least two nodes`);
  if (Array.isArray(nodes)) {
    const nodeNames = nodes.map((node) => node?.title);
    check(nodeNames.every(nonEmptyString), `${lab.id}: topology node title is empty`);
    check(uniqueCount(nodeNames) === nodeNames.length, `${lab.id}: topology node titles are not unique`);
    check(nodes.every((node) => nonEmptyString(node?.detail)), `${lab.id}: topology node detail is empty`);
  }
}

// ---------------------------------------------------------------------------
// 3. Optional simulation packs: discover the content layer without assuming one filename.

const walk = (directory) => {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) return [];
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) result.push(full);
  }
  return result;
};

const packRoots = [
  file("lib/content/ccna-sim"),
  file("lib/content/ccna-simulation"),
  file("lib/content/ccna-simulations"),
  file("content/ccna-sim/packs"),
];
const directPackFiles = [
  "lib/content/ccna-sim.ts",
  "lib/content/ccna-sim-packs.ts",
  "lib/content/ccna-simulation-packs.ts",
  "lib/content/ccna-simulations.ts",
].filter(exists).map(file);
const packFiles = [...new Set([...directPackFiles, ...packRoots.flatMap(walk)])];
const packObjects = [];
const loadedPackSources = [];

const looksLikePack = (value) => isObject(value)
  && (nonEmptyString(value.labId) || (nonEmptyString(value.id) && Array.isArray(value.devices)))
  && (Array.isArray(value.devices) || isObject(value.topology));

const collectPackObjects = (value, source, seen = new Set()) => {
  if (value === null || value === undefined || (typeof value !== "object" && typeof value !== "function")) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (looksLikePack(value)) { packObjects.push({ pack: value, source }); return; }
  if (Array.isArray(value)) { for (const item of value) collectPackObjects(item, source, seen); return; }
  for (const [key, child] of Object.entries(value)) {
    if (key === "__esModule") continue;
    collectPackObjects(child, source, seen);
  }
};

for (const source of packFiles) {
  try {
    if (source.endsWith(".json")) collectPackObjects(JSON.parse(readFileSync(source, "utf8")), source);
    else {
      const importedPackModule = await import(`${pathToFileURL(source).href}?qa=${Date.now()}`);
      collectPackObjects(importedPackModule, source);
    }
    loadedPackSources.push(source);
  } catch (error) {
    failures.push(`simulation pack source ${path.relative(projectRoot, source)} could not load: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const packLabIds = [];
const endpointFrom = (value) => {
  if (typeof value === "string") {
    const separator = value.indexOf(".");
    if (separator > 0) return { deviceId: value.slice(0, separator), portId: value.slice(separator + 1) };
    return null;
  }
  if (!isObject(value)) return null;
  const deviceId = value.deviceId ?? value.device ?? value.nodeId;
  const portId = value.portId ?? value.port ?? value.interface;
  return nonEmptyString(deviceId) && nonEmptyString(portId) ? { deviceId, portId } : null;
};
const topologyFor = (pack) => {
  const topology = isObject(pack.topology) ? pack.topology : pack;
  return {
    devices: topology.devices ?? topology.nodes,
    links: topology.links ?? topology.edges,
  };
};
const nodeIdOf = (node) => typeof node === "string" ? node : node?.id ?? node?.deviceId ?? node?.name ?? node?.title;
const portsOf = (node) => Array.isArray(node?.ports) ? node.ports : Array.isArray(node?.interfaces) ? node.interfaces : [];
const portIdOf = (port) => typeof port === "string" ? port : port?.id ?? port?.portId ?? port?.name ?? port?.label;

const validatePack = ({ pack, source }, index) => {
  const identity = pack.labId ?? pack.id;
  const label = nonEmptyString(identity) ? identity : `pack #${index + 1}`;
  check(nonEmptyString(identity), `${path.relative(projectRoot, source)}: pack needs labId (or id)`);
  check(!packLabIds.includes(identity), `${label}: duplicate simulation pack for this lab`);
  if (nonEmptyString(identity)) packLabIds.push(identity);
  const lab = pathLabById.get(identity);
  check(Boolean(lab), `${label}: pack points to a lab that is not in ccnaLabPath`);
  if (lab) warn(lab.reviewStatus !== "needs-review", `${label}: pack is attached to a needs-review lab and is shown as a fallback`);
  check(nonEmptyString(pack.title), `${label}: pack title is missing`);
  check(isObject(pack.scenario), `${label}: pack scenario is missing`);

  const topology = topologyFor(pack);
  const devices = Array.isArray(topology.devices) ? topology.devices : [];
  const links = Array.isArray(topology.links) ? topology.links : [];
  check(devices.length >= 1, `${label}: pack has no devices`);
  const deviceIds = devices.map(nodeIdOf);
  check(deviceIds.every(nonEmptyString), `${label}: every device needs a non-empty id`);
  check(uniqueCount(deviceIds) === deviceIds.length, `${label}: device IDs are not unique`);
  const deviceMap = new Map(devices.map((device) => [nodeIdOf(device), device]));
  const ports = new Map();
  for (const device of devices) {
    const deviceId = nodeIdOf(device);
    const devicePorts = portsOf(device);
    check(devicePorts.length >= 1, `${label}/${deviceId}: device has no published ports`);
    const portIds = devicePorts.map(portIdOf);
    check(portIds.every(nonEmptyString), `${label}/${deviceId}: every port needs an id`);
    check(uniqueCount(portIds) === portIds.length, `${label}/${deviceId}: duplicate port ID`);
    ports.set(deviceId, new Map(devicePorts.map((port) => [portIdOf(port), port])));
    for (const coordinate of ["x", "y"]) {
      if (coordinate in (device ?? {})) check(Number.isFinite(device[coordinate]), `${label}/${deviceId}: ${coordinate} must be numeric`);
    }
  }
  check(devices.length < 2 || links.length >= 1, `${label}: multi-device topology has no links`);
  const linkKeys = new Set();
  const usedEndpoints = new Set();
  for (const [linkIndex, link] of links.entries()) {
    const sourceEndpoint = endpointFrom(Array.isArray(link) ? link[0] : link?.source ?? link?.from);
    const targetEndpoint = endpointFrom(Array.isArray(link) ? link[1] : link?.target ?? link?.to);
    check(sourceEndpoint && targetEndpoint, `${label}: link ${linkIndex + 1} must have two device.port endpoints`);
    if (!sourceEndpoint || !targetEndpoint) continue;
    const sourceKey = `${sourceEndpoint.deviceId}.${sourceEndpoint.portId}`;
    const targetKey = `${targetEndpoint.deviceId}.${targetEndpoint.portId}`;
    const linkKey = [sourceKey, targetKey].sort().join("|");
    check(!linkKeys.has(linkKey), `${label}: duplicate link ${sourceKey} ↔ ${targetKey}`);
    linkKeys.add(linkKey);
    check(sourceEndpoint.deviceId !== targetEndpoint.deviceId, `${label}: link ${linkIndex + 1} connects a device to itself`);
    for (const endpoint of [sourceEndpoint, targetEndpoint]) {
      const endpointKey = `${endpoint.deviceId}.${endpoint.portId}`;
      check(deviceMap.has(endpoint.deviceId), `${label}: link references missing device ${endpoint.deviceId}`);
      check(ports.get(endpoint.deviceId)?.has(endpoint.portId), `${label}: link references missing port ${endpointKey}`);
      const port = ports.get(endpoint.deviceId)?.get(endpoint.portId);
      if (!port?.allowMultipleLinks) {
        check(!usedEndpoints.has(endpointKey), `${label}: port ${endpointKey} is connected more than once`);
        usedEndpoints.add(endpointKey);
      }
    }
  }
  const objectives = Array.isArray(pack.objectives) ? pack.objectives : Array.isArray(pack.checklist) ? pack.checklist : [];
  warn(objectives.length > 0, `${label}: no checklist/objectives yet (topology-only pack)`);
  const objectiveIds = objectives.map((objective) => objective?.id);
  check(uniqueCount(objectiveIds) === objectiveIds.length, `${label}: objective IDs are not unique`);
  for (const objective of objectives) {
    check(nonEmptyString(objective?.id), `${label}: objective is missing id`);
    check(nonEmptyString(objective?.title), `${label}: objective is missing title`);
    check(objective?.check !== undefined || objective?.predicate !== undefined || objective?.verify !== undefined || objective?.assert !== undefined || nonEmptyString(objective?.detail), `${label}/${objective?.id ?? "objective"}: no check/predicate/detail`);
  }
  const commandNames = Array.isArray(pack.commands) ? pack.commands : Array.isArray(pack.allowedCommands) ? pack.allowedCommands : [];
  if (commandNames.length) {
    check(commandNames.length <= 25, `${label}: pack exposes ${commandNames.length} commands; maximum is 25`);
    const commandSet = new Set(simCommands.map((command) => command.name));
    for (const command of commandNames) {
      const name = typeof command === "string" ? command : command?.name;
      check(commandSet.has(name), `${label}: command ${name} is not in the simulator catalog`);
    }
  }
};

packObjects.forEach(validatePack);
const missingPackLabs = ccnaLabPath.filter((lab) => !packLabIds.includes(lab.id));
warn(packObjects.length > 0, "no simulation content packs were discovered; reference topologies are validated, but pack coverage is still pending rollout");
warn(missingPackLabs.length === 0, `${missingPackLabs.length} of ${ccnaLabPath.length} labs have no simulation pack yet`);

// ---------------------------------------------------------------------------
// 3b. Reference diagram ↔ simulator mapping.
//
// A lab may have a published diagram with more than the small generic starter
// graph.  The route and detail page must resolve the same pack, and a diagram
// must not silently point at a pack for another lab.  Keep one explicit
// contract for the first multi-device catalogue topology so a future mapper
// change cannot regress it back to the old three-node fallback.

for (const lab of ccnaLabPath) {
  const pack = ccnaSimulationPackByLabId.get(lab.id);
  check(Boolean(pack), `${lab.id}: learning-path entry has no simulation pack mapping`);
  if (lab.diagram && pack) {
    check(pack.diagram?.src === lab.diagram.src, `${lab.id}: simulator pack diagram does not match the learning-path diagram`);
  }
}

const exploreCiscoPack = ccnaSimulationPackByLabId.get("ccna-topology-001");
const exploreCiscoLabels = ["Device1", "Device2", "Device5", "Device3", "Device4", "Accounting", "WWW", "FTP", "Web Admin", "Sales"];
check(Boolean(exploreCiscoPack), "ccna-topology-001: Explore Cisco Devices pack is missing");
if (exploreCiscoPack) {
  check(exploreCiscoPack.devices.length === exploreCiscoLabels.length, `ccna-topology-001: expected ${exploreCiscoLabels.length} mapped devices, found ${exploreCiscoPack.devices.length}`);
  check(exploreCiscoPack.devices.map((device) => device.label).join("|") === exploreCiscoLabels.join("|"), "ccna-topology-001: mapped device labels do not match the published topology");
  check((exploreCiscoPack.links ?? []).length === 9, `ccna-topology-001: expected 9 starter links, found ${(exploreCiscoPack.links ?? []).length}`);
}

// ---------------------------------------------------------------------------
// 4. Independent per-lab route and entry points.

const simPage = exists("app/ccna/sim/page.tsx") ? read("app/ccna/sim/page.tsx") : "";
const labPathComponent = exists("app/components/ccna-lab-path.tsx") ? read("app/components/ccna-lab-path.tsx") : "";
const buildPage = exists("app/ccna/build/page.tsx") ? read("app/ccna/build/page.tsx") : "";
const simComponentSources = [file("app/components/ccna-sim.tsx"), file("app/components/ccna-simulation-workspace.tsx"), ...walk(file("app/components/ccna-sim"))]
  .filter((full) => /\.(ts|tsx)$/.test(full) && existsSync(full)).map((full) => readFileSync(full, "utf8")).join("\n");
check(Boolean(simPage), "missing app/ccna/sim/page.tsx: no independent simulator route");
check(/useSearchParams/.test(simPage), "simulator route does not read a per-lab query parameter");
check(/ccnaLabPath\.find/.test(simPage), "simulator route does not resolve the requested lab from ccnaLabPath");
check(/CcnaSimulator/.test(simPage) || /CcnaSimulationWorkspace/.test(simPage), "simulator route does not render the simulator surface");
warn(/getCcnaSimulationPack/.test(simPage), "simulator route does not yet resolve an interactive pack");
check(/ccna\/sim\?lab=/.test(labPathComponent), "lab library has no per-lab simulator link");
warn(/ccna\/sim\?lab=/.test(buildPage), "hands-on build page has no direct simulator link; library links remain available");
for (const id of labIds) check(id.length > 0, "empty lab ID cannot form an independent simulator route");

// ---------------------------------------------------------------------------
// 5. Static mobile and keyboard acceptance checks.

const css = [file("app/ccna-sim.css"), file("app/ccna/simulator.css"), ...walk(file("app"))].filter((full) => full.endsWith(".css") && (path.basename(full).includes("ccna-sim") || path.basename(full).includes("simulator")))
  .filter((full, index, list) => list.indexOf(full) === index).map((full) => readFileSync(full, "utf8")).join("\n");
const keyboardExpectations = [
  ["onKeyDown", "keyboard event handler"],
  ["ArrowUp", "command history up"],
  ["ArrowDown", "command history down"],
  ["Tab", "completion key"],
  ["role=\"log\"", "accessible terminal log"],
  ["tabIndex", "keyboard-focusable transcript"],
  ["aria-label", "labelled simulator controls"],
];
for (const [needle, label] of keyboardExpectations) check(simComponentSources.includes(needle), `keyboard/a11y acceptance missing ${label}`);
const mobileExpectations = [
  ["@media (max-width:599px)", "small-screen layout"],
  ["@media (max-width:899px)", "mobile panel layout"],
  ["ccna-sim-mobile-tabs", "mobile panel navigation"],
  ["ccna-simulation-tabs", "interactive workspace panel navigation"],
  ["min-width:0", "shrinkable grid children"],
  ["overflow:auto", "contained scroll region"],
  [":focus-visible", "visible keyboard focus"],
];
for (const [needle, label] of mobileExpectations) check(css.includes(needle), `mobile acceptance missing ${label}`);
check(/aria-controls=\{`sim-\$\{panel\}-panel`\}/.test(simComponentSources), "mobile panel buttons do not point at their panel IDs");
for (const panel of ["terminal", "scenario", "topology", "reference"]) check(simComponentSources.includes(`sim-${panel}-panel`), `mobile panel target sim-${panel}-panel is missing`);

// ---------------------------------------------------------------------------
// Report. Warnings are intentional during rollout; malformed structure is not.

const summary = {
  status: failures.length ? "failed" : warnings.length ? "ok-with-warnings" : "ok",
  bands: ccnaLabBands.length,
  labs: ccnaLabPath.length,
  catalogLabs: catalogPathLabs.length,
  handsOnLabs: handsOnPathLabs.length,
  catalogTopologyRecords: ccnaTopologyLabs.length,
  catalogDiagrams: diagramCount,
  conceptOnlyCatalogLabs: conceptOnlyCount,
  packSources: loadedPackSources.length,
  packs: packObjects.length,
  labsWithoutPack: missingPackLabs.length,
  failures: failures.length,
  warnings: warnings.length,
};

if (failures.length) {
  console.error("CCNA simulation acceptance failed");
  for (const message of failures) console.error(`  - ${message}`);
  if (warnings.length) {
    console.error("Warnings");
    for (const message of warnings) console.error(`  - ${message}`);
  }
  console.error(JSON.stringify(summary));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(summary));
  if (warnings.length) {
    console.log("Warnings");
    for (const message of warnings) console.log(`  - ${message}`);
  }
}
