import { getSatztatMission, satztatCases, satztatDiagnostics, type SatztatCaseId, type SatztatDiagnostic, type SatztatRepair } from "./content/satztat-missions.ts";

export type { SatztatCaseId, SatztatDiagnostic, SatztatRepair } from "./content/satztat-missions.ts";
export { satztatCases, satztatDiagnostics } from "./content/satztat-missions.ts";
export type SatztatReportResult = "unsubmitted" | "verified" | "needs-repair" | "not-assessed";
export type SatztatAction =
  | { type: "hypothesis" | "draft"; value: string }
  | { type: "diagnostic"; diagnostic: SatztatDiagnostic }
  | { type: "repair"; repair: SatztatRepair }
  | { type: "technical-hint" | "language-hint" | "reveal-model" | "submit-report" | "self-review" | "start-review" | "review-report" };
export interface SatztatObservation { diagnostic: SatztatDiagnostic; revision: number; ok: boolean; text: string }
export interface SatztatAttempt {
  at: number; answer: string; result: SatztatReportResult; independent: boolean;
  languageAssistance: number; technicalAssistance: number; kind: "report" | "review";
}
export interface SatztatCaseProgress {
  network: { recordAddress: string; clientDns: string; cacheAddress: string | null; revision: number };
  observations: SatztatObservation[];
  log: { at: number; kind: string; text: string }[];
  hypothesis: string; baseline: string; draft: string;
  attempts: SatztatAttempt[]; submissionCount: number; firstAttempt: SatztatAttempt | null;
  hintLevel: number; revealed: boolean; technicalAssistance: number; languageAssistance: number;
  reportResult: SatztatReportResult; reportFeedback: string; selfReview: boolean;
  reviewDueAt: number | null; reviewLevel: number; lastReviewDay: string | null;
  reviewStartedAt: number | null; reviewAssisted: boolean; reviewSubmissionCount: number;
}
export interface SatztatProgress { version: 1; contentVersion: 1; cases: Record<SatztatCaseId, SatztatCaseProgress> }
export interface SatztatCaseResult {
  unlocked: boolean; technicalResolved: boolean; languageVerified: boolean; independentLanguage: boolean;
  storyCompleted: boolean; transferVerified: boolean; needsFreshDiagnostics: boolean;
}
const DAY = 86_400_000;
export const SATZTAT_REVIEW_DAYS = [1, 3, 7, 14] as const;
export const SATZTAT_MAX_DRAFT = 2000;
const ids: SatztatCaseId[] = ["dns-record", "dns-client"];
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8_000_000_000_000_000;
const count = (value: unknown, max = 1_000_000): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = SATZTAT_MAX_DRAFT): value is string => typeof value === "string" && value.length <= max;
const normalize = (value: string) => value.normalize("NFC").trim().replace(/\s+/gu, " ").replace(/[.!]$/u, "");
const statuses: SatztatReportResult[] = ["unsubmitted", "verified", "needs-repair", "not-assessed"];

export function createSatztatProgress(): SatztatProgress {
  const fresh = (id: SatztatCaseId): SatztatCaseProgress => ({
    network: { ...getSatztatMission(id).initial, revision: 0 }, observations: [], log: [], hypothesis: "", baseline: "", draft: "",
    attempts: [], submissionCount: 0, firstAttempt: null, hintLevel: 0, revealed: false,
    technicalAssistance: 0, languageAssistance: 0, reportResult: "unsubmitted", reportFeedback: "", selfReview: false,
    reviewDueAt: null, reviewLevel: 0, lastReviewDay: null, reviewStartedAt: null, reviewAssisted: false, reviewSubmissionCount: 0,
  });
  return { version: 1, contentVersion: 1, cases: { "dns-record": fresh("dns-record"), "dns-client": fresh("dns-client") } };
}

export function assessSatztatReport(caseId: SatztatCaseId, answer: string): { result: SatztatReportResult; feedback: string } {
  const mission = getSatztatMission(caseId);
  const value = normalize(answer);
  if (!value) return { result: "not-assessed", feedback: "Write your own report before checking. Empty input provides no language evidence." };
  if ([mission.target, ...mission.variants].some(variant => normalize(variant) === value)) return { result: "verified", feedback: "This reviewed formulation expresses the intended past counterfactual. This is bounded language evidence, not universal grammar grading." };
  const known = mission.supportedErrors.find(error => normalize(error.answer) === value);
  if (known) return { result: "needs-repair", feedback: `${known.code} · ${known.hint}` };
  return { result: "not-assessed", feedback: "This formulation is outside the reviewed answer set. It is not automatically marked wrong. Compare meaning and grammar with the model, or record an honest self-review; neither grants automatic language verification." };
}

