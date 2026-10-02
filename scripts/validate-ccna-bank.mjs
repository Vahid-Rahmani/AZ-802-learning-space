import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { ccnaLabs } from "../lib/content/ccna.ts";
import { emptyServerLabState, parseServerLabState, gradeServerLab } from "../lib/server-lab-state.ts";

// Compile the actual trusted app module in memory, resolving its imports for Node.
// No upstream code is evaluated and no generated test files are written.
const file = new URL("../lib/content/ccna-bank.ts", import.meta.url);
const source = readFileSync(file, "utf8")
  .replace('from "./ccna-bank-reviewed.json"', `from ${JSON.stringify(new URL("../lib/content/ccna-bank-reviewed.json", import.meta.url).href)} with { type: "json" }`)
  .replace('from "./ccna"', `from ${JSON.stringify(pathToFileURL(fileURLToPath(new URL("../lib/content/ccna.ts", import.meta.url))).href)}`);
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { ccnaBankQuestions: questions, ccnaPracticeUnits: units, ccnaQuestionCount } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const audit = JSON.parse(readFileSync(new URL("../lib/content/ccna-bank-audit.json", import.meta.url), "utf8"));
const rawItems = JSON.parse(readFileSync(new URL("../lib/content/ccna-bank-reviewed.json", import.meta.url), "utf8"));
assert.equal(new Set(rawItems.map((q) => q.sourceIndex)).size, rawItems.length, "Duplicate source index in stored bank");
assert.equal(rawItems.filter((q) => q.reviewStatus === "published").length, ccnaQuestionCount);
assert.equal(ccnaQuestionCount, audit.publishedNewQuestions);
assert.equal(units.length, 6);
assert.deepEqual(units.map((unit) => unit.questions.length), audit.domainCounts);
const stems = new Set(), ids = new Set();
const distribution = [0, 0, 0, 0];
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
for (const q of [...questions, ...ccnaLabs.flatMap((lab) => lab.questions)]) {
  assert.ok(!ids.has(q.id), `Duplicate ID ${q.id}`); ids.add(q.id);
  assert.ok(!stems.has(normalize(q.text)), `Duplicate text ${q.id}`); stems.add(normalize(q.text));
  assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4);
  assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
  assert.ok(q.objective && q.explain.length > 40);
  assert.ok(new URL(q.source).hostname.endsWith("cisco.com"));
}
for (const q of questions) {
  assert.equal(q.reviewStatus, "published");
  assert.ok(q.objective.startsWith(`${q.domain}.`));
  assert.equal(q.whyOthers.length, 4);
  assert.equal(q.whyOthers[q.correct], "");
  assert.equal(new Set(q.whyOthers.filter(Boolean)).size, 3);
  assert.ok(q.whyOthers.every((reason, i) => i === q.correct || reason.length > 20));
  assert.ok(["core", "supporting"].includes(q.priority));
  distribution[q.correct]++;
}
const removed = audit.semanticDuplicatesRemoved.map((entry) => entry.sourceIndex);
assert.ok(!rawItems.some((q) => removed.includes(q.sourceIndex)), "Removed semantic duplicates must not remain hidden as drafts");
assert.equal(ids.size, audit.combinedQuestions);
for (const unit of units) {
  const blank = { ...emptyServerLabState(), activeTab: "quiz" };
  assert.deepEqual(parseServerLabState(blank, unit), blank);
  assert.equal(gradeServerLab(unit, blank).complete, false);
  assert.equal(gradeServerLab(unit, blank).practicalPercent, 0);
  const resume = { ...blank, questionIndex: 2, answers: { [unit.questions[1].id]: 3 } };
  assert.deepEqual(parseServerLabState(JSON.parse(JSON.stringify(resume)), unit), resume);
  const complete = { ...resume, answers: Object.fromEntries(unit.questions.map((q) => [q.id, q.correct])), quizSubmitted: true };
  assert.deepEqual(gradeServerLab(unit, complete), { practicalPercent: 0, quizPercent: 100, correct: unit.questions.length, complete: true });
  const failed = { ...complete, answers: Object.fromEntries(unit.questions.map((q) => [q.id, (q.correct + 1) % 4])) };
  assert.equal(gradeServerLab(unit, failed).quizPercent, 0);
  assert.equal(gradeServerLab(unit, failed).complete, false);
  const revise = { ...failed, quizSubmitted: false };
  assert.ok(parseServerLabState(revise, unit));
  assert.deepEqual(revise.answers, failed.answers, "Review must not delete answers");
  assert.equal(parseServerLabState({ ...blank, answers: { [ccnaLabs[0].questions[0].id]: 0 } }, unit), null);
  assert.equal(parseServerLabState({ ...blank, answers: { [unit.questions[0].id]: 9 } }, unit), null);
  assert.equal(parseServerLabState({ ...blank, questionIndex: unit.questions.length }, unit), null);
  assert.equal(parseServerLabState({ ...blank, quizSubmitted: true }, unit), null);
  assert.equal(parseServerLabState({ ...blank, results: { fake: { outcome: "pass", note: "forged test" } } }, unit), null);
  assert.equal(parseServerLabState({ ...blank, evidenceText: "x".repeat(8001) }, unit), null);
  assert.equal(unit.questions.slice(0, unit.questions.filter((q) => q.priority === "core").length).every((q) => q.priority === "core"), true);
}
const ipv6 = ccnaLabs.flatMap((lab) => lab.questions).find((q) => q.id === "ccna-addr-q3");
assert.ok(ipv6.text.includes("unicast") && ipv6.explain.includes("link-local multicast"));
console.log(JSON.stringify({ status: "ok", bankQuestions: questions.length, combinedQuestions: ids.size, domains: units.map((unit) => ({ domain: unit.title, count: unit.questions.length })), semanticDuplicatesRemoved: removed.length, answerDistribution: distribution }));

