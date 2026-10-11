import { gradedLearningCriteria, type LearningTask } from "./content/cisco-learning";

export type LearningProgress = {
  completed: string[];
  lastTask?: string;
  answers: Record<string, string[]>;
  verified?: Record<string, string[]>;
};

/** Knowledge answers and live device criteria are separate, task-specific measures. */
export function taskMeasurement(task: LearningTask, progress: LearningProgress) {
  const knowledge = task.assessment.startsWith("guided");
  const criteria = knowledge ? (task.reviewQuestions ?? []).map((q, i) => ({
    id: `${task.id}-answer-${i}`, title: q.questionFa,
    passed: progress.answers[task.id]?.[i] === q.answerFa,
  })) : gradedLearningCriteria(task).map(c => ({
    id: c.id, title: c.assertionFa,
    passed: progress.verified?.[task.id]?.includes(c.id) ?? progress.completed.includes(task.id),
  }));
  const passed = criteria.filter(c => c.passed).length;
  return { criteria, passed, total: criteria.length, percent: criteria.length ? Math.floor(passed / criteria.length * 100) : 0,
    complete: criteria.length > 0 && passed === criteria.length, knowledge };
}
