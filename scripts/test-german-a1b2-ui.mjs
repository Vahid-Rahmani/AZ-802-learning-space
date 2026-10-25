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
      contents: 'export { GermanGrammarCourse } from "./app/components/german-grammar-course.tsx"; export { zuInfinitivQuestions, grammarModules } from "./lib/content/german-a1b2/index.ts"; export { emptyCourseState, parseCourseState } from "./lib/content/german-a1b2/types.ts";',
      resolveDir: process.cwd(), loader: "tsx",
    },
    outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "lucide-react"], tsconfig: "tsconfig.json", logLevel: "warning",
    plugins: [{
      name: "translation-fixture",
      setup(buildApi) {
        buildApi.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
        buildApi.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;", loader: "js" }));
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
  const { GermanGrammarCourse, zuInfinitivQuestions, grammarModules, emptyCourseState, parseCourseState } = await import(pathToFileURL(outfile).href);
  const settle = (ms = 30) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

  assert.equal(grammarModules.length, 20);
  assert.equal(zuInfinitivQuestions.length, 100);
  assert.equal(grammarModules.filter((module) => module.status === "ready").length, 1);

  const parsed = parseCourseState({ ...emptyCourseState("infinitiv-zu"), answers: { "zu-b-001": 0 }, difficult: ["zu-b-001"], writing: { w1: "Ich hoffe, zu lernen." }, dictation: { d1: "Test." }, updatedAt: 5 }, "infinitiv-zu", zuInfinitivQuestions.map((question) => question.id));
  assert.ok(parsed, "valid state was rejected");
  assert.equal(parsed.answers["zu-b-001"], 0);
  assert.equal(parseCourseState({ ...emptyCourseState("infinitiv-zu"), moduleId: "other" }, "infinitiv-zu", zuInfinitivQuestions.map((question) => question.id)), null);
  assert.equal(parseCourseState({ ...emptyCourseState("infinitiv-zu"), answers: { unknown: 0 } }, "infinitiv-zu", zuInfinitivQuestions.map((question) => question.id)), null);
  assert.equal(parseCourseState({ ...emptyCourseState("infinitiv-zu"), currentIndex: 100 }, "infinitiv-zu", zuInfinitivQuestions.map((question) => question.id)), null);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(GermanGrammarCourse, { userId: "test-a1b2" })));
  await settle(80);

  assert.equal(container.querySelectorAll(".gg-modules > button").length, 20, "all twenty module entries must render");
  assert.equal(container.querySelectorAll(".gg-modules > button:disabled").length, 19, "planned modules must stay disabled");
  assert.match(container.querySelector(".gg-hero h2").textContent, /Infinitiv mit zu/);
  assert.match(container.querySelector(".gg-module-note").textContent, /Nur Modul 09/);
  assert.match(readFileSync("app/german/grammatik/page.tsx", "utf8"), /1 von 20 Modulen/);

  const tab = (label) => [...container.querySelectorAll(".gg-tabs button")].find((button) => button.textContent.includes(label));
  await act(async () => tab("Üben").click());
  await settle();
  assert.ok(container.querySelector(".gg-prompt"), "practice question did not render");
  assert.equal(container.querySelector(".gg-feedback"), null, "feedback must stay hidden before an answer");
  assert.equal(container.querySelector(".gg-correct-answer"), null);
  assert.equal(container.querySelectorAll(".gg-options button").length, 4);

  const first = zuInfinitivQuestions[0];
  const wrong = (first.correctIndex + 1) % 4;
  const optionButtons = [...container.querySelectorAll(".gg-options button")];
  assert.equal(optionButtons[wrong].disabled, false);
  await act(async () => optionButtons[wrong].click());
  await settle();
  const feedback = container.querySelector(".gg-feedback");
  assert.ok(feedback, "wrong answer did not reveal feedback");
  assert.match(feedback.textContent, /Noch nicht/);
  assert.match(feedback.textContent, new RegExp(first.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(feedback.textContent, /Grammatische Regel/);
  assert.match(feedback.textContent, /Wortstellung/);
  assert.match(feedback.textContent, /توضیح فارسی/);
  assert.equal(feedback.querySelectorAll("li").length >= 2, true, "two examples must render");
  assert.equal(container.querySelectorAll(".gg-options button.is-wrong").length, 1);
  assert.equal(container.querySelectorAll(".gg-options button.is-correct").length, 1);
  const before = container.querySelector(".gg-side-stats").textContent;
  await act(async () => container.querySelectorAll(".gg-options button")[first.correctIndex].click());
  await settle();
  assert.equal(container.querySelector(".gg-side-stats").textContent, before, "a second answer must not change the count");

  await act(async () => [...container.querySelectorAll(".gg-question-actions button")].find((button) => button.textContent.includes("Antwort löschen")).click());
  await settle();
  assert.equal(container.querySelector(".gg-feedback"), null, "deleting an answer must hide feedback");
  const correctButton = container.querySelectorAll(".gg-options button")[first.correctIndex];
  await act(async () => correctButton.click());
  await settle();
  assert.match(container.querySelector(".gg-feedback").textContent, /Richtig/);
  await settle(800);
  assert.ok(requests.some((request) => request.method === "PUT"), "the answer was not synced to the account endpoint");

  await act(async () => [...container.querySelectorAll(".gg-question-actions button")].find((button) => button.textContent.includes("Schwierig")).click());
  await settle();
  assert.match(container.querySelector(".gg-side-card:nth-child(3)").textContent, /Markierte Fragen \(1\)/);

  await act(async () => tab("Ergebnisse").click());
  await settle();
  assert.equal(container.querySelectorAll(".gg-result-row").length, 100, "the results view must list all 100 questions");
  assert.match(container.querySelector(".gg-result-metrics").textContent, /1\/100/);
  await act(async () => [...container.querySelectorAll(".gg-filters button")].find((button) => button.textContent === "Offen").click());
  await settle();
  assert.equal(container.querySelectorAll(".gg-result-row").length, 99, "the open filter must hide answered questions");

  await act(async () => tab("Schreiben").click());
  await settle();
  assert.equal(container.querySelectorAll(".gg-writing-card").length, 6);
  assert.equal(container.querySelector(".gg-model"), null, "model answer must stay hidden");
  await act(async () => [...container.querySelectorAll(".gg-writing-actions button")][0].click());
  await settle();
  assert.ok(container.querySelector(".gg-model"), "model answer did not open");

  await act(async () => tab("Diktat").click());
  await settle();
  assert.equal(container.querySelectorAll(".gg-dictation-card").length, 6);
  assert.ok(container.querySelector(".gg-audio-status"));

  const css = readFileSync("app/german/grammatik/grammatik.css", "utf8");
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.gg-writing-card textarea[^}]*font-size: 16px/s);
  assert.match(css, /\.gg-question-actions \{ display: grid; grid-template-columns: 1fr 1fr; \}/);

  await act(async () => root.unmount());
  container.remove();
  console.log("German A1–B2 UI passed: 20-module map, 100-question flow, hidden feedback, green/red states, delete/re-answer, sync PUT, difficult marker, results filters, writing model, dictation, mobile CSS.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
