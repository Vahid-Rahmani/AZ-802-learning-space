import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

/**
 * Component-level acceptance test for the CCNA simulator workspace.
 *
 * `validate:ccna-sim` proves the engine. This test proves the surface the learner touches: it mounts
 * the real React component in a real DOM (jsdom), types into the real terminal through real keyboard
 * events, clicks the real device tabs, and reads the rendered interface table. It is how the four
 * reported failures are held down:
 *
 *   1. `enable` on R1 must reach the engine and produce `R1#`, never "Unknown command";
 *   2. a command the guide offers must work on the console it names, and be refused on the wrong one;
 *   3. the interface table's status word must equal the word the same console prints;
 *   4. switching device tabs must keep every console's transcript and the step progress, and a saved
 *      session must restore them.
 *
 * Expected values are written here independently of the component: the words and prompts below come
 * from Cisco IOS output, not from the implementation's own strings.
 */

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = path.join(projectRoot, ".tmpwork/ccna-sim-ui");
mkdirSync(scratch, { recursive: true });

const entry = path.join(scratch, "entry.tsx");
const outfile = path.join(scratch, "bundle.mjs");
const { writeFileSync } = await import("node:fs");
writeFileSync(entry, [
  'export { CcnaSimulationWorkspace } from "../../app/components/ccna-simulation-workspace";',
  'export { getCcnaSimulationPack } from "../../lib/content/ccna-simulation-packs";',
  "",
].join("\n"));

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  tsconfig: path.join(projectRoot, "tsconfig.json"),
  external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
  logLevel: "warning",
});

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://lab.local/ccna/sim?lab=ccna-addressing",
  pretendToBeVisual: true,
});
const { window } = dom;
for (const [name, value] of Object.entries({
  window, document: window.document, HTMLElement: window.HTMLElement, Element: window.Element,
  Node: window.Node, Event: window.Event, MouseEvent: window.MouseEvent, KeyboardEvent: window.KeyboardEvent,
  localStorage: window.localStorage, requestAnimationFrame: window.requestAnimationFrame?.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame?.bind(window),
})) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}
Object.defineProperty(globalThis, "navigator", { value: window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { CcnaSimulationWorkspace, getCcnaSimulationPack } = await import(pathToFileURL(outfile).href);

const settle = async (ms = 8) => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
};
const all = (container, selector) => [...container.querySelectorAll(selector)];
const tab = (container, label) => {
  const found = all(container, 'button[role="tab"]').find((button) => button.textContent.trim().startsWith(label));
  assert.ok(found, `the ${label} device tab is missing`);
  return found;
};
const surface = (container) => {
  const found = container.querySelector(".ccna-simulation-terminal-screen");
  assert.ok(found, "the terminal surface is missing");
  return found;
};
const output = (container) => container.querySelector(".ccna-simulation-terminal-output").textContent;
/** Everything the learner can read in the console, including the prompt of the current line. */
const screenText = (container) => container.querySelector(".ccna-simulation-terminal-screen").textContent;
/** The prompt the next command will see, which is how a mode change becomes visible. */
const promptNow = (container) => container.querySelector(".ccna-simulation-terminal-input-line .ccna-simulation-terminal-prompt")?.textContent ?? "";
const headerLine = (container) => container.querySelector(".ccna-lab-title p + p").textContent;
/** The titles of the graded steps the workspace currently credits. */
const creditedSteps = (container) => all(container, ".ccna-simulation-stage.is-complete")
  .map((item) => item.querySelector("strong")?.textContent ?? "");
const interfaceRows = (container) => all(container, ".ccna-simulation-interface-table tbody tr")
  .map((row) => [...row.children].map((cell) => cell.textContent.trim()));

async function mount(packId, persistKey = packId, overridePack) {
  const pack = overridePack ?? getCcnaSimulationPack(packId);
  assert.ok(pack, `${packId} has no simulation pack`);
  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(CcnaSimulationWorkspace, { pack, persistKey })); });
  await settle();
  return { container, root, pack, unmount: async () => { await act(async () => { root.unmount(); }); container.remove(); } };
}

