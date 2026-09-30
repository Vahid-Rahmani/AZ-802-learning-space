import { questions } from "@/lib/course-data";

export type ExplanationLocale = "en" | "fa" | "de";

export type SchematicNode = {
  id: string;
  label: string;
  kind: "input" | "concept" | "decision" | "result";
};

export type SchematicEdge = {
  from: string;
  to: string;
  label?: string;
};

export type QuestionSchematic = {
  title: string;
  nodes: SchematicNode[];
  edges: SchematicEdge[];
};

export type DistractorExplanation = {
  optionIndex: number;
  option: string;
  reason: string;
};

export type StructuredQuestionExplanation = {
  questionId: string;
  locale: ExplanationLocale;
  provider: "local";
  summary: string;
  whyCorrect: string;
  distractors: DistractorExplanation[];
  decisionSteps: string[];
  schematic: QuestionSchematic;
  source: { title: string; url: string };
  generatedAt: string;
};

type CanonicalQuestion = (typeof questions)[number];

const domainLabels: Record<string, string> = {
  "Deploy and manage AD DS": "AD DS identity and directory services",
  "Manage Windows Server instances and workloads in a hybrid environment": "Hybrid Windows Server management",
  "Manage virtual machines": "Virtual machines and Hyper-V",
  "Implement and manage on-premises and hybrid networking": "Windows Server networking",
  "Manage storage and file services": "Storage and file services",
  "Secure Windows Server infrastructure": "Windows Server security",
  "Monitor and troubleshoot Windows Server environments": "Monitoring and troubleshooting",
  "Backup, recovery, high availability, and migration crossover": "Recovery, high availability, and migration",
};

function domainLabel(question: CanonicalQuestion) {
  return domainLabels[question.domain] ?? question.domain;
}

/**
 * A compact, deterministic visual model for every question. This intentionally
 * stays local and predictable. A browser-mode hand-off can optionally ask a
 * user's signed-in Google AI Mode session for a second explanation, but it
 * never changes the deterministic graph shape returned to the browser.
 */
export function schematicForQuestion(question: CanonicalQuestion): QuestionSchematic {
  const answer = question.options[question.correct] ?? "Correct answer";
  const domain = domainLabel(question);
  return {
    title: `${domain}: identify the control point`,
    nodes: [
      { id: "scenario", label: "Scenario / symptom", kind: "input" },
      { id: "concept", label: domain, kind: "concept" },
      { id: "decision", label: "Choose the relevant control or command", kind: "decision" },
      { id: "result", label: answer, kind: "result" },
    ],
    edges: [
      { from: "scenario", to: "concept", label: "classify" },
      { from: "concept", to: "decision", label: "apply the objective" },
      { from: "decision", to: "result", label: "verify" },
    ],
  };
}

export function questionById(questionId: string) {
  return questions.find((question) => question.id === questionId) ?? null;
}

function localizedRationale(question: CanonicalQuestion, locale: ExplanationLocale) {
  return question.rationale[locale] ?? question.rationale.en;
}

export function createLocalExplanation(question: CanonicalQuestion, locale: ExplanationLocale = "en"): StructuredQuestionExplanation {
  const answer = question.options[question.correct] ?? "the selected answer";
  const labels = locale === "fa"
    ? { summary: `این سؤال ${domainLabel(question)} را می‌سنجد.`, reason: "این گزینه نیازمندی سؤال را به‌اندازهٔ پاسخ درست برآورده نمی‌کند.", scope: "سرویس، دامنه و محدودیت سناریو را مشخص کنید.", map: `محدودیت را به هدف ${domainLabel(question)} وصل کنید.`, select: `گزینهٔ ${answer} را انتخاب و نتیجه را با منبع Microsoft Learn بررسی کنید.` }
    : locale === "de"
      ? { summary: `Diese Frage prüft ${domainLabel(question)}.`, reason: "Diese Option erfüllt die Anforderung nicht so direkt wie die richtige Antwort.", scope: "Bestimme Dienst, Bereich und Einschränkung des Szenarios.", map: `Ordne die Einschränkung dem Ziel ${domainLabel(question)} zu.`, select: `Wähle ${answer} und prüfe das Ergebnis mit der verknüpften Microsoft-Learn-Quelle.` }
      : { summary: `This question tests ${domainLabel(question)}.`, reason: "This option does not satisfy the stated requirement as directly as the correct answer.", scope: "Identify the service, scope, and failure or design constraint in the scenario.", map: `Map that constraint to the ${domainLabel(question)} objective.`, select: `Select ${answer} and validate the result with the linked Microsoft Learn source.` };
  const distractors = question.options
    .map((option, optionIndex) => ({ option, optionIndex }))
    .filter(({ optionIndex }) => optionIndex !== question.correct)
    .map(({ option, optionIndex }) => ({
      optionIndex,
      option,
      reason: labels.reason,
    }));
  const rationale = localizedRationale(question, locale);
  const languageNote = locale === "fa" ? "اصطلاحات فنی را در کنار معادل انگلیسی آن‌ها دنبال کنید." : locale === "de" ? "Behalten Sie die englischen Fachbegriffe neben der Übersetzung bei." : "Keep the English technical terms visible while you reason through the scenario.";
  return {
    questionId: question.id,
    locale,
    provider: "local",
    summary: labels.summary,
    whyCorrect: `${rationale} ${languageNote}`,
    distractors,
    decisionSteps: [
      labels.scope,
      labels.map,
      labels.select,
    ],
    schematic: schematicForQuestion(question),
    source: { title: "Microsoft Learn — AZ-802 study guide", url: question.source },
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeLocale(value: unknown): ExplanationLocale {
  return value === "fa" || value === "de" ? value : "en";
}

export function stripJsonFence(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

