import { ccnaLegacyPracticeUnits, ccnaPracticeUnits } from "./content/ccna-bank";
import { emptyServerLabState, parseServerLabState, type ServerLabState } from "./server-lab-state";

export type PracticeSubmission = { labId: string; evidenceText: string; updatedAt?: string | Date | null };

export function legacyCcnaIds(domainId: string): string[] {
  const domain = ccnaPracticeUnits.find((unit) => unit.id === domainId);
  return domain ? ccnaLegacyPracticeUnits.filter((unit) => unit.lessonId === domain.lessonId).map((unit) => unit.id) : [];
}

/** Read-only migration; original rows/grades are never overwritten or deleted. */
export function restoreCcnaDomain(domainId: string, rows: PracticeSubmission[]): ServerLabState {
  const domain = ccnaPracticeUnits.find((unit) => unit.id === domainId);
  if (!domain) throw new Error("Unknown CCNA domain");
  const current = rows.find((row) => row.labId === domainId);
  if (current) {
    const state = parseServerLabState(JSON.parse(current.evidenceText), domain);
    if (!state) throw new Error("Invalid saved CCNA domain");
    return state;
  }
  const ids = legacyCcnaIds(domainId);
  const previous = rows.filter((row) => ids.includes(row.labId))
    .sort((a, b) => new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime());
  let state = { ...emptyServerLabState(), activeTab: "quiz" as const } as ServerLabState;
  let submitted = false;
  for (const row of previous) {
    const legacy = ccnaLegacyPracticeUnits.find((unit) => unit.id === row.labId)!;
    const saved = parseServerLabState(JSON.parse(row.evidenceText), legacy);
    if (!saved) throw new Error("Invalid legacy CCNA checkpoint");
    const cursorId = legacy.questions[saved.questionIndex].id;
    state = { ...state, answers: { ...state.answers, ...saved.answers }, questionIndex: domain.questions.findIndex((q) => q.id === cursorId) };
    submitted ||= saved.quizSubmitted;
  }
  state.quizSubmitted = submitted && domain.questions.every((q) => state.answers[q.id] !== undefined);
  return state;
}
