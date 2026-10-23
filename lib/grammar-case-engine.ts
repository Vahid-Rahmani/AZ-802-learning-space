import { grammarMissions, grammarFinal, grammarDiagnostic, type GrammarPrompt, type GrammarSkill } from "./content/grammar-cases.ts";

export const GRAMMAR_DAY = 86_400_000;
export const GRAMMAR_INTERVALS = [1, 3, 7, 14] as const;
export const MAX_GRAMMAR_INPUT = 700;
export type Assessment = {
  status: "verified" | "error" | "uncertain" | "empty";
  meaning: "matched" | "mismatch" | "unknown"; grammar: "matched" | "needs-work" | "unknown";
  naturalness: "not-assessed"; code?: GrammarSkill; message: string;
};
export type Attempt = { answer: string; at: number; helped: boolean; result: Assessment };
export type Work = { draft: string; attempts: Attempt[]; hints: number; modelSeen: boolean; selfReviewed: boolean };
export type MissionEvidence = { main: Work; transfer: Work; completedAt: number | null; dueAt: number | null; reviewLevel: number; reviews: Attempt[]; review: Work; reviewStarted: boolean };
export type GrammarProgress = { version: 1; diagnostic: Record<string, number>; diagnosticAt: number | null; missions: Record<string, MissionEvidence>; final: Record<string, Attempt>; finalDraft: string; finalStarted: boolean; finalFinishedAt: number | null };
const work = (): Work => ({ draft: "", attempts: [], hints: 0, modelSeen: false, selfReviewed: false });
const evidence = (): MissionEvidence => ({ main: work(), transfer: work(), completedAt: null, dueAt: null, reviewLevel: 0, reviews: [], review: work(), reviewStarted: false });
export function createGrammarProgress(): GrammarProgress {
  return { version: 1, diagnostic: {}, diagnosticAt: null, missions: Object.fromEntries(grammarMissions.map(m => [m.id, evidence()])), final: {}, finalDraft: "", finalStarted: false, finalFinishedAt: null };
}
const upperFirst = (s: string) => s[0].toLocaleUpperCase("de") + s.slice(1);
export function grammarModel(p: GrammarPrompt) { return `Wenn ${p.condition}, ${p.consequence}.`; }
export function grammarAnswers(p: GrammarPrompt): string[] {
  const words = p.consequence.split(" ");
  const subjectEnd = ["das", "der", "die"].includes(words[1]) ? 3 : 2;
  return [grammarModel(p), `${upperFirst(words.slice(1, subjectEnd).join(" "))} ${words[0]} ${words.slice(subjectEnd).join(" ")}, wenn ${p.condition}.`, ...p.variants];
}
// Ignore punctuation, whitespace, Unicode composition and sentence-initial casing, not noun casing or umlauts.
export function normalizeGrammar(text: string) {
  return text.normalize("NFC").replace(/[.,!?;:]/g, " ").replace(/\s+/g, " ").trim().replace(/^./u, c => c.toLocaleLowerCase("de"));
}
export function grammarErrorExamples(p: GrammarPrompt): { answer: string; code: GrammarSkill }[] {
  const model = grammarModel(p);
  const cond = p.condition.split(" "); const aux = cond.pop()!;
  const main = p.consequence.split(" ");
  const opposite: Record<string, string> = { hätte: "wäre", wäre: "hätte", hätten: "wären", wären: "hätten" };
  const examples: { answer: string; code: GrammarSkill }[] = [
    { answer: `Wenn ${cond.join(" ")} ${opposite[aux] ?? aux}, ${p.consequence}.`, code: "auxiliary" },
    { answer: `Wenn ${cond[0]} ${aux} ${cond.slice(1).join(" ")}, ${p.consequence}.`, code: "subordinate" },
    { answer: `Wenn ${p.condition}, ${main[1]} ${main[0]} ${main.slice(2).join(" ")}.`, code: "inversion" },
    { answer: model.replace(/\b(gefahren|losgefahren|aufgestanden|mitgenommen|geschrieben|gelesen|gefunden|geblieben|gespart|geprüft)\b/, "machen"), code: "participle" },
  ];
  return examples.filter(e => normalizeGrammar(e.answer) !== normalizeGrammar(model));
}
export const grammarHints: Record<GrammarSkill, string[]> = {
  meaning: ["ماجرا تمام شده است؛ دربارهٔ گذشته‌ای متفاوت حرف می‌زنی، نه برنامهٔ آینده.", "از Partizip II همراه hätte / wäre استفاده کن؛ würde + Infinitiv این گذشته را بیان نمی‌کند."],
  auxiliary: ["به فعل نگاه کن: حرکت یا تغییر حالت معمولاً با sein؛ بسیاری از فعل‌های دیگر با haben.", "صورت فرضی گذشته را از Perfekt بساز: hat → hätte، ist → wäre؛ برای wir/sie جمع: hätten / wären."],
  participle: ["گذشتهٔ فعل را پیدا کن؛ Infinitiv به‌تنهایی کافی نیست.", "مثلاً lesen → gelesen و fahren → gefahren؛ آخر جملهٔ wenn، فعل کمکی بعد از Partizip II می‌آید."],
  subordinate: ["در بخش شروع‌شده با wenn، فعل صرف‌شده باید آخر بیاید.", "الگو: Wenn + فاعل + بقیهٔ جمله + Partizip II + hätte / wäre, …"],
  inversion: ["جملهٔ wenn یک جایگاه را پر کرده؛ جملهٔ اصلی با فعل صرف‌شده شروع می‌شود.", "بعد از ویرگول: hätte/wäre + فاعل + … + Partizip II. اگر جملهٔ اصلی را اول بیاوری، فاعل قبل از فعل می‌آید."],
  transfer: ["شرط و نتیجهٔ این موقعیت را جدا کن؛ داستان قبلی را کپی نکن.", "ابتدا زمان گذشتهٔ خلاف واقع را بساز؛ سپس فعل کمکی و جایگاه فعل هر دو بخش را کنترل کن."],
};
export function assessGrammar(p: GrammarPrompt, input: string): Assessment {
  const base = { naturalness: "not-assessed" as const };
  if (!input.trim()) return { ...base, status: "empty", meaning: "unknown", grammar: "unknown", message: "ابتدا یک جملهٔ آلمانی بنویس." };
  const answer = normalizeGrammar(input);
  if (grammarAnswers(p).some(a => normalizeGrammar(a) === answer)) return { ...base, status: "verified", meaning: "matched", grammar: "matched", message: "معنا و ساختار هدف در محدودهٔ این تمرین تأیید شد. طبیعی‌بودن همهٔ سبک‌های بیان جداگانه ارزیابی نشده است." };
  const error = grammarErrorExamples(p).find(e => normalizeGrammar(e.answer) === answer);
  if (error) return { ...base, status: "error", meaning: "unknown", grammar: "needs-work", code: error.code, message: grammarHints[error.code][0] + " ممکن است منظورت قابل‌فهم باشد؛ این بازخورد دربارهٔ ساختار است." };
  // These complete, grammatical sentences are real meaning contrasts, not blanket regex rejection.
  if (["Wenn ich Zeit habe, komme ich.", "Wenn ich Zeit hätte, käme ich."].some(s => normalizeGrammar(s) === answer)) return { ...base, status: "error", meaning: "mismatch", grammar: "unknown", code: "meaning", message: "این جمله می‌تواند از نظر دستور درست باشد، ولی داستان این مأموریت دربارهٔ گذشته‌ای است که اتفاق نیفتاده، نه زمان حال." };
  return { ...base, status: "uncertain", meaning: "unknown", grammar: "unknown", message: "این بیان در پاسخ‌های پشتیبانی‌شده نیست؛ آن را غلط حساب نمی‌کنیم. پس از تلاش دوباره می‌توانی با نمونه مقایسه و خودبررسی کنی؛ خودبررسی تأیید مستقل نمی‌گیرد." };
}
export function workPassed(w: Work) { return w.attempts.at(-1)?.result.status === "verified" || w.selfReviewed; }
export function missionUnlocked(p: GrammarProgress, id: string) {
  const index = grammarMissions.findIndex(m => m.id === id);
  return p.diagnosticAt !== null && index >= 0 && (index === 0 || p.missions[grammarMissions[index - 1].id].completedAt !== null);
}
export function finalUnlocked(p: GrammarProgress) { return grammarMissions.every(m => p.missions[m.id].completedAt !== null); }
export type GrammarAction =
  | { type: "diagnostic"; id: string; choice: number }
  | { type: "draft"; id: string; phase: "main" | "transfer" | "review"; text: string }
  | { type: "hint" | "model" | "submit" | "self-review"; id: string; phase: "main" | "transfer" | "review" }
  | { type: "start-review"; id: string }
  | { type: "start-final" }
  | { type: "final-draft"; text: string }
  | { type: "final-answer"; id: string; text: string };