/** Conservative availability guard, NOT a semantic or grammar verdict. Unknown valid answers remain ungraded. */
export function getSatztatSelfReviewEligibility(caseId: SatztatCaseId, answer: string): { eligible: boolean; reason: string } {
  const value = normalize(answer);
  const words = value.toLocaleLowerCase("de").match(/[\p{L}]+/gu) ?? [];
  if (value.length < 40 || words.length < 7 || new Set(words).size < 6) return { eligible: false, reason: "For self-review, write a substantive sentence (at least 40 characters and 7 words, with varied vocabulary). This is an input guard, not a grammar grade." };
  if (!words.some(word => ["hätte", "hättest", "hätten", "hättet", "wäre", "wärst", "wären", "wäret"].includes(word))) return { eligible: false, reason: "Self-review here needs an identifiable past-counterfactual attempt, for example with hätte or wäre. Other formulations remain ungraded; this guard does not declare them incorrect." };
  const relevant = caseId === "dns-record" ? /(?:dns|eintrag|auflösung|namensauflösung|datei|server|namen|erreichbar)/iu : /(?:dns|client|resolver|arbeitsplatz|rechner|server|namen|erreichbar)/iu;
  if (!relevant.test(value)) return { eligible: false, reason: "Mention the incident's client, name resolution or service in your report before self-review. Relevance is only an input guard, not automatic correctness." };
  return { eligible: true, reason: "Eligible for your own checklist review only. Length, vocabulary and cue checks do not verify German grammar or incident meaning." };
}

function resolvedAddress(state: SatztatCaseProgress, caseId: SatztatCaseId): string | null {
  const mission = getSatztatMission(caseId);
  return state.network.cacheAddress ?? (state.network.clientDns === mission.correctDns ? state.network.recordAddress : null);
}

function observation(state: SatztatCaseProgress, caseId: SatztatCaseId, diagnostic: SatztatDiagnostic): SatztatObservation {
  const mission = getSatztatMission(caseId);
  const resolved = resolvedAddress(state, caseId);
  const answers: Record<SatztatDiagnostic, { ok: boolean; text: string }> = {
    ipconfig: { ok: state.network.clientDns === mission.correctDns, text: `Client: ${mission.topology[0].address}\nDNS server: ${state.network.clientDns}\nLAN link: connected` },
    "ping-ip": { ok: true, text: `ping ${mission.serverAddress}\nReply from ${mission.serverAddress}. This proves IP reachability only, not SMB.` },
    "service-ip": { ok: true, text: `Test-NetConnection ${mission.serverAddress} -Port 445\nTcpTestSucceeded: True` },
    "dns-authoritative": { ok: state.network.recordAddress === mission.serverAddress, text: `nslookup ${mission.hostname} ${mission.correctDns}\nAuthoritative answer: ${state.network.recordAddress}` },
    "client-cache": { ok: state.network.cacheAddress === mission.serverAddress, text: state.network.cacheAddress === null ? "No cached entry. A fresh name lookup uses the configured DNS server." : `${mission.hostname} → ${state.network.cacheAddress}\nThis is the client cache, not a direct authoritative query.` },
    "service-name": { ok: resolved === mission.serverAddress, text: `Test-NetConnection ${mission.hostname} -Port 445\nResolved address: ${resolved ?? "No answer from configured legacy resolver"}\nTcpTestSucceeded: ${resolved === mission.serverAddress ? "True" : "False"}` },
  };
  return { diagnostic, revision: state.network.revision, ...answers[diagnostic] };
}