async function click(container, element) {
  await act(async () => { element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
  await settle();
}

async function type(container, text) {
  const target = container.querySelector('.ccna-simulation-terminal-native-input');
  assert.ok(target, 'the editable console input is missing');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(target, text);
    target.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await act(async () => { target.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  await settle();
}

/** Open a device tab and run commands on it, the way a learner does. */
async function run(container, label, ...commands) {
  await click(container, tab(container, label));
  for (const command of commands) await type(container, command);
}

const results = {};
// Mobile keyboards/paste may emit input events without printable keydowns.
const mobile = await mount("ccna-addressing", "mobile-native-input");
await click(mobile.container, tab(mobile.container, "SW1"));
const nativeInput = mobile.container.querySelector('.ccna-simulation-terminal-native-input');
assert.ok(nativeInput instanceof window.HTMLInputElement, 'a real editable input must open the mobile keyboard');
assert.equal(window.document.activeElement, nativeInput, 'a device tap must focus the input synchronously, not in a later animation frame');
assert.equal(nativeInput.getAttribute('inputmode'), 'text');
assert.equal(nativeInput.getAttribute('autocapitalize'), 'off');
await act(async () => {
  surface(mobile.container).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
});
assert.equal(window.document.activeElement, nativeInput, 'tapping the console must focus its native input');
await act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(nativeInput, 'enable');
  nativeInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  nativeInput.dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true }));
  nativeInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true }));
});
assert.equal(promptNow(mobile.container), 'SW1>', 'IME confirmation must not submit a command prematurely');
assert.equal(nativeInput.value, 'enable');
await act(async () => {
  nativeInput.dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true }));
  nativeInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
});
await settle();
assert.equal(promptNow(mobile.container), 'SW1#', 'native input events must reach the same engine as physical keys');
assert.equal(nativeInput.value, '', 'submitted commands must clear the inline draft');
await act(async () => {
  nativeInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
});
assert.equal(nativeInput.value, 'enable', 'native input must retain command history');
await click(mobile.container, tab(mobile.container, 'R1'));
await click(mobile.container, tab(mobile.container, 'SW1'));
assert.equal(nativeInput.value, 'enable', 'switching devices must retain the native input draft');
results.mobileNativeInput = 'tapping focuses a real inline input; input-only typing, IME confirmation, Enter, history and device drafts work';
await act(async () => { mobile.container.querySelector('#ccna-panel-tab-topology').click(); });
await act(async () => { mobile.container.querySelector('#ccna-panel-tab-terminal').click(); });
assert.equal(window.document.activeElement, nativeInput, 'Terminal panel tap must retain the mobile keyboard user gesture');
assert.match(mobile.container.querySelector('.ccna-simulation-workspace').style.getPropertyValue('--simulation-viewport-height'), /px$/);
await mobile.unmount();
const workspace = await mount("ccna-addressing");
assert.equal(workspace.container.querySelectorAll('.ccna-simulation-node-card').length, 0, 'topology must not render rectangular device cards');
assert.equal(workspace.container.querySelectorAll('.ccna-simulation-node .ccna-simulation-device-art.is-large').length, workspace.pack.devices.length, 'each node must have its own device silhouette');

// 0. The lab does not start solved.
assert.match(headerLine(workspace.container), /0\/11 steps verified/, "a graded step is already credited before any configuration");
results.startUnsolved = "a fresh lab reports 0/11 verified";

// 1. `enable` and the switch-only command, on the consoles the lab names.
await click(workspace.container, tab(workspace.container, "R1"));
assert.equal(promptNow(workspace.container), "R1>", "R1 does not start in user exec mode");
await type(workspace.container, "enable");
assert.equal(promptNow(workspace.container), "R1#", "R1 did not enter privileged exec after enable");
assert.doesNotMatch(screenText(workspace.container), /Unknown command/, "the engine answered enable with a canned Unknown command");
await type(workspace.container, "show vlan brief");
assert.match(screenText(workspace.container), /Invalid input/, "a router accepted a switch-only show command");
assert.doesNotMatch(screenText(workspace.container), /Unknown command/);
await run(workspace.container, "SW1", "enable", "show vlan brief");
assert.match(screenText(workspace.container), /VLAN Name\s+Status\s+Ports/, "SW1 refused show vlan brief, which this lab's guide offers");
assert.doesNotMatch(screenText(workspace.container), /Unknown command/, "SW1 answered show vlan brief with a canned Unknown command");
results.guideCommandsWork = "enable and show vlan brief run on the console the guide names, and the router refuses the switch command";

