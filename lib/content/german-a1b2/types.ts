export type GrammarLevel = "A1" | "A2" | "B1" | "B2";
export type GrammarDifficulty = 1 | 2 | 3;
export type GrammarQuestionFormat = "choice" | "fill" | "order";

/**
 * The authored explanations for the first 100 questions are deliberately
 * detailed. Imported B1 questions use the shorter `shortExplanation` instead;
 * the full grammar lesson lives once in the module, not in every prompt.
 */
export type GrammarExplanation = {
  rule: string;
  reason: string;
  analysis: string;
  wordOrder: string;
  forms: string;
  error: string;
  examples: [string, string];
  translationFa: string;
};

export type GrammarShortExplanation = {
  /** One question-specific German sentence. */
  de: string;
  /** Persian support, not a second full grammar essay. */
  fa: string;
};

export type GrammarQuestion = {
  id: string;
  level: GrammarLevel;
  difficulty: GrammarDifficulty;
  prompt: string;
  translationFa: string;
  options: string[];
  correctIndex: number;
  answer: string;
  /** Defaults to choice. */
  format?: GrammarQuestionFormat;
  /** Answer text from an earlier version of a typed question, used for migration. */
  legacyAnswer?: string;
  /** Present on the original 100 authored questions. */
  explanation?: GrammarExplanation;
  /** Present on imported/reviewed questions. */
  shortExplanation?: GrammarShortExplanation;
};

export type GrammarModuleStatus = "ready" | "planned";

export type GrammarModule = {
  id: string;
  number: number;
  title: string;
  titleFa: string;
  level: string;
  status: GrammarModuleStatus;
  questionCount: number;
  summaryFa: string;
  skills: string[];
};

export type GrammarLessonSection = {
  titleDe: string;
  titleFa: string;
  bodyDe: string;
  bodyFa: string;
  examples: string[];
  examplesFa?: string[];
};

export type GrammarLesson = {
  introDe: string;
  introFa: string;
  sections: GrammarLessonSection[];
};

export type GrammarModuleProgress = {
  currentIndex: number;
  answers: Record<string, number | string>;
  difficult: string[];
  writing: Record<string, string>;
  dictation: Record<string, string>;
};

export type GrammarCourseState = {
  version: 2;
  activeModuleId: string;
  modules: Record<string, GrammarModuleProgress>;
  updatedAt: number;
};

export type GrammarModuleSpec = {
  id: string;
  questionIds: readonly string[];
  /** Questions answered by typing; a stored option index is stale after a format migration. */
  typedQuestionIds?: readonly string[];
  /** Previous answer text per question; a matching saved answer belongs to the old task. */
  legacyAnswers?: Readonly<Record<string, string>>;
};

export function emptyModuleProgress(): GrammarModuleProgress {
  return { currentIndex: 0, answers: {}, difficult: [], writing: {}, dictation: {} };
}

export function createCourseState(specs: readonly GrammarModuleSpec[], activeModuleId = specs[0]?.id ?? "infinitiv-zu", now = Date.now()): GrammarCourseState {
  const modules: Record<string, GrammarModuleProgress> = {};
  for (const spec of specs) modules[spec.id] = emptyModuleProgress();
  return { version: 2, activeModuleId, modules, updatedAt: now };
}

/** Used by focused tests and by old callers that only need one module. */
export function emptyCourseState(moduleId = "infinitiv-zu", now = Date.now()): GrammarCourseState {
  return createCourseState([{ id: moduleId, questionIds: [] }], moduleId, now);
}

export function isGrammarLevel(value: unknown): value is GrammarLevel {
  return value === "A1" || value === "A2" || value === "B1" || value === "B2";
}

export function normalizeGrammarAnswer(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

export function isGrammarAnswerCorrect(question: GrammarQuestion, answer: number | string | undefined): boolean {
  if (answer === undefined) return false;
  const format = question.format ?? "choice";
  if (format === "fill" || format === "order") {
    return typeof answer === "string" && normalizeGrammarAnswer(answer) === normalizeGrammarAnswer(question.answer);
  }
  return typeof answer === "number" && answer === question.correctIndex;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isSafeKey = (key: string) => key !== "__proto__" && key !== "constructor" && key !== "prototype";

function parseDrafts(value: unknown): Record<string, string> | null {
  if (value === undefined) return {};
  if (!isRecord(value) || Object.keys(value).length > 100) return null;
  const result: Record<string, string> = {};
  for (const [id, text] of Object.entries(value)) {
    if (!isSafeKey(id) || typeof text !== "string" || text.length > 4000) return null;
    result[id] = text;
  }
  return result;
}

function parseAnswers(value: unknown, ids: Set<string>): Record<string, number | string> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, number | string> = {};
  for (const [id, answer] of Object.entries(value)) {
    if (!ids.has(id) || !isSafeKey(id)) return null;
    if (typeof answer === "number") {
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) return null;
      result[id] = answer;
    } else if (typeof answer === "string") {
      if (!answer.trim() || answer.length > 4000) return null;
      result[id] = answer;
    } else {
      return null;
    }
  }
  return result;
}