export function getSatztatCaseResult(progress: SatztatProgress, caseId: SatztatCaseId): SatztatCaseResult {
  const state = progress.cases[caseId]; const mission = getSatztatMission(caseId);
  const networkCorrect = state.network.recordAddress === mission.serverAddress && state.network.clientDns === mission.correctDns && resolvedAddress(state, caseId) === mission.serverAddress;
  const required: SatztatDiagnostic[] = ["ipconfig", "dns-authoritative", "service-name"];
  const fresh = required.every(diagnostic => state.observations.some(item => item.diagnostic === diagnostic && item.revision === state.network.revision && item.ok));
  const technicalResolved = networkCorrect && fresh;
  const languageVerified = state.reportResult === "verified";
  const independentLanguage = !!state.firstAttempt?.independent && state.firstAttempt.result === "verified";
  const storyCompleted = technicalResolved && (languageVerified || state.selfReview);
  const unlocked = caseId === "dns-record" || getSatztatCaseResult(progress, "dns-record").storyCompleted;
  return { unlocked, technicalResolved, languageVerified, independentLanguage, storyCompleted,
    transferVerified: caseId === "dns-client" && technicalResolved && independentLanguage && state.technicalAssistance === 0 && state.firstAttempt?.technicalAssistance === 0,
    needsFreshDiagnostics: networkCorrect && !fresh };
}

function pushLog(state: SatztatCaseProgress, now: number, kind: string, message: string) {
  state.log = [...state.log, { at: now, kind, text: message.slice(0, 500) }].slice(-60);
}