// 1b. Reading the lab's own evidence twice credits nothing: no device state changed yet.
await run(workspace.container, "SW1", "show vlan brief", "show vlan brief", "show running-config");
assert.match(headerLine(workspace.container), /0\/11 steps verified/, "repeating read-only commands credited a graded step");
results.repeatedReadsCreditNothing = "repeated show commands leave the lab at 0/11";

// 2. The canvas/table word and the console word come from one rule.
await click(workspace.container, tab(workspace.container, "R1"));
let rows = interfaceRows(workspace.container);
assert.equal(rows.find((row) => row[0] === "Gi0/0")?.[4], "disabled", "R1 Gi0/0 is not shown as disabled before it is enabled");
await type(workspace.container, "show ip interface brief");
assert.match(output(workspace.container), /Gi0\/0\s+unassigned\s+YES\s+unset\s+administratively down\s+down/, "the R1 console does not report the same state the table shows");
await type(workspace.container, "end");
await run(workspace.container, "R1", "configure terminal", "interface gi0/0", "no shutdown", "ip address 192.168.10.1 255.255.255.192", "end");
rows = interfaceRows(workspace.container);
assert.equal(rows.find((row) => row[0] === "Gi0/0")?.[4], "connected", "R1 Gi0/0 is not shown as connected after it was enabled on its real cable");
assert.equal(rows.find((row) => row[0] === "Gi0/0")?.[3], "192.168.10.1 255.255.255.192", "the table does not show the address the console configured");
await type(workspace.container, "show ip interface brief");
assert.match(output(workspace.container), /Gi0\/0\s+192\.168\.10\.1\s+YES\s+manual\s+up\s+up/, "the console and the table disagree about R1 Gi0/0 after it came up");
assert.deepEqual(creditedSteps(workspace.container), ["Bring up R1 Gi0/0 with the /26 gateway"], "enabling the router interface credited the wrong set of steps");
results.statusParity = "the interface table and show ip interface brief report the same state, from the same cable and admin rule";

// 3. A graded step needs device state, and it is credited once it matches.
await run(workspace.container, "PC-A", "ip address 192.168.10.10 255.255.255.192", "ip default-gateway 192.168.10.1");
assert.deepEqual([...creditedSteps(workspace.container)].sort(), ["Address and cable PC-A", "Bring up R1 Gi0/0 with the /26 gateway", "Prove the gateway answers on the LAN"].sort(), "PC-A's published /26 plan and the gateway path credited the wrong set of steps");
await type(workspace.container, "show ipconfig");
assert.match(headerLine(workspace.container), /3\/11 steps verified/, "an unknown command changed the progress");
const afterPcA = headerLine(workspace.container);
results.gradedFromState = "0/11 at the start, one step after the router interface came up, three after PC-A's published plan and the gateway path";

// 4. Tab switching keeps every console's transcript and the progress.
await run(workspace.container, "PC-B", "ipconfig");
assert.equal(promptNow(workspace.container), "PC-B>", "the PC-B console did not open");
await click(workspace.container, tab(workspace.container, "SW1"));
assert.match(screenText(workspace.container), /VLAN Name\s+Status\s+Ports/, "SW1's console transcript was lost when another device was opened");
assert.match(screenText(workspace.container), /show vlan brief/, "SW1's typed history was lost when another device was opened");
assert.equal(headerLine(workspace.container), afterPcA, "the step progress changed while switching device tabs");
await click(workspace.container, tab(workspace.container, "PC-A"));
assert.match(screenText(workspace.container), /ip address 192\.168\.10\.10 255\.255\.255\.192/, "PC-A's console transcript was lost after switching tabs and back");
assert.match(screenText(workspace.container), /192\.168\.10\.10 255\.255\.255\.192/, "PC-A's configured address is not readable from its console after switching tabs");
results.tabsKeepState = "each console keeps its own transcript, draft and configuration across device switches, and progress is unchanged";

// 5. Guidance points at the device the step belongs to.
await click(workspace.container, tab(workspace.container, "SW1"));
const guidance = workspace.container.querySelector(".ccna-simulation-device-guidance")?.textContent ?? "";
assert.match(guidance, /SW1 is not needed for this step|PC-A/, "the guide does not direct the learner to the device the current step belongs to");
results.guidanceNamesDevice = "the guide names the console the current step belongs to and tells the learner when the open device is not needed";

