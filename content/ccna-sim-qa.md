# CCNA simulator acceptance gate

The simulator has two offline validators:

- `npm run validate:ccna-sim` checks the IOS terminal catalog, single-language surface and golden transcripts.
- `npm run validate:ccna-simulation` checks the learning-path and topology contract described here.

The second gate is intentionally independent from the UI and content-generation agents. It verifies:

- exactly 12 ordered bands, 109 path labs, 101 catalog labs and 8 hands-on labs;
- unique lab and band IDs, complete band partitioning and agreement with the published counters;
- one catalog topology record per catalog lab, diagram/file agreement, valid PNGs, and a non-empty topology outline for each hands-on stage;
- every discovered simulation pack points to a real non-`needs-review` lab, has unique devices and ports, and has links whose endpoints resolve to published devices and ports without duplicate cable use;
- independent `/ccna/sim?lab=<id>` resolution from the library, with mobile panel targets and the keyboard terminal entry points present;
- responsive CSS, contained scrolling, visible focus, and keyboard history/completion/a11y hooks.

## Pack rollout behavior

Reference topology diagrams are already part of the catalog. Simulation content packs are loaded when a pack module appears under one of these content locations:

- `lib/content/ccna-sim/`
- `lib/content/ccna-simulation/`
- `lib/content/ccna-simulations/`
- `content/ccna-sim/packs/`
- `lib/content/ccna-sim-packs.ts` (or the equivalent single-file module)

During the terminal-only rollout it is valid for the validator to report that pack coverage is pending. A malformed pack is never ignored: it fails with the source file, lab ID, device/port and link endpoint that caused the failure. After pack waves land, the same command becomes the strict topology/pack gate without requiring a validator rewrite.

The validator is static and offline. It does not contact Cisco, Packet Tracer, a browser, or a user account, and it does not modify lab data, UI files, generated images or the database.

## Manual browser checks

The static gate cannot prove pixels or touch events. For each release, manually exercise one catalog lab and one hands-on lab at desktop width and at 390px width:

1. Open `/ccna/library`, select the lab's simulator link, and confirm the URL keeps that lab ID.
2. Use Terminal / Scenario / Topology / Commands mobile tabs; return to Terminal and verify the typed state remains.
3. Operate the terminal with keyboard only: Tab into it, type a command, use ArrowUp/ArrowDown history, Tab completion, `?`, and visible focus.
4. Zoom the topology and inspect the contained scroll area; confirm the document itself has no horizontal overflow.

Record browser evidence in `content/ccna-sim-ui-qa.md`; this file documents the automated contract and should not replace earlier evidence.