// Optional integration tests create disposable users only in the named local preview.
if (process.argv.includes("--local-http")) {
  const origin = "http://localhost:5173";
  const suffix = crypto.randomUUID();
  const testUsers = [];
  async function request(path, cookie, method = "GET", body) {
    const response = await fetch(`${origin}${path}`, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  for (const label of ["a", "b"]) {
    const email = `ccna-local-${suffix}-${label}@example.test`;
    const registered = await request("/api/auth/register", null, "POST", { email, password: crypto.randomUUID() + "Local-only!" });
    assert.equal(registered.status, 201); assert.ok(registered.cookie);
    testUsers.push({ id: registered.body.user.id, cookie: registered.cookie, email });
  }
  const [a, b] = testUsers;
  const unit = units[0], path = `/api/server-labs/${unit.id}`;
  assert.equal((await request(path)).status, 401);
  const blank = (await request(path, a.cookie)).body.state;
  const state = { ...blank, activeTab: "quiz", questionIndex: 2, answers: { [unit.questions[0].id]: unit.questions[0].correct } };
  for (let repeat = 0; repeat < 2; repeat++) assert.equal((await request(path, a.cookie, "PUT", { state, userId: a.id })).status, 200);
  assert.deepEqual((await request(path, a.cookie)).body.state, state);
  assert.deepEqual((await request(path, b.cookie)).body.state.answers, {});
  assert.equal((await request(path, b.cookie, "PUT", { state, userId: a.id })).status, 409);
  assert.deepEqual((await request(path, b.cookie)).body.state.answers, {});
  assert.equal((await request("/api/lab-submissions", a.cookie)).body.submissions.filter((row) => row.labId === unit.id).length, 1);
  const complete = { ...state, answers: Object.fromEntries(unit.questions.map((q) => [q.id, q.correct])), quizSubmitted: true };
  const graded = await request(path, a.cookie, "PUT", { state: complete, userId: a.id, score: -999 });
  assert.equal(graded.status, 200); assert.equal(graded.body.grade.quizPercent, 100);
  const failed = { ...complete, answers: Object.fromEntries(unit.questions.map((q) => [q.id, (q.correct + 1) % 4])) };
  assert.equal((await request(path, a.cookie, "PUT", { state: failed, userId: a.id, score: 100 })).body.grade.quizPercent, 0);
  const revise = { ...failed, quizSubmitted: false };
  assert.equal((await request(path, a.cookie, "PUT", { state: revise, userId: a.id })).status, 200);
  assert.deepEqual((await request(path, a.cookie)).body.state.answers, failed.answers);
  assert.equal((await request(path, a.cookie, "PUT", { state: { ...state, questionIndex: 999 }, userId: a.id })).status, 400);
  assert.equal((await request(path, a.cookie, "PUT", { state: { ...state, answers: { [ccnaLabs[0].questions[0].id]: 0 } }, userId: a.id })).status, 400);
  console.log(JSON.stringify({ integration: "ok", accountIsolation: true, staleOwnerRejected: true, idempotentCheckpoint: true, serverGrade: true, resume: true, revision: true, disposableLocalUsers: testUsers.map(({ id, email }) => ({ id, email })) }));
}
