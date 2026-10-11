import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = mkdtempSync(path.join(project, ".tmp-cisco-ui-"));
const outfile = path.join(scratch, "bundle.mjs");
try {
  await build({ stdin: { contents: 'export { CiscoLearningTask, CiscoLearningOverview, CiscoLearningPath } from "./app/components/cisco-learning.tsx"; export { learningTasks, learningStages, learningPack } from "./lib/content/cisco-learning.ts"; export { taskMeasurement } from "./lib/cisco-learning-progress.ts";', resolveDir: project, loader: "tsx" }, outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic", tsconfig: path.join(project, "tsconfig.json"), external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "lucide-react"], logLevel: "warning", plugins: [{ name: "test-auth-context", setup(b) {
    b.onResolve({ filter: /^@\/app\/ccna\/layout$/ }, () => ({ path: "auth-context", namespace: "test" }));
    b.onLoad({ filter: /^auth-context$/, namespace: "test" }, () => ({ contents: 'export const useCcnaShell = () => ({userId: "ui-learner", language: ""});', loader: "js" }));
    b.onResolve({ filter: /(?:google-translate|cisco-learning-language)$/ }, args => ({ path: args.path.endsWith("google-translate") ? "google" : "language", namespace: "test" }));
    b.onLoad({ filter: /^(google|language)$/, namespace: "test" }, () => ({ contents: 'export const LearningText = ({text}) => text; export const GoogleSubtitle = ({text}) => text;', loader: "js" }));
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "test" }));
    b.onLoad({ filter: /^link$/, namespace: "test" }, () => ({ contents: 'import React from "react"; export default function Link(props) { return React.createElement("a", props); }', loader: "js" }));
  } }] });
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://lab.local/ccna/sim?task=001", pretendToBeVisual: true });
  const { window } = dom;
  for (const [name, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node, Event: window.Event, MouseEvent: window.MouseEvent, KeyboardEvent: window.KeyboardEvent, localStorage: window.localStorage, navigator: window.navigator, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = await import("react"); const { act } = React;
  const { createRoot } = await import("react-dom/client");
  const { CiscoLearningTask, CiscoLearningOverview, CiscoLearningPath, learningTasks, learningStages, learningPack, taskMeasurement } = await import(pathToFileURL(outfile).href);
  const settle = async () => act(async () => { await new Promise(r => setTimeout(r, 4)); });
  async function mount(t, Component = CiscoLearningTask) {
    const container = window.document.createElement("div"); document.body.appendChild(container); const root = createRoot(container);
    await act(async () => root.render(React.createElement(Component, { task: t }))); await settle(); await settle();
    return { container, unmount: async () => { await act(async () => root.unmount()); container.remove(); } };
  }
  const credited = c => c.querySelectorAll(".ccna-simulation-stage.is-complete").length;
  async function run(c, blocks, pack) {
    for (const b of blocks) {
      const label = pack.devices.find(n => n.id === b.deviceId).label;
      const tab = [...c.querySelectorAll('button[role="tab"]')].find(n => n.textContent.trim().startsWith(label));
      assert.ok(tab, `${pack.id} missing ${label} tab`);
      await act(async () => tab.click());
      for (const command of b.commands) {
        const input = c.querySelector(".ccna-simulation-terminal-native-input"); assert.ok(input);
        await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, command); input.dispatchEvent(new window.Event("input", { bubbles: true })); });
        await act(async () => input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
      }
    }
    await settle();
  }
  // Complete all real state goals by typing the solution into the real React workspace.
  for (const t of learningTasks.filter(t => t.assessment === "live-state")) {
    const pack = learningPack(t), graded = pack.stages.filter(s => s.check).length;
    const f = await mount(t);
    assert.ok(credited(f.container) < graded, `${t.id}: UI starts fully solved`);
    await run(f.container, t.solution, pack);
    assert.equal(credited(f.container), graded, `${t.id}: solution did not tick all live goals in UI`);
    const history = JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner"));
    assert.ok(history.completed.includes(t.id), `${t.id}: completion callback did not persist`);
    assert.equal(taskMeasurement(t, history).percent, 100, `${t.id}: dashboard disagrees with live ticks`);
    await f.unmount();
    const restored = await mount(t);
    assert.equal(credited(restored.container), graded, `${t.id}: Resume lost state/ticks`);
    const fault = t.faults.find(f => f.commands.length);
    if (fault) {
      await run(restored.container, fault.commands, pack);
      assert.ok(credited(restored.container) < graded, `${t.id}: break did not remove live tick`);
      assert.ok(taskMeasurement(t, JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner"))).percent < 100, `${t.id}: broken state kept dashboard at 100%`);
      await run(restored.container, fault.repair, pack);
      assert.equal(credited(restored.container), graded, `${t.id}: repair did not restore ticks`);
    }
    await restored.unmount();
  }
  for (const t of learningTasks.filter(t => t.assessment.startsWith("guided"))) {
    const id = t.id, f = await mount(t);
    if (t.assessment === "guided-knowledge") assert.equal(f.container.querySelector(".ccna-simulation-terminal-screen"), null, "guided appliance/advanced case invented an executable console");
    const fields = [...f.container.querySelectorAll(".cisco-knowledge-check fieldset")]; assert.equal(fields.length, t.reviewQuestions.length);
    assert.ok(!JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner")).completed.includes(id));
    for (let i = 0; i < fields.length; i++) {
      const input = [...fields[i].querySelectorAll("input")].find(el => el.value === t.reviewQuestions[i].answerFa);
      await act(async () => input.click());
      assert.equal(taskMeasurement(t, JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner"))).passed, i + 1);
    }
    assert.ok(JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner")).completed.includes(id));
    const wrong = [...fields[0].querySelectorAll("input")].find(el => el.value !== t.reviewQuestions[0].answerFa);
    assert.ok(wrong, `${id}: no wrong answer option`);
    await act(async () => wrong.click());
    assert.ok(!JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner")).completed.includes(id), "wrong answer kept a knowledge completion tick");
    await f.unmount();
  }
  for (const t of learningTasks) {
    const f = await mount(t, CiscoLearningOverview);
    assert.equal(f.container.querySelector(".cisco-learning-primary").getAttribute("href"), `/ccna/sim?task=${t.id}`);
    assert.equal(f.container.querySelectorAll(".cisco-measurement-table tbody tr").length, taskMeasurement(t, JSON.parse(localStorage.getItem("cisco-learning:v1:ui-learner"))).total);
    await f.unmount();
  }
  const pathView = await mount(null, CiscoLearningPath);
  const stageButtons = [...pathView.container.querySelectorAll(".cisco-stage-nav button")];
  assert.equal(stageButtons.length, 13);
  for (let i = 0; i < stageButtons.length; i++) {
    await act(async () => stageButtons[i].click());
    const expected = learningTasks.filter(t => t.stageIds.includes(learningStages[i].id));
    assert.deepEqual([...pathView.container.querySelectorAll(".cisco-lesson-card")].map(el => el.getAttribute("href")), expected.map(t => `/ccna/learning/${t.id}`));
  }
  await pathView.unmount();
  assert.equal(localStorage.getItem("cisco-learning:v1:another-user"), null);
  console.log("Curriculum React/jsdom: 13 practical tasks, live progress/fault/repair; 35 guided lessons with graded answers; 48 lesson overviews; 13 stage navigations passed. Auth and translation are fixtures; this is not a real-browser test.");
} finally {
  // Exact task-owned temporary directory; never a repository or workspace root.
  rmSync(scratch, { recursive: true, force: true });
}
