/**
 * Regression tests for the structural German-question checks.
 *
 * These tests reproduce the concrete defects reported for the course:
 * an option that repeats the article beside the blank, a sentence-building
 * task with a duplicated word, a wrong answer key after shuffling, and
 * progress that must survive a question-bank repair.
 *
 * Run: node --experimental-strip-types scripts/test-german-question-structure.mjs
 */
import assert from "node:assert/strict";
import {
  adjacentRepeat, auditGermanQuestions, boundaryRepeats, completedSentence, normalizePrompt, orderTokenIssues, separatedPrefixDuplicates,
} from "./german-question-audit.mjs";
import { grammarCurriculum, grammarModuleSpecs } from "../lib/content/german-a1b2/curriculum.ts";
import { createCourseState, isGrammarAnswerCorrect, parseCourseState } from "../lib/content/german-a1b2/types.ts";

const choice = (prompt, options, answer, correctIndex) => ({
  id: "test-choice", level: "A2", difficulty: 1, prompt, translationFa: "ترجمه", options, correctIndex, answer, format: "choice",
  shortExplanation: { de: `Die Lösung ist „${answer}“.`, fa: "توضیح" },
});

// 1. Article-only blank: the preposition is already in the sentence.
const article = choice("Wir laufen durch ___ Wald.", ["den", "dem", "der", "das"], "den", 0);
assert.equal(completedSentence(article, "den"), "Wir laufen durch den Wald.");
assert.deepEqual(boundaryRepeats(article, "den"), []);
assert.equal(adjacentRepeat(completedSentence(article, "den")), null);

// 2. Preposition-only blank: the article is already in the sentence.
const preposition = choice("Wir laufen ___ den Wald.", ["durch", "mit", "bei", "von"], "durch", 0);
assert.equal(completedSentence(preposition, "durch"), "Wir laufen durch den Wald.");
assert.deepEqual(boundaryRepeats(preposition, "durch"), []);

// 3. The invalid mixed question must be detected, not rendered.
const mixed = choice("Wir laufen ___ den Wald.", ["durch den", "durch dem", "durch der", "durch das"], "durch den", 0);
assert.deepEqual(boundaryRepeats(mixed, "durch den"), ["right:den"]);
assert.equal(adjacentRepeat(completedSentence(mixed, "durch den")), "den");

// 3b. A separated prefix must not be supplied a second time by an option.
const separable = choice("Ich ___ das Fenster auf.", ["mache", "aufmache", "mache auf", "gemacht"], "mache", 0);
assert.deepEqual(separatedPrefixDuplicates(separable), ["aufmache", "mache auf"]);
assert.deepEqual(separatedPrefixDuplicates({ ...separable, options: ["mache", "machst", "machen", "gemacht"] }), []);

// 4. Sentence building must not supply a word twice.
const build = {
  id: "test-order", level: "B1", difficulty: 2, format: "order",
  prompt: "Ich · versuche · dich · dich · morgen · anzurufen",
  answer: "Ich versuche, dich morgen anzurufen.",
  options: [], correctIndex: -1, translationFa: "ترجمه", shortExplanation: { de: "Satzbau.", fa: "توضیح" },
};
assert.ok(orderTokenIssues(build).includes("extra:dich"));
const cleanBuild = { ...build, prompt: "morgen · Ich · versuche, · dich · anzurufen." };
assert.deepEqual(orderTokenIssues(cleanBuild), []);

// 5. The stored answer key must follow a shuffled option array.
const shuffled = ["dem", "das", "den", "der"];
const shuffledQuestion = { ...article, options: shuffled, correctIndex: shuffled.indexOf("den") };
assert.equal(shuffledQuestion.options[shuffledQuestion.correctIndex], "den");
assert.equal(isGrammarAnswerCorrect(shuffledQuestion, shuffledQuestion.correctIndex), true);
assert.equal(isGrammarAnswerCorrect(shuffledQuestion, shuffledQuestion.options.indexOf("dem")), false);

// 6. Repairing one question must not reset another module's progress.
const state = createCourseState(grammarModuleSpecs, "dativ", 1);
const dativQuestion = grammarCurriculum.find((module) => module.id === "dativ").questions.find((question) => (question.format ?? "choice") === "choice");
const akkusativQuestion = grammarCurriculum.find((module) => module.id === "akkusativ").questions.find((question) => (question.format ?? "choice") === "choice");
assert.ok(dativQuestion && akkusativQuestion);
state.modules.dativ.answers[dativQuestion.id] = 0;
state.modules.akkusativ.answers[akkusativQuestion.id] = 0;
const parsed = parseCourseState(state, grammarModuleSpecs);
assert.ok(parsed);
assert.equal(parsed.modules.dativ.answers[dativQuestion.id], 0);
assert.equal(parsed.modules.akkusativ.answers[akkusativQuestion.id], 0);
assert.equal(parseCourseState({ ...state, modules: { ...state.modules, unknown: state.modules.dativ } }, grammarModuleSpecs), null);

