import { questions } from "./questions";

export type ExamMode = "quick" | "stage" | "mixed" | "full";

export type ExamBlueprint = {
  id: string;
  version: string;
  title: { fa: string; en: string; de: string };
  mode: ExamMode;
  questionCount: number;
  durationMinutes: number;
  capstone: boolean;
};

export const examBlueprints: ExamBlueprint[] = [
  { id: "quick-check", version: "1.0", mode: "quick", questionCount: 8, durationMinutes: 18, capstone: false, title: { fa: "آزمون سریع", en: "Quick Check", de: "Schnelltest" } },
  { id: "stage-assessment", version: "1.0", mode: "stage", questionCount: 40, durationMinutes: 45, capstone: true, title: { fa: "ارزیابی مرحله", en: "Stage Assessment", de: "Stufenprüfung" } },
  { id: "mixed-mock", version: "1.0", mode: "mixed", questionCount: 60, durationMinutes: 75, capstone: true, title: { fa: "آزمون ترکیبی", en: "Mixed Mock", de: "Gemischte Prüfung" } },
  { id: "endurance-review", version: "1.0", mode: "full", questionCount: 120, durationMinutes: 120, capstone: true, title: { fa: "آزمون استقامت و مرور جامع", en: "Endurance & Comprehensive Review", de: "Ausdauer- und Gesamtprüfung" } },
];

export type QuestionForExam = typeof questions[number] & { stageId?: string; primaryDomain?: string; reviewStatus?: string };

export type ExamQuestionOrder = { questionId: string; optionOrder: number[] };

export const officialDomains = [
  "Deploy and manage AD DS",
  "Manage Windows Server instances and workloads in a hybrid environment",
  "Manage virtual machines",
  "Implement and manage on-premises and hybrid networking",
  "Manage storage and file services",
  "Secure Windows Server infrastructure",
  "Monitor and troubleshoot Windows Server environments",
] as const;

const stageByDomain: Record<string, string> = {
  "Deploy and manage AD DS": "ad-ds",
  "Manage Windows Server instances and workloads in a hybrid environment": "hybrid",
  "Manage virtual machines": "virtual-machines",
  "Implement and manage on-premises and hybrid networking": "networking",
  "Manage storage and file services": "storage",
  "Secure Windows Server infrastructure": "security",
  "Monitor and troubleshoot Windows Server environments": "monitoring",
  "Backup, recovery, high availability, and migration crossover": "capstone",
};

export function examQuestionPool() {
  return questions.map((question, index) => ({
    ...question,
    stageId: stageByDomain[question.domain] ?? "capstone",
    // Capstone items are attributed to an existing official domain only for
    // quota calculation; Capstone never receives an independent quota.
    primaryDomain: officialDomains.includes(question.domain as typeof officialDomains[number])
      ? question.domain
      : officialDomains[index % officialDomains.length] ?? officialDomains[0],
  })) as QuestionForExam[];
}

function randomSeed(seed: string) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) value = Math.imul(value ^ seed.charCodeAt(index), 16777619);
  return value >>> 0;
}

function nextRandom(state: { value: number }) {
  state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0;
  return state.value / 0x100000000;
}

export function shuffle<T>(items: T[], seed: string) {
  const output = [...items];
  const state = { value: randomSeed(seed) };
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom(state) * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export function optionOrder(question: QuestionForExam, seed: string) {
  return shuffle(question.options.map((_, index) => index), `${seed}:${question.id}`);
}

export function selectExamQuestions({ mode, pool = questions as QuestionForExam[], stageId, seed = crypto.randomUUID(), recentIds = [] }: { mode: ExamMode; pool?: QuestionForExam[]; stageId?: string; seed?: string; recentIds?: string[] }) {
  const scoped = stageId ? pool.filter((question) => question.stageId === stageId || question.domain === stageId || (stageId === "recovery" && question.domain.includes("crossover"))) : pool;
  const recent = new Set(recentIds);
  const fresh = scoped.filter((question) => !recent.has(question.id));
  const source = fresh.length >= Math.min(scoped.length, examBlueprints.find((blueprint) => blueprint.mode === mode)?.questionCount ?? 8) ? fresh : scoped;
  const blueprint = examBlueprints.find((item) => item.mode === mode) ?? examBlueprints[0];
  const count = mode === "stage" ? Math.min(blueprint.questionCount, source.length) : Math.min(blueprint.questionCount, source.length);
  let candidates = shuffle(source, `${seed}:questions`);
  if (mode === "mixed" || mode === "full") {
    // Keep the official seven-domain distribution. Capstone items are selected
    // only through their primary domain and never receive an eighth quota.
    const byDomain = new Map<string, QuestionForExam[]>();
    for (const domain of officialDomains) byDomain.set(domain, []);
    for (const question of candidates) byDomain.get(question.primaryDomain ?? question.domain)?.push(question);
    const weights = [0.225, 0.125, 0.125, 0.125, 0.175, 0.125, 0.175];
    const rawTargets = weights.map((weight) => count * weight);
    const targets = rawTargets.map(Math.floor);
    let remainder = count - targets.reduce((sum, target) => sum + target, 0);
    [...rawTargets.keys()].sort((left, right) => (rawTargets[right] - targets[right]) - (rawTargets[left] - targets[left])).forEach((index) => {
      if (remainder > 0) { targets[index] += 1; remainder -= 1; }
    });
    const selected: QuestionForExam[] = [];
    officialDomains.forEach((domain, index) => {
      const target = targets[index] ?? 0;
      selected.push(...(byDomain.get(domain) ?? []).slice(0, target));
    });
    candidates = [...selected, ...candidates.filter((question) => !selected.some((item) => item.id === question.id))];
  }
  return candidates.slice(0, count);
}

export function buildQuestionOrder(selected: QuestionForExam[], seed: string): ExamQuestionOrder[] {
  return selected.map((question) => ({ questionId: question.id, optionOrder: optionOrder(question, seed) }));
}

