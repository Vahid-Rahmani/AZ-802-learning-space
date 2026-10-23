import assert from "node:assert/strict";
import { satztatCases, satztatDiagnostics, createSatztatProgress, parseSatztatProgress, assessSatztatReport, getSatztatSelfReviewEligibility, applySatztatAction, getSatztatCaseResult, getSatztatSummary, SATZTAT_REVIEW_DAYS } from "../lib/satztat-engine.ts";

const NOW = Date.UTC(2026, 9, 23, 9, 30);
const DAY = 86_400_000;
let checks = 0;
function test(name, run) { run(); checks++; console.log(`PASS ${name}`); }
const act = (p, id, action, now = NOW) => applySatztatAction(p, id, action, now);
function verify(p, id) {
  for (const diagnostic of ["ipconfig", "dns-authoritative", "service-name"]) p = act(p, id, { type: "diagnostic", diagnostic });
  return p;
}
function repair(p, id) {
  if (id === "dns-record") p = act(p, id, { type: "repair", repair: "correct-record" });
  else p = act(p, id, { type: "repair", repair: "correct-client-dns" });
  return verify(act(p, id, { type: "repair", repair: "refresh-cache" }), id);
}
function report(p, id, answer, now = NOW) { return act(act(p, id, { type: "draft", value: answer }), id, { type: "submit-report" }, now); }
function pilot() { return report(repair(createSatztatProgress(), "dns-record"), "dns-record", satztatCases[0].target); }

