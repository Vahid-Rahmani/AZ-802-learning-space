import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

const scratch = mkdtempSync(path.resolve(".tmp-german-b1-redirect-"));
try {
  const outfile = path.join(scratch, "redirect.mjs");
  await build({
    stdin: {
      contents: 'export { B1GrammarRedirect } from "./app/german/b1-grammar/redirect-client.tsx";',
      resolveDir: process.cwd(), loader: "tsx",
    },
    outfile, bundle: true, format: "esm", platform: "neutral", target: "es2022", jsx: "automatic",
    external: ["react", "react/jsx-runtime"], tsconfig: "tsconfig.json", logLevel: "warning",
    plugins: [{
      name: "next-fixtures",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "navigation", namespace: "fixture" }));
        buildApi.onResolve({ filter: /^next\/link$/ }, () => ({ path: "link", namespace: "fixture" }));
        buildApi.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents: args.path === "link"
            ? 'import React from "react"; export default function Link({ href, children, ...props }) { return React.createElement("a", { href, ...props }, children); }'
            : 'export const useRouter = () => ({ replace(url) { globalThis.__replaceCalls.push(url); } });',
          loader: "js",
        }));
      },
    }],
  });

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/german/b1-grammar?from=old#top",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const [key, value] of Object.entries({
    window, document: window.document, HTMLElement: window.HTMLElement, Element: window.Element,
    Node: window.Node, Event: window.Event,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  })) Object.defineProperty(globalThis, key, { value, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.__replaceCalls = [];
  const { act, createElement } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { B1GrammarRedirect } = await import(pathToFileURL(outfile).href);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(B1GrammarRedirect)));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });

  assert.deepEqual(globalThis.__replaceCalls, ["/german/grammatik?from=old#top"], "the old B1 route must preserve the query/hash and redirect to the unified curriculum");
  assert.match(container.textContent, /Grammatik A1–B2/);
  assert.match(container.querySelector("a").getAttribute("href"), /^\/german\/grammatik/);
  assert.equal(container.querySelector(".app-sidebar"), null, "the redirect must not render a second sidebar");
  assert.equal(container.querySelector(".german-content"), null, "the redirect must not render a second course header");
  await act(async () => root.unmount());
  container.remove();

  const page = readFileSync("app/german/b1-grammar/page.tsx", "utf8");
  assert.match(page, /B1GrammarRedirect/);
  assert.doesNotMatch(page, /GermanWorkspace|StudyHeader|German for IT|12 Themen/);
  const redirect = readFileSync("app/german/b1-grammar/redirect-client.tsx", "utf8");
  assert.match(redirect, /router\.replace/);
  assert.match(redirect, /\/german\/grammatik/);
  const grammar = readFileSync("app/german/grammatik/page.tsx", "utf8");
  assert.match(grammar, /GermanGrammarShell/, "the grammar dashboard must use the shared shell");
  const grammarShell = readFileSync("app/components/german-grammar-shell.tsx", "utf8");
  assert.doesNotMatch(grammarShell, /\/german\/b1-grammar/, "the unified navigation must not link a second grammar section");
  assert.equal((grammarShell.match(/<StudyHeader/g) ?? []).length, 1, "the unified grammar shell must keep one header");
  assert.match(grammarShell, /view="?\{?view/, "the shell must pass the dashboard or module view through");
  const germanForIt = readFileSync("app/german/page.tsx", "utf8");
  assert.doesNotMatch(germanForIt, /href: "\/german\/b1-grammar"/, "German for IT must not advertise a second B1 grammar course");

  console.log("B1 route passed: old URL redirects with query/hash into Grammatik A1–B2, no second sidebar/header/quiz, and the unified navigation has one grammar entry.");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
