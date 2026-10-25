/**
 * Validates the B1 drill bank used by /german/b1-grammar.
 *
 * Offline by design: it reads only committed content, so it runs in CI without
 * a browser. The public contract is 12 topics with exactly 100 questions each,
 * covering multiple-choice recognition and typed sentence building, ordered
 * from easy to hard. Each drill appears once as recognition and once as a
 * scrambled production task; no two questions share a prompt.
 *
 * Run: node --experimental-strip-types scripts/validate-german-b1-drills.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { germanB1DrillModules } from "../lib/content/german-b1-drills.ts";

/** The grammar module keeps its type import from german-learning, so Node cannot
 * load it directly without resolving an extensionless path. Transpile it in
 * memory and point its one runtime import at the drill module instead. */
const grammarFile = fileURLToPath(new URL("../lib/content/german-b1-grammar.ts", import.meta.url));
const drillFile = pathToFileURL(fileURLToPath(new URL("../lib/content/german-b1-drills.ts", import.meta.url))).href;
const grammarSource = readFileSync(grammarFile, "utf8").replace(/from "\.\/german-b1-drills(?:\.ts)?"/, `from ${JSON.stringify(drillFile)}`);
const grammarModule = `data:text/javascript;base64,${Buffer.from(ts.transpileModule(grammarSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString("base64")}`;
const { b1GrammarQuestions, b1GrammarUnits } = await import(grammarModule);

const expectedTitles = [
  "Präpositionen mit Dativ",
  "Präpositionen mit Akkusativ",
  "Wechselpräpositionen",
  "Dativ und Akkusativ",
  "Nebensätze",
  "Modalverben",
  "Verben mit Präpositionen",
  "Zeiten",
  "Relativsätze",
  "Adjektive und Deklination",
  "Passiv und Konjunktiv II",
  "Schreiben und Prüfung B1",
];

const FORMATS = ["choice", "fill", "order"];
const EXPECTED_FORMAT_COUNTS = { choice: 50, fill: 0, order: 50 };

assert.equal(germanB1DrillModules.length, 12, "the drill bank must cover all twelve B1 topics");
assert.deepEqual(germanB1DrillModules.map((topic) => topic.title), expectedTitles, "topic order or titles changed");
assert.deepEqual(germanB1DrillModules.map((topic) => topic.number), Array.from({ length: 12 }, (_, index) => index + 1), "topic numbers must be 1..12");

const seenModules = new Set();
const seenDrills = new Set();
for (const topic of germanB1DrillModules) {
  assert.ok(!seenModules.has(topic.id), `duplicate topic id: ${topic.id}`);
  seenModules.add(topic.id);
  assert.ok(topic.fa.trim(), `${topic.id}: missing Persian title`);
  assert.equal(topic.drills.length, 50, `${topic.id}: expected 50 authored drills`);
  assert.equal(`unit${topic.number + 12}`, b1GrammarUnits[topic.number - 1]?.id, `${topic.id}: unit mapping changed`);
  for (const drill of topic.drills) {
    assert.ok(!seenDrills.has(drill.id), `duplicate drill id: ${drill.id}`);
    seenDrills.add(drill.id);
    assert.equal((drill.prompt.match(/___/g) ?? []).length, 1, `${drill.id}: prompt must contain exactly one blank`);
    assert.ok(drill.translation.trim(), `${drill.id}: missing translation`);
    assert.ok(drill.why.trim(), `${drill.id}: missing explanation`);
    assert.equal(drill.options.length, 4, `${drill.id}: expected four options`);
    assert.equal(new Set(drill.options).size, 4, `${drill.id}: duplicate option text`);
    assert.ok(Number.isInteger(drill.correct) && drill.correct >= 0 && drill.correct < drill.options.length, `${drill.id}: answer index out of range`);
  }
}

const allDrillPrompts = germanB1DrillModules.flatMap((topic) => topic.drills.map((drill) => drill.prompt));
assert.equal(new Set(allDrillPrompts).size, allDrillPrompts.length, "drill prompts must be unique");

