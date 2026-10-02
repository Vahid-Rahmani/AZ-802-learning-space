import reviewed from "./ccna-bank-reviewed.json";
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
export const ccnaBankQuestions = (reviewed as CcnaReviewedItem[]).filter((q) => q.reviewStatus === "published").map((q) => {
  const order = [0, 1, 2, 3].map((index) => (index + q.sourceIndex % 4) % 4);
  return { ...q, id: `ccna-bank-v1-${q.sourceIndex}`, options: order.map((index) => q.options[index]), correct: order.indexOf(q.correct), whyOthers: order.map((index) => q.whyOthers[index]) };
});
export const ccnaQuestionCount = ccnaBankQuestions.length;

/** Separate practice IDs preserve the existing four-question lab checkpoints. */
export const ccnaPracticeUnits: ServerLab[] = ccnaDomains.map((domain, index) => ({
  id: `ccna-practice-v1-${index + 1}`, kind: "knowledge", title: domain.title,
  assignment: `CCNA 200-301 v1.1 · domain ${domain.id}`, lessonId: `ccna-domain-${index + 1}`,
  minutes: "Untimed", goal: "Practice reviewed questions, understand the options and continue from your saved checkpoint.",
  prerequisites: [], steps: [], tests: [],
  questions: ccnaBankQuestions.filter((q) => q.domain === index + 1).sort((a, b) => Number(a.priority === "supporting") - Number(b.priority === "supporting") || a.objective.localeCompare(b.objective, "en", { numeric: true }) || a.sourceIndex - b.sourceIndex) as LabQuestion[],
  sources: [{ title: "Official CCNA v1.1 objectives", url: ccnaSources.blueprint }],
}));
