import assert from "node:assert/strict";
import { createLinuxSession, runLinuxCommand, linuxPrompt, isLinuxSession } from "../lib/linux-sim/engine.ts";
import { linuxLessons, linuxLessonResults } from "../lib/content/linux-learning.ts";

// Every learner command below runs in the in-memory simulator, never the host shell.
let checks = 0;
const test = (name, fn) => {
  fn();
  checks += 1;
  console.log(`PASS ${name}`);
};
const run = (session, command) => {
  const result = runLinuxCommand(session, command);
  assert.equal(result.exitCode, 0, `${command}: ${result.output.join("\n")}`);
  assert.ok(isLinuxSession(result.session), `${command}: invalid returned session`);
  return result.session;
};
const fail = (session, command, pattern) => {
  const before = JSON.stringify(session);
  const result = runLinuxCommand(session, command);
  assert.notEqual(result.exitCode, 0, `${command} unexpectedly succeeded`);
  assert.equal(JSON.stringify(result.session), before, `${command} changed state despite failing`);
  assert.equal(JSON.stringify(session), before, `${command} mutated its input state`);
  if (pattern) assert.match(result.output.join("\n"), pattern);
  return result;
};
const allResults = (session) => linuxLessons.flatMap((lesson) => linuxLessonResults(session, lesson.id));
const assertUnsolved = (session) => {
  const results = allResults(session);
  assert.ok(results.length > 0, "lesson catalog has no evaluated goals");
  assert.ok(results.every((result) => !result.passed), `unexpected completed goals: ${results.filter((result) => result.passed).map((result) => result.id)}`);
};

test("fresh sessions contain no completed lesson goals", () => {
  const session = createLinuxSession();
  assert.ok(isLinuxSession(session));
  assertUnsolved(session);
  assert.equal(session.cwd, "/home/learner");
  assert.match(linuxPrompt(session), /learner@training-rhel.*\$/);
  const second = createLinuxSession();
  session.files["/home/learner"].mode = 0;
  assert.notEqual(second.files["/home/learner"].mode, 0, "fresh sessions share mutable files");
});

test("read-only repetition cannot complete tasks", () => {
  let session = createLinuxSession();
  for (let count = 0; count < 3; count += 1) {
    for (const command of ["pwd", "ls -la", "whoami", "cat /etc/os-release", "dnf list --installed", "ip addr show"]) {
      session = run(session, command);
      assertUnsolved(session);
    }
  }
  session.commandCount = 10_000;
  assertUnsolved(session);
});

test("relative paths, quoted names, directory changes and redirection", () => {
  const initial = createLinuxSession();
  let session = run(initial, 'mkdir -p "practice folder/subdir"');
  assert.equal(initial.files["/home/learner/practice folder"], undefined, "successful command mutated input session");
  session = run(session, 'cd "practice folder/subdir"');
  assert.equal(session.cwd, "/home/learner/practice folder/subdir");
  session = run(session, 'echo "Linux practice" > "notes file.txt"');
  session = run(session, 'echo "second line" >> "notes file.txt"');
  assert.equal(session.files[`${session.cwd}/notes file.txt`].content, "Linux practice\nsecond line\n");
  const output = runLinuxCommand(session, 'cat "./notes file.txt"');
  assert.equal(output.exitCode, 0);
  assert.equal(output.output.join("\n").trimEnd(), "Linux practice\nsecond line");
  session = run(session, 'cp "notes file.txt" ../copy.txt');
  session = run(session, 'mv ../copy.txt ../renamed.txt');
  assert.equal(session.files["/home/learner/practice folder/copy.txt"], undefined);
  assert.equal(session.files["/home/learner/practice folder/renamed.txt"].content, "Linux practice\nsecond line\n");
  session = run(session, "cd ..");
  assert.equal(session.cwd, "/home/learner/practice folder");
  session = run(session, "cd ~");
  assert.equal(session.cwd, "/home/learner");
});

test("failed filesystem operations cannot invent success or mutate state", () => {
  let session = createLinuxSession();
  fail(session, "cd missing", /no such|not found/i);
  fail(session, "touch missing/file.txt", /no such|not found/i);
  fail(session, 'echo "unterminated', /quot|syntax/i);
  fail(session, "cat /missing > should-not-exist.txt");
  assert.equal(session.files["/home/learner/should-not-exist.txt"], undefined);
  session = run(session, "mkdir folder");
  session = run(session, "touch folder/file.txt");
  fail(session, "rm folder", /directory/i);
  session = run(session, "rm -r folder");
  assert.equal(session.files["/home/learner/folder"], undefined);
  assert.equal(session.files["/home/learner/folder/file.txt"], undefined);
});

