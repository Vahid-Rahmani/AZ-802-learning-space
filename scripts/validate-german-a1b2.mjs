/**
 * Validates the new /german/grammatik course without a browser.
 *
 * Run: node --experimental-strip-types scripts/validate-german-a1b2.mjs
 */
import assert from "node:assert/strict";
import { grammarModules, zuInfinitivDictation, zuInfinitivLesson, zuInfinitivModule, zuInfinitivQuestions, zuInfinitivWritingTasks } from "../lib/content/german-a1b2/index.ts";

const LEVELS = ["A1", "A2", "B1", "B2"];
const levelRank = new Map(LEVELS.map((level, index) => [level, index]));

assert.equal(grammarModules.length, 20, "the course map must publish all twenty modules");
assert.equal(new Set(grammarModules.map((module) => module.id)).size, 20, "module IDs must be unique");
assert.equal(new Set(grammarModules.map((module) => module.number)).size, 20, "module numbers must be unique");
assert.deepEqual(grammarModules.map((module) => module.number), Array.from({ length: 20 }, (_, index) => index + 1), "modules must be numbered 1..20");
assert.equal(grammarModules.filter((module) => module.status === "ready").length, 1, "only the authored module may be marked ready");
assert.equal(grammarModules.filter((module) => module.status === "planned").length, 19, "the remaining modules must stay planned");
assert.equal(zuInfinitivModule.status, "ready", "the zu + Infinitiv module must be the ready module");
assert.equal(zuInfinitivModule.questionCount, 100, "the module map must report 100 questions");
for (const entry of grammarModules) {
  assert.ok(entry.title.trim() && entry.titleFa.trim(), `${entry.id}: missing title`);
  assert.ok(entry.summaryFa.trim(), `${entry.id}: missing Persian summary`);
  assert.ok(entry.skills.length > 0, `${entry.id}: missing skills`);
  if (entry.status === "planned") assert.equal(entry.questionCount, 0, `${entry.id}: a planned module must not report questions`);
}

assert.equal(zuInfinitivQuestions.length, 100, `expected 100 questions, found ${zuInfinitivQuestions.length}`);
assert.equal(new Set(zuInfinitivQuestions.map((question) => question.id)).size, 100, "question IDs must be unique");
assert.equal(new Set(zuInfinitivQuestions.map((question) => question.prompt)).size, 100, "prompts must not repeat");
assert.equal(new Set(zuInfinitivQuestions.map((question) => question.explanation.rule)).size, 100, "every question needs its own rule explanation");

const distribution = [0, 0, 0, 0];
let previousDifficulty = 0;
let previousLevel = -1;
for (const question of zuInfinitivQuestions) {
  assert.match(question.id, /^zu-(b|d|t|u|a)-\d{3}$/, `${question.id}: invalid stable ID`);
  assert.ok(LEVELS.includes(question.level), `${question.id}: unknown level`);
  assert.ok(question.difficulty === 1 || question.difficulty === 2 || question.difficulty === 3, `${question.id}: invalid difficulty`);
  assert.ok(question.difficulty >= previousDifficulty, `${question.id}: difficulty must not drop`);
  if (question.difficulty === previousDifficulty) assert.ok(levelRank.get(question.level) >= previousLevel, `${question.id}: level must not drop inside a difficulty band`);
  previousDifficulty = question.difficulty;
  previousLevel = levelRank.get(question.level);
  assert.equal((question.prompt.match(/___/g) ?? []).length, 1, `${question.id}: prompt needs exactly one blank`);
  assert.ok(question.translationFa.trim(), `${question.id}: missing Persian sentence`);
  assert.equal(question.options.length, 4, `${question.id}: expected four options`);
  assert.equal(new Set(question.options).size, 4, `${question.id}: options must be distinct`);
  assert.ok(question.correctIndex >= 0 && question.correctIndex < 4, `${question.id}: answer index out of range`);
  assert.equal(question.options[question.correctIndex], question.answer, `${question.id}: answer must equal the selected option`);
  distribution[question.correctIndex] += 1;
  for (const key of ["rule", "reason", "analysis", "wordOrder", "forms", "error", "translationFa"]) {
    assert.ok(typeof question.explanation[key] === "string" && question.explanation[key].trim().length > 20, `${question.id}: explanation.${key} is too short`);
  }
  // The feedback has two deliberately separate audiences: the grammatical
  // explanation is German, the comprehension bridge is Persian. Do not let a
  // copy-paste mistake collapse them into one language.
  for (const key of ["rule", "reason", "analysis", "wordOrder", "forms", "error"]) {
    assert.doesNotMatch(question.explanation[key], /[\u0600-\u06FF]/, `${question.id}: explanation.${key} must be German`);
  }
  assert.match(question.explanation.translationFa, /[\u0600-\u06FF]/, `${question.id}: Persian explanation is missing`);
  assert.match(question.translationFa, /[\u0600-\u06FF]/, `${question.id}: Persian sentence translation is missing`);
  assert.equal(question.explanation.examples.length, 2, `${question.id}: expected two extra examples`);
  for (const example of question.explanation.examples) {
    assert.ok(example.trim().length > 10, `${question.id}: example is too short`);
    assert.notEqual(example, question.answer, `${question.id}: an example must be a full sentence`);
  }
  assert.notEqual(question.explanation.examples[0], question.explanation.examples[1], `${question.id}: examples must differ`);
  assert.doesNotMatch(JSON.stringify(question), /\b(TODO|TBD|lorem ipsum|placeholder)\b/i, `${question.id}: placeholder content found`);
}

assert.ok(distribution.every((count) => count >= 15 && count <= 30), `answer positions are unbalanced: ${distribution.join("/")}`);
assert.deepEqual(LEVELS.filter((level) => zuInfinitivQuestions.some((question) => question.level === level)), LEVELS, "all four levels must appear");
assert.deepEqual([1, 2, 3].filter((difficulty) => zuInfinitivQuestions.some((question) => question.difficulty === difficulty)), [1, 2, 3], "all three difficulty bands must appear");

assert.ok(zuInfinitivLesson.sections.length >= 5, "the lesson needs at least five teaching sections");
assert.ok(zuInfinitivLesson.introDe.trim() && zuInfinitivLesson.introFa.trim(), "the lesson needs both introductions");
for (const section of zuInfinitivLesson.sections) {
  assert.ok(section.titleDe.trim() && section.titleFa.trim(), "lesson section is missing a title");
  assert.ok(section.bodyDe.trim() && section.bodyFa.trim(), "lesson section is missing an explanation");
  assert.ok(section.examples.length >= 2, "lesson section needs examples");
}
assert.ok(zuInfinitivWritingTasks.length >= 5, "the module needs writing tasks");
for (const task of zuInfinitivWritingTasks) {
  assert.ok(task.promptFa.trim() && task.model.trim(), `${task.id}: incomplete writing task`);
  assert.ok(task.checklist.length >= 2, `${task.id}: checklist is too small`);
}
assert.ok(zuInfinitivDictation.length >= 5, "the module needs dictation sentences");
for (const sentence of zuInfinitivDictation) assert.ok(sentence.trim().length > 10, "dictation sentence is too short");

console.log(`German A1–B2 module OK: 20 planned/ready modules, 100 unique questions, answer positions ${distribution.join("/")}, all explanations, examples, lesson, writing and dictation content valid.`);
