import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-german-b1-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({
    stdin: { contents: 'export { GermanWorkspace } from "./app/german/page.tsx"; export { b1GrammarQuestions, b1GrammarUnits } from "./lib/content/german-b1-grammar.ts"; export { b1GrammarLessons } from "./lib/content/german-b1-grammar.ts";', resolveDir: process.cwd(), loader: "tsx" },
    outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic",
    external: ["react", "react/jsx-runtime", "lucide-react"], tsconfig: "tsconfig.json", logLevel: "warning",
    plugins: [{ name: "translation-fixture", setup(b) {
      b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;', loader: "js" }));
    } }],
  });
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/german/b1-grammar", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLInputElement: window.HTMLInputElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, HTMLFormElement: window.HTMLFormElement, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { GermanWorkspace, b1GrammarQuestions, b1GrammarUnits, b1GrammarLessons } = await import(pathToFileURL(outfile).href);
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });

  assert.equal(b1GrammarUnits.length, 12, "B1 must keep twelve topics");
  assert.equal(b1GrammarLessons.length, 24, "B1 must keep both lessons for every topic");
  for (const unit of b1GrammarUnits) {
    const questions = b1GrammarQuestions.filter(question => question.unitId === unit.id);
    assert.equal(questions.length, 100, `${unit.id} must have 100 questions`);
    assert.deepEqual([...new Set(questions.map(question => question.format))].sort(), ["choice", "fill", "fix", "order"], `${unit.id} must use all four formats`);
  }

  const userId = "test-b1-ui";
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(GermanWorkspace, { userId, variant: "b1" })));
  await settle();

  assert.equal(container.querySelector(".german-intro"), null, "the duplicated B1 hero must not render");
  assert.equal(container.textContent.includes("GERMAN FOR IT"), false, "the B1 page must not reuse the German-for-IT hero");
  assert.equal(container.textContent.includes("German for IT"), false, "the B1 page must not link its content to German for IT");
  const title = container.querySelector("#b1-grammar-quiz-title");
  assert.ok(title, "the B1 quiz did not render");
  assert.match(title.textContent, /تمرین 1 از 50/, "the first B1 lesson must own 50 of the 100 topic questions");
  assert.equal(container.querySelector(".german-feedback"), null, "feedback must stay hidden before an answer");
  assert.equal(container.querySelector(".german-correct-answer"), null, "the answer must stay hidden before an answer");

  const firstUnit = b1GrammarUnits[0];
  const firstUnitLessons = b1GrammarLessons.filter(lesson => lesson.unitId === firstUnit.id);
  const firstUnitQuestions = b1GrammarQuestions.filter(question => question.unitId === firstUnit.id);
  const lessonQuestions = firstUnitQuestions.filter(question => question.lessonSlot === 0);
  assert.equal(lessonQuestions.length, 50, "each B1 lesson must show 50 distinct sentences");
  assert.equal(new Set(lessonQuestions.map(question => question.prompt)).size, 50, "a lesson must not repeat a sentence");
  assert.equal(firstUnitLessons.length, 2);

  const click = async element => { assert.ok(element, "requested control missing"); await act(async () => element.click()); await settle(); };
  const submitForm = async () => { await act(async () => container.querySelector("form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))); await settle(); };
  const typeInto = async (selector, value) => {
    const field = container.querySelector(selector);
    assert.ok(field, `missing input ${selector}`);
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(field, value);
      field.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await settle();
  };

  // A wrong choice must reveal the correct answer and the Persian explanation.
  const firstQuestion = lessonQuestions[0];
  assert.equal(firstQuestion.format, "choice");
  const optionButtons = [...container.querySelectorAll(".german-grammar-options button")];
  assert.equal(optionButtons.length, 4);
  await click(optionButtons[(firstQuestion.correctIndex + 1) % 4]);
  const feedback = container.querySelector(".german-feedback");
  assert.ok(feedback, "wrong choice did not show feedback");
  assert.match(feedback.textContent, /بررسی جواب/);
  assert.match(container.querySelector(".german-correct-answer").textContent, new RegExp(firstQuestion.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(firstQuestion.explanationFa.trim());
  await click(container.querySelector(".german-grammar-next"));

  // Walk correct answers until a typed format appears, exercising both UI paths.
  let position = 1;
  while (position < lessonQuestions.length && !container.querySelector("#b1-fill-answer")) {
    const question = lessonQuestions[position];
    if (question.format === "choice" || question.format === "fix") {
      const buttons = [...container.querySelectorAll(".german-grammar-options button")];
      await click(buttons[question.correctIndex]);
      await click(container.querySelector(".german-grammar-next"));
    } else {
      await typeInto("#b1-fill-answer", question.answer);
      await submitForm();
      await click(container.querySelector(".german-grammar-next"));
    }
    position++;
  }
  assert.ok(position < lessonQuestions.length, "no typed question was reachable in the first lesson");

  const typedQuestion = lessonQuestions[position];
  assert.equal(container.querySelector(".german-feedback"), null, "typed feedback must stay hidden before submission");
  assert.equal(container.querySelector(".german-correct-answer"), null, "typed answer must stay hidden before submission");
  await typeInto("#b1-fill-answer", "falsche Antwort");
  await submitForm();
  const typedFeedback = container.querySelector(".german-feedback");
  assert.ok(typedFeedback, "typed answer did not show feedback");
  assert.match(typedFeedback.textContent, /بررسی جواب/);
  assert.match(container.querySelector(".german-correct-answer").textContent, new RegExp(typedQuestion.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(container.querySelector("#b1-fill-answer").getAttribute("dir"), "ltr");
  assert.equal(container.querySelector("#b1-fill-answer").getAttribute("lang"), "de");

  // Test mode must not leak per-question feedback and must start a fresh 12-question set.
  await click(container.querySelector(".german-grammar-next"));
  const testButton = [...container.querySelectorAll("button")].find(button => button.textContent.includes("آزمون این درس"));
  await click(testButton);
  assert.match(container.querySelector("#b1-grammar-test-title").textContent, /سؤال 1 از 12/);
  assert.equal(container.querySelector(".german-feedback"), null, "test mode leaked feedback");
  await act(async () => root.unmount());
  container.remove();

  const pageSource = readFileSync("app/german/b1-grammar/page.tsx", "utf8");
  assert.equal(pageSource.includes("German for IT"), false, "the standalone route must not add a German-for-IT link");
  assert.equal((pageSource.match(/<StudyHeader/g) ?? []).length, 1, "the standalone route must render one header");
  const css = readFileSync("app/german/german.css", "utf8");
  assert.match(css, /\.german-fill-form input[^}]*font-size: 16px/s, "mobile inputs must stay at 16px to avoid iOS zoom");
  assert.match(css, /@media \(max-width: 700px\)/);
  console.log(`B1 UI passed: ${b1GrammarUnits.length} topics, 100 questions each (${b1GrammarQuestions.length} total), 50 per lesson, four formats, hidden answers, typed and choice feedback, no duplicate hero, standalone header, mobile input sizing.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