test("permissions and command-scoped sudo", () => {
  let session = createLinuxSession();
  fail(session, "touch /etc/learner-test.conf", /permission|denied/i);
  session = run(session, "sudo touch /etc/learner-test.conf");
  assert.equal(session.files["/etc/learner-test.conf"].owner, "root");
  assert.equal(session.user, "learner", "sudo became a persistent root shell");
  fail(session, "echo unsafe > /etc/learner-test.conf", /permission|denied/i);
  fail(session, "chmod 777 /etc/learner-test.conf", /permission|permitted|denied/i);
  session = run(session, "sudo chmod 600 /etc/learner-test.conf");
  assert.equal(session.files["/etc/learner-test.conf"].mode, 0o600);
  fail(session, "cat /etc/learner-test.conf", /permission|denied/i);
  session = run(session, "sudo cat /etc/learner-test.conf");
  fail(session, "sudo chmod 888 /etc/learner-test.conf");
});

test("package installation, service lifecycle and removal remain consistent", () => {
  let session = createLinuxSession();
  assert.equal(Boolean(session.packages.httpd), false);
  fail(session, "systemctl start httpd", /permission|denied|root|not found|could not be found/i);
  fail(session, "sudo systemctl start httpd", /not found|not.*installed|could not|does not/i);
  fail(session, "dnf install httpd", /permission|root|denied/i);
  fail(session, "sudo dnf install made-up-package", /match|unknown|available|package|unsupported/i);
  session = run(session, "sudo dnf install -y httpd");
  assert.equal(session.packages.httpd, true);
  assert.equal(session.services.httpd.running, false);
  assert.equal(session.services.httpd.enabled, false);
  fail(session, "systemctl start httpd", /permission|denied|root/i);
  session = run(session, "sudo systemctl enable --now httpd");
  assert.equal(session.services.httpd.running, true);
  assert.equal(session.services.httpd.enabled, true);
  assert.match(runLinuxCommand(session, "systemctl status httpd").output.join("\n"), /active.*running/i);
  session = run(session, "sudo systemctl stop httpd");
  assert.equal(session.services.httpd.running, false);
  assert.equal(session.services.httpd.enabled, true);
  session = run(session, "sudo systemctl restart httpd");
  session = run(session, "sudo systemctl disable httpd");
  assert.equal(session.services.httpd.running, true);
  assert.equal(session.services.httpd.enabled, false);
  session = run(session, "sudo dnf remove -y httpd");
  assert.equal(Boolean(session.packages.httpd), false);
  assert.ok(!session.services.httpd || !session.services.httpd.running);
  fail(session, "sudo systemctl start httpd");
});

test("all lesson goals follow actual virtual state and survive JSON resume", () => {
  let session = createLinuxSession();
  for (const command of [
    "mkdir -p /home/learner/practice", "cd /home/learner/practice", "touch notes.txt",
    'echo "Linux practice" > notes.txt', "chmod 640 notes.txt", "sudo dnf install -y httpd",
    "sudo systemctl start httpd", "sudo systemctl enable httpd", "mkdir -p config",
    'echo "ServerName training-rhel" > config/httpd.conf', "cp config/httpd.conf config/httpd.conf.bak",
    "chmod 600 config/httpd.conf.bak",
  ]) session = run(session, command);
  const results = allResults(session);
  assert.ok(results.every((result) => result.passed), `unsolved goals: ${results.filter((result) => !result.passed).map((result) => result.id)}`);
  const resumed = JSON.parse(JSON.stringify(session));
  assert.ok(isLinuxSession(resumed));
  assert.deepEqual(allResults(resumed), results);
  assert.equal(linuxPrompt(resumed), linuxPrompt(session));
  const modified = run(resumed, "chmod 644 notes.txt");
  assert.ok(allResults(modified).some((result) => !result.passed), "changing permissions did not falsify goal state");
  const stopped = run(session, "sudo systemctl stop httpd");
  assert.ok(allResults(stopped).some((result) => !result.passed), "stopped service still passed every goal");
  const altered = run(session, 'echo "wrong backup" > config/httpd.conf.bak');
  assert.ok(allResults(altered).some((result) => !result.passed), "incorrect backup still passed every goal");
  const changedDirectory = run(session, "cd ~");
  assert.equal(linuxLessonResults(changedDirectory, "001").find((result) => result.id === "location").passed, false);
  const removedPackage = run(session, "sudo dnf remove -y httpd");
  assert.equal(linuxLessonResults(removedPackage, "004")[0].passed, false);
  assert.ok(linuxLessonResults(removedPackage, "005").every((result) => !result.passed));
});

test("unsupported commands and syntax are truthful and non-mutating", () => {
  const session = createLinuxSession();
  for (const command of ["curl https://example.com", "ls | grep notes", "sudo bash", "sudo rm -rf /", "sudo reboot"])
    fail(session, command, /unsupported|not supported|not found|simulation|simulat|protect|refus/i);
  assert.equal(isLinuxSession({}), false);
});

console.log(`Linux simulator: ${checks} checks passed.`);
