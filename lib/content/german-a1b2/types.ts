export type GrammarLevel = "A1" | "A2" | "B1" | "B2";
export type GrammarDifficulty = 1 | 2 | 3;

/**
 * One reviewed multiple-choice item.
 *
 * The explanation is deliberately structured: the interface can show the rule,
 * the sentence analysis, the word order, the case/form information, the error
 * analysis and two fresh examples without inventing any of them at render time.
 */
export type GrammarQuestion = {
  id: string;
  level: GrammarLevel;
  difficulty: GrammarDifficulty;
  prompt: string;
  translationFa: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  answer: string;
  explanation: {
    rule: string;
    reason: string;
    analysis: string;
    wordOrder: string;
    forms: string;
    error: string;
    examples: [string, string];
    translationFa: string;
  };
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

export type GrammarCourseState = {
  version: 1;
  moduleId: string;
  currentIndex: number;
  answers: Record<string, number>;
  difficult: string[];
  writing: Record<string, string>;
  dictation: Record<string, string>;
  updatedAt: number;
};

export function emptyCourseState(moduleId: string, now = Date.now()): GrammarCourseState {
  return { version: 1, moduleId, currentIndex: 0, answers: {}, difficult: [], writing: {}, dictation: {}, updatedAt: now };
}

export function isGrammarLevel(value: unknown): value is GrammarLevel {
  return value === "A1" || value === "A2" || value === "B1" || value === "B2";
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** Accept only a well-formed, known-module state; never invent answers. */
export function parseCourseState(value: unknown, moduleId: string, questionIds: readonly string[]): GrammarCourseState | null {
  if (!isRecord(value) || value.version !== 1 || value.moduleId !== moduleId) return null;
  if (!Number.isInteger(value.currentIndex) || (value.currentIndex as number) < 0 || (value.currentIndex as number) >= questionIds.length) return null;
  if (!Number.isSafeInteger(value.updatedAt) || (value.updatedAt as number) < 0) return null;
  const ids = new Set(questionIds);
  if (!isRecord(value.answers)) return null;
  const answers: Record<string, number> = {};
  for (const [id, answer] of Object.entries(value.answers)) {
    if (!ids.has(id) || !Number.isInteger(answer) || (answer as number) < 0 || (answer as number) > 3) return null;
    answers[id] = answer as number;
  }
  if (!Array.isArray(value.difficult)) return null;
  const difficult = Array.from(new Set(value.difficult.filter((id): id is string => typeof id === "string" && ids.has(id))));
  const reading = (candidate: unknown): Record<string, string> | null => {
    if (candidate === undefined) return {};
    if (!isRecord(candidate) || Object.keys(candidate).length > 100) return null;
    const result: Record<string, string> = {};
    for (const [id, text] of Object.entries(candidate)) {
      if (typeof text !== "string" || text.length > 4000) return null;
      result[id] = text;
    }
    return result;
  };
  const writing = reading(value.writing);
  const dictation = reading(value.dictation);
  if (!writing || !dictation) return null;
  return { version: 1, moduleId, currentIndex: value.currentIndex as number, answers, difficult, writing, dictation, updatedAt: value.updatedAt as number };
}
