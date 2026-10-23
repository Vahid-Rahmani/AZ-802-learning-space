import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-grammar-cases-ui-"));
const realNow = Date.now;
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { GrammarCasesWorkspace } from "./app/components/grammar-cases-workspace.tsx"; export { default as GrammarCasesPage } from "./app/german/grammar-cases/page.tsx"; export * from "./lib/grammar-case-engine.ts"; export * from "./lib/content/grammar-cases.ts";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, platform: "neutral", format: "esm", jsx: "automatic", target: "es2022", external: ["react", "react/*", ...Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies)], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle=({text})=>text; export const GoogleSubtitleProvider=({children})=>children; export const GoogleTranslateControl=()=>null;', loader: "js" }));
  } }] });
  const dom = new JSDOM('<html data-theme="fluent"><body></body></html>', { url: "http://localhost/german/grammar-cases", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLTextAreaElement: window.HTMLTextAreaElement, HTMLInputElement: window.HTMLInputElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let clock = Date.UTC(2026, 9, 23, 12); Date.now = () => clock;
  const { act, createElement: h } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const api = await import(pathToFileURL(outfile).href);
  const { GrammarCasesWorkspace, GrammarCasesPage, grammarMissions, grammarFinal, grammarDiagnostic, grammarModel, grammarErrorExamples, grammarSummary, createGrammarProgress, applyGrammarAction, GRAMMAR_DAY } = api;
  let container, root, user;
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
  async function mount(id = "grammar-ui") { user = id; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); await act(async () => root.render(h(GrammarCasesWorkspace, { userId: user }))); await settle(); }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  async function click(element) { assert.ok(element, "Missing control"); assert.ok(!element.disabled, `Disabled control: ${element.textContent}`); await act(async () => element.click()); await settle(); }
  const button = text => { const all = [...container.querySelectorAll("button")]; return all.find(b => b.textContent.trim() === text) ?? all.find(b => b.textContent.trim().startsWith(text)) ?? all.find(b => b.textContent.includes(text)); };
  async function type(selector, value) { const input = container.querySelector(selector); assert.ok(input, `Missing input ${selector}`); await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(input, value); input.dispatchEvent(new window.Event("input", { bubbles: true })); }); await settle(); }
  const saved = () => JSON.parse(localStorage.getItem(`klybit-grammar-cases:v1:${user}`));
  async function diagnose() { await click(button("شروع با ارزیابی کوتاه")); for (const [index, q] of grammarDiagnostic.entries()) await click(container.querySelectorAll("fieldset")[index].querySelectorAll("button")[q.correct]); await click(button("بازکردن فصل اول")); }
  const first = grammarMissions[0];
  localStorage.setItem("klybit-german:v1:grammar-ui", "preserve-lessons");
  localStorage.setItem("klybit-satztat:v1:grammar-ui", "preserve-network-game");
  await mount();
  assert.equal(container.querySelector(".gc-workspace").getAttribute("dir"), "rtl");
  assert.equal(container.querySelector(".gc-workspace").getAttribute("lang"), "fa");
  await click(button("Wenn ich Zeit habe, komme ich.")); assert.ok(container.textContent.includes("حال یا آینده"));
  await diagnose();
  assert.equal(container.querySelectorAll(".gc-chapter").length, 4); assert.equal(container.querySelectorAll(".gc-chapter li").length, 24);
  assert.equal(container.querySelectorAll(".gc-chapter li button:not(:disabled)").length, 1);
  await click(button(first.title));
  assert.equal(container.querySelector("#gc-answer").getAttribute("lang"), "de");
  assert.equal(container.querySelector("#gc-answer").getAttribute("dir"), "ltr");
  assert.equal(container.querySelector("#gc-answer").getAttribute("translate"), "no");
  assert.equal(container.querySelector("#gc-answer").tagName, "TEXTAREA");
  assert.equal(button("بررسی جمله").disabled, true);
  assert.ok(!container.textContent.includes(grammarModel(first.main)), "Model leaked before first answer");
  await type("#gc-answer", grammarModel(first.main)); await click(button("بررسی جمله"));
  assert.equal(grammarSummary(saved().progress, clock).independent, 1);
  assert.ok(button("حالا در موقعیتی تازه")); assert.equal(container.querySelectorAll(".gc-hint").length, 0);
  await click(button("حالا در موقعیتی تازه"));
  const error = grammarErrorExamples(first.transfer)[0].answer;
  await type("#gc-answer", error); await click(button("بررسی جمله"));
  assert.ok(container.textContent.includes("فرصت اصلاح")); assert.equal(saved().progress.missions["01"].completedAt, null);
  await type("#gc-answer", grammarModel(first.transfer)); await click(button("بررسی جمله"));
  assert.equal(grammarSummary(saved().progress, clock).selfCorrected, 1);
  assert.equal(grammarSummary(saved().progress, clock).completed, 1);
  await click(button("پروندهٔ بعد")); assert.ok(container.textContent.includes(grammarMissions[1].title));
  await click(button("کشف ساختار با راهنما"));
  await unmount(); await mount();
  assert.equal(saved().missionId, "02"); assert.equal(saved().progress.missions["02"].main.hints, 1);
  assert.ok(container.querySelector(".gc-hint"));
  await type("#gc-answer", "Hallo Welt"); await click(button("بررسی جمله"));
  await click(button("بررسی جمله")); await click(button("دیدن نمونه و توضیح"));
  assert.ok(container.textContent.includes(grammarModel(grammarMissions[1].main)));
  assert.ok(container.querySelectorAll(".gc-char-diff").length > 0);
  await unmount(); await mount(); assert.ok(container.querySelector(".gc-model"));
  await type("#gc-answer", grammarModel(grammarMissions[1].main)); await click(button("بررسی جمله"));
  assert.equal(saved().progress.missions["02"].main.attempts.at(-1).helped, true);
  await click(button("پروندهٔ خطاها")); assert.ok(container.querySelectorAll(".gc-error-card").length > 0);
  await click(button("شواهد پیشرفت")); assert.equal(container.querySelectorAll(".gc-metrics > div").length, 6);
  assert.equal(container.querySelectorAll("tbody tr").length, 6);
  await click(button("آزمون پایانی")); assert.ok(container.textContent.includes("هنوز باز نشده"));
  await click(button("شروع دوباره")); await click(button("انصراف")); assert.equal(grammarSummary(saved().progress, clock).completed, 1);
  assert.equal(localStorage.getItem("klybit-german:v1:grammar-ui"), "preserve-lessons");
  assert.equal(localStorage.getItem("klybit-satztat:v1:grammar-ui"), "preserve-network-game");
  await unmount();
  console.log("PASS diagnostic, 24-card map, native bilingual typing, first-try advancement, repair, model provenance, persisted resume, dossiers and evidence");

  await mount("grammar-independent"); await diagnose(); await click(button(first.title));
  await type("#gc-answer", "Wenn ich etwas früher losgefahren wäre, hätte ich den Zug noch erreicht.");
  await click(button("بررسی جمله")); await click(button("بررسی جمله")); await click(button("دیدن نمونه و توضیح"));
  assert.equal(button("ثبت خودبررسی و ادامهٔ داستان").disabled, true);
  for (const checkbox of container.querySelectorAll('.gc-self-review input[type="checkbox"]')) await click(checkbox);
  await click(button("ثبت خودبررسی و ادامهٔ داستان")); assert.equal(saved().progress.missions["01"].main.selfReviewed, true);
  assert.equal(grammarSummary(saved().progress, clock).independent, 0);
  await unmount(); console.log("PASS unknown valid-like answer can self-review without independent credit");

  let completed = createGrammarProgress(); for (const q of grammarDiagnostic) completed = applyGrammarAction(completed, { type: "diagnostic", id: q.id, choice: q.correct }, clock);
  for (const m of grammarMissions) for (const phase of ["main", "transfer"]) {
    completed = applyGrammarAction(completed, { type: "draft", id: m.id, phase, text: grammarModel(m[phase]) }, clock);
    completed = applyGrammarAction(completed, { type: "submit", id: m.id, phase }, clock);
  }
  localStorage.setItem("klybit-grammar-cases:v1:grammar-final", JSON.stringify({ progress: completed, view: "map", missionId: "24", phase: "transfer" }));
  await mount("grammar-final"); await click(button("آزمون پایانی")); await click(button("شروع آزمون انتقال"));
  for (const q of grammarFinal) assert.ok(!container.textContent.includes(grammarModel(q)), "Final model leaked");
  assert.ok(!button("یک سرنخ"));
  await type("#gc-final-answer", grammarModel(grammarFinal[0])); await unmount(); await mount("grammar-final");
  await click(button("آزمون پایانی")); assert.equal(container.querySelector("#gc-final-answer").value, grammarModel(grammarFinal[0]));
  for (const q of grammarFinal) { await type("#gc-final-answer", grammarModel(q)); await click(button("ثبت و سؤال بعدی")); }
  assert.ok(container.textContent.includes("۶ پاسخ")); assert.ok(container.textContent.includes(grammarModel(grammarFinal[0])));
  await unmount(); console.log("PASS final held-out questions hide answers until all submitted; final draft and baseline survive reload");

  clock += GRAMMAR_DAY;
  await mount("grammar-final");
  assert.equal(container.querySelectorAll(".gc-due button").length, 24);
  await click(button(`مرور ${first.title}`));
  assert.ok(!container.querySelector(".gc-model"));
  await type("#gc-answer", "Unknown answer"); await click(button("بررسی جمله"));
  assert.equal(grammarSummary(saved().progress, clock).delayed, 0);
  assert.equal(saved().progress.missions["01"].completedAt, completed.missions["01"].completedAt);
  await unmount(); console.log("PASS delayed review becomes due with real elapsed time; failures cannot claim mastery");

  await mount("grammar-empty-user"); assert.equal(saved().progress.diagnosticAt, null);
  await click(button("شروع دوباره")); await click(button("بله، فقط این بخش پاک شود")); assert.equal(grammarSummary(saved().progress, clock).completed, 0); await unmount();
  localStorage.setItem("klybit-grammar-cases:v1:corrupt", "{broken"); await mount("corrupt"); assert.ok(container.textContent.includes("قابل‌خواندن نبود")); await unmount();
  const get = window.Storage.prototype.getItem, set = window.Storage.prototype.setItem;
  window.Storage.prototype.getItem = () => { throw Error("blocked"); }; window.Storage.prototype.setItem = () => { throw Error("blocked"); };
  await mount("blocked"); await click(button("شروع با ارزیابی کوتاه")); assert.equal(container.querySelectorAll("fieldset").length, 4); assert.ok(container.textContent.includes("ذخیره")); await unmount();
  window.Storage.prototype.getItem = get; window.Storage.prototype.setItem = set;
  console.log("PASS per-account isolation, scoped reset, corrupt and blocked storage do not break practice");

  globalThis.fetch = async () => ({ ok: true, json: async () => ({ user: { id: "route-user" } }) });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(h(GrammarCasesPage))); await settle(); await settle();
  assert.equal(container.querySelectorAll("h1").length, 1); assert.ok(container.querySelector('a[href="/german/satztat"]')); assert.ok(container.querySelector(".gc-workspace"));
  await unmount();
  globalThis.fetch = async () => { throw Error("offline"); };
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(h(GrammarCasesPage))); await settle(); await settle();
  assert.ok(container.textContent.includes("ارتباط حساب برقرار نشد")); assert.ok(button("تلاش دوباره")); await unmount();
  console.log("PASS actual route auth success and network failure states; shared header not duplicated");
  const css = readFileSync("app/german/grammar-cases/grammar-cases.css", "utf8");
  assert.match(css, /@media \(max-width: 560px\)/); assert.match(css, /prefers-reduced-motion/); assert.match(css, /font-size: 16px/);
  assert.match(readFileSync("app/german/page.tsx", "utf8"), /href="\/german\/grammar-cases"/);
  console.log("Grammar-case UI DOM contracts passed. These are not real-browser geometry/native-keyboard tests.");
} finally { Date.now = realNow; rmSync(scratch, { recursive: true, force: true }); }
