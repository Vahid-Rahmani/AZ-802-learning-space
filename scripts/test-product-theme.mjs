import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const init = readFileSync("public/theme-init.js", "utf8");
for (const [stored, expected] of [[null, "fluent"], ["fluent", "fluent"], ["classic", "classic"], ["obsolete", "fluent"]]) {
  const document = { documentElement: { dataset: {} } };
  vm.runInNewContext(init, { document, localStorage: { getItem: () => stored } });
  assert.equal(document.documentElement.dataset.theme, expected);
}
const blockedDocument = { documentElement: { dataset: {} } };
vm.runInNewContext(init, { document: blockedDocument, localStorage: { getItem() { throw new Error("Blocked storage"); } } });
assert.equal(blockedDocument.documentElement.dataset.theme, "fluent");

const layout = readFileSync("app/layout.tsx", "utf8");
assert.ok(layout.indexOf('"./product-theme.css"') > layout.indexOf('"./learning-portal.css"'));
assert.ok(layout.includes('data-theme="fluent"'));
const css = readFileSync("app/product-theme.css", "utf8");
assert.ok(!css.includes("!important"), "Do not add specificity wars");
for (const selector of [".study-app", ".certpath-header", ".simple-navigation", ".learning-start", ".reading-panel", ".server-labs-workspace", ".ccna-dashboard-hero", ".cisco-learning-path", ".ccna-simulation-workspace", ".study-app.linux-app", ".german-intro", ".cicd-hero"]) assert.ok(css.includes(selector), `Missing shared course skin: ${selector}`);
for (const selector of [".ccna-simulation-terminal-screen", ".linux-terminal-screen", ".cicd-terminal-screen"]) assert.ok(css.includes(selector), `Missing dark terminal exception: ${selector}`);
assert.ok(!/german-(?:typed-overlay|input-shell|char-correct|char-incorrect)/.test(css), "Keep typing metrics and semantic feedback local");
assert.ok(!/[{;]\s*(?:height|grid-template-columns|position|transform)\s*:/.test(css), "Theme must not change functional layouts, terminal bounds or topology geometry");

const scratch = mkdtempSync(path.resolve(".tmp-product-theme-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { AppearanceProvider, ThemeControl } from "./app/components/appearance-provider.tsx"; export { LearningStart } from "./app/components/simple-learning.tsx";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, platform: "neutral", format: "esm", jsx: "automatic", target: "es2022", external: ["react", "react/*"], plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const GoogleSubtitle = ({text}) => text;", loader: "js" }));
  } }] });
  const dom = new JSDOM('<html data-theme="fluent"><body></body></html>', { url: "http://localhost/", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, localStorage: window.localStorage, navigator: window.navigator, HTMLElement: window.HTMLElement, Event: window.Event })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement: h } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AppearanceProvider, ThemeControl, LearningStart } = await import(pathToFileURL(outfile).href);
  localStorage.setItem("saved-practice", JSON.stringify({ question: 12, correct: 8 }));
  const untouchedProgress = localStorage.getItem("saved-practice");
  let container, root;
  async function mount() {
    container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(h(AppearanceProvider, null, h(ThemeControl))));
  }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  await mount();
  assert.equal(container.querySelector("select").value, "fluent");
  await act(async () => { const select = container.querySelector("select"); select.value = "classic"; select.dispatchEvent(new window.Event("change", { bubbles: true })); });
  assert.equal(document.documentElement.dataset.theme, "classic");
  assert.equal(localStorage.getItem("certpath-theme"), "classic");
  await unmount(); await mount();
  assert.equal(container.querySelector("select").value, "classic", "Keep an existing dark preference");
  await act(async () => { localStorage.setItem("certpath-theme", "fluent"); window.dispatchEvent(new window.StorageEvent("storage", { key: "certpath-theme", newValue: "fluent" })); });
  assert.equal(container.querySelector("select").value, "fluent");
  await act(async () => { localStorage.removeItem("certpath-theme"); window.dispatchEvent(new window.StorageEvent("storage", { key: "certpath-theme", newValue: null })); });
  assert.equal(document.documentElement.dataset.theme, "fluent");
  assert.equal(localStorage.getItem("saved-practice"), untouchedProgress);
  await unmount();

  let started = 0, destination = "";
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(h(LearningStart, { title: "AZ-900", lesson: "Cloud concepts", onStart: () => started++, progress: "3 of 10", metrics: [{ label: "Mastery", value: "30%", percent: 30 }], actions: [{ key: "exam", label: "Exam" }], onNavigate: key => { destination = key; } }, h("p", null, "Keep the existing lesson list"))));
  assert.equal(container.querySelector(".learning-start-heading h2").textContent, "AZ-900");
  assert.equal(container.querySelectorAll("h1").length, 0);
  assert.ok(container.querySelector(".learning-start-body").textContent.includes("Keep the existing lesson list"));
  assert.equal(container.querySelector("progress").value, 30);
  await act(async () => container.querySelector(".simple-primary").click());
  await act(async () => container.querySelector(".dashboard-shortcuts button").click());
  assert.equal(started, 1); assert.equal(destination, "exam");
  await unmount(); dom.window.close();
  console.log("PASS product theme: defaults, saved preferences, storage events, preserved progress, shared dashboard actions and all course skin contracts. DOM tests, not rendered visual QA.");
} finally { rmSync(scratch, { recursive: true, force: true }); }
