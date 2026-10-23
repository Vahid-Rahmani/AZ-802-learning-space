import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-portal-ui-"));
try {
  const outfile = path.join(scratch, "ui.mjs");
  await build({ stdin: { contents: 'export { LearningPortal, portalCourses } from "./app/components/learning-portal.tsx"; export { default as Home } from "./app/page.tsx"; export { questions, trainingStages, lessons } from "./lib/course-data.ts";', resolveDir: process.cwd(), loader: "tsx" }, outfile, bundle: true, format: "esm", platform: "neutral", jsx: "automatic", target: "es2022", external: ["react", "react/*", "react-dom", ...Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies)], tsconfig: "tsconfig.json", logLevel: "warning", plugins: [{ name: "translation-fixture", setup(b) {
    b.onResolve({ filter: /google-translate$/ }, () => ({ path: "translation", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const GoogleSubtitle = ({text}) => text; export const GoogleSubtitleProvider = ({children}) => children; export const GoogleTranslateControl = () => null;', loader: "js" }));
  } }] });
  const dom = new JSDOM("<html data-theme='classic'><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const { window } = dom;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, HTMLInputElement: window.HTMLInputElement, Element: window.Element, Node: window.Node, localStorage: window.localStorage, navigator: window.navigator, Event: window.Event, requestAnimationFrame: window.requestAnimationFrame.bind(window), cancelAnimationFrame: window.cancelAnimationFrame.bind(window) })) Object.defineProperty(globalThis, key, { value, configurable: true });
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { LearningPortal, portalCourses, Home, questions, trainingStages, lessons } = await import(pathToFileURL(outfile).href);
  let container, root;
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  async function mount(component, props = {}) { container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); await act(async () => root.render(createElement(component, props))); await settle(); }
  async function unmount() { await act(async () => root.unmount()); container.remove(); }
  async function click(element) { assert.ok(element, "control not found"); await act(async () => element.click()); await settle(); }
  const button = text => [...container.querySelectorAll("button")].find(element => element.textContent.trim() === text);
  async function type(value) { await act(async () => { const input = container.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(input, value); input.dispatchEvent(new window.Event("input", { bubbles: true })); }); await settle(); }

  let signedIn = 0, opened = 0, practised = 0;
  await mount(LearningPortal, { questionCount: questions.length, onSignIn: () => signedIn++, onWindowsServer: () => opened++, onPractice: () => practised++ });
  assert.equal(container.querySelectorAll("h1").length, 1);
  assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.length);
  assert.ok(container.textContent.includes(`${questions.length.toLocaleString("en-US")} practice questions`));
  assert.equal(container.querySelectorAll(".portal-course-card h3").length, portalCourses.length);
  assert.equal(new Set(portalCourses.map(course => course.id)).size, portalCourses.length);
  for (const course of portalCourses) {
    assert.ok(existsSync(path.resolve(`app${course.href === "/" ? "" : course.href}/page.tsx`)), `missing route ${course.href}`);
    const action = container.querySelector(`[data-course="${course.id}"] .portal-card-footer :is(a,button)`);
    assert.ok(action.getAttribute("aria-label").includes(course.code));
    if (course.id !== "az802") assert.equal(action.getAttribute("href"), course.href);
  }
  for (const link of container.querySelectorAll('a[href^="#"]')) assert.ok(document.getElementById(link.getAttribute("href").slice(1)), "broken section anchor");
  await click(button("Sign in")); assert.equal(signedIn, 1);
  await click(button("Start practising")); assert.equal(practised, 1); assert.equal(opened, 0);
  await click(container.querySelector('[data-course="az802"] button')); assert.equal(opened, 1);
  await click(button("Microsoft")); assert.equal(container.querySelectorAll(".portal-course-card").length, 2);
  await type("aZ-900"); assert.equal(container.querySelectorAll(".portal-course-card").length, 1);
  assert.equal(container.querySelector(".portal-course-card").dataset.course, "az900");
  await type("not a real course"); assert.equal(container.querySelectorAll(".portal-course-card").length, 0); assert.ok(container.querySelector(".portal-empty"));
  await click(button("Show all paths")); assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.length); assert.equal(container.querySelector("input").value, "");
  await click(button("Hands-on")); assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.filter(course => course.category === "Hands-on").length);
  await unmount();

  const calls = [];
  const progress = { learning: 47, answered: 10, correct: 8, lesson: "Restore a domain controller", stages: [{ id: "identity", title: "Identity", percent: 80 }], onLesson: () => calls.push("lesson"), onStage: id => calls.push(id), onPractice: () => calls.push("practice"), onExams: () => calls.push("exams"), onReview: () => calls.push("review") };
  await mount(LearningPortal, { questionCount: questions.length, onWindowsServer: () => calls.push("course"), progress });
  assert.equal(container.querySelectorAll("h1").length, 0, "dashboard duplicates the shell h1");
  assert.equal(container.querySelector('.portal-next-lesson progress').value, 47);
  assert.match(container.querySelector(".portal-statistics").textContent, /10.*80%/);
  assert.equal(container.querySelector(".portal-navigation"), null, "duplicate app header");
  await click(button("Continue learning")); await click(button("Question practice")); await click(button("Timed assessments")); await click(button("Review saved questions")); await click(container.querySelector(".portal-stage-details button"));
  assert.deepEqual(calls, ["lesson", "practice", "exams", "review", "identity"]);
  await unmount();

  let identity = null;
  const requests = [];
  globalThis.fetch = async (url, options = {}) => { requests.push({ url, ...options }); return { ok: true, status: 200, json: async () => url === "/api/auth/me" ? { user: identity ? { id: identity } : null } : {} }; };
  await mount(Home);
  assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.length, "anonymous visitor hit an auth wall");
  assert.equal(container.querySelector('[role="dialog"]'), null);
  await click(button("Sign in")); assert.ok(container.querySelector('[role="dialog"] form'));
  await click(container.querySelector('button[aria-label="Close"]')); assert.equal(container.querySelector('[role="dialog"]'), null);
  await click(button("Start practising")); assert.ok(container.querySelector('[role="dialog"]'));
  await act(async () => container.querySelector('[role="dialog"] input').dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.equal(requests.filter(request => request.method && request.method !== "GET").length, 0, "browsing the public catalogue mutated data");
  await unmount();

  window.history.replaceState({}, "", "/?google_error=state");
  await mount(Home); assert.ok(container.querySelector('[role="dialog"]'), "OAuth errors lost their sign-in panel"); await unmount();
  window.history.replaceState({}, "", "/?reset_token=local-test-only");
  await mount(Home); assert.ok(container.querySelector('[role="dialog"] input'), "password recovery no longer opens"); await unmount();
  window.history.replaceState({}, "", "/");

  identity = "portal-ui-test";
  localStorage.setItem(`wincraft-progress:${identity}`, JSON.stringify({ translationVersion: 2, translationLanguage: "", totalProgress: 47, selectedLessonId: lessons[0].id, answerStats: { correct: 8, total: 10 }, domainStats: { [trainingStages[0].domain]: { correct: 8, total: 10 } } }));
  requests.length = 0;
  await mount(Home);
  assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.length, "session hydration should retain the landing catalogue");
  await click(button("My dashboard"));
  assert.equal(container.querySelector('.portal-next-lesson progress').value, 47, "existing progress was not restored");
  assert.equal(container.querySelectorAll("h1").length, 1);
  assert.ok(container.querySelector(".app-sidebar .simple-navigation"), "existing menus were removed");
  const writes = requests.filter(request => request.url === "/api/progress" && request.method === "PUT");
  assert.ok(writes.length); assert.ok(writes.every(request => JSON.parse(request.body).completionPercent === 47), "empty initial state overwrote saved progress");
  await click(button("Continue learning")); assert.equal(container.querySelector(".klybit-portal"), null); assert.match(container.querySelector("h1").textContent, /Learning/);
  await click(button("Home"));
  assert.equal(container.querySelectorAll(".portal-course-card").length, portalCourses.length);
  await click(button("My dashboard")); assert.ok(container.querySelector(".portal-progress"));
  await click(button("Question practice")); assert.ok(container.querySelector(".quiz-workspace"), "practice CTA not connected to the real quiz");
  assert.equal(JSON.parse(localStorage.getItem(`wincraft-progress:${identity}`)).totalProgress, 47);
  await unmount();

  const css = readFileSync("app/learning-portal.css", "utf8");
  assert.match(css, /max-width: 700px/); assert.match(css, /grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /prefers-reduced-motion/); assert.doesNotMatch(css, /!important/);
  console.log(`PASS: public catalogue, ${portalCourses.length} existing routes, real question count, search/filter/reset, dashboard actions, auth close/Escape/OAuth/recovery, preserved progress and real practice navigation. Responsive CSS contract checked; this is not a rendered-browser layout test.`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
