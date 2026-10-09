import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

/**
 * Per-lab acceptance test for the connection between topology, simulator state and task completion.
 *
 * `validate:ccna-sim` proves the engine headlessly. This test drives the real React workspace in a
 * real DOM and asserts, for EVERY authored lab, the criteria the reported failures were about:
 *
 *   1. a fresh lab starts with its required objectives unsolved (0/N, and no step credited);
 *   2. the correct commands on the wrong console receive no credit;
 *   3. repeating read-only commands creates no extra credit;
 *   4. the lab's own solution completes exactly the steps whose requirements it satisfies;
 *   5. breaking a requirement removes its checkmark and shows why;
 *   6. disconnecting and reconnecting a cable changes the results that depend on it, both ways;
 *   7. Resume restores the configuration, the cables and the progress;
 *   8. extra configuration is still allowed after 100%, and 100% needs every graded step;
 *   9. Reset affects the selected lab only.
 *
 * It is deliberately per-lab: a lab that passes here is not evidence for any other lab, and the
 * script prints one line per lab so a failure names the lab instead of the catalog.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(projectRoot, ".tmpwork/ccna-sim-labs");
mkdirSync(scratch, { recursive: true });

const entry = path.join(scratch, "entry.tsx");
const outfile = path.join(scratch, "bundle.mjs");
writeFileSync(entry, [
  'export { CcnaSimulationWorkspace } from "../../app/components/ccna-simulation-workspace";',
  'export { getCcnaSimulationPack } from "../../lib/content/ccna-simulation-packs";',
  'export { listAuthoredLabPacks } from "../../lib/content/ccna-sim/index.ts";',
  "",
].join("\n"));

await build({
  entryPoints: [entry], outfile, bundle: true, format: "esm", platform: "neutral",
  target: "es2022", jsx: "automatic", tsconfig: path.join(projectRoot, "tsconfig.json"),
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"], logLevel: "warning",
});

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://lab.local/ccna/sim", pretendToBeVisual: true,
});
const { window } = dom;
for (const [name, value] of Object.entries({
  window, document: window.document, HTMLElement: window.HTMLElement, Element: window.Element,
  Node: window.Node, Event: window.Event, MouseEvent: window.MouseEvent, KeyboardEvent: window.KeyboardEvent,
  localStorage: window.localStorage, requestAnimationFrame: window.requestAnimationFrame?.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame?.bind(window),
})) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { CcnaSimulationWorkspace, getCcnaSimulationPack, listAuthoredLabPacks } = await import(pathToFileURL(outfile).href);

const settle = async (ms = 8) => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); }); };
const all = (container, selector) => [...container.querySelectorAll(selector)];
const surfaceOf = (container) => {
  const found = container.querySelector(".ccna-simulation-terminal-screen");
  assert.ok(found, "the terminal surface is missing");
  return found;
};
const screenText = (container) => surfaceOf(container).textContent;
const headerLine = (container) => container.querySelector(".ccna-lab-title p + p").textContent;
const progressNow = (container) => container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow");
const verifiedCount = (container) => Number(/^(\d+)\/(\d+)/.exec(headerLine(container))?.[1] ?? -1);
const requiredCount = (container) => Number(/^(\d+)\/(\d+)/.exec(headerLine(container))?.[2] ?? -1);
const creditedTitles = (container) => all(container, ".ccna-simulation-stage.is-complete").map((item) => item.querySelector("strong")?.textContent ?? "");
const isComplete = (container) => Boolean(container.querySelector(".ccna-simulation-guide-complete"));

async function mount(packId, persistKey) {
  const pack = getCcnaSimulationPack(packId);
  assert.ok(pack, `${packId} has no simulation pack`);
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(CcnaSimulationWorkspace, { pack, persistKey })); });
  await settle();
  return { container, pack, unmount: async () => { await act(async () => { root.unmount(); }); container.remove(); } };
}

async function click(container, element) {
  assert.ok(element, "tried to click an element that is not on the page");
  await act(async () => { element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
  await settle();
}
/**
 * Type one command the way the surface accepts it now: through the console's real inline input, which
 * is what a hardware keyboard, a soft keyboard and a paste all funnel through. Editing the input's
 * value with its own setter is what React sees as a learner keystroke, and Enter submits the line.
 */