// 5b. A closed console says so, and the surface offers the way back.
await run(workspace.container, "SW1", "exit", "exit");
assert.equal(promptNow(workspace.container), "", "a closed console still shows a prompt to type at");
assert.match(screenText(workspace.container), /Connection closed/, "a closed console does not say why it stopped accepting commands");
await click(workspace.container, all(workspace.container, ".ccna-simulation-terminal-actions button")[0]);
assert.equal(promptNow(workspace.container), "SW1>", "restarting the console did not open a fresh session on the same device");
assert.doesNotMatch(screenText(workspace.container), /Connection closed/, "the closed notice survived the restart");
assert.match(screenText(workspace.container), /Connected to SW1/, "the restarted console did not open a fresh session");
results.closedConsoleRecovers = "`exit` at user exec ends the session, the console says the connection closed, and Restart this console opens a fresh one";

// 6. A saved session restores both consoles and the progress.
const savedKey = "component-restore";
const first = await mount("ccna-addressing", savedKey);
await run(first.container, "PC-A", "ip address 192.168.10.10 255.255.255.192", "ip default-gateway 192.168.10.1");
await run(first.container, "R1", "enable", "configure terminal", "interface gi0/0", "no shutdown", "ip address 192.168.10.1 255.255.255.192", "end", "show running-config");
const savedHeader = headerLine(first.container);
const savedSteps = creditedSteps(first.container);
assert.equal(savedSteps.length, 3, `the saved run credited ${savedSteps.length} steps instead of 3`);
await first.unmount();
const restored = await mount("ccna-addressing", savedKey);
assert.equal(headerLine(restored.container), savedHeader, "the restored session lost its step progress");
assert.deepEqual(creditedSteps(restored.container), savedSteps, "the restored session lost the steps it had credited");
await click(restored.container, tab(restored.container, "PC-A"));
assert.match(screenText(restored.container), /ip address 192\.168\.10\.10 255\.255\.255\.192/, "the restored session lost PC-A's console transcript");
assert.match(screenText(restored.container), /192\.168\.10\.10 255\.255\.255\.192/, "the restored session lost PC-A's configured address");
await click(restored.container, tab(restored.container, "R1"));
assert.equal(promptNow(restored.container), "R1#", "the restored session lost R1's privileged mode");
assert.match(screenText(restored.container), /show running-config/, "the restored session lost R1's console transcript");
await restored.unmount();
results.saveAndRestore = "a saved session restores every console transcript, the device state and the step progress";