/** Pure local story simulation: no network calls, machine commands, or external AI. */
export function applySatztatAction(progress: SatztatProgress, caseId: SatztatCaseId, action: SatztatAction, now = Date.now()): SatztatProgress {
  if (!ids.includes(caseId) || !timestamp(now) || !getSatztatCaseResult(progress, caseId).unlocked) return progress;
  const previous = progress.cases[caseId];
  const state: SatztatCaseProgress = { ...previous, network: { ...previous.network }, observations: [...previous.observations], attempts: [...previous.attempts], log: [...previous.log] };
  const next = { ...progress, cases: { ...progress.cases, [caseId]: state } };
  const mission = getSatztatMission(caseId);
  switch (action.type) {
    case "hypothesis": state.hypothesis = action.value.normalize("NFC").slice(0, 1000); return next;
    case "draft":
      state.draft = action.value.normalize("NFC").slice(0, SATZTAT_MAX_DRAFT);
      if (state.reviewStartedAt === null) { state.selfReview = false; state.reportResult = "unsubmitted"; state.reportFeedback = ""; }
      return next;
    case "diagnostic": {
      if (!satztatDiagnostics.some(item => item.id === action.diagnostic)) return progress;
      const result = observation(state, caseId, action.diagnostic);
      state.observations = [...state.observations.filter(item => item.diagnostic !== action.diagnostic), result];
      pushLog(state, now, "diagnostic", result.text); return next;
    }
    case "repair": {
      if (!mission.repairs.some(item => item.id === action.repair)) { pushLog(state, now, "notice", "This change is not available in this bounded case. Inspect the evidence; this is not a general-purpose network console."); return next; }
      const before = JSON.stringify(state.network);
      if (action.repair === "correct-record") state.network.recordAddress = mission.serverAddress;
      if (action.repair === "correct-client-dns") state.network.clientDns = mission.correctDns;
      if (action.repair === "refresh-cache") state.network.cacheAddress = state.network.clientDns === mission.correctDns ? state.network.recordAddress : null;
      if (JSON.stringify(state.network) !== before) { state.network.revision++; pushLog(state, now, "repair", `${mission.repairs.find(item => item.id === action.repair)!.label}. State revision ${state.network.revision}; run fresh verification checks.`); }
      else pushLog(state, now, "notice", "No state change. Read-only checks or repeated repairs do not create completion evidence.");
      return next;
    }
    case "technical-hint": state.technicalAssistance++; pushLog(state, now, "technical-hint", mission.technicalHints[Math.min(state.technicalAssistance - 1, mission.technicalHints.length - 1)]); return next;
    case "language-hint":
      state.languageAssistance++; state.hintLevel = Math.min(mission.hints.length, state.hintLevel + 1); state.reviewAssisted = true;
      pushLog(state, now, "language-hint", mission.hints[state.hintLevel - 1]); return next;
    case "reveal-model":
      state.revealed = true; state.languageAssistance++; state.reviewAssisted = true;
      pushLog(state, now, "model", "Model requested. This attempt is assisted; exposure remains recorded after reload."); return next;
    case "self-review":
      if (state.reportResult !== "not-assessed" || !state.revealed || !getSatztatSelfReviewEligibility(caseId, state.draft).eligible || !state.submissionCount) return progress;
      state.selfReview = true; state.languageAssistance++; state.reviewAssisted = true;
      pushLog(state, now, "self-review", "You recorded a self-review, not automatic correctness or independent transfer. It can complete the story once the network is verified."); return next;
    case "submit-report": {
      if (!state.draft.trim()) { state.reportFeedback = "Write a report first. Empty input earns no credit."; return next; }
      const assessment = assessSatztatReport(caseId, state.draft);
      const attempt: SatztatAttempt = { at: now, answer: state.draft, result: assessment.result,
        independent: state.submissionCount === 0 && state.languageAssistance === 0 && !state.revealed,
        languageAssistance: state.languageAssistance, technicalAssistance: state.technicalAssistance, kind: "report" };
      if (!state.firstAttempt) { state.firstAttempt = attempt; state.baseline = state.draft; }
      state.submissionCount++; state.attempts = [...state.attempts, attempt].slice(-30);
      state.reportResult = assessment.result; state.reportFeedback = assessment.feedback; state.selfReview = false;
      // Feedback after a first check can help a retry; retries cannot become first-attempt evidence.
      if (assessment.result === "needs-repair") { state.languageAssistance++; state.reviewAssisted = true; }
      if (assessment.result === "verified" && state.reviewDueAt === null) state.reviewDueAt = now + DAY;
      pushLog(state, now, "report", `${assessment.result}: ${assessment.feedback}`); return next;
    }
    case "start-review":
      if (state.reviewDueAt === null || state.reviewDueAt > now || !getSatztatCaseResult(next, caseId).storyCompleted || state.reviewStartedAt !== null) return progress;
      state.reviewStartedAt = now; state.reviewAssisted = false; state.reviewSubmissionCount = 0; state.draft = "";
      pushLog(state, now, "review", "Delayed recall started. The learned form is not an unseen transfer item. Do not open hints or model before submitting."); return next;
    case "review-report": {
      if (state.reviewStartedAt === null || !state.draft.trim() || state.reviewDueAt === null || state.reviewDueAt > now) return progress;
      const assessment = assessSatztatReport(caseId, state.draft);
      const day = new Date(now).toISOString().slice(0, 10);
      const eligible = assessment.result === "verified" && !state.reviewAssisted && state.reviewSubmissionCount === 0 && state.lastReviewDay !== day;
      state.reviewSubmissionCount++;
      state.attempts = [...state.attempts, { at: now, answer: state.draft, result: assessment.result, independent: eligible, languageAssistance: Number(state.reviewAssisted), technicalAssistance: 0, kind: "review" as const }].slice(-30);
      state.reportFeedback = eligible ? "Independent delayed recall recorded. This is not unseen transfer or a certificate of mastery." : `${assessment.feedback} No independent delayed-review promotion.`;
      if (eligible) { state.reviewLevel = Math.min(4, state.reviewLevel + 1); state.lastReviewDay = day; state.reviewDueAt = now + SATZTAT_REVIEW_DAYS[state.reviewLevel - 1] * DAY; }
      else state.reviewDueAt = now + DAY;
      state.reviewStartedAt = null; pushLog(state, now, "review", state.reportFeedback); return next;
    }
  }
  return progress;
}

function validAttempt(value: unknown): value is SatztatAttempt {
  return object(value) && timestamp(value.at) && text(value.answer) && statuses.includes(value.result as SatztatReportResult)
    && typeof value.independent === "boolean" && count(value.languageAssistance) && count(value.technicalAssistance) && ["report", "review"].includes(String(value.kind));
}

