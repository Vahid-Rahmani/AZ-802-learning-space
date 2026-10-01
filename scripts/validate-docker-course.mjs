import assert from "node:assert/strict";
import { dockerLabs, dockerDockerfile, dockerCompose, dockerNginx } from "../lib/content/docker.ts";
import { serverLabs } from "../lib/content/server-labs.ts";
import { emptyServerLabState, parseServerLabState, gradeServerLab } from "../lib/server-lab-state.ts";

assert.equal(dockerLabs.length, 6);
assert.equal(new Set([...dockerLabs, ...serverLabs].map((lab) => lab.id)).size, 13);
const ids = new Set();
const answerDistribution = [0, 0, 0, 0];
for (const lab of dockerLabs) {
  assert.ok(lab.id.startsWith("docker-"));
  assert.equal(lab.steps.length, 4);
  assert.equal(lab.tests.length, 3);
  assert.equal(lab.questions.length, 4);
  assert.ok(lab.steps.every((step) => step.instruction.length > 60 && step.explain.length > 40));
  assert.equal(new Set(lab.tests.map((test) => test.id)).size, 3);
  for (const question of lab.questions) {
    assert.ok(!ids.has(question.id)); ids.add(question.id);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4);
    assert.ok(question.explain.length > 40);
    assert.equal(new URL(question.source).hostname, "docs.docker.com");
    assert.ok(lab.sources.some((source) => source.url === question.source));
    answerDistribution[question.correct]++;
  }
  const blank = emptyServerLabState();
  assert.deepEqual(parseServerLabState(blank, lab), blank);
  assert.equal(gradeServerLab(lab, blank).complete, false);
  const resume = { ...blank, activeTab: "quiz", questionIndex: 3, answers: { [lab.questions[0].id]: 2 } };
  assert.deepEqual(parseServerLabState(resume, lab), resume);
  assert.equal(parseServerLabState({ ...resume, questionIndex: 4 }, lab), null);
  assert.equal(parseServerLabState({ ...resume, answers: { [serverLabs[0].questions[0].id]: 0 } }, lab), null);
  assert.equal(parseServerLabState({ ...blank, quizSubmitted: true }, lab), null);
  const complete = { ...blank, stepIds: ["0", "1", "2", "3"], results: Object.fromEntries(lab.tests.map((test) => [test.id, { outcome: "pass", note: "Unit fixture only: recorded expected outcome" }])), answers: Object.fromEntries(lab.questions.map((question) => [question.id, question.correct])), quizSubmitted: true, evidenceText: "Unit fixture only: final report" };
  assert.equal(gradeServerLab(lab, complete).complete, true);
  assert.equal(gradeServerLab(lab, complete).quizPercent, 100);
  const wrong = { ...complete, answers: Object.fromEntries(lab.questions.map((question) => [question.id, (question.correct + 1) % 4])) };
  assert.equal(gradeServerLab(lab, wrong).quizPercent, 0);
  assert.equal(gradeServerLab(lab, wrong).complete, false);
  assert.equal(gradeServerLab(lab, { ...complete, results: {} }).complete, false);
  assert.equal(gradeServerLab(lab, { ...complete, evidenceText: "" }).complete, false);
  assert.equal(gradeServerLab(lab, parseServerLabState({ ...blank, score: 100, complete: true }, lab)).complete, false);
}
assert.deepEqual(answerDistribution, [6, 6, 6, 6]);
assert.ok(dockerDockerfile.includes("USER 10001:10001"));
assert.ok(dockerCompose.includes('"127.0.0.1:8082:80"'));
assert.ok(dockerNginx.includes("http://app:8080"));
console.log(JSON.stringify({ status: "ok", stages: 6, buildSteps: 24, practicalTests: 18, questions: 24, answerDistribution }));
