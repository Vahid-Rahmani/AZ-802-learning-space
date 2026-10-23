# Northstar CI/CD teaching engine

This is a browser-only, deterministic educational model for one fictional company shop. It does not run a shell, JavaScript, package scripts, containers, GitHub workflows or deployments; it never accesses host files, credentials, cloud accounts or networks.

The 24 sequential missions use one evolving repository and two virtual environments. They cover staged Git snapshots, feature branches, a pushed pull request, event-bound checks, lint and unit failures, integration services, frozen lockfiles, cache keys, a small security fixture, checked merges, immutable artifact provenance, a registry, staging smoke checks, simulated production approval, promotion, observation, a second release, an incident and rollback, runner retries, concurrency cancellation, release tags and an end-to-end release audit. Every mission has two state-checked objectives, staged hints, a complete solution, verification commands and a fault variation. `cicdWalkthroughs` supplies executable command/file-edit actions from the same source as the displayed solution.

## Explicit boundaries

- `ci` commands and `ci/pipeline.json` are the simulator's teaching interface, not a vendor CLI or GitHub Actions YAML interpreter. Only the documented JSON schema and command subset work. Unsupported syntax and unknown options fail explicitly.
- `src/app.js` supports four exported constants only; checks parse those declarations without evaluating source. `package.json` and the version-3 lockfile use a bounded fictional `@northstar/kit` fixture with versions 1.0.0 and 1.0.1. The advisory is fictional and no package is downloaded.
- The single Linux runner executes ordered model gates. Queued runs advance deterministically with `ci tick`; there is no clock or real job scheduler. Retries accept only a transient runner failure on the current branch/revision. Cancellation is modeled by queueing a newer run.
- Git supports exact staging, commits, branch switching, a single open pull request and a fast-forward merge. There is no rebase, conflict resolution, remote authentication or full Git command language. Release policy requires successful install, lint, unit, integration, scan and build gates even if a learner removes stages from the configuration.
- The Dockerfile is a four-line recognized fixture, not an image builder. Artifact identifiers are deterministic teaching hashes of revision plus source and are not SHA-256 digests, signatures or cryptographic attestations. Artifact provenance is immutable within the model. Registry publication, staging, approval and promotion all bind to the current clean main revision. Rollback intentionally restores a previous immutable artifact without moving Git backward.
- The only secret-store input is `ci secret set DEPLOY_TOKEN training-only`, saved as a placeholder-presence action, with no real credential value. The scanner recognizes bounded fake-secret prefixes and a small least-privilege/dependency fixture. Fake-secret strings are redacted in terminal output. This is not a general secret scanner, security audit or authorization system.
- Simulated approval records no human identity. Health, smoke checks, error rates and incidents are deterministic fixtures, not real probes or observability data. A build can pass while the committed health fixture makes deployment smoke fail.
- The replay journal has at most 480 actions, 12,000 characters per virtual file edit and 700,000 characters of aggregate action text. Save validation replays supported actions; unknown fields, unsupported actions and fabricated state fields are rejected. Saves are local educational progress, not signed evidence or protection against a user deliberately reconstructing valid actions.
- A state-changing expected failure (lint/unit push, frozen-install mismatch, runner outage, failed smoke) returns exit code 1 **and retains the resulting diagnostic state**. Rejected syntax, unsupported commands and unmet preconditions do not append actions. Read-only commands never award completion. Only the current sequential mission can be awarded on one transition. Earned IDs stay in the achievement list while the current-state check can later fail honestly.

## Verification

Run `node --experimental-strip-types scripts/test-cicd-engine.mjs` from the checkout. The suite drives all 24 displayed walkthroughs, checks progression after each action, verifies restore at every mission boundary and covers wrong branches, stale revisions, missing/failed PR checks, parser rejection, lock mismatches, cache behavior, security fixtures, immutable artifacts, deployment gates, failed smoke, rollback, retry, cancellation and corrupt saves.

Source references ground the real concepts and familiar Git/npm syntax. They do not imply these docs describe the simulator's `ci` interface:

- [Git staging](https://git-scm.com/docs/git-add) and [commits](https://git-scm.com/docs/git-commit)
- [GitHub workflow syntax, permissions and concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [Docker image digests](https://docs.docker.com/dhi/explore/security-concepts/digests/)