// SSH is free exploration, not an allowlist tied to the lab's prescribed commands.
const remoteLab = await mount("ccna-addressing", "remote-config");
await run(remoteLab.container, "R1", "enable", "conf t", "ip domain-name lab.example", "username learner secret LabOnly123", "crypto key generate rsa modulus 2048", "line vty 0 4", "login local", "transport input ssh", "exit", "interface gi0/0", "ip address 192.168.10.1 255.255.255.192", "no shutdown", "end");
await run(remoteLab.container, "PC-A", "ip address 192.168.10.10 255.255.255.192", "ip default-gateway 192.168.10.1", "ssh -l learner 192.168.10.1");
assert.equal(promptNow(remoteLab.container), "Password:");
await type(remoteLab.container, "LabOnly123");
assert.equal(promptNow(remoteLab.container), "R1>");
assert.doesNotMatch(screenText(remoteLab.container), /LabOnly123/, "SSH password was echoed in the PC transcript");
await type(remoteLab.container, "enable");
await type(remoteLab.container, "conf t");
await type(remoteLab.container, "interface gi0/0");
await type(remoteLab.container, "ip address 192.168.10.2 255.255.255.192");
await click(remoteLab.container, tab(remoteLab.container, "R1"));
assert.equal(interfaceRows(remoteLab.container).find((row) => row[0] === "Gi0/0")?.[3], "192.168.10.2 255.255.255.192", "remote configuration is missing from the destination interface table");
assert.ok(!creditedSteps(remoteLab.container).includes("Bring up R1 Gi0/0 with the /26 gateway"), "the grader ignored the remotely changed gateway");
await run(remoteLab.container, "R1", "conf t", "interface gi0/0", "ip address 192.168.10.1 255.255.255.192", "end");
await run(remoteLab.container, "R1", "conf t", "ip route 10.100.0.0 255.255.0.0 192.168.10.10", "do show ip route", "end");
await run(remoteLab.container, "SW1", "enable", "conf t", "vlan 20", "exit", "interface vlan 20", "ip address 192.168.20.2 255.255.255.0", "no shutdown", "end");
assert.equal(remoteLab.container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow"), "27");
await remoteLab.unmount();
const remoteRestored = await mount("ccna-addressing", "remote-config");
await run(remoteRestored.container, "R1", "show ip ssh");
assert.match(screenText(remoteRestored.container), /SSH Enabled - version 2/);
await run(remoteRestored.container, "R1", "show running-config");
assert.match(screenText(remoteRestored.container), /ip route 10.100.0.0 255.255.0.0 192.168.10.10/);
await run(remoteRestored.container, "SW1", "show running-config");
assert.match(screenText(remoteRestored.container), /interface Vlan20/);
assert.equal(interfaceRows(remoteRestored.container).find((row) => row[0] === "Vlan20")?.[3], "192.168.20.2 255.255.255.0", "custom SVI vanished on resume");
assert.equal(remoteRestored.container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow"), "27");
await remoteRestored.unmount();
results.sshSharedModel = "free SSH configuration, hidden login, remote changes reach the target table and grader, configuration/progress survive remount";

// A small independent contract proves the last step, not a command echo, yields 100%.
const sample = getCcnaSimulationPack("ccna-addressing");
const namedStage = (label) => ({ ...sample.stages[0], id: `name-${label}`, title: `Name ${label}`, ungraded: false,
  deviceId: sample.devices.find((device) => device.label === label).id,
  check: (lab) => ({ ok: lab.device(label).hostname === `Branch-${label}`, detail: `Set the hostname to Branch-${label}` }) });
const completion = await mount("ccna-addressing", "completion-contract", { ...sample, stages: [namedStage("R1"), namedStage("SW1")] });
const percent = () => completion.container.querySelector('[role="progressbar"]').getAttribute("aria-valuenow");
assert.equal(percent(), "0");
await run(completion.container, "R1", "enable", "conf t", "hostname Branch-R1", "end");
assert.equal(percent(), "50");
assert.equal(creditedSteps(completion.container).length, 1);
await run(completion.container, "SW1", "enable", "conf t", "hostname Branch-SW1", "end");
assert.equal(percent(), "100");
assert.match(completion.container.querySelector(".ccna-simulation-guide-complete").textContent, /100%/);
await run(completion.container, "SW1", "conf t", "ip domain-name extra.example", "end");
assert.equal(percent(), "100", "the completed lab blocked extra configuration");
await run(completion.container, "SW1", "conf t", "hostname SW1", "end");
assert.equal(percent(), "50", "undoing a requirement retained a false completion");
await completion.unmount();
results.progressCompletesFromState = "0 → 50 → 100%, extra configuration remains allowed, undoing a goal revokes its tick";

// 7. A lab with no authored objectives is honest about it and offers nothing to tick.
const unauthored = await mount("ccna-topology-006", "observation-only");
assert.match(headerLine(unauthored.container), /No graded steps authored yet/, "an unauthored lab claims graded progress");
const scenarioText = unauthored.container.querySelector(".ccna-simulation-guide--observations")?.textContent ?? "";
assert.match(scenarioText, /nothing on this page is credited as completed work/, "an unauthored lab does not state that nothing is credited");
assert.equal(all(unauthored.container, ".ccna-simulation-checklist button").length, 0, "an unauthored lab offers a manual checklist to tick");
await run(unauthored.container, "SW1", "enable", "show ip interface brief", "show vlan brief");
assert.equal(promptNow(unauthored.container), "SW1#", "a generated lab's switch console did not reach the engine");
assert.match(screenText(unauthored.container), /VLAN Name\s+Status\s+Ports/, "a generated lab's switch refused a command its own observation list offers");
assert.doesNotMatch(screenText(unauthored.container), /Unknown command/, "a generated lab still answers from a canned terminal");
await unauthored.unmount();
results.unauthoredLab = "an unauthored lab runs the real engine, states that it credits nothing, and offers no manual checklist";

await workspace.unmount();
rmSync(scratch, { recursive: true, force: true });
console.log(JSON.stringify({ surface: "ccna-simulation-workspace", assertions: results }));
