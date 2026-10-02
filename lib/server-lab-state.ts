import type { ServerLab } from "./content/server-labs";

export type LabOutcome = "pass" | "fail" | "not-run";
export type ServerLabState = {
  stepIds: string[];
  results: Record<string, { outcome: LabOutcome; note: string }>;
  answers: Record<string, number>;
  quizSubmitted: boolean;
  evidenceText: string;
  activeTab: "build" | "test" | "quiz" | "evidence";
  questionIndex: number;
};
export const emptyServerLabState = (): ServerLabState => ({ stepIds: [], results: {}, answers: {}, quizSubmitted: false, evidenceText: "", activeTab: "build", questionIndex: 0 });

/** Accept only identifiers from this exact lab; scores are never accepted from the browser. */
export function parseServerLabState(value: unknown, lab: ServerLab): ServerLabState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.stepIds) || !raw.stepIds.every((id) => typeof id === "string" && lab.steps.some((_, i) => String(i) === id))) return null;
  if (typeof raw.quizSubmitted !== "boolean" || typeof raw.evidenceText !== "string" || raw.evidenceText.length > 8000) return null;
  if (!raw.results || typeof raw.results !== "object" || Array.isArray(raw.results) || !raw.answers || typeof raw.answers !== "object" || Array.isArray(raw.answers)) return null;
  const results: ServerLabState["results"] = {};
  for (const [id, entry] of Object.entries(raw.results)) {
    if (!lab.tests.some((test) => test.id === id) || !entry || typeof entry !== "object") return null;
    const result = entry as Record<string, unknown>;
    if (!["pass", "fail", "not-run"].includes(String(result.outcome)) || typeof result.note !== "string" || result.note.length > 2000) return null;
    results[id] = { outcome: result.outcome as LabOutcome, note: result.note };
  }
  const answers: Record<string, number> = {};
  for (const [id, answer] of Object.entries(raw.answers)) {
    const question = lab.questions.find((item) => item.id === id);
    if (!question || typeof answer !== "number" || !Number.isInteger(answer) || answer < 0 || answer >= question.options.length) return null;
    answers[id] = answer;
  }
  if (raw.quizSubmitted && lab.questions.some((question) => answers[question.id] === undefined)) return null;
  const activeTab = raw.activeTab ?? "build";
  const questionIndex = raw.questionIndex ?? 0;
  if (!["build", "test", "quiz", "evidence"].includes(String(activeTab)) || typeof questionIndex !== "number" || !Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= lab.questions.length) return null;
  return { stepIds: [...new Set(raw.stepIds)], results, answers, quizSubmitted: raw.quizSubmitted, evidenceText: raw.evidenceText, activeTab: activeTab as ServerLabState["activeTab"], questionIndex };
}

export function gradeServerLab(lab: ServerLab, state: ServerLabState) {
  const maximum = lab.tests.reduce((sum, test) => sum + test.points, 0);
  const earned = lab.tests.reduce((sum, test) => sum + (state.results[test.id]?.outcome === "pass" && state.results[test.id].note.trim().length >= 8 ? test.points : 0), 0);
  const practicalPercent = maximum > 0 ? Math.round(earned / maximum * 100) : 0;
  const correct = lab.questions.filter((question) => state.answers[question.id] === question.correct).length;
  const quizPercent = state.quizSubmitted ? Math.round(correct / lab.questions.length * 100) : null;
  const complete = lab.kind === "knowledge"
    ? quizPercent !== null && quizPercent >= 80
    : practicalPercent === 100 && state.stepIds.length === lab.steps.length && quizPercent !== null && quizPercent >= 80 && state.evidenceText.trim().length >= 8;
  return { practicalPercent, quizPercent, correct, complete };
}