function parseModuleProgress(value: unknown, spec: GrammarModuleSpec): GrammarModuleProgress | null {
  if (!isRecord(value)) return null;
  const ids = new Set(spec.questionIds);
  const typedIds = new Set(spec.typedQuestionIds ?? []);
  const legacyAnswers = spec.legacyAnswers ?? {};
  const answers = parseAnswers(value.answers, ids);
  if (answers) {
    for (const [id, answer] of Object.entries(answers)) {
      // Older banks stored a chosen option index for questions that now require
      // a typed sentence. Keep the rest of the module's progress, drop the
      // incompatible answer and let the learner answer that question again.
      if (typedIds.has(id) && typeof answer === "number") {
        delete answers[id];
        continue;
      }
      // A former gap-fill answer (for example „auf den“) cannot be compared
      // with the full sentence of the sentence-building task. Drop only that
      // exact legacy value; unrelated answers and other modules stay intact.
      const legacy = legacyAnswers[id];
      if (typeof answer === "string" && legacy && normalizeGrammarAnswer(answer) === normalizeGrammarAnswer(legacy)) {
        delete answers[id];
      }
    }
  }
  const writing = parseDrafts(value.writing);
  const dictation = parseDrafts(value.dictation);
  if (!answers || !writing || !dictation) return null;
  if (!Array.isArray(value.difficult)) return null;
  const difficult = Array.from(new Set(value.difficult.filter((id): id is string => typeof id === "string" && ids.has(id))));
  const max = Math.max(0, spec.questionIds.length - 1);
  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 || (value.currentIndex as number) > max) return null;
  return { currentIndex: value.currentIndex as number, answers, difficult, writing, dictation };
}

function migrateV1(value: Record<string, unknown>, specs: readonly GrammarModuleSpec[]): GrammarCourseState | null {
  if (value.version !== 1 || value.moduleId !== "infinitiv-zu") return null;
  const spec = specs.find((item) => item.id === "infinitiv-zu");
  if (!spec) return null;
  const ids = new Set(spec.questionIds);
  const answers = parseAnswers(value.answers, ids);
  const writing = parseDrafts(value.writing);
  const dictation = parseDrafts(value.dictation);
  if (!answers || !writing || !dictation) return null;
  if (!Array.isArray(value.difficult)) return null;
  const difficult = Array.from(new Set(value.difficult.filter((id): id is string => typeof id === "string" && ids.has(id))));
  const max = Math.max(0, spec.questionIds.length - 1);
  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 || (value.currentIndex as number) > max) return null;
  if (!Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0) return null;
  const state = createCourseState(specs, "infinitiv-zu", value.updatedAt as number);
  state.modules["infinitiv-zu"] = { currentIndex: value.currentIndex as number, answers, difficult, writing, dictation };
  return state;
}

/**
 * Accept only well-formed state for known modules and known question IDs.
 * A v1 row from the former single-module course is migrated into module 09
 * so existing answers, drafts and difficult markers survive the merge.
 */
export function parseCourseState(value: unknown, specs: readonly GrammarModuleSpec[]): GrammarCourseState | null {
  if (!isRecord(value) || !Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0) return null;
  if (value.version === 1) return migrateV1(value, specs);
  if (value.version !== 2) return null;
  if (typeof value.activeModuleId !== "string" || !specs.some((spec) => spec.id === value.activeModuleId)) return null;
  if (!isRecord(value.modules)) return null;
  for (const key of Object.keys(value.modules)) {
    if (!specs.some((spec) => spec.id === key)) return null;
  }
  const state = createCourseState(specs, value.activeModuleId as string, value.updatedAt as number);
  for (const spec of specs) {
    if (!Object.hasOwn(value.modules, spec.id)) continue;
    const progress = parseModuleProgress(value.modules[spec.id], spec);
    if (!progress) return null;
    state.modules[spec.id] = progress;
  }
  return state;
}
