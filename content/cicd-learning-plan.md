# CI/CD Project Lab — implementation and acceptance plan

## Requested experience

Add a project-based CI/CD learning path to the existing Klybit site. The learner
develops and releases one company web application through 24 sequential missions,
like a game. Correct actions update objective ticks automatically. A static
checklist or accepting the same status command as several achievements is not
acceptable. Existing courses, question banks, authentication, progress and
simulators remain intact.

## Ownership

- `cicd_engine_curriculum` agent: deterministic engine, 24 authored missions,
  complete solutions, official sources and engine golden-path/negative tests.
- Main agent: this plan, website integration, accessible responsive workspace,
  persistence, UI regression tests, integration review, graph update and release.
- The engine agent reviews the integrated result before completion is reported.

## Learning sequence

1. Repository baseline and first reviewed commit.
2. Feature branch and small source changes.
3. Reproducible local dependency installation and checks.
4. Pipeline configuration and pull-request checks.
5. Failed lint/unit checks and evidence-based repair.
6. Integration checks, lockfiles and cache correctness.
7. Defensive secret handling, permissions and security gates.
8. Reviewed merge and commit-bound successful CI.
9. Immutable build artifacts and container/registry concepts.
10. Staging deployment and smoke checks.
11. Explicit production approval and promotion of the same artifact.
12. A second release, an incident and safe rollback.
13. Retry/concurrency policy and a release capstone.

The authored mission catalogue is the executable source of truth for the exact
24 tasks, prerequisites, goals, hints, verification and solutions.

## Simulation contract

- This is a **browser-only educational model**, not Git, a shell, a real runner,
  Docker, GitHub Actions or a cloud deployment service.
- No entered commands execute on the learner's device or contact infrastructure.
- Use an explicitly educational `ci/pipeline.json` configuration. Do not pretend
  to interpret arbitrary GitHub Actions YAML. Teach how the concepts map to real
  tools, with official documentation links and clear limits.
- Every supported command has deterministic state transitions and meaningful
  errors. Unsupported syntax must fail honestly.
- Completion is revision-, artifact- and environment-aware. A failed or stale run
  must not authorize promotion. Read-only commands never award completion.
- Historical achievements and current project health are displayed separately.
- Save/resume is account-scoped browser storage. It is not cross-device sync.
- Never enter actual credentials. Secrets in training are fictitious and logs
  must not expose their values.

## Workspace

- Compact course header using existing account, appearance and opt-in translation.
- Mission map with prerequisites, earned milestones and overall progress.
- Current mission: scenario, precise goal, live checks/reasons, progressive hints,
  explanation, verification commands and a clearly separated complete solution.
- Large bounded terminal with command history, native mobile input, IME support
  and scrolling output. Terminal output must never grow the page indefinitely.
- Virtual-file editor, pipeline stage view, artifact provenance and deployment
  state, all backed by the same engine state.
- Mobile guide/workspace navigation and small touch-friendly controls.
- Scoped reset, saved workspace resume and an explicit completion banner.

## Acceptance gates

- All 24 missions have a tested executable solution and start unearned.
- Full golden path reaches 24/24 without bypassing any goal.
- Wrong branch/revision, failed tests, missing approval, stale artifact and repeated
  inspection commands cannot forge completion.
- Failed deployment/recovery and rollback use the modeled state honestly.
- Invalid/oversized saves and inputs are rejected without host execution.
- UI checks: native typing, virtual-file save, real checks, next/locked mission,
  resume, account isolation, reset scope and terminal bounds.
- Existing learning catalogue regression checks, type check and production build.
- Agent integration review, project graph refresh and publish verification.

## Coverage boundary

This is an end-to-end CI/CD project covering the implemented subjects, not a claim
to simulate every CI/CD vendor, plugin, cloud, orchestrator or production failure.
Kubernetes, arbitrary YAML runtimes, actual container builds, real cryptographic
signatures, hosted runners and live cloud credentials are outside this browser
model unless explicitly added in a future project.

## Completion evidence — 2026-10-23

- 24 authored missions, 48 state-checked objectives and a complete shared
  command/editor walkthrough for every mission.
- Engine validation: 34 test groups passed; the golden path earns 24/24 missions
  through 103 state-changing actions. Wrong branches/revisions, stale artifacts,
  missing quality gates, missing approvals and fake saves have negative tests.
- React integration: all 24 missions completed through the actual terminal and
  virtual-file editor forms. Resume, unsaved drafts, account isolation, scoped
  reset, IME input, keyboard tabs and secret-echo protection were checked.
- Existing learning-catalogue regression and TypeScript checks passed.
- The delegated engine/curriculum agent reviewed the integrated UI, reported
  concrete findings, re-reviewed their fixes and returned **APPROVED** with no
  remaining review blocker. The model boundaries above remain intentional.
- Production build includes `/cicd`. Source-graph AST refresh is part of release.
- Verification limit: UI checks use React + a simulated DOM and CSS contracts,
  not a rendered browser or a physical phone keyboard. No visual/mobile-browser
  certification is claimed.
- Release target: the existing Klybit project and its existing Vercel production
  domain, not a new website or hosting account.
