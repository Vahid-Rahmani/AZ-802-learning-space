/** Browser-only practice evidence, not certification or automatic free-writing grading. */
export type GermanMode = "copy" | "dictation" | "recall" | "writing";
export type CharacterStatus = "correct" | "incorrect" | "pending";
export type GermanCharacter = { character: string; status: CharacterStatus };
type AlignedCharacter = GermanCharacter & { typedIndex: number | null };

export const LEITNER_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const MAX_GERMAN_INPUT = 1000;
const DAY = 86_400_000;
const MODES: GermanMode[] = ["copy", "dictation", "recall", "writing"];

export function normalizeGermanText(text: string): string {
  return text.normalize("NFC").slice(0, MAX_GERMAN_INPUT);
}

/** Align to the best expected prefix: one missing/extra letter does not spoil its suffix. */
function alignCharacters(expected: string, typed: string): AlignedCharacter[] {
  const target = Array.from(normalizeGermanText(expected));
  const input = Array.from(normalizeGermanText(typed));
  const width = input.length + 1;
  const distance = new Uint16Array((target.length + 1) * width);
  const matches = new Uint16Array(distance.length);
  const direction = new Uint8Array(distance.length); // 1 diagonal, 2 missing, 3 extra
  for (let i = 1; i <= target.length; i++) { distance[i * width] = i; direction[i * width] = 2; }
  for (let j = 1; j <= input.length; j++) { distance[j] = j; direction[j] = 3; }
  for (let i = 1; i <= target.length; i++) {
    for (let j = 1; j <= input.length; j++) {
      const cell = i * width + j;
      const equal = target[i - 1] === input[j - 1];
      let cost = distance[cell - width - 1] + Number(!equal);
      let count = matches[cell - width - 1] + Number(equal);
      let move = 1;
      for (const [neighbor, candidateMove] of [[cell - width, 2], [cell - 1, 3]]) {
        const candidateCost = distance[neighbor] + 1;
        if (candidateCost < cost || (candidateCost === cost && matches[neighbor] > count)) {
          cost = candidateCost; count = matches[neighbor]; move = candidateMove;
        }
      }
      distance[cell] = cost; matches[cell] = count; direction[cell] = move;
    }
  }
  let end = 0;
  for (let i = 1; i <= target.length; i++) {
    const candidate = i * width + input.length;
    const current = end * width + input.length;
    if (distance[candidate] < distance[current]
      || (distance[candidate] === distance[current] && matches[candidate] > matches[current])
      || (distance[candidate] === distance[current] && matches[candidate] === matches[current]
        && Math.abs(i - input.length) < Math.abs(end - input.length))) end = i;
  }
  const reversed: AlignedCharacter[] = [];
  let i = end; let j = input.length;
  while (i > 0 || j > 0) {
    const move = direction[i * width + j];
    if (move === 1) {
      reversed.push({ character: target[i - 1], status: target[i - 1] === input[j - 1] ? "correct" : "incorrect", typedIndex: j - 1 });
      i--; j--;
    } else if (move === 2) {
      reversed.push({ character: target[i - 1], status: "incorrect", typedIndex: null }); i--;
    } else {
      reversed.push({ character: input[j - 1], status: "incorrect", typedIndex: j - 1 }); j--;
    }
  }
  return reversed.reverse().concat(target.slice(end).map((character) => ({ character, status: "pending" as const, typedIndex: null })));
}

export function compareCharacters(expected: string, typed: string): GermanCharacter[] {
  return alignCharacters(expected, typed).map(({ character, status }) => ({ character, status }));
}

/** Dictation/recall overlay must never reveal expected or pending characters. */
export function compareTypedCharacters(expected: string, typed: string): GermanCharacter[] {
  const input = Array.from(normalizeGermanText(typed));
  return alignCharacters(expected, typed).filter((item) => item.typedIndex !== null)
    .map((item) => ({ character: input[item.typedIndex!], status: item.status }));
}

export function isGermanAnswerCorrect(expected: string, typed: string): boolean {
  return normalizeGermanText(expected) === normalizeGermanText(typed);
}

export type GermanLessonProgress = {
  draft: string;
  mode: GermanMode;
  box: number;
  dueAt: number | null;
  lastPromotedDay: string | null;
  counters: Record<GermanMode, { attempted: number; correct: number }>;
  independentRecallCount: number;
  writingReviews: number;
  lastAttemptAt: number | null;
};
export type GermanProgress = { version: 1; lessons: Record<string, GermanLessonProgress> };

function freshLesson(): GermanLessonProgress {
  return { draft: "", mode: "copy", box: 1, dueAt: null, lastPromotedDay: null,
    counters: { copy: { attempted: 0, correct: 0 }, dictation: { attempted: 0, correct: 0 }, recall: { attempted: 0, correct: 0 }, writing: { attempted: 0, correct: 0 } },
    independentRecallCount: 0, writingReviews: 0, lastAttemptAt: null };
}
function safeId(id: string): boolean { return id !== "__proto__" && id !== "constructor" && id !== "prototype"; }
export function createGermanProgress(lessonIds: readonly string[]): GermanProgress {
  return { version: 1, lessons: Object.fromEntries(lessonIds.filter(safeId).map((id) => [id, freshLesson()])) };
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const counter = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
const timestamp = (value: unknown): value is number | null => value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000);

