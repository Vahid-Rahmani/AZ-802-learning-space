import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-german-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { GermanWorkspace } from "./app/german/page.tsx"; export { germanLessons, germanUnits } from "./lib/content/german-learning.ts";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic", external: ["react", "react/jsx-runtime", "lucide-react"], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;', loader: "js" }));
  } }] });
  const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/german", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLInputElement: window.HTMLInputElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GermanWorkspace, germanLessons, germanUnits } = await import(pathToFileURL(outfile).href);
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  let container, root, user;
  async function mount(id = "test-german") {
    user = id; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(createElement(GermanWorkspace, { userId: user }))); await settle();
  }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  const input = () => container.querySelector("#german-answer");
  const saved = () => JSON.parse(localStorage.getItem(`klybit-german:v1:${user}`));
  const state = id => saved().progress.lessons[id ?? germanLessons[0].id];
  async function type(value) { await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(input(), value); input().dispatchEvent(new window.Event("input", { bubbles: true })); }); await settle(); }
  async function click(element) { assert.ok(element, "requested control missing"); await act(async () => element.click()); await settle(); }
  const button = text => [...container.querySelectorAll("button")].find(element => element.textContent.trim() === text);
  async function mode(name) { await click(container.querySelector(`#german-tab-${name}`)); }
  async function submit() { await act(async () => container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))); await settle(); }
  const correct = germanLessons[0].model;
  assert.equal(germanLessons.length, 30); assert.equal(germanUnits.length, 6);
  assert.equal(new Set(germanLessons.map(lesson => lesson.id)).size, 30);
  for (const unit of germanUnits) assert.equal(germanLessons.filter(lesson => lesson.unitId === unit.id).length, 5);

  await mount();
  assert.equal(container.querySelector("progress").value, 0);
  assert.equal(state().box, 1);
  assert.equal(input().getAttribute("autocapitalize"), "none");
  assert.equal(input().getAttribute("inputmode"), "text");
  assert.equal(input().getAttribute("spellcheck"), "false");
  assert.equal(input().closest("[translate]").getAttribute("translate"), "no");
  assert.equal(input().closest("[lang]").getAttribute("lang"), "de");
  await type("Xch");
  assert.ok(container.querySelector(".german-typed-overlay .german-char-incorrect"), "wrong typed letter is not marked");
  await type("Ich");
  assert.equal(container.querySelectorAll(".german-typed-overlay .german-char-incorrect").length, 0, "corrected letter remained red");
  assert.equal(container.querySelectorAll(".german-typed-overlay .german-char-correct").length, 3);
  await type(correct); await submit();
  assert.equal(state().counters.copy.correct, 1);
  assert.equal(state().independentRecallCount, 0, "copy forged independent success");
  assert.equal(container.querySelector("progress").value, 0);

  await mode("recall");
  assert.equal(input().value, "");
  assert.equal(container.querySelector(".german-model"), null);
  await type("Xch");
  assert.equal(container.querySelectorAll(".german-typed-overlay .german-char-correct,.german-typed-overlay .german-char-incorrect").length, 0, "recall typing leaked answer oracle before submit");
  assert.equal(container.querySelector(".german-typed-overlay").textContent, "Xch", "hidden model leaked characters");
  await type(correct); await submit();
  assert.equal(state().box, 2);
  assert.equal(state().independentRecallCount, 1);
  assert.equal(container.querySelector("progress").value, 1);
  await submit(); assert.equal(state().box, 2, "same-day repeat advanced a second box");

  await mode("dictation");
  assert.equal(container.querySelector(".german-audio button").disabled, true, "no-voice device should have an explicit fallback");
  assert.match(container.querySelector(".german-audio").textContent, /No German voice/);
  await mode("writing"); await type("Ich brauche Hilfe. Können Sie bitte meinen Zugang prüfen?");
  assert.equal(container.querySelector(".german-typed-overlay"), null, "free writing was compared to a fixed model");
  assert.equal(container.querySelector("button[type=submit]").disabled, true);
  for (const checkbox of container.querySelectorAll(".german-writing-checklist input")) await click(checkbox);
  await submit();
  assert.equal(state().writingReviews, 1);
  assert.equal(state().counters.writing.correct, 0);
  assert.match(container.querySelector(".german-feedback").textContent, /not automatic grammar grading/);

  await mode("copy"); await type("ab"); input().setSelectionRange(1, 1); await click(button("ä"));
  assert.equal(input().value, "aäb", "umlaut was not inserted at cursor");
  assert.equal(input().selectionStart, 2);
  await unmount(); await mount();
  assert.equal(input().value, "aäb", "saved draft did not resume");
  assert.equal(state().writingReviews, 1);
  await unmount();

  // An assisted draft must remain assisted after reload; seeing a solution is not recall.
  await mount("test-german-hint"); await mode("recall"); await click(button("Show model · assisted")); await type(correct);
  await unmount(); await mount("test-german-hint");
  assert.equal(input().value, correct);
  await submit();
  assert.equal(state().independentRecallCount, 0, "reloading assisted draft fabricated independent recall");
  assert.equal(state().box, 1);
  await unmount();

  // Opening explanation in Model and switching to Recall must not leave a visible unflagged hint.
  await mount("test-german-explanation");
  const explanation = container.querySelector(".german-explanation");
  await act(async () => { explanation.open = true; explanation.dispatchEvent(new window.Event("toggle")); }); await settle();
  await mode("recall"); await type(correct); await submit();
  assert.ok(!container.querySelector(".german-explanation").open || state().independentRecallCount === 0, "open explanation was counted as independent recall");
  await unmount();

  // Composition input is a real mobile keyboard path; unfinished IME text cannot submit.
  await mount("test-german-ime"); await mode("recall"); await type(correct);
  await act(async () => input().dispatchEvent(new window.CompositionEvent("compositionstart", { bubbles: true, data: "" })));
  await submit();
  assert.equal(state().counters.recall.attempted, 0, "unfinished IME composition submitted an answer");
  await act(async () => input().dispatchEvent(new window.CompositionEvent("compositionend", { bubbles: true, data: correct })));
  await submit(); assert.equal(state().independentRecallCount, 1); await unmount();

  await mount("test-german");
  window.confirm = () => true;
  await click(button("Reset German practice"));
  assert.equal(container.querySelector("progress").value, 0); assert.equal(input().value, ""); assert.equal(state().writingReviews, 0);
  assert.equal(localStorage.getItem("klybit-german:v1:test-german-hint") !== null, true, "reset crossed account boundary");
  await unmount(); await mount("other-german"); assert.equal(container.querySelector("progress").value, 0); await unmount();
  localStorage.setItem("klybit-german:v1:corrupt-german", "invalid JSON");
  await mount("corrupt-german"); assert.equal(container.querySelector("progress").value, 0); assert.match(container.querySelector(".german-toolbar").textContent, /unavailable|invalid/i); await unmount();

  const css = readFileSync("app/german/german.css", "utf8");
  assert.match(css, /german-input-shell textarea,\.german-typed-overlay[^}]*font-size: 16px/s);
  assert.match(css, /@media \(max-width: 700px\)/);
  console.log("German React UI passed: 30 lessons / 6 units; immediate letter correction; copy vs independent recall; neutral hidden-answer recall; no-voice fallback; honest writing self-review; cursor umlauts; draft resume; hint integrity on reload; explanation integrity across modes; IME submission guard; reset / account isolation / corrupt save; mobile textarea attributes. Auth and translation are fixtures; browser geometry and native keyboard require browser/device checks.");
} finally { rmSync(scratch, { recursive: true, force: true }); }
