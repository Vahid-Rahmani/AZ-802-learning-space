import type { GrammarLesson } from "./types.ts";
import { remainingPractice } from "./remaining/index.ts";

export type ModuleWritingTask = {
  id: string;
  promptFa: string;
  model: string;
  checklist: string[];
};

/**
 * Every ready module gets the same five-part workspace as module 09. The
 * authored zu-Infinitiv tasks live in index.ts; this helper gives the other
 * modules a real writing and dictation path from their own lesson examples.
 */
export function writingTasksForLesson(lesson: GrammarLesson): ModuleWritingTask[] {
  return lesson.sections.slice(0, 4).map((section, index) => ({
    id: `s${index + 1}`,
    promptFa: `یک جملهٔ کامل آلمانی با ساختار «${section.titleFa}» بنویس. یک موقعیت تازه از زندگی روزمره یا کار انتخاب کن؛ جملهٔ نمونه را کپی نکن.`,
    model: section.examples[0],
    checklist: [
      `ساختار «${section.titleDe}» در جمله دیده می‌شود.`,
      "فعل صرف‌شده در جای درست است.",
      "جمله از نظر معنا کامل است.",
      "حروف بزرگ و علائم نگارشی درست‌اند.",
    ],
  }));
}

export function dictationForLesson(lesson: GrammarLesson): string[] {
  const sentences = lesson.sections.flatMap((section) => section.examples);
  return Array.from(new Set(sentences)).slice(0, 6);
}

/** Authored practice takes precedence over lesson-derived prompts. */
export function practiceForModule(moduleId: string): { writing: ModuleWritingTask[]; dictation: string[] } | null {
  return remainingPractice[moduleId] ?? null;
}
