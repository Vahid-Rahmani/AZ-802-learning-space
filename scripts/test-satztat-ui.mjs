import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-satztat-ui-"));
const originalNow = Date.now;
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { SatztatWorkspace } from "./app/components/satztat-workspace.tsx"; export { default as SatztatPage } from "./app/german/satztat/page.tsx"; export * from "./lib/satztat-engine.ts";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, platform: "neutral", format: "esm", jsx: "automatic", target: "es2022", external: ["react", "react/*", ...Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies)], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle=({text})=>text; export const GoogleSubtitleProvider=({children})=>children; export const GoogleTranslateControl=()=>null;', loader: "js" }));
  } }] });
  const dom = new JSDOM('<html data-theme="fluent"><body></body></html>', { url: "http://localhost/german/satztat", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLTextAreaElement: window.HTMLTextAreaElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let clock = Date.UTC(2026, 9, 23, 12); Date.now = () => clock;
  const { act, createElement: h } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const api = await import(pathToFileURL(outfile).href);
  const { SatztatWorkspace, SatztatPage, satztatCases, getSatztatCaseResult, createSatztatProgress, applySatztatAction } = api;
  let container, root, user;
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
  async function mount(id = "satztat-test", props = {}) { user = id; container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); await act(async () => root.render(h(SatztatWorkspace, { userId: user, ...props }))); await settle(); }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  async function click(element) { assert.ok(element, "Missing control"); await act(async () => element.click()); await settle(); }
  const button = text => [...container.querySelectorAll("button")].find(item => item.textContent.trim() === text || item.textContent.trim().startsWith(text));
  async function type(selector, value) { const input = container.querySelector(selector); assert.ok(input, `Missing input ${selector}`); await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(input, value); input.dispatchEvent(new window.Event("input", { bubbles: true })); }); await settle(); }
  const saved = () => JSON.parse(localStorage.getItem(`klybit-satztat:v1:${user}`)).progress;
  async function begin() { await type("#st-hypothesis", "Check name resolution before changing the network."); await click(button("Open the investigation")); }
  const repair = (caseIndex, id) => button(satztatCases[caseIndex].repairs.find(item => item.id === id).label);
  async function solveFirst() { await begin(); await click(repair(0, "correct-record")); await click(repair(0, "refresh-cache")); await click(button("Run verification checks")); await click(button("Repair verified.")); }

  localStorage.setItem("klybit-german:v1:satztat-test", "preserved-existing-lessons");
  await mount();
  assert.equal(container.querySelectorAll("h1").length, 0);
  assert.equal(container.querySelectorAll(".st-case-nav button")[1].disabled, true);
  assert.ok(!container.textContent.includes(satztatCases[1].title));
  for (const item of satztatCases) assert.ok(!container.textContent.includes(item.target), "Answer leaked before reveal");
  await begin();
  await click(container.querySelector('[aria-label="Inspect FILE1"]'));
  assert.ok(container.querySelector(".st-inline-result").textContent.includes("TcpTestSucceeded: True"));
  await click(button("Run verification checks")); assert.equal(getSatztatCaseResult(saved(), "dns-record").technicalResolved, false);
  const firstRevision = saved().cases["dns-record"].network.revision;
  await click(repair(0, "correct-client-dns")); assert.equal(saved().cases["dns-record"].network.revision, firstRevision);
  await click(repair(0, "correct-record")); await click(button("Run verification checks"));
  assert.equal(getSatztatCaseResult(saved(), "dns-record").technicalResolved, false, "Stale client cache must remain a failure");
  await click(repair(0, "refresh-cache")); await click(button("Run verification checks"));
  assert.equal(getSatztatCaseResult(saved(), "dns-record").technicalResolved, true);
  assert.equal(getSatztatCaseResult(saved(), "dns-record").languageVerified, false);
  await click(button("Repair verified."));
  assert.equal(container.querySelector("#st-report").getAttribute("lang"), "de");
  assert.equal(container.querySelector("#st-report").getAttribute("translate"), "no");
  assert.equal(button("Check my report").disabled, true);
  await type("#st-report", satztatCases[0].supportedErrors[0].answer);
  assert.equal(container.querySelectorAll(".st-letter-error").length, 0, "No pre-submit answer oracle");
  await click(button("Check my report")); assert.ok(container.textContent.includes("AUX-01"));
  assert.ok(container.textContent.includes("FIRST SUBMISSION ALREADY RECORDED"));
  assert.ok(container.querySelectorAll(".st-letter-error").length > 0);
  await click(button("Show model")); assert.ok(container.querySelector(".st-model"));
  const exposure = saved().cases["dns-record"].languageAssistance;
  await unmount(); await mount(); assert.ok(container.querySelector(".st-model")); assert.equal(saved().cases["dns-record"].languageAssistance, exposure);
  await type("#st-report", satztatCases[0].variants[0]); await click(button("Check my report"));
  assert.equal(getSatztatCaseResult(saved(), "dns-record").storyCompleted, true);
  assert.equal(getSatztatCaseResult(saved(), "dns-record").independentLanguage, false);
  await click(button("Open the next incident")); await begin();
  await click(repair(1, "correct-record")); await click(repair(1, "refresh-cache")); await click(button("Run verification checks"));
  assert.equal(getSatztatCaseResult(saved(), "dns-client").technicalResolved, false, "Previous incident repair is not sufficient");
  await click(repair(1, "correct-client-dns")); await click(repair(1, "refresh-cache")); await click(button("Run verification checks")); await click(button("Repair verified."));
  await type("#st-report", satztatCases[1].variants[0]);
  await act(async () => container.querySelector("#st-report").dispatchEvent(new window.CompositionEvent("compositionstart", { bubbles: true })));
  await click(button("Check my report")); assert.equal(saved().cases["dns-client"].submissionCount, 0, "IME must not submit an unfinished composition");
  await act(async () => container.querySelector("#st-report").dispatchEvent(new window.CompositionEvent("compositionend", { bubbles: true })));
  await click(button("Check my report")); assert.equal(getSatztatCaseResult(saved(), "dns-client").transferVerified, true);
  assert.equal(localStorage.getItem("klybit-german:v1:satztat-test"), "preserved-existing-lessons");
  await unmount();

  // Due recall must conceal study answers and must not reuse the old green verdict.
  clock += 86_400_000 + 1000;
  await mount(); await click(container.querySelector(".st-case-nav button")); await click(button("Start due recall"));
  assert.equal(container.querySelector(".st-model"), null);
  assert.ok(!container.textContent.includes(satztatCases[0].target));
  await type("#st-report", "Eine andere Aussage ohne geprüfte Form."); await click(button("Check delayed recall"));
  assert.ok(container.querySelector(".st-report-feedback strong").textContent.includes("did not earn independent"));
  assert.ok(!container.querySelector(".st-report-feedback").classList.contains("st-report-feedback--verified"));
  assert.equal(container.querySelector(".st-model"), null, "Old model must not silently reappear after recall");
  assert.equal(getSatztatCaseResult(saved(), "dns-record").storyCompleted, true, "Historical completion remains distinct from failed later recall");
  await unmount();

  await mount("unknown-report"); await solveFirst();
  await type("#st-report", "Hallo"); await click(button("Check my report")); await click(button("Show model"));
  for (const checkbox of container.querySelectorAll('.st-self-review input[type="checkbox"]')) await click(checkbox);
  assert.equal(button("Record self-review").disabled, true, "Obvious junk cannot close a case");
  await type("#st-report", "Wenn wir den DNS-Eintrag früher überprüft hätten, wäre der Dateiserver auch über seinen Namen erreichbar gewesen.");
  await click(button("Check my report"));
  assert.equal(saved().cases["dns-record"].reportResult, "not-assessed");
  for (const checkbox of container.querySelectorAll('.st-self-review input[type="checkbox"]')) await click(checkbox);
  await click(button("Record self-review"));
  assert.equal(getSatztatCaseResult(saved(), "dns-record").storyCompleted, true);
  assert.equal(getSatztatCaseResult(saved(), "dns-record").languageVerified, false);
  await click(button("Reset game")); await click(button("Cancel")); assert.equal(getSatztatCaseResult(saved(), "dns-record").storyCompleted, true);
  await click(button("Reset game")); await click(button("Yes, reset game only")); assert.equal(saved().cases["dns-record"].network.revision, 0);
  await unmount();

  await mount("other-user"); assert.equal(container.querySelectorAll(".st-case-nav button")[1].disabled, true); await unmount();
  localStorage.setItem("klybit-satztat:v1:corrupt", "{broken"); await mount("corrupt"); assert.ok(container.querySelector("#st-hypothesis")); await unmount();
  await mount("translated", { translationLanguage: "fa" }); await type("#st-hypothesis", "A hypothesis"); assert.ok(saved().cases["dns-record"].languageAssistance > 0); await unmount();
  const originalGet = window.Storage.prototype.getItem, originalSet = window.Storage.prototype.setItem;
  window.Storage.prototype.getItem = () => { throw Error("blocked"); }; window.Storage.prototype.setItem = () => { throw Error("blocked"); };
  await mount("blocked"); await begin(); assert.ok(container.textContent.includes("Could not save")); await unmount();
  window.Storage.prototype.getItem = originalGet; window.Storage.prototype.setItem = originalSet;

  globalThis.fetch = async () => ({ ok: true, json: async () => ({ user: { id: "route-user" } }) });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(h(SatztatPage))); await settle(); await settle();
  assert.equal(container.querySelectorAll("h1").length, 1);
  assert.ok(container.querySelector('a[href="/german"]'));
  assert.ok(container.querySelector(".st-workspace")); await unmount();

  const css = readFileSync("app/german/satztat/satztat.css", "utf8");
  assert.ok(css.includes("@media(max-width:640px)")); assert.ok(css.includes("font-size: max(16px, 1em)"));
  assert.ok(css.includes("max-height: 290px")); assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(readFileSync("app/german/page.tsx", "utf8").includes('href="/german/satztat"'));
  console.log("PASS SatzTat UI: both cases through real React controls, distinct faults, fresh checks, supported errors/variants, no answer oracle, durable exposure, transfer, failed recall verdict, neutral unknown/self-review guards, IME, reload, isolation, scoped reset, blocked storage, translation assistance and authenticated route fixture. CSS contracts only; no rendered-browser/native-phone claim.");
  dom.window.close();
} finally { Date.now = originalNow; rmSync(scratch, { recursive: true, force: true }); }
