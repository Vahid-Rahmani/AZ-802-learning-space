import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-cicd-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { CicdWorkspace } from "./app/cicd/page.tsx"; export { cicdMissions, cicdWalkthroughs } from "./lib/content/cicd-learning.ts"; export { describeCicdSession, isCicdSession } from "./lib/cicd-sim/engine.ts";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic", external: ["react", "react/*", "react-dom", ...Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies)], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;', loader: "js" }));
  } }] });
  const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/cicd", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLInputElement: window.HTMLInputElement, HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLSelectElement: window.HTMLSelectElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { CicdWorkspace, cicdMissions, cicdWalkthroughs, describeCicdSession, isCicdSession } = await import(pathToFileURL(outfile).href);
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 8)); });
  let root, container, user;
  async function mount(id = "cicd-ui-learner") { user = id; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); await act(async () => root.render(createElement(CicdWorkspace, { userId: user }))); await settle(); }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  async function click(element) { assert.ok(element, "requested control missing"); await act(async () => element.click()); await settle(); }
  const button = text => [...container.querySelectorAll("button")].find(item => item.textContent.trim() === text);
  const stored = () => JSON.parse(localStorage.getItem(`klybit-cicd:v1:${user}`));
  const overview = () => describeCicdSession(stored().session);
  async function setValue(element, value, prototype) { assert.ok(element); await act(async () => { Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value); element.dispatchEvent(new window.Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true })); }); await settle(); }
  async function run(command) {
    await click(container.querySelector("#cicd-tab-terminal"));
    await setValue(container.querySelector("#cicd-command"), command, window.HTMLInputElement.prototype);
    await act(async () => container.querySelector(".cicd-command-line").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))); await settle();
  }
  async function write(filePath, content) {
    await click(container.querySelector("#cicd-tab-files"));
    await setValue(container.querySelector("#cicd-file"), filePath, window.HTMLSelectElement.prototype);
    await setValue(container.querySelector("textarea"), content, window.HTMLTextAreaElement.prototype);
    const save = button("Save virtual file"); if (!save.disabled) await click(save);
  }

  assert.equal(cicdMissions.length, 24); assert.equal(cicdWalkthroughs.length, 24);
  await mount();
  assert.equal(container.querySelector("progress").value, 0);
  assert.equal(container.querySelectorAll(".cicd-earned").length, 0);
  assert.equal(container.querySelectorAll(".cicd-mission-map button:disabled").length, 23);
  const input = container.querySelector("#cicd-command");
  assert.equal(input.getAttribute("inputmode"), "text"); assert.equal(input.getAttribute("autocapitalize"), "none"); assert.equal(input.getAttribute("spellcheck"), "false"); assert.equal(input.closest("[translate]").getAttribute("translate"), "no");
  for (const command of ["git status", "ci status", "help", "git status", "ci status"]) await run(command);
  assert.equal(overview().completedMissionIds.length, 0, "read-only command forged achievement");
  await run("not-a-supported-command"); assert.equal(overview().completedMissionIds.length, 0); assert.ok(container.querySelector(".cicd-transcript pre.is-failed"));
  await setValue(container.querySelector("#cicd-command"), "git status", window.HTMLInputElement.prototype);
  const beforeComposition = JSON.stringify(stored().session);
  await act(async () => { input.dispatchEvent(new window.CompositionEvent("compositionstart", { bubbles: true })); });
  const enter = new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  await act(async () => { input.dispatchEvent(enter); container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
  assert.equal(enter.defaultPrevented, true); assert.equal(JSON.stringify(stored().session), beforeComposition, "IME Enter ran a command");
  await act(async () => input.dispatchEvent(new window.CompositionEvent("compositionend", { bubbles: true })));
  await run("ci secret set DEPLOY_TOKEN real-secret-not-allowed");
  assert.ok(!localStorage.getItem(`klybit-cicd:v1:${user}`).includes("real-secret-not-allowed"), "rejected secret leaked to saved transcript/history");
  await run("  ci secret set DEPLOY_TOKEN leading-space-secret");
  assert.ok(!localStorage.getItem(`klybit-cicd:v1:${user}`).includes("leading-space-secret"), "leading spaces bypassed secret redaction");
  await setValue(container.querySelector("#cicd-command"), "  ci secret set DEPLOY_TOKEN cancelled-secret", window.HTMLInputElement.prototype);
  assert.ok(!localStorage.getItem(`klybit-cicd:v1:${user}`).includes("cancelled-secret"), "secret draft persisted before execution");
  await act(async () => container.querySelector("#cicd-command").dispatchEvent(new window.KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true }))); await settle();
  assert.ok(!localStorage.getItem(`klybit-cicd:v1:${user}`).includes("cancelled-secret"), "Ctrl+C leaked cancelled secret");
  await run("unsupported TRAINING_TOKEN_echoLeak");
  assert.ok(!container.querySelector(".cicd-transcript").textContent.includes("TRAINING_TOKEN_echoLeak"), "training token leaked in command echo");
  await act(async () => container.querySelector("#cicd-tab-terminal").dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }))); await settle();
  assert.ok(container.querySelector("#cicd-panel-files")); assert.equal(document.activeElement.id, "cicd-tab-files");
  await click(container.querySelector("#cicd-tab-terminal"));

  for (let index = 0; index < cicdWalkthroughs.length; index++) {
    const walkthrough = cicdWalkthroughs[index];
    assert.equal(walkthrough.missionId, cicdMissions[index].id);
    for (const action of walkthrough.actions) {
      if (action.kind === "write") await write(action.path, action.content);
      else {
        const command = action.command.replace(/<failed run-ID shown by ci status>/g, overview().pipeline?.id ?? "missing-run");
        await run(command);
      }
    }
    assert.equal(overview().completedMissionIds.length, index + 1, `UI could not finish ${walkthrough.missionId}`);
    assert.equal(container.querySelector("progress").value, index + 1);
    assert.ok(container.querySelector(".cicd-earned"), `earned banner missing for ${walkthrough.missionId}`);
    assert.ok(isCicdSession(stored().session));
    if (index === 11) {
      const saved = JSON.stringify(stored().session); await unmount(); await mount(); assert.equal(JSON.stringify(stored().session), saved, "resume changed project state"); assert.equal(overview().completedMissionIds.length, 12);
    }
    if (index < cicdWalkthroughs.length - 1) await click(button("Next mission"));
  }
  assert.ok(container.querySelector(".cicd-completion"));
  assert.match(container.querySelector(".cicd-progress strong").textContent, /100%/);
  assert.ok(container.querySelectorAll(".cicd-transcript > div").length <= 100, "terminal transcript is unbounded");
  await click(container.querySelector("#cicd-tab-releases")); assert.ok(container.querySelector(".cicd-environments")); assert.ok(container.querySelectorAll("table tbody tr").length > 0);
  await click(container.querySelector("#cicd-tab-pipeline")); assert.ok(container.querySelectorAll(".cicd-pipeline-graph li").length > 0);
  const completedSave = localStorage.getItem(`klybit-cicd:v1:${user}`);
  await unmount(); await mount("cicd-other-learner"); assert.equal(overview().completedMissionIds.length, 0); assert.equal(localStorage.getItem("klybit-cicd:v1:cicd-ui-learner"), completedSave, "account progress crossed identities"); await unmount();
  await mount(); assert.equal(overview().completedMissionIds.length, 24);
  await click(container.querySelector("#cicd-tab-files"));
  await setValue(container.querySelector("#cicd-file"), "README.md", window.HTMLSelectElement.prototype);
  await setValue(container.querySelector("textarea"), "Unsaved editor draft for tomorrow", window.HTMLTextAreaElement.prototype);
  await unmount(); await mount(); await click(container.querySelector("#cicd-tab-files")); assert.equal(container.querySelector("textarea").value, "Unsaved editor draft for tomorrow");
  localStorage.setItem("unrelated-course-progress", "keep-me");
  window.confirm = () => false; await click(button("Reset this project")); assert.equal(overview().completedMissionIds.length, 24);
  window.confirm = () => true; await click(button("Reset this project")); assert.equal(overview().completedMissionIds.length, 0); assert.equal(localStorage.getItem("unrelated-course-progress"), "keep-me");
  await unmount();
  localStorage.setItem("klybit-cicd:v1:corrupt", JSON.stringify({ version: 1, session: { version: 1, actions: [], completedMissionIds: cicdMissions.map(item => item.id) } }));
  await mount("corrupt"); assert.equal(overview().completedMissionIds.length, 0); assert.match(container.querySelector(".cicd-project-bar").textContent, /Invalid save ignored/); await unmount();

  const css = readFileSync("app/cicd/cicd.css", "utf8");
  assert.match(css, /\.cicd-terminal-screen\s*\{[^}]*height: clamp\([^}]*overflow: auto/s);
  assert.match(css, /max-width: 760px/); assert.match(css, /font-size: 16px/); assert.doesNotMatch(css, /!important/);
  console.log("PASS: all 24 CI/CD missions through actual React terminal/editor forms; state-backed ticks, failed commands, IME, completion, bounded transcript, resume/drafts, account isolation and reset scope. Responsive CSS contract checked; no rendered-browser layout or physical phone keyboard test claimed.");
} finally { rmSync(scratch, { recursive: true, force: true }); }
