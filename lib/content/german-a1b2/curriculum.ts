import { b1GrammarQuestions } from "../german-b1-grammar.ts";
import { germanB1DrillModules } from "../german-b1-drills.ts";
import { grammarModules, zuInfinitivLesson, zuInfinitivQuestions } from "./index.ts";
import { moduleLessons } from "./lessons.ts";
import { remainingModules } from "./remaining/index.ts";
import type { GrammarLesson, GrammarModule, GrammarQuestion, GrammarShortExplanation } from "./types.ts";

/**
 * One home for every grammar topic.
 *
 * The original 20-module map stays the primary structure. Each of the twelve
 * B1 topics is mapped to the module that teaches the same grammar; the old
 * /german/b1-grammar route redirects here instead of owning a second copy.
 */
export const B1_TOPIC_MODULE: Record<string, string> = {
  dativ: "dativ",
  akkusativ: "akkusativ",
  wechsel: "wechselpraepositionen",
  "dativ-akkusativ": "dativ-akkusativ",
  nebensatz: "nebensaetze",
  modalverben: "modalverben",
  "verben-praepositionen": "verben-praepositionen",
  zeiten: "zeiten",
  relativsatz: "relativsaetze",
  adjektive: "adjektive",
  schreiben: "komplexe-saetze",
};

/** B1 topic 11 contains two grammar topics; each drill has one home. */
const KONJUNKTIV_DRILLS = new Set([
  "p1", "p4", "p5", "p6", "p8", "p12", "p13", "p14", "p15", "p18", "p19", "p21", "p22", "p30", "p31", "p33",
]);

const MODULE_RULE_DE: Record<string, string> = {
  wechselpraepositionen: "Wechselpräpositionen stehen mit Dativ bei einer Position (Wo?) und mit Akkusativ bei einer Bewegung zu einem Ziel (Wohin?).",
  dativ: "Nach dieser Präposition steht der Dativ; Artikel und Pronomen müssen im Dativ erscheinen.",
  akkusativ: "Nach dieser Präposition steht der Akkusativ; Artikel und Pronomen müssen im Akkusativ erscheinen.",
  "dativ-akkusativ": "Die Satzrolle entscheidet: Der Dativ markiert oft den Empfänger, der Akkusativ das direkte Objekt.",
  "verben-praepositionen": "Die Präposition gehört fest zum Verb; sie darf nicht durch eine wörtliche Übersetzung ersetzt werden.",
  modalverben: "Das Modalverb steht auf Position zwei, der Infinitiv des Vollverbs am Satzende.",
  nebensaetze: "Im Nebensatz steht das konjugierte Verb am Ende; der Konnektor bestimmt die Bedeutung.",
  relativsaetze: "Das Relativpronomen richtet sich in Genus und Numerus nach dem Bezugswort; den Kasus bestimmt seine Rolle im Relativsatz.",
  zeiten: "Die Zeitform zeigt Gegenwart, Vergangenheit, Vorzeitigkeit oder Zukunft; Hilfsverb und Partizip müssen zusammenpassen.",
  adjektive: "Vor dem Nomen trägt das Adjektiv eine Endung; Genus, Numerus und Kasus bestimmen die Form.",
  passiv: "Im Passiv steht werden mit dem Partizip II; mit einem Modalverb bleibt werden im Infinitiv.",
  konjunktiv: "Der Konjunktiv II drückt Wunsch, irrealen Vergleich oder höfliche Distanz aus.",
  "komplexe-saetze": "Hauptsatz und Nebensatz behalten ihre eigene Verbstellung; Klarheit geht vor Satzlänge.",
};

function b1DrillId(questionId: string, topicId: string): string {
  return questionId.replace(`q-${topicId}-c-`, "").replace(`q-${topicId}-m-`, "");
}