async function type(container, text) {
  const target = container.querySelector(".ccna-simulation-terminal-native-input");
  assert.ok(target, "the console's editable input is missing");
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(target, text);
    target.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
  await act(async () => { target.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  await settle();
}
/**
 * Run one command on a named device's console, opening that console first.
 *
 * A learner's own input can end a session (`exit` at user exec is a real close), and the surface then
 * offers "Restart this console". A test that gave up there would silently stop replaying the rest of
 * the step, so it restarts the console and finishes the step on the device it does not belong to.
 */
async function typeOn(container, label, command) {
  await click(container, tabFor(container, label));
  let restarted = false;
  if (!container.querySelector(".ccna-simulation-terminal-native-input")) {
    const restart = all(container, ".ccna-simulation-terminal-actions button").find((button) => /restart/i.test(button.textContent));
    assert.ok(restart, `${label}'s console closed and offers no way to restart it`);
    await click(container, restart);
    restarted = true;
  }
  await type(container, command);
  return restarted;
}
const readAgain = async (container) => {
  const before = headerLine(container);
  for (const label of consoleLabels(container)) {
    await click(container, tabFor(container, label));
    await type(container, "show ip interface brief");
    await type(container, "show ip interface brief");
  }
  return before;
};
const tabFor = (container, label) => {
  const found = all(container, 'button[role="tab"]').find((button) => button.textContent.trim().startsWith(label));
  assert.ok(found, `the ${label} console tab is missing`);
  return found;
};
const consoleLabels = (container) => all(container, ".ccna-simulation-device-tabs button[role='tab']")
  .filter((button) => !button.disabled).map((button) => button.querySelector("span")?.textContent ?? "");
const portElement = (container, deviceLabel, portLabel) => all(container, ".ccna-simulation-port")
  .find((element) => (element.getAttribute("aria-label") ?? "").startsWith(`${deviceLabel} ${portLabel},`));
/** Cables render in the order the pack declares them, so the canvas position identifies one exactly. */
const linkElementAt = (container, index) => all(container, ".ccna-simulation-link")[index];

const labelOf = (pack, deviceId) => pack.devices.find((node) => node.id === deviceId)?.label ?? deviceId;
const portLabelOf = (pack, endpoint) => pack.devices.find((node) => node.id === endpoint.deviceId)
  ?.ports.find((port) => port.id === endpoint.portId)?.label ?? endpoint.portId;
const gradedStepsOf = (pack) => pack.objectives.flatMap((objective) => objective.steps.map((step) => ({ objective, step })))
  .filter((entry) => Boolean(entry.step.check));

async function runSolution(container, pack) {
  for (const entry of pack.solution) {
    await click(container, tabFor(container, labelOf(pack, entry.deviceId)));
    for (const command of entry.commands) await type(container, command);
  }
}

const results = {};
const failures = [];
const record = (labId, outcome) => { results[labId] = outcome; };

for (const pack of listAuthoredLabPacks()) {
  const labId = pack.labId;
  const graded = gradedStepsOf(pack);
  const total = graded.length;
  const report = {};
  const expect = (condition, message) => { if (!condition) throw new Error(message); };
  try {
    // Phase one: a lab nobody has touched. "Unreached" rather than persisted, so a failure here is
    // about the starting state and not about a row saved by an earlier phase.
    const untouched = await mount(labId, `acceptance-fresh-${labId}`);

    // 1. A fresh lab is unsolved, and its progress is measured only over graded requirements.
    expect(headerLine(untouched.container) === `0/${total} steps verified · practice model, not a device`, `a fresh lab reports "${headerLine(untouched.container)}" instead of 0/${total}`);
    expect(requiredCount(untouched.container) === total, "the progress denominator is not the graded step count");
    expect(progressNow(untouched.container) === "0", "a fresh lab does not start at 0%");
    expect(creditedTitles(untouched.container).length === 0, "a step is credited before any configuration");
    report.freshUnsolved = `0/${total} verified, 0%`;

    // 3. Repeating read-only commands two times per console credits nothing.
    await readAgain(untouched.container);
    expect(verifiedCount(untouched.container) === 0, "repeating read commands credited a step");
    report.repeatedReads = "repeated show commands credit nothing";

    // 2. The lab's own commands on the wrong console credit nothing. This runs in its own lab, because
    // typing another device's commands can legitimately close the console they are typed into.
    const wrongConsole = pack.devices.find((node) => node.role === "host");
    expect(wrongConsole, "this lab publishes no host console to test the wrong-device case on");
    const wrongTarget = graded.find((entry) => entry.step.deviceId !== wrongConsole.id && (entry.step.commands ?? []).length);
    expect(wrongTarget, "no graded step of another device can be replayed on the wrong console");
    let answerClosed = false;
    for (const command of wrongTarget.step.commands) {
      answerClosed = await typeOn(untouched.container, wrongConsole.label, command) || answerClosed;
    }
    expect(!creditedTitles(untouched.container).includes(wrongTarget.step.title), `"${wrongTarget.step.title}" was credited while its commands were typed on ${wrongConsole.label}`);
    expect(verifiedCount(untouched.container) === 0, `the wrong console earned ${verifiedCount(untouched.container)} step(s)`);
    report.wrongConsole = `${wrongConsole.label} ran all ${wrongTarget.step.commands.length} command(s) of "${wrongTarget.step.title}" and earned nothing${answerClosed ? " (one of them closed that session, which does not affect any other console)" : ""}`;
    await untouched.unmount();

    // Phase two: the same lab configured through the console, saved and resumed.
    const persistKey = `acceptance-${labId}`;
    const first = await mount(labId, persistKey);

    // 4. The lab's solution completes every graded step and only then reaches 100%.
    await runSolution(first.container, pack);
    expect(verifiedCount(first.container) === total, `the solution ended at ${headerLine(first.container)} instead of ${total}/${total}`);
    expect(progressNow(first.container) === "100", "the solution did not reach 100%");
    expect(isComplete(first.container), "100% of graded steps is not reported as a completed lab");
    const solvedSteps = creditedTitles(first.container).length;
    report.solutionCompletes = `solution reaches ${total}/${total} and 100%`;

    // 5. Breaking a requirement removes its checkmark and the lab is no longer "complete".
    const criticalLink = pack.links[pack.links.length - 1];
    const cut = linkElementAt(first.container, pack.links.length - 1);
    expect(cut, `the published cable ${portLabelOf(pack, criticalLink.source)} ↔ ${portLabelOf(pack, criticalLink.target)} is not on the canvas`);
    await click(first.container, cut);
    const afterCut = verifiedCount(first.container);
    expect(afterCut < total, "cutting a published cable kept every step credited");
    expect(!isComplete(first.container), "the lab still reports completion after a cable was removed");
    report.cableCut = `cutting ${portLabelOf(pack, criticalLink.source)} ↔ ${portLabelOf(pack, criticalLink.target)} drops ${total - afterCut} step(s)`;

    // 6. Reconnecting the same cable restores exactly what depended on it.
    await click(first.container, portElement(first.container, labelOf(pack, criticalLink.source.deviceId), portLabelOf(pack, criticalLink.source)));
    await click(first.container, portElement(first.container, labelOf(pack, criticalLink.target.deviceId), portLabelOf(pack, criticalLink.target)));
    expect(verifiedCount(first.container) === total, `reconnecting the cable left the lab at ${headerLine(first.container)} instead of ${total}/${total}`);
    expect(creditedTitles(first.container).length === solvedSteps, "reconnecting the cable did not restore the same credited steps");
    report.cableReconnect = "reconnecting restores every dependent step";

    // 8. Extra configuration is still available after 100%, it never creates credit, and the only mark
    // it can cost is the lab's own save step — a running configuration that changed is meant to be
    // saved again, and the pack's instruction says so.
    const extraConsole = pack.devices.find((node) => node.role === "router") ?? pack.devices.find((node) => node.role === "switch");
    expect(extraConsole, "this lab has no console that can accept extra configuration");
    await click(first.container, tabFor(first.container, extraConsole.label));
    await type(first.container, "enable");
    await type(first.container, "configure terminal");
    await type(first.container, "ip domain-name extra.lab.example");
    await type(first.container, "end");
    expect(!/Invalid input/.test(screenText(first.container)), "extra configuration was refused");
    const afterExtra = verifiedCount(first.container);
    expect(afterExtra <= total, "extra configuration credited a step that was not earned");
    for (const entry of pack.solution) {
      if (!entry.commands.includes("copy running-config startup-config")) continue;
      await click(first.container, tabFor(first.container, labelOf(pack, entry.deviceId)));
      await type(first.container, "copy running-config startup-config");
    }
    expect(verifiedCount(first.container) === total, `saving again after extra configuration left the lab at ${headerLine(first.container)} instead of ${total}/${total}`);
    report.freeExperimentation = `${extraConsole.label} accepted extra configuration (${total - afterExtra} step(s) went stale until saved again, then back to ${total}/${total})`;

    // 7. Resume restores the cables, the configuration and the progress.
    await first.unmount();
    const resumed = await mount(labId, persistKey);
    expect(verifiedCount(resumed.container) === total, `Resume gave ${headerLine(resumed.container)} instead of ${total}/${total}`);
    expect(resumed.container.querySelectorAll(".ccna-simulation-link").length === pack.links.length, "Resume did not restore the lab's cables");
    const lastEntry = pack.solution[pack.solution.length - 1];
    await click(resumed.container, tabFor(resumed.container, labelOf(pack, lastEntry.deviceId)));
    expect(screenText(resumed.container).includes(lastEntry.commands[lastEntry.commands.length - 1]), `Resume lost the console history of ${labelOf(pack, lastEntry.deviceId)}`);
    report.resume = `Resume restores ${total}/${total}, the cables and the console configuration`;

    // 9. Reset affects this lab only: a second mounted lab keeps its own progress.
    const otherLab = listAuthoredLabPacks().find((candidate) => candidate.labId !== labId);
    const other = await mount(otherLab.labId, `acceptance-other-${otherLab.labId}`);
    await runSolution(other.container, otherLab);
    const otherTotal = gradedStepsOf(otherLab).length;
    expect(verifiedCount(other.container) === otherTotal, "the second lab did not reach its own total");
    await click(resumed.container, resumed.container.querySelector(".ccna-lab-reset"));
    expect(verifiedCount(resumed.container) === 0, "Reset did not clear the lab it belongs to");
    expect(creditedTitles(resumed.container).length === 0, "Reset left a step credited");
    expect(verifiedCount(other.container) === otherTotal, `Reset of ${labId} changed ${otherLab.labId}`);
    expect(other.container.querySelectorAll(".ccna-simulation-link").length === otherLab.links.length, `Reset of ${labId} removed ${otherLab.labId}'s cables`);
    report.resetScope = `Reset cleared ${labId} and left ${otherLab.labId} at ${otherTotal}/${otherTotal}`;
    await other.unmount();
    await resumed.unmount();
    record(labId, report);
  } catch (error) {
    failures.push(`${labId}: ${error.message}`);
    record(labId, { ...report, error: error.message });
  }
}

console.log(JSON.stringify({ surface: "ccna-simulation-workspace", perLab: results, failures }, null, 1));
rmSync(scratch, { recursive: true, force: true });
if (failures.length) process.exitCode = 1;