/** Versioned defensive import. Client-local evidence is not tamper-proof assessment. */
export function parseSatztatProgress(raw: unknown): SatztatProgress | null {
  if (typeof raw === "string") { if (raw.length > 300_000) return null; try { raw = JSON.parse(raw); } catch { return null; } }
  if (!object(raw) || raw.version !== 1 || raw.contentVersion !== 1 || !object(raw.cases)) return null;
  const next = createSatztatProgress();
  for (const id of ids) {
    const item = raw.cases[id]; const mission = getSatztatMission(id);
    if (!object(item) || !object(item.network) || typeof item.network.recordAddress !== "string" || ![mission.initial.recordAddress, mission.serverAddress].includes(item.network.recordAddress)
      || typeof item.network.clientDns !== "string" || ![mission.initial.clientDns, mission.correctDns].includes(item.network.clientDns)
      || !(item.network.cacheAddress === null || (typeof item.network.cacheAddress === "string" && [mission.initial.recordAddress, mission.serverAddress].includes(item.network.cacheAddress)))
      || !count(item.network.revision) || !text(item.hypothesis, 1000) || !text(item.baseline) || !text(item.draft)
      || !count(item.submissionCount) || !count(item.hintLevel, mission.hints.length) || !count(item.technicalAssistance) || !count(item.languageAssistance)
      || ![item.revealed, item.selfReview, item.reviewAssisted].every(value => typeof value === "boolean")
      || !statuses.includes(item.reportResult as SatztatReportResult) || !text(item.reportFeedback, 2000)
      || !(item.reviewDueAt === null || timestamp(item.reviewDueAt)) || !count(item.reviewLevel, 4)
      || !(item.lastReviewDay === null || (typeof item.lastReviewDay === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(item.lastReviewDay)))
      || !(item.reviewStartedAt === null || timestamp(item.reviewStartedAt)) || !count(item.reviewSubmissionCount)
      || !Array.isArray(item.attempts) || item.attempts.length > 30 || !item.attempts.every(validAttempt)
      || !(item.firstAttempt === null || validAttempt(item.firstAttempt))
      || !Array.isArray(item.observations) || item.observations.length > satztatDiagnostics.length
      || !item.observations.every(value => object(value) && satztatDiagnostics.some(diagnostic => diagnostic.id === value.diagnostic)
        && count(value.revision) && Number(value.revision) <= Number(item.network && (item.network as Record<string, unknown>).revision)
        && typeof value.ok === "boolean" && text(value.text, 1000))
      || !Array.isArray(item.log) || item.log.length > 60 || !item.log.every(value => object(value) && timestamp(value.at) && text(value.kind, 30) && text(value.text, 500))) return null;
    const importedAttempts = item.attempts as SatztatAttempt[];
    const importedFirst = item.firstAttempt as SatztatAttempt | null;
    if ((item.submissionCount === 0) !== (item.firstAttempt === null) || Number(item.submissionCount) < importedAttempts.filter(attempt => attempt.kind === "report").length
      || ((item.revealed || Number(item.hintLevel) > 0) && Number(item.languageAssistance) === 0)
      || (item.selfReview && (item.reportResult !== "not-assessed" || !item.revealed || !getSatztatSelfReviewEligibility(id, String(item.draft)).eligible))
      || (importedFirst && (importedFirst.kind !== "report" || importedFirst.answer !== item.baseline || (importedFirst.independent && importedFirst.languageAssistance !== 0)))
      || [...importedAttempts, ...(importedFirst ? [importedFirst] : [])].some(attempt => attempt.result !== assessSatztatReport(id, attempt.answer).result)
      || (Number(item.reviewLevel) > 0 && (item.reviewDueAt === null || item.lastReviewDay === null))) return null;
    // Copy validated known fields only. Ignore imported labels; recompute current observations from actual state.
    const restored = JSON.parse(JSON.stringify(item)) as SatztatCaseProgress;
    restored.observations = restored.observations.map(value => value.revision === restored.network.revision ? observation(restored, id, value.diagnostic) : value);
    if (restored.reportResult === "verified" && !restored.attempts.some(attempt => attempt.kind === "report" && assessSatztatReport(id, attempt.answer).result === "verified")) return null;
    next.cases[id] = restored;
  }
  return next;
}

export function getSatztatSummary(progress: SatztatProgress, now = Date.now()) {
  const results = ids.map(id => getSatztatCaseResult(progress, id));
  return { total: ids.length, completed: results.filter(result => result.storyCompleted).length,
    technicalResolved: results.filter(result => result.technicalResolved).length,
    languageVerified: results.filter(result => result.languageVerified).length,
    independentLanguage: results.filter(result => result.independentLanguage).length,
    transferVerified: results.filter(result => result.transferVerified).length,
    dueReviews: ids.filter(id => getSatztatCaseResult(progress, id).storyCompleted && progress.cases[id].reviewDueAt !== null && progress.cases[id].reviewDueAt! <= now),
  };
}