assert.equal(b1GrammarQuestions.length, 1200, `expected 1200 questions, found ${b1GrammarQuestions.length}`);
assert.equal(new Set(b1GrammarQuestions.map((question) => question.id)).size, b1GrammarQuestions.length, "question IDs must be unique");

const questionIds = new Set();
for (const topic of germanB1DrillModules) {
  const unitId = `unit${topic.number + 12}`;
  const unitQuestions = b1GrammarQuestions.filter((question) => question.unitId === unitId);
  assert.equal(unitQuestions.length, 100, `${unitId}: expected 100 questions, found ${unitQuestions.length}`);
  const formatCounts = Object.fromEntries(FORMATS.map((format) => [format, unitQuestions.filter((question) => question.format === format).length]));
  assert.deepEqual(formatCounts, EXPECTED_FORMAT_COUNTS, `${unitId}: format mix changed`);

  for (const slot of [0, 1]) {
    const slotQuestions = unitQuestions.filter((question) => question.lessonSlot === slot);
    assert.equal(slotQuestions.length, 50, `${unitId}: lesson slot ${slot} must have 50 questions`);
    assert.equal(new Set(slotQuestions.map((question) => question.prompt)).size, 50, `${unitId}: lesson slot ${slot} repeats a sentence`);
    assert.deepEqual([...new Set(slotQuestions.map((question) => question.format))].sort(), ["choice", "order"], `${unitId}: lesson slot ${slot} must pair recognition with production`);
  }

  let previousLevel = 0;
  for (const question of unitQuestions) {
    assert.ok(!questionIds.has(question.id), `duplicate question id: ${question.id}`);
    questionIds.add(question.id);
    assert.ok(question.lessonSlot === 0 || question.lessonSlot === 1, `${question.id}: invalid lesson slot`);
    assert.ok(question.format === "choice" || question.format === "fill" || question.format === "order", `${question.id}: unknown format`);
    assert.ok(question.level >= previousLevel, `${unitId}: difficulty must not drop at ${question.id}`);
    previousLevel = question.level;
    assert.ok(question.prompt.trim() && question.answer.trim(), `${question.id}: missing prompt or answer`);
    assert.ok(question.translationFa.trim() && question.explanationFa.trim(), `${question.id}: missing Persian feedback`);
    if (question.format === "fill" || question.format === "order") {
      assert.equal(question.options.length, 0, `${question.id}: typed questions must not carry options`);
      assert.equal(question.correctIndex, -1, `${question.id}: typed questions must not carry an option index`);
    } else {
      assert.equal(question.options.length, 4, `${question.id}: expected four options`);
      assert.equal(new Set(question.options).size, 4, `${question.id}: duplicate option text`);
      assert.equal(question.options[question.correctIndex], question.answer, `${question.id}: answer must be the selected option`);
    }
    if (question.format === "order") assert.notEqual(question.prompt.replaceAll(" · ", " "), question.answer, `${question.id}: the scrambled prompt must not already be in order`);
  }

  for (const drill of topic.drills) {
    const choice = b1GrammarQuestions.find((question) => question.id === `q-${topic.id}-c-${drill.id}`);
    const production = b1GrammarQuestions.find((question) => question.id === `q-${topic.id}-m-${drill.id}`);
    assert.ok(choice, `${drill.id}: missing recognition question`);
    assert.ok(production, `${drill.id}: missing production question`);
    assert.equal(choice.unitId, unitId, `${drill.id}: mapped to the wrong unit`);
    assert.equal(production.unitId, unitId, `${drill.id}: production mapped to the wrong unit`);
  }
}

// The example from the requested course outline must remain correct.
const lamp = b1GrammarQuestions.find((question) => question.prompt === "Ich stelle die Lampe ___ Tisch.");
assert.ok(lamp, "missing the lamp exercise");
assert.equal(lamp.options[lamp.correctIndex], "auf den", "the lamp exercise must grade the Wohin/Akkusativ answer");

console.log(`German B1 drill bank OK: ${germanB1DrillModules.length} topics, 100 questions each (${b1GrammarQuestions.length} total), recognition plus sentence-building production, keys, levels and unit mappings valid.`);