function shortExplanation(
  moduleId: string,
  sourceFormat: string,
  prompt: string,
  answer: string,
  persian: string,
): GrammarShortExplanation {
  const rule = MODULE_RULE_DE[moduleId] ?? "Die Form muss zur grammatischen Struktur des Satzes passen.";
  const context = prompt.replace(/___/g, "…");
  let de: string;
  if (sourceFormat === "fill") de = `In die Lücke von „${context}“ gehört „${answer}“. ${rule}`;
  else if (sourceFormat === "order") de = `Die richtige Reihenfolge lautet: „${answer}“. ${rule}`;
  else de = `„${answer}“ ist in „${context}“ die richtige Lösung. ${rule}`;
  return { de, fa: persian };
}

function importedQuestion(
  source: (typeof b1GrammarQuestions)[number],
  moduleId: string,
): GrammarQuestion {
  const isChoice = source.format === "choice";
  return {
    id: `b1-${source.id}`,
    level: source.level === 3 ? "B2" : "B1",
    difficulty: source.level,
    prompt: source.prompt,
    translationFa: source.translationFa,
    options: isChoice ? [...source.options] : [],
    correctIndex: isChoice ? source.correctIndex : -1,
    answer: source.answer,
    format: source.format,
    legacyAnswer: source.legacyAnswer,
    shortExplanation: shortExplanation(moduleId, source.format, source.prompt, source.answer, source.explanationFa),
  };
}

const b1QuestionsByModule: Record<string, GrammarQuestion[]> = {};
for (const topic of germanB1DrillModules) {
  const topicQuestions = b1GrammarQuestions.filter((question) => question.unitId === `unit${topic.number + 12}`);
  if (topic.id === "passiv") {
    for (const question of topicQuestions) {
      const drill = b1DrillId(question.id, topic.id);
      const moduleId = KONJUNKTIV_DRILLS.has(drill) ? "konjunktiv" : "passiv";
      (b1QuestionsByModule[moduleId] ??= []).push(importedQuestion(question, moduleId));
    }
    continue;
  }
  const moduleId = B1_TOPIC_MODULE[topic.id];
  if (!moduleId) continue;
  b1QuestionsByModule[moduleId] = topicQuestions.map((question) => importedQuestion(question, moduleId));
}

const remainingById = new Map(remainingModules.map((module) => [module.id, module]));

const questionsByModule: Record<string, GrammarQuestion[]> = {
  ...b1QuestionsByModule,
  "infinitiv-zu": zuInfinitivQuestions,
  ...Object.fromEntries(remainingModules.map((module) => [module.id, module.questions])),
};

export type CurriculumModule = GrammarModule & {
  lesson: GrammarLesson | null;
  questions: GrammarQuestion[];
};

export const grammarCurriculum: CurriculumModule[] = grammarModules.map((module) => {
  const questions = questionsByModule[module.id] ?? [];
  const lesson = module.id === "infinitiv-zu"
    ? zuInfinitivLesson
    : remainingById.get(module.id)?.lesson ?? moduleLessons[module.id] ?? null;
  return {
    ...module,
    status: questions.length && lesson ? "ready" : "planned",
    questionCount: questions.length,
    lesson,
    questions,
  };
});

export const grammarModuleSpecs = grammarCurriculum.map((module) => ({
  id: module.id,
  questionIds: module.questions.map((question) => question.id),
  typedQuestionIds: module.questions
    .filter((question) => question.format === "fill" || question.format === "order")
    .map((question) => question.id),
  legacyAnswers: Object.fromEntries(module.questions
    .filter((question) => question.legacyAnswer)
    .map((question) => [question.id, question.legacyAnswer as string])),
}));

export const readyGrammarModules = grammarCurriculum.filter((module) => module.status === "ready");

export function getCurriculumModule(id: string): CurriculumModule | undefined {
  return grammarCurriculum.find((module) => module.id === id);
}

/** Used only to carry old B1 difficult markers into the unified modules. */
export const legacyB1QuestionMap = new Map<string, { id: string; moduleId: string }>();
for (const entry of grammarCurriculum) {
  for (const question of entry.questions) {
    if (question.id.startsWith("b1-")) legacyB1QuestionMap.set(question.id.slice(3), { id: question.id, moduleId: entry.id });
  }
}
