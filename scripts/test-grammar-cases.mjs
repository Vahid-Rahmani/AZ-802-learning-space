import assert from "node:assert/strict";
import { grammarMissions, grammarFinal, grammarDiagnostic, grammarChapters } from "../lib/content/grammar-cases.ts";
import { createGrammarProgress, applyGrammarAction, grammarAnswers, grammarModel, grammarErrorExamples, assessGrammar, grammarSummary, missionUnlocked, finalUnlocked, parseGrammarProgress, GRAMMAR_DAY, eligibleSelfReview } from "../lib/grammar-case-engine.ts";

const NOW = Date.UTC(2026, 9, 23, 12);
let groups = 0;
function test(name, fn) { fn(); console.log(`PASS ${name}`); groups++; }
const act = (p, action, now = NOW) => applyGrammarAction(p, action, now);
function diagnostic() { let p = createGrammarProgress(); for (const q of grammarDiagnostic) p = act(p, { type: "diagnostic", id: q.id, choice: q.correct }); return p; }
function submit(p, id, phase, text, now = NOW) { p = act(p, { type: "draft", id, phase, text }, now); return act(p, { type: "submit", id, phase }, now); }
function complete(p, mission, now = NOW) { p = submit(p, mission.id, "main", grammarModel(mission.main), now); return submit(p, mission.id, "transfer", grammarModel(mission.transfer), now); }