export function applyGrammarAction(p: GrammarProgress, action: GrammarAction, now = Date.now()): GrammarProgress {
  if (!Number.isFinite(now) || now < 0) return p;
  if (action.type === "diagnostic") {
    const q = grammarDiagnostic.find(q => q.id === action.id);
    if (p.diagnosticAt !== null || !q || action.id in p.diagnostic || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= q.options.length) return p;
    const next = structuredClone(p); next.diagnostic[action.id] = action.choice;
    if (grammarDiagnostic.every(q => q.id in next.diagnostic)) next.diagnosticAt = now;
    return next;
  }
  if (action.type === "start-final") {
    if (!finalUnlocked(p) || p.finalFinishedAt !== null) return p;
    return { ...p, finalStarted: true };
  }
  if (action.type === "final-draft") {
    if (!p.finalStarted || p.finalFinishedAt !== null || !finalUnlocked(p)) return p;
    return { ...p, finalDraft: action.text.slice(0, MAX_GRAMMAR_INPUT) };
  }
  if (action.type === "final-answer") {
    const item = grammarFinal.find(q => q.id === action.id);
    if (!p.finalStarted || !finalUnlocked(p) || !item || p.final[action.id] || !action.text.trim() || action.text.length > MAX_GRAMMAR_INPUT) return p;
    const next = structuredClone(p);
    next.finalDraft = "";
    next.final[action.id] = { answer: action.text, at: now, helped: false, result: assessGrammar(item, action.text) };
    if (grammarFinal.every(q => next.final[q.id])) next.finalFinishedAt = now;
    return next;
  }
  const mission = grammarMissions.find(m => m.id === action.id);
  if (!mission || !missionUnlocked(p, mission.id)) return p;
  const previous = p.missions[mission.id];
  if (action.type === "start-review") {
    if (previous.completedAt === null || previous.dueAt === null || now < previous.dueAt || previous.reviewStarted) return p;
    const next = structuredClone(p); next.missions[mission.id].reviewStarted = true; next.missions[mission.id].review = work(); return next;
  }
  if (action.phase === "transfer" && !workPassed(previous.main)) return p;
  if (action.phase === "review" && !previous.reviewStarted) return p;
  const next = structuredClone(p), current = next.missions[mission.id], w = current[action.phase];
  const item = action.phase === "main" ? mission.main : mission.transfer;
  if (action.type === "draft") { w.draft = action.text.slice(0, MAX_GRAMMAR_INPUT); return next; }
  // Do not turn a passed prompt into a second source of completion credit.
  if (action.phase !== "review" && workPassed(w)) return p;
  if (action.type === "hint") { w.hints = Math.min(3, w.hints + 1); return next; }
  if (action.type === "model") {
    if (w.attempts.length < 2) return p;
    w.modelSeen = true; return next;
  }
  if (action.type === "self-review") {
    if (action.phase === "review" || !w.modelSeen || w.attempts.length < 2 || w.attempts.at(-1)?.result.status !== "uncertain" || !eligibleSelfReview(w.draft)) return p;
    w.selfReviewed = true;
  }
  if (action.type === "submit") {
    if (!w.draft.trim()) return p;
    const result = assessGrammar(item, w.draft);
    const attempt = { answer: w.draft, at: now, helped: w.hints > 0 || w.modelSeen || w.attempts.length > 0, result };
    w.attempts = w.attempts.length < 40 ? [...w.attempts, attempt] : [w.attempts[0], ...w.attempts.slice(-38), attempt];
    if (action.phase === "review") {
      current.reviews = [...current.reviews.slice(-39), attempt];
      if (result.status === "verified") {
        current.reviewLevel = attempt.helped ? 0 : Math.min(3, current.reviewLevel + 1);
        current.dueAt = now + GRAMMAR_INTERVALS[current.reviewLevel] * GRAMMAR_DAY;
        current.reviewStarted = false;
      }
      return next;
    }
  }
  if (current.completedAt === null && workPassed(current.main) && workPassed(current.transfer)) {
    current.completedAt = now; current.dueAt = now + GRAMMAR_DAY;
  }
  return next;
}
export function eligibleSelfReview(text: string) {
  return text.length >= 35 && new Set(text.trim().split(/\s+/)).size >= 7 && /\bwenn\b/i.test(text) && /\b(hätte|wäre|hätten|wären)\b/.test(text);
}
export function grammarSummary(p: GrammarProgress, now = Date.now()) {
  const all = Object.values(p.missions), works = all.flatMap(e => [e.main, e.transfer]);
  return {
    completed: all.filter(e => e.completedAt !== null).length,
    firstTry: works.filter(w => w.attempts[0]?.result.status === "verified").length,
    independent: works.filter(w => w.attempts[0]?.result.status === "verified" && !w.attempts[0].helped).length,
    assisted: works.filter(w => w.attempts.some(a => a.result.status === "verified" && a.helped)).length,
    selfCorrected: works.filter(w => w.attempts[0] && w.attempts[0].result.status !== "verified" && w.attempts.some(a => a.result.status === "verified") && !w.modelSeen).length,
    transfer: all.filter(e => e.transfer.attempts[0]?.result.status === "verified" && !e.transfer.attempts[0].helped).length,
    delayed: all.filter(e => e.reviews.some(a => a.result.status === "verified" && !a.helped)).length,
    due: grammarMissions.filter(m => p.missions[m.id].dueAt !== null && p.missions[m.id].dueAt! <= now).map(m => m.id),
    selfReviewed: works.filter(w => w.selfReviewed).length,
    // Story rewards do not change the evidence counters above.
    storyPoints: all.filter(e => e.completedAt !== null).length * 10 + works.filter(w => w.attempts[0]?.result.status === "verified" && !w.attempts[0].helped).length * 3,
  };
}

