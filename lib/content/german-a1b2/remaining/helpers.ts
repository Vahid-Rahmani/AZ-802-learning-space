import type { GrammarDifficulty, GrammarLesson, GrammarLevel, GrammarQuestion } from "../types.ts";

export type AuthoredRow = readonly [
  prompt: string,
  answer: string,
  wrong1: string,
  wrong2: string,
  wrong3: string,
  translationFa: string,
  whyDe: string,
];

export type AuthoredPractice = {
  writing: Array<{ id: string; promptFa: string; model: string; checklist: string[] }>;
  dictation: string[];
};

export type RemainingModule = {
  id: string;
  lesson: GrammarLesson;
  questions: GrammarQuestion[];
} & AuthoredPractice;

/** The authored rows are the content; this helper only balances A/B/C/D. */
export function buildQuestions(
  prefix: string,
  levels: readonly [GrammarLevel, GrammarLevel, GrammarLevel],
  faRule: string,
  rows: readonly AuthoredRow[],
): GrammarQuestion[] {
  const seen = new Set<string>();
  return rows.map(([prompt, answer, wrong1, wrong2, wrong3, translationFa, whyDe], index) => {
    if (seen.has(prompt)) throw new Error(`${prefix}-${index + 1}: repeated prompt`);
    seen.add(prompt);
    const wrong = [wrong1, wrong2, wrong3];
    if (wrong.includes(answer) || new Set(wrong).size !== 3) throw new Error(`${prefix}-${index + 1}: invalid distractors`);
    const position = (index + prefix.length) % 4;
    const options = [...wrong];
    options.splice(position, 0, answer);
    const difficulty: GrammarDifficulty = index < 35 ? 1 : index < 75 ? 2 : 3;
    const level = levels[difficulty - 1];
    return {
      id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
      level,
      difficulty,
      prompt,
      translationFa,
      options,
      correctIndex: position,
      answer,
      format: "choice",
      shortExplanation: {
        de: `In diesem Satz ist „${answer}“ richtig. ${whyDe}`,
        fa: `در این جمله «${answer}» درست است. ${faRule}`,
      },
    } satisfies GrammarQuestion;
  });
}
