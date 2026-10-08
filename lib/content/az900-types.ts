/**
 * Shared AZ-900 types.
 *
 * Kept in its own module so the authoring files, the builder, and the page can
 * all import the same shape without creating an import cycle.
 *
 * The field set mirrors what `QuestionExplanation` already renders, so every
 * authored question shows its own evidence instead of the generic schematic:
 * `keyPoints` (the facts that decide the answer), `whyOthers` (why each
 * distractor fails), `requirements` (version, prerequisites, limits) and
 * `sourceRefs` (the exact Learn pages that were read).
 */

import type { Az900DomainId } from "./az900-objectives.ts";

export type Az900Text = { fa: string; en: string; de: string };

export type Az900CommandStep = { label: string; command: string };

export type Az900Question = {
  id: string;
  courseId: "az900";
  domain: string;
  domainId: Az900DomainId;
  objectiveGroupId: string;
  objectiveId: string;
  /** Verbatim study-guide bullet for `objectiveId`. */
  objective: string;
  topic: string;
  text: string;
  options: string[];
  correct: number;
  source: string;
  sourceRefs: string[];
  rationale: Az900Text;
  skillId: string;
  reviewStatus: "draft" | "technical-approved" | "published";
  isOriginal: true;
  difficulty: "easy" | "medium" | "hard";
  keyPoints: string[];
  whyOthers: string[];
  requirements?: string;
  commandPath?: Az900CommandStep[];
  /**
   * How this question was authored. New questions translate at runtime through
   * the existing Google subtitle path, so nothing here stores a copy of an
   * English string in a Persian or German field.
   */
  translations: "runtime-google";
};

/** Compact authoring shape used by the per-domain question files. */
export type Az900Draft = {
  question: string;
  correct: string;
  wrong: [string, string, string];
  rationale: string;
  keyPoints: string[];
  whyOthers: [string, string, string];
  requirements?: string;
  commandPath?: Az900CommandStep[];
  difficulty?: "easy" | "medium" | "hard";
  topic?: string;
};