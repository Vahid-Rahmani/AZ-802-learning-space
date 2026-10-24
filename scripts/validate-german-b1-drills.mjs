/**
 * Validates the B1 drill bank used by /german/b1-grammar.
 *
 * Offline by design: it reads only committed content, so it runs in CI without
 * a browser. It refuses to pass a bank with a missing topic, a broken answer
 * key, a duplicate question ID, or a drill mapped to the wrong B1 unit.
 *
 * Run: node --experimental-strip-types scripts/validate-german-b1-drills.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { germanB1DrillModules, germanB1DrillTotal } from "../lib/content/german-b1-drills.ts";

/** The grammar module keeps its type import from german-learning, so Node cannot
 * load it directly without resolving an extensionless path. Transpile it in
 * memory and point its one runtime import at the drill module instead. */
const grammarFile = fileURLToPath(new URL("../lib/content/german-b1-grammar.ts", import.meta.url));
const drillFile = pathToFileURL(fileURLToPath(new URL("../lib/content/german-b1-drills.ts", import.meta.url))).href;
const grammarSource = readFileSync(grammarFile, "utf8").replace("from \"./german-b1-drills\"", `from ${JSON.stringify(drillFile)}`);
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

assert.equal(germanB1DrillModules.length, 12, "the drill bank must cover all twelve B1 topics");
assert.deepEqual(germanB1DrillModules.map((topic) => topic.title), expectedTitles, "topic order or titles changed");
assert.deepEqual(germanB1DrillModules.map((topic) => topic.number), Array.from({ length: 12 }, (_, index) => index + 1), "topic numbers must be 1..12");

const seenModules = new Set();
const seenDrills = new Set();
for (const topic of germanB1DrillModules) {
  assert.ok(!seenModules.has(topic.id), `duplicate topic id: ${topic.id}`);
  seenModules.add(topic.id);
  assert.ok(topic.fa.trim(), `${topic.id}: missing Persian title`);
  assert.ok(topic.drills.length >= 6, `${topic.id}: expected at least six drills`);
  assert.equal(`unit${topic.number + 12}`, b1GrammarUnits[topic.number - 1]?.id, `${topic.id}: unit mapping changed`);
  for (const drill of topic.drills) {
    assert.ok(!seenDrills.has(drill.id), `duplicate drill id: ${drill.id}`);
    seenDrills.add(drill.id);
    assert.ok(drill.prompt.includes("___"), `${drill.id}: prompt must contain a blank`);
    assert.ok(drill.translation.trim(), `${drill.id}: missing translation`);
    assert.ok(drill.why.trim(), `${drill.id}: missing explanation`);
    assert.equal(drill.options.length, 4, `${drill.id}: expected four options`);
    assert.equal(new Set(drill.options).size, 4, `${drill.id}: duplicate option text`);
    assert.ok(Number.isInteger(drill.correct) && drill.correct >= 0 && drill.correct < drill.options.length, `${drill.id}: answer index out of range`);
  }
}

assert.equal(germanB1DrillTotal, 96, `expected 96 drills, found ${germanB1DrillTotal}`);
const corePrompts = new Set(b1GrammarQuestions.slice(0, 12).map((question) => question.prompt));
const allDrillPrompts = germanB1DrillModules.flatMap((topic) => topic.drills.map((drill) => drill.prompt));
assert.equal(new Set(allDrillPrompts).size, allDrillPrompts.length, "drill prompts must be unique");
const expectedQuestionCount = 12 + [...new Set(allDrillPrompts)].filter((prompt) => !corePrompts.has(prompt)).length;
assert.equal(b1GrammarQuestions.length, expectedQuestionCount, "the course question list must be the core bank plus every distinct drill");
assert.equal(new Set(b1GrammarQuestions.map((question) => question.prompt)).size, b1GrammarQuestions.length, "course prompts must not repeat");

const questionIds = new Set();
for (const question of b1GrammarQuestions) {
  assert.ok(!questionIds.has(question.id), `duplicate question id: ${question.id}`);
  questionIds.add(question.id);
  assert.equal(question.options.length, 4, `${question.id}: expected four options`);
  assert.equal(new Set(question.options).size, 4, `${question.id}: duplicate option text`);
  assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length, `${question.id}: answer index out of range`);
  assert.ok(question.translationFa.trim() && question.explanationFa.trim(), `${question.id}: missing Persian feedback`);
  assert.ok(b1GrammarUnits.some((unit) => unit.id === question.unitId), `${question.id}: unknown unit ${question.unitId}`);
}

for (const topic of germanB1DrillModules) {
  const unitId = `unit${topic.number + 12}`;
  const unitQuestions = b1GrammarQuestions.filter((question) => question.unitId === unitId);
  assert.ok(unitQuestions.length >= 7, `${unitId}: expected the core question plus six drills, found ${unitQuestions.length}`);
  for (const drill of topic.drills) {
    if (corePrompts.has(drill.prompt)) continue;
    const mapped = b1GrammarQuestions.find((question) => question.id === `q-b1-drill-${drill.id}`);
    assert.ok(mapped, `${drill.id}: drill is missing from the course question list`);
    assert.equal(mapped.unitId, unitId, `${drill.id}: mapped to the wrong unit`);
    assert.equal(mapped.correctIndex, drill.correct, `${drill.id}: answer index changed in the mapping`);
  }
}

// The example from the requested course outline must remain correct.
const lamp = b1GrammarQuestions.find((question) => question.prompt === "Ich stelle die Lampe ___ Tisch.");
assert.ok(lamp, "missing the lamp exercise");
assert.equal(lamp.options[lamp.correctIndex], "auf den", "the lamp exercise must grade the Wohin/Akkusativ answer");

console.log(`German B1 drill bank OK: ${germanB1DrillModules.length} topics, ${germanB1DrillTotal} drills, ${b1GrammarQuestions.length} course questions, all keys and unit mappings valid.`);
