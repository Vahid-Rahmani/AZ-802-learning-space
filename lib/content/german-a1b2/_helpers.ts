import type { GrammarDifficulty, GrammarLevel, GrammarQuestion } from "./types";

/** Build an item and derive its index from the authored option list. */
export function q(
  id: string,
  level: GrammarLevel,
  difficulty: GrammarDifficulty,
  prompt: string,
  translationFa: string,
  options: [string, string, string, string],
  answer: string,
  explanation: GrammarQuestion["explanation"],
): GrammarQuestion {
  const correctIndex = options.indexOf(answer);
  if (correctIndex < 0) throw new Error(`${id}: answer is not one of its options`);
  return { id, level, difficulty, prompt, translationFa, options, correctIndex: correctIndex as 0 | 1 | 2 | 3, answer, explanation };
}
