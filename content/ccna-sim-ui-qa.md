# CCNA simulator UI repair — 2026-10-08

Scope: the existing simulator in this checkout, not the older AZ-802 checkout.
The SwitchLab lesson was inspected as a layout reference; its engine/content was not copied.

## Implemented

- Separate scenario/objectives, terminal, exact-lab reference topology and command-reference panels.
- Catalog labs use their own diagram; hands-on labs use their existing topology description.
- All library cards link to their own simulator URL, with the existing lab IDs preserved.
- Mobile uses four panel buttons; changing panels does not unmount the terminal or lose state.
- Compact mobile course navigation; theme-aware non-terminal panels and a consistently dark CLI.
- CLI table output retains monospace alignment and scrolls inside the terminal, not the page.
- Command history preserves the unsubmitted draft, clamps at the oldest entry and moves forward correctly.
- Tab completes unique keywords, including after whitespace; ambiguous/no completion and Shift+Tab allow normal keyboard navigation.
- CLI supports case-insensitive keywords without changing hostname/argument capitalization.
- Fixed second-argument parsing (`ip address <address> <mask>`); invalid input leaves state unchanged.
- Automatic transcript scroll, mode-filtered command reference, live interface configuration table and a reset confirmation.
- Diagram zoom (100–200%) and Fit, scoped to the diagram viewport.

## Verified

- `validate:ccna-sim`: 31 commands, 62 golden-transcript inputs, 271 matching output lines plus interactive regression assertions.
- `validate:ccna-labs`: 109 labs / 12 bands; existing IDs and frozen course files pass.
- `validate:ccna-topologies`: 101 catalog labs / 96 diagram files pass.
- TypeScript and ESLint on the changed simulator/layout/library files: exit 0.
- Production Vercel build: exit 0. The sandbox attempt hit Windows `tslib` realpath EPERM; an unsandboxed retry succeeded.
- Browser desktop: separate panels with no pairwise overlap; correct diagram for `ccna-topology-002`; VLAN 10/admin-down state updates after commands.
- Browser 390×844 with 130% text: no document horizontal overflow, no clipped panel buttons; state survives Terminal → Topology → Terminal.
- Browser 320×740: diagram at 125% stays within its own scroll viewport; no document horizontal overflow.
- CLI history draft restoration and unique Tab completion were exercised in the browser.

## Boundaries

This is still a single-switch configuration model with 31 implemented commands, not a complete Cisco network emulator. Reference topology pictures are not live peer devices. Automatic per-lab grading, router routing, packet reachability and multi-device packs remain unimplemented. The UI states these boundaries explicitly; no fake score or connectivity result was added.

No deployment, commit or push was performed. Existing unrelated/uncommitted work was preserved.
`graphify update .` was attempted but the installed launcher failed (`uv trampoline failed to canonicalize script path`); this checkout has no existing graph to update.