export function parseGrammarProgress(raw: unknown): GrammarProgress | null {
  if (!raw || typeof raw !== "object" || (raw as GrammarProgress).version !== 1) return null;
  const source = raw as GrammarProgress, next = createGrammarProgress();
  const time = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
  try {
    for (const q of grammarDiagnostic) if (Number.isInteger(source.diagnostic?.[q.id]) && source.diagnostic[q.id] >= 0 && source.diagnostic[q.id] < q.options.length) next.diagnostic[q.id] = source.diagnostic[q.id];
    if (grammarDiagnostic.every(q => q.id in next.diagnostic) && time(source.diagnosticAt)) next.diagnosticAt = source.diagnosticAt;
    const readAttempts = (list: Attempt[], prompt: GrammarPrompt) => Array.isArray(list) ? list.slice(-40).filter(a => a && typeof a.answer === "string" && a.answer.length <= MAX_GRAMMAR_INPUT && time(a.at) && typeof a.helped === "boolean").map(a => ({ answer: a.answer, at: a.at, helped: a.helped, result: assessGrammar(prompt, a.answer) })) : [];
    for (const m of grammarMissions) {
      const value = source.missions?.[m.id]; if (!value) continue;
      const target = next.missions[m.id];
      for (const phase of ["main", "transfer", "review"] as const) {
        const w = value[phase]; if (!w) continue;
        const prompt = phase === "main" ? m.main : m.transfer;
        target[phase] = { draft: typeof w.draft === "string" ? w.draft.slice(0, MAX_GRAMMAR_INPUT) : "", attempts: readAttempts(w.attempts, prompt), hints: Number.isInteger(w.hints) ? Math.max(0, Math.min(3, w.hints)) : 0, modelSeen: w.modelSeen === true, selfReviewed: false };
        const restored = target[phase];
        restored.selfReviewed = phase !== "review" && w.selfReviewed === true && restored.modelSeen && restored.attempts.length >= 2 && restored.attempts.at(-1)?.result.status === "uncertain" && eligibleSelfReview(restored.draft);
      }
      if (missionUnlocked(next, m.id) && workPassed(target.main) && workPassed(target.transfer) && time(value.completedAt)) {
        target.completedAt = value.completedAt;
        target.dueAt = time(value.dueAt) && value.dueAt > value.completedAt ? value.dueAt : value.completedAt + GRAMMAR_DAY;
        target.reviewLevel = Number.isInteger(value.reviewLevel) ? Math.max(0, Math.min(3, value.reviewLevel)) : 0;
        target.reviews = readAttempts(value.reviews, m.transfer).filter(a => a.at >= value.completedAt! + GRAMMAR_DAY);
        target.reviewStarted = value.reviewStarted === true;
      }
    }
    if (finalUnlocked(next)) {
      next.finalStarted = source.finalStarted === true;
      next.finalDraft = typeof source.finalDraft === "string" ? source.finalDraft.slice(0, MAX_GRAMMAR_INPUT) : "";
      for (const q of grammarFinal) { const a = source.final?.[q.id]; if (a) { const list = readAttempts([a], q); if (list.length) next.final[q.id] = list[0]; } }
      if (grammarFinal.every(q => next.final[q.id]) && time(source.finalFinishedAt)) next.finalFinishedAt = source.finalFinishedAt;
    }
    return next;
  } catch { return null; }
}