// 6b. A question that changed from options to typed input must not keep a stale
// option index; every other answer in every module must survive the migration.
const dativModule = grammarCurriculum.find((entry) => entry.id === "dativ");
const typedDativ = dativModule.questions.find((question) => question.format === "fill" || question.format === "order");
assert.ok(typedDativ, "dativ must contain a typed question for the migration test");
const migratedState = { ...state, modules: { ...state.modules, dativ: { ...state.modules.dativ, answers: { ...state.modules.dativ.answers, [typedDativ.id]: 2 } } } };
const migrated = parseCourseState(migratedState, grammarModuleSpecs);
assert.ok(migrated);
assert.equal(migrated.modules.dativ.answers[typedDativ.id], undefined, "a stale option index on a typed question must be dropped");
assert.equal(migrated.modules.dativ.answers[dativQuestion.id], 0, "the choice answer in the same module must survive");
assert.equal(migrated.modules.akkusativ.answers[akkusativQuestion.id], 0, "other modules must not be reset by the migration");

// 6c. A saved gap phrase from the former fill-in task must be dropped, while a
// full-sentence answer to the new sentence-building task must survive.
const convertedDativ = dativModule.questions.find((question) => question.legacyAnswer);
assert.ok(convertedDativ, "dativ must contain a converted production question");
assert.equal(convertedDativ.format, "order");
const legacyState = { ...state, modules: { ...state.modules, dativ: { ...state.modules.dativ,
  answers: { ...state.modules.dativ.answers, [convertedDativ.id]: convertedDativ.legacyAnswer } } } };
const legacyParsed = parseCourseState(legacyState, grammarModuleSpecs);
assert.ok(legacyParsed);
assert.equal(legacyParsed.modules.dativ.answers[convertedDativ.id], undefined, "an old gap phrase must not survive as a sentence-building answer");
assert.equal(legacyParsed.modules.dativ.answers[dativQuestion.id], 0, "the other answer in the same module must survive");
assert.equal(legacyParsed.modules.akkusativ.answers[akkusativQuestion.id], 0, "another module must not be reset");
const sentenceState = { ...state, modules: { ...state.modules, dativ: { ...state.modules.dativ,
  answers: { ...state.modules.dativ.answers, [convertedDativ.id]: convertedDativ.answer } } } };
const sentenceParsed = parseCourseState(sentenceState, grammarModuleSpecs);
assert.ok(sentenceParsed);
assert.equal(sentenceParsed.modules.dativ.answers[convertedDativ.id], convertedDativ.answer, "a new full-sentence answer must survive a reload");

// 7. Module coverage: all twenty modules and the complete bank are audited.
const report = auditGermanQuestions();
assert.equal(report.inspected, 1900);
assert.equal(report.modules, 20);
assert.equal(report.errors.length, 0, report.errors.map((error) => `${error.code} ${error.questionId}: ${error.detail}`).join("\n"));
assert.equal(Object.keys(report.moduleCounts).length, 20);
assert.equal(Object.values(report.formatCounts).reduce((sum, count) => sum + count, 0), 1900);
for (const entry of grammarCurriculum) {
  assert.ok((report.moduleCounts[entry.id] ?? 0) >= 32, `${entry.id}: too few audited questions`);
  assert.ok(entry.questions.every((question) => report.formatCounts[question.format ?? "choice"] > 0));
}
assert.equal(normalizePrompt("Ich weiß, dass er morgen ___ ."), normalizePrompt("Ich weiß, dass er morgen ___."));
assert.equal(report.duplicatePromptPairs, 0, "no two questions may display the same prompt");
assert.equal(report.formatCounts.fill ?? 0, 0, "the duplicated gap-fill production questions must be gone");
assert.equal(report.formatCounts.order, 600, "every production question must be a sentence-building task");

console.log(`German question structure OK: ${report.inspected} questions in ${report.modules} modules, 0 structural errors, ${report.duplicatePromptPairs} repeated prompts, ${report.crossModuleSentences} cross-module sentence reuse warnings.`);