test("fresh fault, locked transfer and immutable no-op", () => {
  const p = createSatztatProgress(); const before = JSON.stringify(p);
  assert.equal(getSatztatCaseResult(p, "dns-record").technicalResolved, false);
  assert.equal(getSatztatCaseResult(p, "dns-client").unlocked, false);
  assert.equal(act(p, "dns-client", { type: "reveal-model" }), p);
  assert.equal(getSatztatSummary(p, NOW).completed, 0);
  act(p, "dns-record", { type: "diagnostic", diagnostic: "ping-ip" });
  assert.equal(JSON.stringify(p), before, "reducer mutated its input");
});
test("all authored diagnostics share network state; IP and service are distinct", () => {
  let p = createSatztatProgress();
  for (const diagnostic of satztatDiagnostics) p = act(p, "dns-record", { type: "diagnostic", diagnostic: diagnostic.id });
  const byId = Object.fromEntries(p.cases["dns-record"].observations.map(o => [o.diagnostic, o]));
  assert.equal(byId["ping-ip"].ok, true); assert.equal(byId["service-ip"].ok, true);
  assert.match(byId["ping-ip"].text, /not SMB/);
  assert.equal(byId["dns-authoritative"].ok, false); assert.equal(byId["service-name"].ok, false);
  assert.match(byId["client-cache"].text, /10\.24\.0\.99/);
  assert.equal(getSatztatCaseResult(p, "dns-record").technicalResolved, false);
});
test("record-only and cache-only repairs cannot resolve pilot", () => {
  let a = act(createSatztatProgress(), "dns-record", { type: "repair", repair: "correct-record" });
  a = verify(a, "dns-record"); assert.equal(getSatztatCaseResult(a, "dns-record").technicalResolved, false);
  let b = act(createSatztatProgress(), "dns-record", { type: "repair", repair: "refresh-cache" });
  b = verify(b, "dns-record"); assert.equal(getSatztatCaseResult(b, "dns-record").technicalResolved, false);
  assert.equal(b.cases["dns-record"].network.revision, 0, "cache refresh copied unchanged wrong record");
});
test("network changes invalidate observations until fresh retest", () => {
  let p = verify(createSatztatProgress(), "dns-record");
  p = act(p, "dns-record", { type: "repair", repair: "correct-record" });
  p = act(p, "dns-record", { type: "repair", repair: "refresh-cache" });
  assert.equal(getSatztatCaseResult(p, "dns-record").needsFreshDiagnostics, true);
  assert.equal(getSatztatCaseResult(p, "dns-record").technicalResolved, false);
  p = verify(p, "dns-record"); assert.equal(getSatztatCaseResult(p, "dns-record").technicalResolved, true);
  assert.equal(getSatztatCaseResult(p, "dns-record").languageVerified, false);
});
test("report cannot repair network and current unsubmitted draft is not verified", () => {
  let p = report(createSatztatProgress(), "dns-record", satztatCases[0].target);
  assert.equal(getSatztatCaseResult(p, "dns-record").languageVerified, true);
  assert.equal(getSatztatCaseResult(p, "dns-record").technicalResolved, false);
  p = act(p, "dns-record", { type: "draft", value: "New unsubmitted report." });
  assert.equal(getSatztatCaseResult(p, "dns-record").languageVerified, false);
});
test("accepted alternate order and NFC/spacing variants; supported errors only", () => {
  for (const mission of satztatCases) {
    for (const answer of [mission.target, ...mission.variants]) assert.equal(assessSatztatReport(mission.id, `  ${answer.normalize("NFD")}  `).result, "verified");
    for (const error of mission.supportedErrors) {
      const result = assessSatztatReport(mission.id, error.answer);
      assert.equal(result.result, "needs-repair"); assert.ok(result.feedback.includes(error.code));
    }
    assert.equal(assessSatztatReport(mission.id, "Wenn wir früher gehandelt hätten, hätte alles funktioniert.").result, "not-assessed");
    assert.equal(assessSatztatReport(mission.id, "hätte wäre").result, "not-assessed");
    assert.equal(assessSatztatReport(mission.id, "").result, "not-assessed");
  }
});
test("first submission, retry, hints and reload preserve real evidence", () => {
  let p = repair(createSatztatProgress(), "dns-record");
  p = report(p, "dns-record", satztatCases[0].supportedErrors[0].answer);
  p = report(p, "dns-record", satztatCases[0].target);
  assert.equal(getSatztatCaseResult(p, "dns-record").languageVerified, true);
  assert.equal(getSatztatCaseResult(p, "dns-record").independentLanguage, false);
  assert.equal(p.cases["dns-record"].submissionCount, 2);
  p = parseSatztatProgress(JSON.stringify(p)); assert.ok(p);
  assert.equal(p.cases["dns-record"].firstAttempt.result, "needs-repair");
  let q = act(repair(createSatztatProgress(), "dns-record"), "dns-record", { type: "reveal-model" });
  q = parseSatztatProgress(JSON.stringify(q)); q = report(q, "dns-record", satztatCases[0].target);
  assert.equal(getSatztatCaseResult(q, "dns-record").independentLanguage, false);
  assert.equal(q.cases["dns-record"].revealed, true);
});
test("unknown alternatives can self-review story without false language credit", () => {
  let p = repair(createSatztatProgress(), "dns-record");
  p = report(p, "dns-record", "Hätten wir den veralteten Eintrag früher berichtigt, wäre der Server per Namen erreichbar gewesen.");
  assert.equal(getSatztatCaseResult(p, "dns-record").storyCompleted, false);
  assert.equal(act(p, "dns-record", { type: "self-review" }), p, "self-review requires actual model comparison exposure");
  p = act(p, "dns-record", { type: "reveal-model" });
  p = act(p, "dns-record", { type: "self-review" });
  assert.equal(getSatztatCaseResult(p, "dns-record").storyCompleted, true);
  assert.equal(getSatztatCaseResult(p, "dns-record").languageVerified, false);
  assert.equal(getSatztatCaseResult(p, "dns-record").independentLanguage, false);
  assert.equal(getSatztatCaseResult(p, "dns-client").unlocked, true);
  for (const answer of ["", "hello", "hello hello hello hello hello hello hello hello hello", "These are just unrelated words about a completely different matter.", "Blubb wären blubb blubb blubb blubb blubb DNS blubb blubb."]) {
    let q = report(repair(createSatztatProgress(), "dns-record"), "dns-record", answer);
    q = act(q, "dns-record", { type: "reveal-model" });
    q = act(q, "dns-record", { type: "self-review" });
    assert.equal(getSatztatCaseResult(q, "dns-record").storyCompleted, false);
    assert.equal(getSatztatSelfReviewEligibility("dns-record", answer).eligible, false);
  }
});
test("same three repair choices do not reveal the cause by availability", () => {
  assert.deepEqual(satztatCases[0].repairs.map(item => item.id), satztatCases[1].repairs.map(item => item.id));
  const a = createSatztatProgress();
  const b = act(a, "dns-record", { type: "repair", repair: "correct-client-dns" });
  assert.equal(b.cases["dns-record"].network.revision, 0);
  assert.equal(getSatztatCaseResult(b, "dns-record").technicalResolved, false);
});
test("held-out cause, repairs, addresses and German target differ", () => {
  let p = pilot(); assert.equal(getSatztatCaseResult(p, "dns-client").unlocked, true);
  p = verify(p, "dns-client");
  assert.equal(p.cases["dns-client"].observations.find(o => o.diagnostic === "dns-authoritative").ok, true);
  assert.equal(p.cases["dns-client"].observations.find(o => o.diagnostic === "ipconfig").ok, false);
  p = act(p, "dns-client", { type: "repair", repair: "correct-record" });
  assert.equal(p.cases["dns-client"].network.revision, 0);
  assert.equal(getSatztatCaseResult(p, "dns-client").technicalResolved, false);
  p = report(repair(p, "dns-client"), "dns-client", satztatCases[1].variants[0]);
  assert.equal(getSatztatCaseResult(p, "dns-client").transferVerified, true);
  assert.equal(getSatztatSummary(p, NOW).completed, 2);
});
test("technical help is separate from language help and transfer independence", () => {
  let p = act(pilot(), "dns-client", { type: "technical-hint" });
  p = report(repair(p, "dns-client"), "dns-client", satztatCases[1].target);
  assert.equal(getSatztatCaseResult(p, "dns-client").independentLanguage, true);
  assert.equal(getSatztatCaseResult(p, "dns-client").transferVerified, false);
  assert.equal(p.cases["dns-client"].languageAssistance, 0);
});
test("delayed 1/3/7/14 schedule, first due, no same-day farming", () => {
  let p = pilot(); let now = NOW;
  assert.equal(p.cases["dns-record"].reviewDueAt, now + DAY);
  assert.equal(act(p, "dns-record", { type: "start-review" }, now), p);
  for (let index = 0; index < 4; index++) {
    now = p.cases["dns-record"].reviewDueAt;
    p = act(p, "dns-record", { type: "start-review" }, now);
    p = act(p, "dns-record", { type: "draft", value: satztatCases[0].target }, now);
    p = act(p, "dns-record", { type: "review-report" }, now);
    assert.equal(p.cases["dns-record"].reviewLevel, index + 1);
    assert.equal(p.cases["dns-record"].reviewDueAt, now + SATZTAT_REVIEW_DAYS[index] * DAY);
    assert.equal(act(p, "dns-record", { type: "start-review" }, now), p);
  }
});
test("revealed study history remains but assisted delayed review cannot promote", () => {
  let p = act(pilot(), "dns-record", { type: "reveal-model" });
  const due = p.cases["dns-record"].reviewDueAt;
  p = act(p, "dns-record", { type: "start-review" }, due);
  p = act(p, "dns-record", { type: "language-hint" }, due);
  p = act(p, "dns-record", { type: "draft", value: satztatCases[0].target }, due);
  p = act(p, "dns-record", { type: "review-report" }, due);
  assert.equal(p.cases["dns-record"].reviewLevel, 0);
  assert.equal(p.cases["dns-record"].revealed, true);
  assert.equal(p.cases["dns-record"].reviewDueAt, due + DAY);
});
test("bounded transcript, per-case drafts and safe versioned roundtrip", () => {
  let p = pilot();
  p = act(p, "dns-record", { type: "draft", value: "One draft" });
  // A draft makes the first report unsubmitted, so preserve the story before switching.
  p = report(p, "dns-record", satztatCases[0].target);
  p = act(p, "dns-client", { type: "draft", value: "Another draft" });
  for (let i = 0; i < 90; i++) p = act(p, "dns-record", { type: "diagnostic", diagnostic: "ping-ip" });
  assert.equal(p.cases["dns-record"].log.length, 60);
  assert.equal(p.cases["dns-client"].draft, "Another draft");
  assert.deepEqual(parseSatztatProgress(JSON.stringify(p)), p);
  for (const raw of ["{", "x".repeat(300001), null, {}, { ...p, version: 2 }]) assert.equal(parseSatztatProgress(raw), null);
  for (const mutate of [q => q.cases["dns-record"].network.revision = -1, q => q.cases["dns-record"].revealed = "yes", q => q.cases["dns-record"].network.recordAddress = "1.2.3.4", q => q.cases["dns-record"].attempts[0].at = -5]) {
    const q = structuredClone(p); mutate(q); assert.equal(parseSatztatProgress(q), null);
  }
});
test("local states and accounts do not share mutable objects", () => {
  const a = pilot(); const b = createSatztatProgress();
  assert.equal(b.cases["dns-record"].network.revision, 0);
  assert.equal(b.cases["dns-record"].submissionCount, 0);
  assert.notEqual(a.cases["dns-record"].network, b.cases["dns-record"].network);
});

console.log(`SatzTat engine: ${checks} groups passed. Pure authored simulation only; no UI/mobile/device/browser or freeform-AI claims.`);
