import reviewed from "./ccna-bank-reviewed.json";
import localBank from "./ccna-local-bank.json";
import { ccnaDomains, ccnaSources } from "./ccna";
import type { LabQuestion, ServerLab } from "./server-labs";

export type CcnaReviewedItem = {
  sourceIndex: number; domain: number; objective: string; text: string;
  options: string[]; correct: number; explain: string; whyOthers: string[];
  source: string; priority: "core" | "supporting"; reviewStatus: "published"; changes: string;
};
export const ccnaBankAttribution = {
  url: "https://github.com/BlackSwanAust/ccna-lab-sim",
  commit: "8d1bdc7a1d28cca1776737e8863f7a4f237b92df",
  reviewedAt: "2026-10-02", blueprint: "200-301-v1.1",
  license: "MIT", notice: "/ccna-attribution.txt",
} as const;

/** Stable IDs and deterministic option rotation keep answers valid on resume.
 * Never reshuffle a published version: migrate IDs when changing answer meaning.
 */
export const ccnaReviewedQuestions = (reviewed as CcnaReviewedItem[]).filter((q) => q.reviewStatus === "published").map((q) => {
  const order = [0, 1, 2, 3].map((index) => (index + q.sourceIndex % 4) % 4);
  return { ...q, id: `ccna-bank-v1-${q.sourceIndex}`, options: order.map((index) => q.options[index]), correct: order.indexOf(q.correct), whyOthers: order.map((index) => q.whyOthers[index]) };
});
// Local material retains its original review status, option order and rationale.
export const ccnaLocalQuestions = localBank.map((q) => ({
  ...q, domain: Number(q.objectiveId.split(".")[0]), objective: q.objectiveId,
  explain: q.rationale.en, priority: "supporting" as const,
}));
export const ccnaBankQuestions = [...ccnaReviewedQuestions, ...ccnaLocalQuestions];
export const ccnaQuestionCount = ccnaBankQuestions.length;

/** Separate practice IDs preserve the existing four-question lab checkpoints. */
const reviewedUnits: ServerLab[] = ccnaDomains.map((domain, index) => ({
  id: `ccna-practice-v1-${index + 1}`, kind: "knowledge", title: domain.title,
  assignment: `CCNA 200-301 v1.1 · domain ${domain.id}`, lessonId: `ccna-domain-${index + 1}`,
  minutes: "Untimed", goal: "Practice reviewed questions, understand the options and continue from your saved checkpoint.",
  prerequisites: [], steps: [], tests: [],
  questions: ccnaReviewedQuestions.filter((q) => q.domain === index + 1).sort((a, b) => Number(a.priority === "supporting") - Number(b.priority === "supporting") || a.objective.localeCompare(b.objective, "en", { numeric: true }) || a.sourceIndex - b.sourceIndex) as LabQuestion[],
  sources: [{ title: "Official CCNA v1.1 objectives", url: ccnaSources.blueprint }],
}));

// Separate checkpoint IDs keep every existing cursor, answer and submitted grade valid.
const localUnits: ServerLab[] = ccnaDomains.map((domain, index) => ({
  id: `ccna-local-v1-${index + 1}`, kind: "knowledge" as const,
  title: `${domain.title} · added questions`, assignment: "Local CCNA learning bank",
  lessonId: `ccna-domain-${index + 1}`, minutes: "Untimed",
  goal: "Practice your locally authored questions with their original explanations and references.",
  prerequisites: [], steps: [], tests: [],
  questions: ccnaLocalQuestions.filter((q) => q.domain === index + 1) as LabQuestion[],
  sources: [{ title: "Official CCNA v1.1 objectives", url: ccnaSources.blueprint }],
})).filter((unit) => unit.questions.length > 0);
export const ccnaLegacyPracticeUnits: ServerLab[] = [...reviewedUnits, ...localUnits];

/** One visible practice per objective domain; legacy APIs remain addressable. */
export const ccnaPracticeUnits: ServerLab[] = ccnaDomains.map((domain, index) => ({
  ...reviewedUnits[index], id: `ccna-domain-v2-${index + 1}`,
  title: domain.title,
  goal: "Learn and practice all questions assigned to this objective domain.",
  questions: [...reviewedUnits[index].questions, ...ccnaLocalQuestions.filter((q) => q.domain === index + 1)],
}));

export const ccnaKnowledgeQuestions = ccnaBankQuestions.map((q) => ({
  ...q, domain: ccnaDomains[q.domain - 1].title,
  rationale: "rationale" in q ? q.rationale : { en: q.explain, fa: "", de: "" },
}));

export function ccnaPracticeForQuestion(questionId: string) {
  return ccnaPracticeUnits.find((unit) => unit.questions.some((q) => q.id === questionId));
}
