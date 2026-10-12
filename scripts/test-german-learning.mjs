import assert from "node:assert/strict";
import { compareCharacters, compareTypedCharacters, isGermanAnswerCorrect, createGermanProgress, parseGermanProgress, updateGermanDraft, recordGermanAttempt, getGermanSummary } from "../lib/german-learning-engine.ts";

let checks = 0;
const test = (name, run) => { run(); checks++; console.log(`PASS ${name}`); };
const now = Date.UTC(2026, 9, 12, 12);
const ids = ["IT-001", "IT-002"];
const attempt = (progress, overrides = {}) => recordGermanAttempt(progress, ids[0], { mode: "recall", correct: true, now, ...overrides });

test("NFC equivalence while case, umlauts, sharp s and punctuation remain exact", () => {
  assert.ok(isGermanAnswerCorrect("Ändern", "A\u0308ndern"));
  for (const [target, input] of [["Passwort", "passwort"], ["für", "fur"], ["Straße", "Strasse"], ["Ja.", "Ja"]]) assert.equal(isGermanAnswerCorrect(target, input), false);
  assert.equal(compareCharacters("Ändern", "A\u0308ndern")[0].status, "correct");
});
test("pending text and substitution colors", () => {
  assert.deepEqual(compareCharacters("abc", "a"), [{ character: "a", status: "correct" }, { character: "b", status: "pending" }, { character: "c", status: "pending" }]);
  assert.deepEqual(compareTypedCharacters("abc", "axc").map((item) => item.status), ["correct", "incorrect", "correct"]);
});
test("one insertion or deletion does not color every remaining character red", () => {
  assert.deepEqual(compareTypedCharacters("abcd", "abXcd").map((item) => item.status), ["correct", "correct", "incorrect", "correct", "correct"]);
  assert.deepEqual(compareCharacters("abcd", "acd").map((item) => item.status), ["correct", "incorrect", "correct", "correct"]);
  assert.ok(compareTypedCharacters("abcd", "acd").every((item) => item.status === "correct"));
  assert.equal(compareTypedCharacters("abc", "abcd").at(-1).status, "incorrect");
  assert.equal(compareTypedCharacters("secret", "s").map((item) => item.character).join(""), "s", "recall leaks expected text");
});
test("fresh state has no independent success or writing mastery", () => {
  const initial = createGermanProgress(ids);
  assert.equal(getGermanSummary(initial, ids, now).independentRecallLessons, 0);
  assert.equal(getGermanSummary(initial, ids, now).newLessons, 2);
  assert.ok(parseGermanProgress(JSON.stringify(initial), ids));
});
test("copy, dictation and hinted recall never promote", () => {
  const initial = createGermanProgress(ids);
  for (const options of [{ mode: "copy" }, { mode: "dictation" }, { hintUsed: true }]) {
    const result = attempt(initial, options);
    assert.equal(result.lessons[ids[0]].box, 1);
    assert.equal(result.lessons[ids[0]].independentRecallCount, 0);
  }
  assert.equal(initial.lessons[ids[0]].counters.copy.attempted, 0, "input was mutated");
});
test("hint-free recall advances once only when due", () => {
  let state = attempt(createGermanProgress(ids));
  assert.equal(state.lessons[ids[0]].box, 2);
  assert.equal(state.lessons[ids[0]].dueAt, now + 3 * 86_400_000);
  state = attempt(state);
  assert.equal(state.lessons[ids[0]].box, 2);
  state = attempt(state, { now: now + 86_400_000 });
  assert.equal(state.lessons[ids[0]].box, 2, "early review advanced box");
  state = attempt(state, { now: now + 3 * 86_400_000 });
  assert.equal(state.lessons[ids[0]].box, 3);
});
test("typing mistakes alone cannot demote; submitted failed recall can", () => {
  let state = attempt(createGermanProgress(ids));
  state = updateGermanDraft(state, ids[0], "recall", "wrong draft");
  assert.equal(state.lessons[ids[0]].box, 2);
  state = attempt(state, { correct: false });
  assert.equal(state.lessons[ids[0]].box, 1);
  state = attempt(state);
  assert.equal(state.lessons[ids[0]].box, 1, "failed-then-pass farming on same day");
});
test("writing tracks reviews separately, never automatic correct or Leitner mastery", () => {
  const state = attempt(createGermanProgress(ids), { mode: "writing" });
  assert.equal(state.lessons[ids[0]].writingReviews, 1);
  assert.equal(state.lessons[ids[0]].counters.writing.correct, 0);
  assert.equal(state.lessons[ids[0]].box, 1);
  assert.equal(getGermanSummary(state, ids, now).independentRecallLessons, 0);
});
test("validated drafts resume and malformed saved state is rejected", () => {
  const state = updateGermanDraft(createGermanProgress(ids), ids[1], "dictation", "für");
  assert.deepEqual(parseGermanProgress(JSON.stringify(state), ids), state);
  for (const invalid of [null, "not json", {}, { version: 4, lessons: {} }, { ...state, lessons: { [ids[0]]: { ...state.lessons[ids[0]], box: 7 } } }, { ...state, lessons: { [ids[0]]: { ...state.lessons[ids[0]], dueAt: Infinity } } }, { ...state, lessons: { [ids[0]]: { ...state.lessons[ids[0]], counters: {} } } }]) assert.equal(parseGermanProgress(invalid, ids), null);
  const poisoned = JSON.parse('{"version":1,"lessons":{"__proto__":{"polluted":true}}}');
  assert.ok(parseGermanProgress(poisoned, ids));
  assert.equal({}.polluted, undefined);
  assert.equal(recordGermanAttempt(state, "missing", { mode: "recall", correct: true }), state);
});
console.log(`${checks} German learning engine test groups passed.`);
test("curriculum expansion retains old evidence and initializes added items unsolved", () => {
  const oldIds = Array.from({ length: 30 }, (_, i) => `lesson${String(i + 1).padStart(3, "0")}`);
  const expandedIds = Array.from({ length: 60 }, (_, i) => `lesson${String(i + 1).padStart(3, "0")}`);
  const old = recordGermanAttempt(createGermanProgress(oldIds), oldIds[2], { mode: "recall", correct: true, now });
  const restored = parseGermanProgress(old, expandedIds);
  assert.deepEqual(restored.lessons.lesson003, old.lessons.lesson003);
  assert.equal(Object.keys(restored.lessons).length, 60);
  assert.equal(getGermanSummary(restored, expandedIds, now).independentRecallLessons, 1);
  for (const id of expandedIds.slice(30)) {
    assert.equal(restored.lessons[id].independentRecallCount, 0);
    assert.equal(restored.lessons[id].dueAt, null);
  }
});
test("long free-writing drafts resume intact without making alignment input unbounded", () => {
  const text = "Wir dokumentieren die Ergebnisse sorgfältig. ".repeat(70);
  const written = updateGermanDraft(createGermanProgress(ids), ids[0], "writing", text);
  assert.equal(written.lessons[ids[0]].draft, text);
  assert.deepEqual(parseGermanProgress(written, ids), written);
  const bounded = updateGermanDraft(written, ids[0], "copy", text);
  assert.equal(bounded.lessons[ids[0]].draft.length, 1000);
  const maxWriting = updateGermanDraft(written, ids[0], "writing", "x".repeat(5000));
  assert.equal(maxWriting.lessons[ids[0]].draft.length, 4000);
  assert.ok(parseGermanProgress(maxWriting, ids));
});
console.log(`${checks} total German learning engine test groups passed.`);