/** Reject malformed state rather than inventing completion. Unknown lesson IDs are dropped. */
export function parseGermanProgress(value: unknown, lessonIds: readonly string[]): GermanProgress | null {
  if (typeof value === "string") {
    if (value.length > 250_000) return null;
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!object(value) || value.version !== 1 || !object(value.lessons)) return null;
  const progress = createGermanProgress(lessonIds);
  for (const id of Object.keys(progress.lessons)) {
    if (!Object.hasOwn(value.lessons, id)) continue;
    const lesson = value.lessons[id];
    if (!object(lesson) || typeof lesson.draft !== "string" || lesson.draft.length > MAX_GERMAN_INPUT
      || !MODES.includes(lesson.mode as GermanMode) || !Number.isInteger(lesson.box) || Number(lesson.box) < 1 || Number(lesson.box) > 5
      || !timestamp(lesson.dueAt) || !timestamp(lesson.lastAttemptAt)
      || !(lesson.lastPromotedDay === null || (typeof lesson.lastPromotedDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(lesson.lastPromotedDay)))
      || !counter(lesson.independentRecallCount) || !counter(lesson.writingReviews) || !object(lesson.counters)) return null;
    const counters = freshLesson().counters;
    for (const mode of MODES) {
      const entry = lesson.counters[mode];
      if (!object(entry) || !counter(entry.attempted) || !counter(entry.correct) || entry.correct > entry.attempted
        || (mode === "writing" && entry.correct !== 0)) return null;
      counters[mode] = { attempted: entry.attempted, correct: entry.correct };
    }
    if (lesson.independentRecallCount > counters.recall.correct || lesson.writingReviews > counters.writing.attempted) return null;
    progress.lessons[id] = { draft: normalizeGermanText(lesson.draft), mode: lesson.mode as GermanMode,
      box: Number(lesson.box), dueAt: lesson.dueAt, lastPromotedDay: lesson.lastPromotedDay as string | null,
      counters, independentRecallCount: lesson.independentRecallCount, writingReviews: lesson.writingReviews, lastAttemptAt: lesson.lastAttemptAt };
  }
  return progress;
}

export function updateGermanDraft(progress: GermanProgress, id: string, mode: GermanMode, draft: string): GermanProgress {
  if (!Object.hasOwn(progress.lessons, id) || !MODES.includes(mode)) return progress;
  return { ...progress, lessons: { ...progress.lessons, [id]: { ...progress.lessons[id], mode, draft: normalizeGermanText(draft) } } };
}

export function recordGermanAttempt(progress: GermanProgress, id: string,
  attempt: { mode: GermanMode; correct: boolean; hintUsed?: boolean; now?: number }): GermanProgress {
  if (!Object.hasOwn(progress.lessons, id) || !MODES.includes(attempt.mode)) return progress;
  const now = attempt.now ?? Date.now();
  if (!timestamp(now) || now === null) return progress;
  const original = progress.lessons[id];
  const lesson: GermanLessonProgress = { ...original, mode: attempt.mode, lastAttemptAt: now,
    counters: { ...original.counters, [attempt.mode]: { attempted: original.counters[attempt.mode].attempted + 1,
      correct: original.counters[attempt.mode].correct + Number(attempt.correct && attempt.mode !== "writing") } } };
  if (attempt.mode === "writing") lesson.writingReviews++;
  if (attempt.mode === "recall") {
    if (attempt.correct && !attempt.hintUsed) {
      lesson.independentRecallCount++;
      const day = new Date(now).toISOString().slice(0, 10);
      // Promotions require a due review and cannot be farmed by repeating today.
      if (lesson.lastPromotedDay !== day && (lesson.dueAt === null || lesson.dueAt <= now)) {
        lesson.box = Math.min(5, lesson.box + 1);
        lesson.lastPromotedDay = day;
        lesson.dueAt = now + LEITNER_INTERVAL_DAYS[lesson.box - 1] * DAY;
      }
    } else if (!attempt.correct) {
      lesson.box = Math.max(1, lesson.box - 1);
      lesson.dueAt = now + LEITNER_INTERVAL_DAYS[lesson.box - 1] * DAY;
    }
  }
  return { ...progress, lessons: { ...progress.lessons, [id]: lesson } };
}

export function getGermanSummary(progress: GermanProgress, lessonIds: readonly string[], now = Date.now()) {
  const lessons = lessonIds.map((id) => progress.lessons[id]).filter(Boolean);
  return {
    totalLessons: lessons.length,
    practicedLessons: lessons.filter((lesson) => MODES.some((mode) => lesson.counters[mode].attempted > 0)).length,
    independentRecallLessons: lessons.filter((lesson) => lesson.independentRecallCount > 0).length,
    dueLessons: lessons.filter((lesson) => lesson.dueAt !== null && lesson.dueAt <= now).length,
    newLessons: lessons.filter((lesson) => lesson.dueAt === null && lesson.independentRecallCount === 0).length,
    copyPasses: lessons.reduce((sum, lesson) => sum + lesson.counters.copy.correct, 0),
    dictationPasses: lessons.reduce((sum, lesson) => sum + lesson.counters.dictation.correct, 0),
    independentRecallPasses: lessons.reduce((sum, lesson) => sum + lesson.independentRecallCount, 0),
    writingReviews: lessons.reduce((sum, lesson) => sum + lesson.writingReviews, 0),
  };
}
