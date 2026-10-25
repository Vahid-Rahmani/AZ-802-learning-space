/**
 * Structural audit for the unified German A1–B2 question bank.
 *
 * The audit inspects the data the application actually serves. It cannot prove
 * that a German sentence is idiomatic; it does catch the mechanical defects
 * that made questions unusable:
 *   - options that repeat a word already fixed beside the blank
 *   - doubled words inside a prompt, option or completed sentence
 *   - sentence-building tokens that do not rebuild the stored answer
 *   - wrong option counts, duplicate options or answer-key mismatches
 *   - accidental duplicate prompts across the whole question bank
 *
 * Run directly for a readable report:
 *   node --experimental-strip-types scripts/german-question-audit.mjs
 * Add --json for machine-readable output.
 */
import { pathToFileURL } from "node:url";
import { grammarCurriculum } from "../lib/content/german-a1b2/curriculum.ts";

const PUNCTUATION = /[.,!?;:…„“"'’()\[\]]/g;
const PUNCTUATION_AT_END = /[.,!?;:…]$/;
const PUNCTUATION_AT_START = /^[.,!?;:…]/;
const SEPARABLE_PREFIXES = new Set([
  "auf", "an", "ab", "vor", "nach", "mit", "ein", "fern", "statt", "teil", "zu", "weiter",
  "zusammen", "aus", "zurück", "los", "kennen", "fest", "frei", "hoch", "her", "hin", "weg",
  "wieder", "zurecht", "klar", "satt",
]);

export function normalizeToken(token) {
  return token
    .normalize("NFC")
    .replace(PUNCTUATION, "")
    .toLocaleLowerCase("de-DE");
}

export function normalizePrompt(prompt) {
  return prompt
    .normalize("NFC")
    .toLocaleLowerCase("de-DE")
    .replace(/\s*([.,!?;:])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/[„“"'’()\[\]…]/g, "")
    .trim();
}

/** The sentence the learner should produce after choosing/typing an answer. */
export function completedSentence(question, option = question.answer) {
  if ((question.format ?? "choice") === "order") return question.answer;
  if (!question.prompt.includes("___")) return question.prompt;
  const parts = option.split(/\s*…\s*/);
  let index = 0;
  return question.prompt.replace(/___/g, () => parts[index++] ?? "");
}

/**
 * Two neighbouring words with the same lemma-like token are almost always an
 * accidental duplication ("durch den den Wald"). A comma or other punctuation
 * between them is legitimate German ("… ist, ist …"), so it is not flagged.
 */
export function adjacentRepeat(text) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let index = 1; index < words.length; index++) {
    const previous = words[index - 1];
    if (PUNCTUATION_AT_END.test(previous)) continue;
    const left = normalizeToken(previous);
    const right = normalizeToken(words[index]);
    if (left && left === right) return left;
  }
  return null;
}

/**
 * Check only the two junctions created by inserting an option into the blank.
 * Repeating a word elsewhere in the sentence (for example in a following
 * subordinate clause) is not a construction bug.
 */
export function boundaryRepeats(question, option) {
  const format = question.format ?? "choice";
  if (format === "order" || !question.prompt.includes("___")) return [];
  const blanks = (question.prompt.match(/___/g) ?? []).length;
  if (blanks > 1) return [];
  const [before, after] = question.prompt.split("___");
  const inserted = option.split(/\s+/).filter(Boolean);
  if (!inserted.length) return ["empty option"];
  const issues = [];
  const beforeWords = before.split(/\s+/).filter(Boolean);
  const afterWords = after.split(/\s+/).filter(Boolean);
  const left = normalizeToken(beforeWords.at(-1) ?? "");
  const first = normalizeToken(inserted[0]);
  const last = normalizeToken(inserted.at(-1));
  const right = normalizeToken(afterWords[0] ?? "");
  const leftBoundary = beforeWords.at(-1) ?? "";
  const rightBoundary = afterWords[0] ?? "";
  if (left && first && left === first && !PUNCTUATION_AT_END.test(leftBoundary)) {
    issues.push(`left:${left}`);
  }
  if (last && right && last === right && !PUNCTUATION_AT_START.test(rightBoundary)) {
    issues.push(`right:${right}`);
  }
  const doubled = adjacentRepeat(option);
  if (doubled) issues.push(`option:${doubled}`);
  return issues;
}

/**
 * In a separated verb the finite form belongs in the blank and the prefix is
 * already at the end of the prompt. An option that carries the prefix again
 * (fused or as a separate word) would produce a doubled prefix.
 */
export function separatedPrefixDuplicates(question) {
  if ((question.format ?? "choice") !== "choice" || !question.prompt.includes("___")) return [];
  const words = question.prompt.trim().split(/\s+/);
  const prefix = normalizeToken(words.at(-1) ?? "");
  if (!SEPARABLE_PREFIXES.has(prefix)) return [];
  return question.options.filter((option) =>
    option.split(/\s+/).map(normalizeToken).some((word) => word === prefix || (word.startsWith(prefix) && word.length > prefix.length + 2)),
  );
}

/** Sentence-building questions must supply exactly the words of the answer. */
export function orderTokenIssues(question) {
  const supplied = question.prompt.split(" · ").map((token) => token.trim()).filter(Boolean);
  const target = question.answer.split(/\s+/).filter(Boolean);
  const issues = [];
  if (supplied.length < 2) issues.push("missing tokens");
  const count = (items) => items.reduce((map, item) => map.set(item, (map.get(item) ?? 0) + 1), new Map());
  const suppliedCounts = count(supplied);
  const targetCounts = count(target);
  for (const [token, amount] of targetCounts) {
    if ((suppliedCounts.get(token) ?? 0) < amount) issues.push(`missing:${token}`);
  }
  for (const [token, amount] of suppliedCounts) {
    if ((targetCounts.get(token) ?? 0) < amount) issues.push(`extra:${token}`);
  }
  if (supplied.join(" ") === target.join(" ")) issues.push("not scrambled");
  return issues;
}

function moduleQuestions(curriculum) {
  return curriculum.flatMap((module) =>
    module.questions.map((question) => ({ ...question, moduleId: module.id })),
  );
}

export function auditGermanQuestions(curriculum = grammarCurriculum) {
  const questions = moduleQuestions(curriculum);
  const errors = [];
  const warnings = [];
  const formatCounts = {};
  const moduleCounts = {};
  const duplicatePromptGroups = [];
  const noBlankChoice = [];

  const fail = (question, code, detail) => errors.push({ code, questionId: question.id, moduleId: question.moduleId, detail });
  const exactRecords = new Map();
  const promptGroups = new Map();
  const completedGroups = new Map();

  for (const question of questions) {
    const format = question.format ?? "choice";
    formatCounts[format] = (formatCounts[format] ?? 0) + 1;
    moduleCounts[question.moduleId] = (moduleCounts[question.moduleId] ?? 0) + 1;

    if (format === "fix") fail(question, "obsolete-format", "the fix format is no longer generated");
    if (!question.prompt.trim()) fail(question, "empty-prompt", "missing prompt");
    if (!question.answer.trim()) fail(question, "empty-answer", "missing answer");
    if (question.prompt.includes("___") && question.answer.includes("___")) fail(question, "blank-in-answer", "the answer must not contain the blank");
    if (adjacentRepeat(question.prompt.replace("___", "").trim())) {
      fail(question, "prompt-repeat", `doubled word in the prompt: ${adjacentRepeat(question.prompt.replace("___", "").trim())}`);
    }

    const exactKey = JSON.stringify([normalizePrompt(question.prompt), question.answer, format, question.options]);
    if (exactRecords.has(exactKey)) {
      fail(question, "duplicate-record", `identical to ${exactRecords.get(exactKey)}`);
    } else {
      exactRecords.set(exactKey, question.id);
    }
    const promptKey = normalizePrompt(question.prompt);
    const group = promptGroups.get(promptKey) ?? [];
    group.push(question);
    promptGroups.set(promptKey, group);

    if (format === "choice") {
      const blanks = (question.prompt.match(/___/g) ?? []).length;
      if (blanks > 1) {
        const parts = question.answer.split(/\s*…\s*/).length;
        if (parts !== blanks) fail(question, "blank-count", `${blanks} blanks but the answer supplies ${parts} parts`);
        for (const option of question.options) {
          if (option.split(/\s*…\s*/).length !== blanks) fail(question, "blank-count", `option „${option}“ does not fill ${blanks} blanks`);
        }
      }
      if (blanks === 0) noBlankChoice.push(question.id);
      if (question.options.length !== 4) fail(question, "option-count", `${question.options.length} options instead of 4`);
      if (new Set(question.options).size !== question.options.length) fail(question, "duplicate-options", "options are not distinct");
      if (question.options.some((option) => !option.trim())) fail(question, "empty-option", "an option is empty");
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length) {
        fail(question, "answer-index", `answer index ${question.correctIndex} is out of range`);
      } else if (question.options[question.correctIndex] !== question.answer) {
        fail(question, "answer-key", "the stored answer index does not point at the stored answer");
      }
      for (const option of question.options) {
        if (adjacentRepeat(option)) fail(question, "option-repeat", `doubled word in option „${option}“`);
        for (const repeat of boundaryRepeats(question, option)) {
          fail(question, "boundary-repeat", `option „${option}“ repeats ${repeat}`);
        }
        const completed = completedSentence(question, option);
        if (adjacentRepeat(completed)) fail(question, "completed-repeat", `option „${option}“ creates a doubled word in the completed sentence`);
      }
    } else if (format === "fill" || format === "order") {
      if (question.options.length !== 0) fail(question, "typed-options", "typed questions must not carry options");
      if (question.correctIndex !== -1) fail(question, "typed-index", "typed questions must not carry an option index");
      if (format === "fill") {
        const blanks = (question.prompt.match(/___/g) ?? []).length;
        if (blanks !== 1) fail(question, "blank-count", `${blanks} blanks in a gap-fill question`);
        for (const repeat of boundaryRepeats(question, question.answer)) {
          fail(question, "boundary-repeat", `answer „${question.answer}“ repeats ${repeat}`);
        }
      } else {
        for (const issue of orderTokenIssues(question)) fail(question, "order-tokens", issue);
      }
    } else {
      fail(question, "unknown-format", `unknown format ${format}`);
    }

    if (question.moduleId === "trennbare-verben") {
      for (const option of separatedPrefixDuplicates(question)) {
        fail(question, "prefix-duplicate", `option „${option}“ repeats the separated prefix`);
      }
    }

    const completed = normalizePrompt(completedSentence(question));
    const completedGroup = completedGroups.get(completed) ?? [];
    completedGroup.push(question);
    completedGroups.set(completed, completedGroup);
  }

  for (const [prompt, group] of promptGroups) {
    if (group.length === 1) continue;
    duplicatePromptGroups.push({ prompt, ids: group.map((question) => question.id), modules: [...new Set(group.map((question) => question.moduleId))] });
    if (group.length !== 2) {
      for (const question of group) fail(question, "prompt-duplicate", `${group.length} questions share this prompt`);
      continue;
    }
    const [left, right] = group;
    if (left.moduleId !== right.moduleId) {
      for (const question of group) fail(question, "cross-module-duplicate", "the same prompt is used in two modules");
      continue;
    }
    if (left.answer !== right.answer) {
      for (const question of group) fail(question, "duplicate-answer-conflict", "the same prompt has two different answers");
      continue;
    }
    const formats = new Set([left.format ?? "choice", right.format ?? "choice"]);
    const isPair = formats.size === 2 && formats.has("choice") && (formats.has("fill") || formats.has("order"));
    if (!isPair) {
      for (const question of group) fail(question, "duplicate-question", "a repeated prompt must pair recognition with production");
    }
  }

  const crossModuleSentences = [];
  for (const [sentence, group] of completedGroups) {
    if (group.length < 2) continue;
    const modules = new Set(group.map((question) => question.moduleId));
    if (modules.size > 1) crossModuleSentences.push({ sentence, ids: group.map((question) => question.id), modules: [...modules] });
  }
  if (crossModuleSentences.length) {
    warnings.push({
      code: "cross-module-sentence",
      detail: `${crossModuleSentences.length} completed sentences appear in more than one module (review whether the second context teaches a different rule)`,
      sample: crossModuleSentences.slice(0, 5),
    });
  }

  return {
    inspected: questions.length,
    modules: curriculum.length,
    formatCounts,
    moduleCounts,
    duplicatePromptPairs: duplicatePromptGroups.length,
    noBlankChoice: noBlankChoice.length,
    crossModuleSentences: crossModuleSentences.length,
    errors,
    warnings,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const report = auditGermanQuestions();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("German question audit");
    console.log(`  inspected: ${report.inspected} questions in ${report.modules} modules`);
    console.log(`  formats: ${Object.entries(report.formatCounts).map(([format, count]) => `${format} ${count}`).join(", ")}`);
    console.log(`  repeated prompt groups: ${report.duplicatePromptPairs}`);
    console.log(`  choice prompts without a blank (definition/meta questions): ${report.noBlankChoice}`);
    console.log(`  errors: ${report.errors.length}`);
    for (const error of report.errors.slice(0, 40)) console.log(`    ${error.code} ${error.questionId} [${error.moduleId}]: ${error.detail}`);
    if (report.errors.length > 40) console.log(`    … ${report.errors.length - 40} more`);
    console.log(`  warnings: ${report.warnings.length}`);
    for (const warning of report.warnings) console.log(`    ${warning.code}: ${warning.detail}`);
  }
  process.exit(report.errors.length ? 1 : 0);
}
