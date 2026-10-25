import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-german-a1b2-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({
    stdin: {
      contents: 'export { GermanGrammarCourse } from "./app/components/german-grammar-course.tsx"; export { grammarCurriculum, readyGrammarModules, grammarModuleSpecs } from "./lib/content/german-a1b2/curriculum.ts"; export { createCourseState, parseCourseState } from "./lib/content/german-a1b2/types.ts";',
      resolveDir: process.cwd(), loader: "tsx",
    },
    outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "lucide-react"], tsconfig: "tsconfig.json", logLevel: "warning",
    plugins: [{
      name: "next-fixtures",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
        buildApi.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
        buildApi.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents: args.path === "link"
            ? 'import React from "react"; export default function Link({ href, children, ...props }) { return React.createElement("a", { href, ...props }, children); }'
            : 'export const useRouter = () => ({ push(url) { globalThis.__germanNavigate?.(url); } }); export const usePathname = () => "/german/grammatik";',
          loader: "js",
        }));
      },
    }],
  });
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/german/grammatik", pretendToBeVisual: true });
  const { window } = dom;
  const requests = [];
  const fetchStub = async (url, init = {}) => {
    requests.push({ url: String(url), method: init.method ?? "GET", body: init.body });
    if (!String(url).includes("/api/german-course")) return new Response(JSON.stringify({}), { status: 401, headers: { "content-type": "application/json" } });
    if ((init.method ?? "GET") === "PUT") {
      const state = JSON.parse(String(init.body)).state;
      return new Response(JSON.stringify({ ok: true, state }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ state: null, stored: false }), { status: 200, headers: { "content-type": "application/json" } });
  };
  window.confirm = () => true;
  for (const [key, value] of Object.entries({
    window, document: window.document, HTMLElement: window.HTMLElement, HTMLTextAreaElement: window.HTMLTextAreaElement,
    HTMLInputElement: window.HTMLInputElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage,
    navigator: window.navigator, Event: window.Event, HTMLFormElement: window.HTMLFormElement,
    requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    fetch: fetchStub, Response, SpeechSynthesisUtterance: class {},
  })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GermanGrammarCourse, grammarCurriculum, readyGrammarModules, grammarModuleSpecs } = await import(pathToFileURL(outfile).href);
  const navigate = (path) => { globalThis.__germanNavigate = path; };
  const settle = (ms = 40) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
  const click = async (element) => { assert.ok(element, "requested control missing"); await act(async () => element.click()); await settle(); };
  const buttonWith = (container, text, selector = "button") => [...container.querySelectorAll(selector)].find((button) => button.textContent.includes(text));
  const tab = (container, label) => buttonWith(container, label, ".gg-tabs button");
  const optionButtons = (container) => [...container.querySelectorAll(".gg-options button")];
  const typeInto = async (container, selector, value) => {
    const field = container.querySelector(selector);
    assert.ok(field, `missing input ${selector}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(field, value);
      field.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await settle();
  };
  const submitForm = async (container) => {
    await act(async () => container.querySelector(".gg-typed-answer").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
    await settle();
  };

  assert.equal(grammarCurriculum.length, 20);
  assert.equal(readyGrammarModules.length, 20);
  assert.equal(grammarModuleSpecs.length, 20);

  const userId = "test-unified-a1b2";
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root = createRoot(container);
  await act(async () => root.render(createElement(GermanGrammarCourse, { userId, onNavigate: navigate })));
  await settle(100);

  assert.equal(container.querySelectorAll(".gg-modules > button").length, 20, "all twenty modules must render");
  assert.equal(container.querySelectorAll(".gg-modules > button:disabled").length, 0, "no module may be disabled after completion");
  assert.match(container.querySelector(".gg-hero h2").textContent, /Infinitiv mit zu/);
  assert.match(container.querySelector(".gg-module-note").textContent, /20 von 20/);
  assert.equal(container.querySelectorAll(".gg-tabs button").length, 5, "module 09 keeps writing and dictation tabs");
  const mobileSelect = container.querySelector(".gg-mobile-module select");
  assert.ok(mobileSelect, "the mobile module picker must render");
  assert.equal(mobileSelect.options.length, 20);
  assert.equal([...mobileSelect.options].filter((option) => option.disabled).length, 0);
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(mobileSelect, "wechselpraepositionen");
    mobileSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle();
  assert.match(container.querySelector(".gg-hero h2").textContent, /Wechselpräpositionen/, "the mobile select must switch modules");

  // B1 content now lives in the same map and uses the short feedback form.
  const dativButton = buttonWith(container, "Präpositionen mit Dativ", ".gg-modules > button");
  await click(dativButton);
  assert.match(container.querySelector(".gg-hero h2").textContent, /Präpositionen mit Dativ/);
  assert.equal(container.querySelectorAll(".gg-tabs button").length, 5, "every ready module must use the module-09 five-tab workspace");
  assert.ok(container.querySelectorAll(".gg-lesson-card").length >= 3, "the B1 module must own its complete lesson");
  await click(tab(container, "Üben"));
  assert.ok(container.querySelector(".gg-prompt"), "B1 practice did not render");
  assert.equal(container.querySelector(".gg-feedback"), null, "feedback must stay hidden before an answer");
  assert.equal(optionButtons(container).length, 4);
  const first = { answer: container.querySelector(".gg-prompt").textContent };
  assert.ok(first.answer.trim());

  const before = container.querySelector(".gg-side").textContent;
  assert.equal(optionButtons(container).length, 4);
  await click(optionButtons(container)[1]);
  let feedback = container.querySelector(".gg-feedback");
  assert.ok(feedback, "an answer must reveal feedback");
  assert.equal(container.querySelectorAll(".gg-options button.is-correct").length, 1, "the correct answer must stay green");
  assert.equal(container.querySelectorAll(".gg-options button.is-wrong").length <= 1, true, "at most the chosen answer is red");
  assert.match(feedback.textContent, /Kurz erklärt/);
  assert.doesNotMatch(feedback.textContent, /Grammatische Regel/, "B1 feedback must not repeat the whole module lesson");
  assert.match(feedback.textContent, /توضیح فارسی/);
  assert.equal(feedback.querySelectorAll("li").length, 0, "B1 feedback is short, not an essay");
  assert.match(globalThis.__germanNavigate, /\/german\/grammatik\/dativ$/, "module navigation must target the module's own page");
  await click(tab(container, "Schreiben"));
  assert.ok(container.querySelectorAll(".gg-writing-card").length >= 3, "B1 modules need their own writing workspace");
  await click(tab(container, "Diktat"));
  assert.ok(container.querySelectorAll(".gg-dictation-card").length >= 3, "B1 modules need their own dictation workspace");
  await click(tab(container, "Üben"));
  const countAfterAnswer = container.querySelector(".gg-side").textContent;
  assert.notEqual(countAfterAnswer, before);
  await click(optionButtons(container)[0]);
  assert.equal(container.querySelector(".gg-side").textContent, countAfterAnswer, "a second click must not score again");
  const correctIndex = optionButtons(container).findIndex((button) => button.classList.contains("is-correct"));
  assert.ok(correctIndex >= 0, "the correct option must be marked before reset");
  await click(buttonWith(container, "Antwort löschen"));
  assert.equal(container.querySelector(".gg-feedback"), null, "deleting an answer must hide feedback");
  await click(optionButtons(container)[correctIndex]);
  await settle(800);
  assert.ok(requests.some((request) => request.method === "PUT"), "the answer was not synced to the account endpoint");

  // Next question and previous question are real controls.
  const indexBefore = buttonWith(container, "Weiter").closest(".gg-question").querySelector(".gg-question-index").textContent;
  await click(buttonWith(container, "Weiter"));
  const indexAfter = container.querySelector(".gg-question-index").textContent;
  assert.notEqual(indexAfter, indexBefore, "next did not move to another question");
  await click(buttonWith(container, "Zurück"));
  assert.equal(container.querySelector(".gg-question-index").textContent, indexBefore, "previous did not return");

  // Typed sentence-building questions use a real input.
  let guards = 0;
  while (!container.querySelector("#gg-typed-input") && guards < 120) {
    await click(buttonWith(container, "Weiter"));
    guards += 1;
  }
  assert.ok(guards < 120, "no typed question was reachable");
  assert.equal(container.querySelector(".gg-feedback"), null, "typed feedback must stay hidden before submission");
  assert.equal(container.querySelector("#gg-typed-input").getAttribute("lang"), "de");
  assert.equal(container.querySelector("#gg-typed-input").getAttribute("dir"), "ltr");
  await typeInto(container, "#gg-typed-input", "falsche Antwort");
  await submitForm(container);
  feedback = container.querySelector(".gg-feedback");
  assert.ok(feedback, "typed submission did not reveal feedback");
  assert.match(feedback.textContent, /Lösung:/);
  assert.match(container.querySelector(".gg-typed-result").textContent, /Richtig ist:/);
  assert.equal(container.querySelector("#gg-typed-input").disabled, true);
  assert.ok(container.querySelector(".gg-typed-answer input.is-wrong"));

  // Results, review and filters.
  await click(tab(container, "Ergebnisse"));
  assert.equal(container.querySelectorAll(".gg-result-row").length, 100, "the results view must list all 100 B1 questions");
  assert.match(container.querySelector(".gg-result-metrics").textContent, /\/100/);
  await click(buttonWith(container, "Offen", ".gg-filters button"));
  assert.ok(container.querySelectorAll(".gg-result-row").length < 100, "the open filter must hide answered questions");
  await click(buttonWith(container, "Alle", ".gg-filters button"));
  await click(buttonWith(container, "Falsche üben", ".gg-result-actions button"));
  assert.ok(container.querySelector(".gg-review-banner"), "review mode did not start");
  await click(buttonWith(container, "Beenden", ".gg-review-banner button"));
  assert.equal(container.querySelector(".gg-review-banner"), null, "review mode did not stop");

  // Reset is scoped to the active module, not the course.
  const dativAnswerCount = container.querySelector(".gg-side").textContent;
  const moduleOne = buttonWith(container, "Wechselpräpositionen", ".gg-modules > button");
  await click(moduleOne);
  await click(tab(container, "Üben"));
  const choice = optionButtons(container)[0];
  await click(choice);
  await click(buttonWith(container, "Nur dieses Modul zurücksetzen"));
  await settle();
  assert.match(container.querySelector(".gg-hero h2").textContent, /Wechselpräpositionen/);
  await click(dativButton);
  await click(tab(container, "Üben"));
  assert.match(container.querySelector(".gg-side").textContent, /1/);
  assert.notEqual(container.querySelector(".gg-side").textContent, "", "the other module's progress must survive");
  assert.match(dativAnswerCount, /1/);

  // The newly completed modules use the same five-part workspace and own content.
  const genitivButton = buttonWith(container, "Präpositionen mit Genitiv", ".gg-modules > button");
  await click(genitivButton);
  assert.match(container.querySelector(".gg-hero h2").textContent, /Präpositionen mit Genitiv/);
  assert.equal(container.querySelectorAll(".gg-tabs button").length, 5, "the Genitiv module needs all five tabs");
  assert.equal(container.querySelectorAll(".gg-lesson-card").length, 5, "the Genitiv module needs its complete lesson");
  await click(tab(container, "Schreiben"));
  assert.equal(container.querySelectorAll(".gg-writing-card").length, 6, "the Genitiv module needs authored writing tasks");
  await click(tab(container, "Diktat"));
  assert.equal(container.querySelectorAll(".gg-dictation-card").length, 6, "the Genitiv module needs authored dictation");
  await click(tab(container, "Ergebnisse"));
  assert.equal(container.querySelectorAll(".gg-result-row").length, 100, "the Genitiv module needs 100 questions");

  // Module 09 keeps its 100 full explanations and writing/dictation content.
  await click(buttonWith(container, "Infinitiv mit zu", ".gg-modules > button"));
  await click(tab(container, "Üben"));
  await click(optionButtons(container)[0]);
  feedback = container.querySelector(".gg-feedback");
  assert.match(feedback.textContent, /Grammatische Regel/);
  assert.match(feedback.textContent, /Wortstellung/);
  assert.match(feedback.textContent, /Fehleranalyse/);
  assert.equal(feedback.querySelectorAll("li").length >= 2, true, "module 09 keeps two new examples");
  await click(tab(container, "Schreiben"));
  assert.equal(container.querySelectorAll(".gg-writing-card").length, 6);
  assert.equal(container.querySelector(".gg-model"), null);
  await click(buttonWith(container, "Musterlösung zeigen", ".gg-writing-actions button"));
  assert.ok(container.querySelector(".gg-model"));
  await click(tab(container, "Diktat"));
  assert.equal(container.querySelectorAll(".gg-dictation-card").length, 6);
  assert.ok(container.querySelector(".gg-audio-status"));

  // Reload restores the saved module and answer from localStorage.
  await act(async () => root.unmount());
  container.innerHTML = "";
  root = createRoot(container);
  await act(async () => root.render(createElement(GermanGrammarCourse, { userId, onNavigate: navigate })));
  await settle(100);
  assert.match(container.querySelector(".gg-hero h2").textContent, /Infinitiv mit zu/);
  await click(tab(container, "Üben"));
  assert.ok(container.querySelector(".gg-feedback"), "the answered question must be restored after remount");

  // The dashboard is a separate route view with one card per module and a
  // direct link to each ready module's own page.
  await act(async () => root.unmount());
  container.innerHTML = "";
  root = createRoot(container);
  await act(async () => root.render(createElement(GermanGrammarCourse, { userId, view: "dashboard", onNavigate: navigate })));
  await settle(100);
  assert.equal(container.querySelectorAll(".gg-dash-card").length, 20, "the dashboard must show all twenty modules");
  assert.equal(container.querySelectorAll("a.gg-dash-card").length, 20, "all ready modules link to their own page");
  assert.equal(container.querySelectorAll(".gg-dash-card.is-planned").length, 0, "no module may stay locked");
  assert.ok(container.querySelector(".gg-dash-score"), "the dashboard needs an overall score card");
  assert.equal(container.querySelectorAll(".gg-level-filter button").length, 5, "the dashboard needs level filters");
  assert.ok(container.querySelector('a.gg-dash-card[href="/german/grammatik/dativ"]'), "the dashboard card must link to the module page");
  assert.equal(container.querySelector(".gg-layout"), null, "the dashboard must not render the single-module workspace");

  const css = readFileSync("app/german/grammatik/grammatik.css", "utf8");
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.gg-course \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s, "the course track must not inherit min-content width");
  assert.match(css, /\.gg-modules \{ display: none; \}/, "mobile replaces the long module list with the select");
  assert.match(css, /@media \(max-width: 380px\) \{\s*\.gg-tabs \{ flex-wrap: wrap;/, "small phones wrap the tabs instead of hiding them");
  assert.match(css, /\.gg-typed-answer input[^}]*font-size: 16px/s, "mobile typed inputs must avoid iOS zoom");
  assert.match(css, /\.gg-mobile-module select[^}]*font-size: 16px/s, "the mobile module select must avoid iOS zoom");
  assert.match(css, /\.gg-feedback-head b \{ color: #6ee7a8/, "the solution must be green");
  assert.match(css, /\.gg-options button\.is-correct[^}]*#19a463/s);
  assert.match(css, /\.gg-options button\.is-wrong[^}]*#d9485f/s);

  await act(async () => root.unmount());
  container.remove();
  console.log("Unified German UI passed: 20 modules / 20 ready, B1 short feedback, red-green answers, typed sentence building, review, results filters, module-scoped reset, module 09 full explanations + writing + dictation, persistence, mobile CSS.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
