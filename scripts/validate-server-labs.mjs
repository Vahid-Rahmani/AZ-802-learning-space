import assert from "node:assert/strict";
import { serverLabs, labEmployees, labPermissionMatrix } from "../lib/content/server-labs.ts";
import { emptyServerLabState, gradeServerLab, parseServerLabState } from "../lib/server-lab-state.ts";

assert.equal(serverLabs.length, 7);
assert.equal(labEmployees.length, 8);
assert.equal(new Set(labEmployees.map((item) => item.login)).size, 8);
assert.equal(labEmployees.find((item) => item.login === "nina.wolf").group, "GG_Praktikanten");
assert.equal(labPermissionMatrix.length, 6);
assert.ok(labPermissionMatrix.every((row) => row.rights.length === 5));
const ids = new Set();
for (const lab of serverLabs) {
  assert.ok(!ids.has(lab.id)); ids.add(lab.id);
  assert.ok(lab.steps.length >= 4 && lab.tests.length >= 3 && lab.questions.length >= 2);
  assert.equal(new Set(lab.tests.map((test) => test.id)).size, lab.tests.length);
  for (const step of lab.steps) assert.ok(step.title && step.instruction && step.explain);
  for (const test of lab.tests) assert.ok(test.procedure && test.expected && test.points > 0);
  for (const q of lab.questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.correct >= 0 && q.correct <= 3 && q.explain.length > 40);
    assert.equal(new URL(q.source).hostname, "learn.microsoft.com");
  }
  const blank = emptyServerLabState();
  assert.equal(gradeServerLab(lab, blank).complete, false);
  assert.equal(gradeServerLab(lab, blank).practicalPercent, 0);
  assert.equal(gradeServerLab(lab, blank).quizPercent, null);
  assert.deepEqual(parseServerLabState(blank, lab), blank);
  const resumed = { ...blank, activeTab: "quiz", questionIndex: lab.questions.length - 1, answers: { [lab.questions[0].id]: 1 } };
  assert.deepEqual(parseServerLabState(resumed, lab), resumed);
  assert.equal(parseServerLabState({ ...blank, activeTab: "unknown" }, lab), null);
  assert.equal(parseServerLabState({ ...blank, questionIndex: lab.questions.length }, lab), null);
  assert.equal(parseServerLabState({ ...blank, answers: { [lab.questions[0].id]: 4 } }, lab), null);
  assert.equal(parseServerLabState({ ...blank, stepIds: ["999"] }, lab), null);
  assert.equal(parseServerLabState({ ...blank, answers: { stranger: 0 } }, lab), null);
  assert.equal(parseServerLabState({ ...blank, quizSubmitted: true }, lab), null);
  const complete = { ...blank, stepIds: lab.steps.map((_, i) => String(i)), results: Object.fromEntries(lab.tests.map((test) => [test.id, { outcome: "pass", note: "QA fixture: expected outcome recorded" }])), answers: Object.fromEntries(lab.questions.map((q) => [q.id, q.correct])), quizSubmitted: true, evidenceText: "QA fixture: final lab summary" };
  assert.equal(gradeServerLab(lab, complete).complete, true);
  assert.equal(gradeServerLab(lab, complete).quizPercent, 100);
  assert.equal(gradeServerLab(lab, { ...complete, results: {} }).complete, false);
  const shortNotes = { ...complete, results: Object.fromEntries(lab.tests.map((test) => [test.id, { outcome: "pass", note: "ok" }])) };
  assert.equal(gradeServerLab(lab, shortNotes).practicalPercent, 0);
  assert.equal(gradeServerLab(lab, { ...complete, evidenceText: "" }).complete, false);
  assert.equal(gradeServerLab(lab, { ...complete, answers: {} }).complete, false);
  // Supplied client scores cannot override server-derived outcomes.
  assert.equal(gradeServerLab(lab, parseServerLabState({ ...blank, score: 100, complete: true }, lab)).complete, false);
}
console.log(JSON.stringify({ status: "ok", labs: serverLabs.length, buildSteps: serverLabs.reduce((n, lab) => n + lab.steps.length, 0), practicalTests: serverLabs.reduce((n, lab) => n + lab.tests.length, 0), questions: serverLabs.reduce((n, lab) => n + lab.questions.length, 0), fictionalUsers: labEmployees.length, permissionCells: 30 }));