test("24 missions, four chapters, 48 prompts, six unique held-out contexts", () => {
  assert.equal(grammarMissions.length, 24); assert.equal(grammarChapters.length, 4);
  for (const chapter of grammarChapters) assert.equal(grammarMissions.filter(m => m.chapter === chapter.id).length, 6);
  const prompts = [...grammarMissions.flatMap(m => [m.main, m.transfer]), ...grammarFinal];
  assert.equal(new Set(prompts.map(p => p.id)).size, 54);
  assert.equal(new Set(prompts.map(grammarModel)).size, 54);
  assert.equal(new Set(prompts.map(p => p.situation)).size, 54);
  for (const p of prompts) {
    assert.ok(p.situation.length > 12 && p.goal.length > 12 && p.cues.length > 5);
    for (const answer of grammarAnswers(p)) assert.equal(assessGrammar(p, answer).status, "verified", `${p.id}: ${answer}`);
    for (const error of grammarErrorExamples(p)) { assert.equal(assessGrammar(p, error.answer).status, "error"); assert.equal(assessGrammar(p, error.answer).code, error.code); }
  }
  assert.match(grammarAnswers(grammarMissions[16].main)[1], /^Das Zimmer wäre/);
});
test("fresh start has no solved tasks; diagnosis and sequence enforced", () => {
  const p = createGrammarProgress(); assert.equal(grammarSummary(p, NOW).completed, 0);
  assert.equal(missionUnlocked(p, "01"), false);
  assert.equal(act(p, { type: "start-final" }), p);
  assert.equal(submit(p, "01", "main", grammarModel(grammarMissions[0].main)), p);
  const d = diagnostic(); assert.equal(missionUnlocked(d, "01"), true); assert.equal(missionUnlocked(d, "02"), false);
  assert.equal(submit(d, "02", "main", grammarModel(grammarMissions[1].main)), d);
  assert.equal(submit(d, "01", "transfer", grammarModel(grammarMissions[0].transfer)), d);
});
test("initial diagnostic stores only the first choice and cannot be replayed", () => {
  let p = createGrammarProgress(); p = act(p, { type: "diagnostic", id: "perfekt", choice: 0 });
  assert.equal(act(p, { type: "diagnostic", id: "perfekt", choice: 1 }), p);
  assert.equal(act(p, { type: "diagnostic", id: "missing", choice: 0 }), p);
  assert.equal(act(p, { type: "diagnostic", id: "wenn", choice: 12 }), p);
  for (const q of grammarDiagnostic.slice(1)) p = act(p, { type: "diagnostic", id: q.id, choice: q.correct });
  assert.equal(p.diagnosticAt, NOW); assert.equal(p.diagnostic.perfekt, 0);
});
test("correct first response goes straight forward; variants, NFC, punctuation accepted", () => {
  let p = diagnostic(); const prompt = grammarMissions[0].main;
  p = submit(p, "01", "main", grammarAnswers(prompt)[1].normalize("NFD"));
  assert.equal(p.missions["01"].main.attempts.length, 1);
  assert.equal(grammarSummary(p, NOW).independent, 1);
  assert.equal(p.missions["01"].main.hints, 0);
  assert.equal(p.missions["01"].completedAt, null);
  p = submit(p, "01", "transfer", grammarModel(grammarMissions[0].transfer));
  assert.equal(p.missions["01"].completedAt, NOW); assert.equal(missionUnlocked(p, "02"), true);
  assert.equal(grammarSummary(p, NOW).transfer, 1); assert.equal(grammarSummary(p, NOW).delayed, 0);
  assert.equal(assessGrammar(prompt, grammarModel(prompt).replaceAll(",", "").replaceAll(".", "") + "  ").status, "verified");
});
test("supported error gives repair, first attempt stays failed, self-correction distinct", () => {
  let p = diagnostic(); const q = grammarMissions[0].main;
  p = submit(p, "01", "main", grammarErrorExamples(q)[0].answer);
  assert.equal(p.missions["01"].main.attempts[0].result.grammar, "needs-work");
  assert.equal(p.missions["01"].main.attempts[0].result.meaning, "unknown");
  p = submit(p, "01", "main", grammarModel(q));
  assert.equal(grammarSummary(p, NOW).independent, 0);
  assert.equal(grammarSummary(p, NOW).selfCorrected, 1);
  assert.equal(grammarSummary(p, NOW).assisted, 1);
});
test("hint and model provenance survives reload and cannot manufacture independence", () => {
  let p = diagnostic(); const q = grammarMissions[0].main;
  assert.equal(act(p, { type: "model", id: "01", phase: "main" }), p);
  p = act(p, { type: "hint", id: "01", phase: "main" });
  p = parseGrammarProgress(JSON.parse(JSON.stringify(p))); assert.equal(p.missions["01"].main.hints, 1);
  p = submit(p, "01", "main", grammarModel(q)); assert.equal(grammarSummary(p, NOW).independent, 0);
  let b = diagnostic(); for (let i = 0; i < 2; i++) b = submit(b, "01", "main", "Hallo Welt");
  b = act(b, { type: "model", id: "01", phase: "main" });
  b = parseGrammarProgress(JSON.parse(JSON.stringify(b)));
  assert.equal(b.missions["01"].main.modelSeen, true);
  b = submit(b, "01", "main", grammarModel(q)); assert.equal(grammarSummary(b, NOW).independent, 0); assert.equal(grammarSummary(b, NOW).selfCorrected, 0);
});
test("unknown answers are ungraded, unrelated/empty text never passes", () => {
  const q = grammarMissions[0].main;
  for (const text of ["Hallo Welt", "Wenn ich etwas früher losgefahren wäre, hätte ich den Zug noch erreicht.", "اگر زودتر میرفتم"]) {
    const result = assessGrammar(q, text); assert.equal(result.status, "uncertain"); assert.equal(result.meaning, "unknown"); assert.equal(result.grammar, "unknown");
    assert.equal(result.naturalness, "not-assessed");
  }
  assert.equal(assessGrammar(q, "  ").status, "empty");
  assert.equal(assessGrammar(q, "Wenn ich Zeit habe, komme ich.").meaning, "mismatch");
  assert.equal(submit(diagnostic(), "01", "main", "Hallo Welt").missions["01"].completedAt, null);
});
test("self-review is explicit story progression, never automatic language credit", () => {
  let p = diagnostic(); const text = "Wenn ich etwas früher losgefahren wäre, hätte ich den Zug noch erreicht.";
  assert.equal(eligibleSelfReview("Hallo Welt"), false);
  p = submit(p, "01", "main", text); p = submit(p, "01", "main", text);
  p = act(p, { type: "model", id: "01", phase: "main" });
  p = act(p, { type: "self-review", id: "01", phase: "main" });
  assert.equal(p.missions["01"].main.selfReviewed, true); assert.equal(grammarSummary(p, NOW).independent, 0);
  p = submit(p, "01", "transfer", grammarModel(grammarMissions[0].transfer));
  assert.equal(grammarSummary(p, NOW).completed, 1); assert.equal(grammarSummary(p, NOW).selfReviewed, 1);
  assert.equal(parseGrammarProgress(JSON.parse(JSON.stringify(p))).missions["01"].main.selfReviewed, true);
});
test("day-one gating, no same-day review farming, fresh review evidence", () => {
  let p = complete(diagnostic(), grammarMissions[0]);
  assert.equal(act(p, { type: "start-review", id: "01" }, NOW + GRAMMAR_DAY - 1), p);
  assert.deepEqual(grammarSummary(p, NOW).due, []); assert.deepEqual(grammarSummary(p, NOW + GRAMMAR_DAY).due, ["01"]);
  p = act(p, { type: "start-review", id: "01" }, NOW + GRAMMAR_DAY);
  assert.equal(p.missions["01"].review.modelSeen, false);
  p = submit(p, "01", "review", grammarModel(grammarMissions[0].transfer), NOW + GRAMMAR_DAY);
  assert.equal(grammarSummary(p, NOW + GRAMMAR_DAY).delayed, 1);
  assert.equal(p.missions["01"].dueAt, NOW + 4 * GRAMMAR_DAY);
  assert.equal(act(p, { type: "start-review", id: "01" }, NOW + GRAMMAR_DAY), p);
});
test("failed review is not verified; help shortens interval; old completion survives", () => {
  let p = complete(diagnostic(), grammarMissions[0]);
  p = act(p, { type: "start-review", id: "01" }, NOW + GRAMMAR_DAY);
  p = submit(p, "01", "review", "Hallo Welt", NOW + GRAMMAR_DAY);
  assert.equal(grammarSummary(p, NOW + GRAMMAR_DAY).delayed, 0); assert.equal(p.missions["01"].completedAt, NOW);
  p = submit(p, "01", "review", grammarModel(grammarMissions[0].transfer), NOW + GRAMMAR_DAY);
  assert.equal(grammarSummary(p, NOW + GRAMMAR_DAY).delayed, 0); assert.equal(p.missions["01"].dueAt, NOW + 2 * GRAMMAR_DAY);
});
test("the entire 24-mission path reaches final, six held-out answers first-attempt only", () => {
  let p = diagnostic(); for (const m of grammarMissions) { assert.equal(missionUnlocked(p, m.id), true); p = complete(p, m); }
  assert.equal(grammarSummary(p, NOW).completed, 24); assert.equal(grammarSummary(p, NOW).independent, 48);
  assert.equal(finalUnlocked(p), true);
  p = act(p, { type: "start-final" });
  p = act(p, { type: "final-draft", text: "Partially typed answer" });
  assert.equal(parseGrammarProgress(JSON.parse(JSON.stringify(p))).finalDraft, "Partially typed answer");
  for (const q of grammarFinal) {
    p = act(p, { type: "final-answer", id: q.id, text: grammarAnswers(q)[1] });
    assert.equal(act(p, { type: "final-answer", id: q.id, text: "overwrite" }), p);
  }
  assert.equal(p.finalFinishedAt, NOW); assert.equal(p.finalDraft, "");
  assert.equal(Object.values(p.final).filter(a => a.result.status === "verified").length, 6);
  assert.equal(act(p, { type: "start-final" }), p);
  assert.equal(parseGrammarProgress(JSON.parse(JSON.stringify(p))).finalFinishedAt, NOW);
});
test("safe parsing, grades recomputed, bounded input, immutable reducer", () => {
  assert.equal(parseGrammarProgress(null), null); assert.equal(parseGrammarProgress({ version: 4 }), null);
  assert.doesNotThrow(() => parseGrammarProgress({ version: 1, missions: { "01": { main: { attempts: [null, 42] } } } }));
  let p = diagnostic(); const before = JSON.stringify(p); p = act(p, { type: "draft", id: "01", phase: "main", text: "x".repeat(1000) });
  assert.equal(p.missions["01"].main.draft.length, 700); assert.notEqual(JSON.stringify(p), before);
  p = submit(p, "01", "main", "Unrelated answer"); const raw = structuredClone(p);
  raw.missions["01"].main.attempts[0].result.status = "verified";
  assert.equal(parseGrammarProgress(raw).missions["01"].main.attempts[0].result.status, "uncertain");
  const original = diagnostic(), originalCopy = JSON.stringify(original); complete(original, grammarMissions[0]); assert.equal(JSON.stringify(original), originalCopy);
});
test("more than 40 attempts never erases the original baseline", () => {
  let p = diagnostic(); for (let i = 0; i < 45; i++) p = submit(p, "01", "main", `Unknown response ${i}`);
  p = submit(p, "01", "main", grammarModel(grammarMissions[0].main));
  assert.equal(p.missions["01"].main.attempts.length, 40);
  assert.equal(p.missions["01"].main.attempts[0].answer, "Unknown response 0");
  assert.equal(grammarSummary(p, NOW).firstTry, 0);
});
console.log(`${groups} grammar-case contract groups passed.`);
