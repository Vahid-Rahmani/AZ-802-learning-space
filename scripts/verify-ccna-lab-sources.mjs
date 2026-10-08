/**
 * Fetches every source URL the CCNA section publishes and fails if one no longer answers.
 *
 * This is the live half of the source check. scripts/validate-ccna-labs.mjs proves offline that every
 * lab has an approved source; this proves the source is still there. It needs the network, so it is a
 * separate command rather than part of the offline validation.
 *
 * Run: node --experimental-strip-types scripts/verify-ccna-lab-sources.mjs [--verbose]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { ccnaLabs, ccnaSources } from "../lib/content/ccna.ts";
import { ccnaLabPath, ccnaLabSourcesChecked } from "../lib/content/ccna-lab-path.ts";

// Same in-memory compile the repository already uses for the JSON-backed question bank.
const bankSource = readFileSync(new URL("../lib/content/ccna-bank.ts", import.meta.url), "utf8")
  .replace('from "./ccna-bank-reviewed.json"', `from ${JSON.stringify(new URL("../lib/content/ccna-bank-reviewed.json", import.meta.url).href)} with { type: "json" }`)
  .replace('from "./ccna-local-bank.json"', `from ${JSON.stringify(new URL("../lib/content/ccna-local-bank.json", import.meta.url).href)} with { type: "json" }`)
  .replace('from "./ccna"', `from ${JSON.stringify(pathToFileURL(fileURLToPath(new URL("../lib/content/ccna.ts", import.meta.url))).href)}`);
const { ccnaBankQuestions } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(bankSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`);

/** url -> what points at it, so a failure names the labs that would break. */
const referencedBy = new Map();
const add = (url, reference) => {
  if (typeof url !== "string" || !url.startsWith("http")) return;
  if (!referencedBy.has(url)) referencedBy.set(url, new Set());
  referencedBy.get(url).add(reference);
};
for (const lab of ccnaLabPath) for (const source of lab.sourceRefs) add(source.url, lab.id);
for (const lab of ccnaLabs) for (const source of lab.sources) add(source.url, lab.id);
for (const [key, url] of Object.entries(ccnaSources)) add(url, `ccnaSources.${key}`);
for (const question of ccnaBankQuestions) add(question.source, `question ${question.id}`);

const verbose = process.argv.includes("--verbose");
const timeoutMs = 25_000;
const attempts = 3;
const concurrency = 6;
const urls = [...referencedBy.keys()];
assert.ok(urls.length >= 20, `refusing to report success on only ${urls.length} sources`);

const probe = async (url) => {
  let last = "no attempt";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; klybit-source-check)" } });
      clearTimeout(timer);
      // Drain the body so the connection is released rather than left half-read.
      await response.arrayBuffer().catch(() => undefined);
      if (response.status === 200) return { ok: true, status: response.status, finalUrl: response.url };
      last = `HTTP ${response.status}`;
      if (response.status < 500) break; // a 4xx will not fix itself on retry; a 5xx might
    } catch (error) {
      clearTimeout(timer);
      last = `${error.name}: ${error.message}`;
    }
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  return { ok: false, status: last };
};

const results = [];
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    const result = await probe(url);
    results.push({ url, ...result });
    if (!result.ok) console.error(`FAIL ${result.status}  ${url}\n     referenced by ${[...referencedBy.get(url)].join(", ")}`);
    else if (verbose) console.log(`ok   ${url}`);
  }
}));

const failed = results.filter((result) => !result.ok);
const hosts = [...new Set(urls.map((url) => new URL(url).host))].sort();
console.log(JSON.stringify({
  status: failed.length === 0 ? "ok" : "failed",
  checked: results.length,
  approvedHosts: hosts,
  ok: results.length - failed.length,
  failed: failed.length,
  hosts,
  sourcesAuditedOn: ccnaLabSourcesChecked,
  checkedOn: new Date().toISOString().slice(0, 10),
}));
assert.equal(failed.length, 0, `${failed.length} source URL(s) no longer answer; a lab source must not be published after it breaks`);
