/**
 * Validates the unified /german/grammatik course without a browser.
 *
 * Run: node --experimental-strip-types scripts/validate-german-a1b2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  B1_TOPIC_MODULE, grammarCurriculum, grammarModuleSpecs, legacyB1QuestionMap,
  readyGrammarModules,
} from "../lib/content/german-a1b2/curriculum.ts";
import {
  grammarModules, zuInfinitivDictation, zuInfinitivLesson, zuInfinitivModule,
  zuInfinitivQuestions, zuInfinitivWritingTasks,
} from "../lib/content/german-a1b2/index.ts";
import { createCourseState, parseCourseState } from "../lib/content/german-a1b2/types.ts";
import { auditGermanQuestions } from "./german-question-audit.mjs";
import { dictationForLesson, practiceForModule, writingTasksForLesson } from "../lib/content/german-a1b2/module-practice.ts";

const LEVELS = ["A1", "A2", "B1", "B2"];
const levelRank = new Map(LEVELS.map((level, index) => [level, index]));
const FORMATS = ["choice", "fill", "order"];
const READY_IDS = [
  "wechselpraepositionen", "dativ", "akkusativ", "genitiv", "dativ-akkusativ", "verben-praepositionen",
  "verben-dativ-akkusativ", "modalverben", "infinitiv-zu", "trennbare-verben", "nebensaetze",
  "dass-vs-zu", "um-ohne-statt", "relativsaetze", "zeiten", "adjektive", "passiv", "konjunktiv",
  "satzstellung", "komplexe-saetze",
];

assert.equal(grammarModules.length, 20, "the course map must publish all twenty modules");
assert.equal(new Set(grammarModules.map((module) => module.id)).size, 20, "module IDs must be unique");
assert.equal(new Set(grammarModules.map((module) => module.title)).size, 20, "module titles must be unique");
assert.deepEqual(grammarModules.map((module) => module.number), Array.from({ length: 20 }, (_, index) => index + 1), "modules must be numbered 1..20");
assert.equal(grammarModules.filter((module) => module.status === "ready").length, 1, "the module map must keep its historical ready flag until the curriculum derives status");
assert.equal(grammarModules.filter((module) => module.status === "planned").length, 19, "the module map must keep its historical planned flags until the curriculum derives status");
assert.equal(zuInfinitivModule.status, "ready", "the zu + Infinitiv module must be the ready module");
assert.equal(zuInfinitivModule.questionCount, 100, "the module map must report 100 questions");

assert.equal(grammarCurriculum.length, 20, "the derived curriculum must keep twenty modules");
assert.deepEqual(readyGrammarModules.map((module) => module.id), READY_IDS, "the ready modules changed unexpectedly");
assert.equal(readyGrammarModules.length, 20, "twenty modules must be ready");
assert.equal(grammarCurriculum.filter((module) => module.status === "planned").length, 0, "no module may remain planned");
assert.equal(grammarModuleSpecs.length, 20, "the progress schema must cover every module");
assert.equal(new Set(grammarModuleSpecs.map((spec) => spec.id)).size, 20, "progress spec IDs must be unique");

for (const entry of grammarCurriculum) {
  assert.ok(entry.title.trim() && entry.titleFa.trim(), `${entry.id}: missing title`);
  assert.ok(entry.summaryFa.trim(), `${entry.id}: missing Persian summary`);
  assert.ok(entry.skills.length > 0, `${entry.id}: missing skills`);
  assert.equal(entry.questionCount, entry.questions.length, `${entry.id}: question count is stale`);
  if (entry.status === "ready") {
    assert.ok(entry.lesson, `${entry.id}: a ready module needs a complete lesson`);
    assert.ok(entry.questions.length >= 32, `${entry.id}: a ready module needs a real question bank`);
    assert.ok(entry.level.trim(), `${entry.id}: missing CEFR level`);
  } else {
    assert.equal(entry.questions.length, 0, `${entry.id}: a planned module must not expose questions`);
    assert.equal(entry.lesson, null, `${entry.id}: a planned module must not expose a lesson`);
  }
}

assert.equal(Object.keys(B1_TOPIC_MODULE).length, 11, "the B1 topic map must cover eleven topics plus the split Passiv topic");
assert.equal(legacyB1QuestionMap.size, 1200, `expected 1200 migrated B1 questions, found ${legacyB1QuestionMap.size}`);
assert.deepEqual(legacyB1QuestionMap.get("q-dativ-c-d1"), { id: "b1-q-dativ-c-d1", moduleId: "dativ" }, "old B1 question IDs must map to their unified question");

const fresh = createCourseState(grammarModuleSpecs, "infinitiv-zu", 5);
assert.equal(fresh.version, 2);
assert.equal(Object.keys(fresh.modules).length, 20);
const migratedV1 = parseCourseState({
  version: 1,
  moduleId: "infinitiv-zu",
  currentIndex: 1,
  answers: { [zuInfinitivQuestions[0].id]: 0 },
  difficult: [zuInfinitivQuestions[0].id],
  writing: { w1: "Ich hoffe, zu lernen." },
  dictation: { d1: "Ich lerne Deutsch." },
  updatedAt: 5,
}, grammarModuleSpecs);
assert.ok(migratedV1, "the old single-module progress row must migrate");
assert.equal(migratedV1.activeModuleId, "infinitiv-zu");
assert.equal(migratedV1.modules["infinitiv-zu"].currentIndex, 1);
assert.equal(migratedV1.modules["infinitiv-zu"].answers[zuInfinitivQuestions[0].id], 0);
assert.equal(migratedV1.modules["infinitiv-zu"].writing.w1, "Ich hoffe, zu lernen.");
const migratedV2 = parseCourseState({ ...fresh, activeModuleId: "dativ", modules: { ...fresh.modules, dativ: { ...fresh.modules.dativ, answers: { "b1-q-dativ-c-d1": 0 } } } }, grammarModuleSpecs);
assert.ok(migratedV2, "a valid v2 state must load");
assert.equal(migratedV2.activeModuleId, "dativ");
assert.equal(migratedV2.modules.dativ.answers["b1-q-dativ-c-d1"], 0);
assert.equal(parseCourseState({ ...fresh, modules: { ...fresh.modules, unknown: fresh.modules.dativ } }, grammarModuleSpecs), null, "unknown modules must be rejected");
assert.equal(parseCourseState({ ...fresh, modules: { ...fresh.modules, dativ: { ...fresh.modules.dativ, answers: { unknown: 0 } } } }, grammarModuleSpecs), null, "unknown question IDs must be rejected");
for (const topic of ["dativ", "akkusativ", "wechsel", "dativ-akkusativ", "nebensatz", "modalverben", "verben-praepositionen", "zeiten", "relativsatz", "adjektive", "schreiben"]) {
  assert.ok(B1_TOPIC_MODULE[topic], `B1 topic ${topic} has no home in the curriculum`);
  assert.ok(grammarCurriculum.some((module) => module.id === B1_TOPIC_MODULE[topic] && module.status === "ready"), `B1 topic ${topic} points at an unavailable module`);
}
assert.ok(grammarCurriculum.some((module) => module.id === "passiv" && module.status === "ready"), "Passiv must have a home");
assert.ok(grammarCurriculum.some((module) => module.id === "konjunktiv" && module.status === "ready"), "Konjunktiv II must have a home");

assert.equal(zuInfinitivQuestions.length, 100, `expected 100 authored zu-Infinitiv questions, found ${zuInfinitivQuestions.length}`);
assert.equal(new Set(zuInfinitivQuestions.map((question) => question.id)).size, 100, "question IDs must be unique");
assert.equal(new Set(zuInfinitivQuestions.map((question) => question.prompt)).size, 100, "prompts must not repeat");

const allQuestions = grammarCurriculum.flatMap((module) => module.questions.map((question) => ({ ...question, moduleId: module.id })));
assert.equal(allQuestions.length, 1900, `expected 1900 unified questions, found ${allQuestions.length}`);
assert.equal(new Set(allQuestions.map((question) => question.id)).size, allQuestions.length, "question IDs must be unique across all modules");
const exactRecords = new Set();
for (const question of allQuestions) {
  const key = JSON.stringify([question.prompt, question.answer, question.format ?? "choice", question.options]);
  assert.ok(!exactRecords.has(key), `${question.id}: exact duplicate question record`);
  exactRecords.add(key);
}
// No two published questions may display the same prompt. Production tasks use
// a scrambled version of their sentence, so a repeated prompt is accidental.
const byPrompt = new Map();
for (const question of allQuestions) {
  const group = byPrompt.get(question.prompt) ?? [];
  group.push(question);
  byPrompt.set(question.prompt, group);
}
for (const [prompt, group] of byPrompt) {
  assert.equal(group.length, 1, `repeated prompt: ${prompt}`);
}

const answerPositions = [0, 0, 0, 0];
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
  answerPositions[question.correctIndex] += 1;
  assert.ok(question.explanation, `${question.id}: applying a short explanation to the authored module is not allowed`);
  for (const key of ["rule", "reason", "analysis", "wordOrder", "forms", "error", "translationFa"]) {
    assert.ok(typeof question.explanation[key] === "string" && question.explanation[key].trim().length > 20, `${question.id}: explanation.${key} is too short`);
  }
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
}
assert.ok(answerPositions.every((count) => count >= 15 && count <= 30), `answer positions are unbalanced: ${answerPositions.join("/")}`);

for (const question of allQuestions) {
  assert.ok(question.prompt.trim(), `${question.id}: missing prompt`);
  assert.ok(question.answer.trim(), `${question.id}: missing answer`);
  assert.ok(question.translationFa.trim(), `${question.id}: missing Persian prompt translation`);
  assert.match(question.translationFa, /[\u0600-\u06FF]/, `${question.id}: Persian prompt translation is missing`);
  assert.ok(FORMATS.includes(question.format ?? "choice"), `${question.id}: unknown format`);
  assert.ok(question.explanation || question.shortExplanation, `${question.id}: no explanation attached`);
  assert.ok(!(question.explanation && question.shortExplanation), `${question.id}: do not duplicate a full lesson into a short explanation`);
  if (question.shortExplanation) {
    assert.ok(question.shortExplanation.de.trim().length > 20, `${question.id}: short German explanation is too short`);
    assert.ok(question.shortExplanation.fa.trim().length > 5, `${question.id}: short Persian explanation is missing`);
    assert.doesNotMatch(question.shortExplanation.de, /[\u0600-\u06FF]/, `${question.id}: short German explanation contains Persian`);
    assert.match(question.shortExplanation.fa, /[\u0600-\u06FF]/, `${question.id}: short Persian explanation is missing`);
    assert.ok(question.shortExplanation.de.includes(question.answer), `${question.id}: short explanation must state the accepted answer`);
  }
  const format = question.format ?? "choice";
  if (format === "choice") {
    assert.equal(question.options.length, 4, `${question.id}: expected four options`);
    assert.equal(new Set(question.options).size, 4, `${question.id}: options must be distinct`);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4, `${question.id}: answer index out of range`);
    assert.equal(question.options[question.correctIndex], question.answer, `${question.id}: answer must equal the selected option`);
  } else {
    assert.equal(question.options.length, 0, `${question.id}: typed questions must not carry options`);
    assert.equal(question.correctIndex, -1, `${question.id}: typed questions must not carry an option index`);
    if (format === "order") {
      const tokens = question.prompt.split(" · ").map((token) => token.trim()).sort();
      const answerTokens = question.answer.split(/\s+/).map((token) => token.trim()).sort();
      assert.deepEqual(tokens, answerTokens, `${question.id}: sentence-building tokens must match the answer`);
    }
  }
  assert.doesNotMatch(JSON.stringify(question), /\b(TODO|TBD|lorem ipsum|placeholder)\b/i, `${question.id}: placeholder content found`);
}

assert.ok(zuInfinitivLesson.sections.length >= 5, "the authored lesson needs at least five teaching sections");
assert.ok(zuInfinitivLesson.introDe.trim() && zuInfinitivLesson.introFa.trim(), "the authored lesson needs both introductions");
for (const section of zuInfinitivLesson.sections) {
  assert.ok(section.titleDe.trim() && section.titleFa.trim(), "lesson section is missing a title");
  assert.ok(section.bodyDe.trim() && section.bodyFa.trim(), "lesson section is missing an explanation");
  assert.ok(section.examples.length >= 2, "lesson section needs examples");
}
for (const entry of readyGrammarModules) {
  assert.ok(entry.lesson.introDe.trim() && entry.lesson.introFa.trim(), `${entry.id}: lesson introductions are incomplete`);
  assert.ok(entry.lesson.sections.length >= 3, `${entry.id}: lesson needs at least three sections`);
  for (const section of entry.lesson.sections) {
    assert.ok(section.titleDe.trim() && section.titleFa.trim(), `${entry.id}: lesson section title is incomplete`);
    assert.ok(section.bodyDe.trim() && section.bodyFa.trim(), `${entry.id}: lesson section body is incomplete`);
  }
}
assert.ok(zuInfinitivWritingTasks.length >= 5, "the authored module needs writing tasks");
for (const task of zuInfinitivWritingTasks) {
  assert.ok(task.promptFa.trim() && task.model.trim(), `${task.id}: incomplete writing task`);
  assert.ok(task.checklist.length >= 2, `${task.id}: checklist is too small`);
}
assert.ok(zuInfinitivDictation.length >= 5, "the authored module needs dictation sentences");
for (const sentence of zuInfinitivDictation) assert.ok(sentence.trim().length > 10, "dictation sentence is too short");

// Every ready module now has the same five-part workspace as module 09.
for (const entry of readyGrammarModules) {
  const authored = practiceForModule(entry.id);
  const writing = entry.id === "infinitiv-zu" ? zuInfinitivWritingTasks : authored?.writing ?? writingTasksForLesson(entry.lesson);
  const dictation = entry.id === "infinitiv-zu" ? zuInfinitivDictation : authored?.dictation ?? dictationForLesson(entry.lesson);
  assert.ok(writing.length >= 3, `${entry.id}: needs at least three writing tasks`);
  assert.ok(dictation.length >= 3, `${entry.id}: needs at least three dictation sentences`);
  for (const task of writing) {
    assert.ok(task.promptFa.trim() && task.model.trim(), `${entry.id}/${task.id}: incomplete writing task`);
    assert.ok(task.checklist.length >= 2, `${entry.id}/${task.id}: writing checklist is too small`);
  }
  for (const sentence of dictation) assert.ok(sentence.trim().length > 10, `${entry.id}: dictation sentence is too short`);
}

const b1Route = readFileSync("app/german/b1-grammar/page.tsx", "utf8");
assert.match(b1Route, /B1GrammarRedirect/, "the old B1 route must redirect into the unified curriculum");
assert.doesNotMatch(b1Route, /GermanWorkspace/, "the old B1 route must not keep a second course component");
const grammarRoute = readFileSync("app/german/grammatik/page.tsx", "utf8");
assert.match(grammarRoute, /GermanGrammarShell/, "the grammar route must render the shared shell");
assert.match(grammarRoute, /view="dashboard"/, "the grammar route must render the dashboard view");
const grammarShell = readFileSync("app/components/german-grammar-shell.tsx", "utf8");
assert.doesNotMatch(grammarShell, /\/german\/b1-grammar/, "the grammar navigation must not advertise a second B1 course");
assert.match(grammarShell, /GermanGrammarCourse/, "the shell must mount the shared grammar workspace");
const moduleRoute = readFileSync("app/german/grammatik/[moduleId]/page.tsx", "utf8");
assert.match(moduleRoute, /generateStaticParams/, "module pages must publish their static route parameters");
assert.match(moduleRoute, /notFound/, "unknown or unfinished modules must return 404");
assert.match(moduleRoute, /view="module"/, "module pages must render the module view");
const germanForItRoute = readFileSync("app/german/page.tsx", "utf8");
assert.doesNotMatch(germanForItRoute, /href: "\/german\/b1-grammar"/, "German for IT must not advertise a second B1 course");

const structural = auditGermanQuestions(grammarCurriculum);
assert.equal(structural.errors.length, 0, `structural question audit found ${structural.errors.length} errors: ${structural.errors.slice(0, 5).map((error) => `${error.code} ${error.questionId}`).join(", ")}`);
assert.equal(structural.inspected, allQuestions.length, "the structural audit must inspect every published question");
assert.equal(structural.modules, 20, "the structural audit must cover all twenty modules");
assert.equal(structural.duplicatePromptPairs, 0, "no question may repeat another question's prompt");
assert.equal(structural.formatCounts.fill ?? 0, 0, "the duplicated gap-fill production tasks must not remain");

console.log(`German A1–B2 unified curriculum OK: 20 modules, ${readyGrammarModules.length} ready, dashboard + per-module routes, five-part workspaces, ${allQuestions.length} question records audited (${Object.entries(structural.formatCounts).map(([format, count]) => `${format} ${count}`).join(", ")}), ${structural.duplicatePromptPairs} repeated prompts, 1200 migrated B1 questions, 0 structural errors, all answer keys and explanations valid, old B1 route redirects.`);
