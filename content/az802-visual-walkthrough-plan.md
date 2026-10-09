# AZ-802 visual walkthrough plan

Scope: every AZ-802 question, not just the two group-scope examples. Preserve question text, answers, progress and exam behavior. No generated Windows screenshots and no unrelated pictures to inflate coverage.

## Work order

1. Inventory every bank question by stable identity, actual text and domain. Review each existing walkthrough's opening step, instructions and screenshot against that text. Do not assume older IDs still refer to the same topic.
2. Finish AD DS, then hybrid administration, virtual machines, networking, storage, security, monitoring and recovery. Share a workflow only where its actual steps answer the questions. Concept questions may need a diagram as well as the real console that anchors the concept.
3. For every GUI action, locate and inspect a screenshot of that exact control/window. Prefer verified Windows Server 2025 captures. Clearly label older/reference interfaces, sample values and any selected option that differs from the question. Command-only topics require real relevant command output, not a fabricated terminal.
4. Record missing captures with exact navigation paths. Keep honest text/diagrams until the matching screenshot exists; a console overview is not evidence of a completed configuration.
5. Closing global navigation allocates additional width to the visual explanation pane. Keep the question readable, limit thumbnail height and avoid excessive upscaling of small dialogs. Full-size images are opt-in via enlargement. Stack panels when actual available width is insufficient; mobile guide starts collapsed.
6. Verify exact question mappings, image loading/fallback, enlargement/source links, responsive bounds and no exam hints before submission. Measure open/closed navigation at desktop widths and mobile. Commit/push only scoped changes after a real build.

## Acceptance examples

- Question 017: Domain Local scope — show the Group scope choices and explain own-domain resource permissions and eligible trusted-domain members.
- Question 018: Global scope — same relevant dialog, but explain same-domain job-function membership, not conversion to Universal.
- Question 012: modern SYSVOL replication — DFS Replication service/logs, not DFS Namespaces or ordinary DFS Management editing of SYSVOL.

## Parallel ownership

- Mapping reviewer: read-only audit of actual question text and existing mappings; identify mismatches and uncovered domains.
- Screenshot researcher: source/image verification, focused SYSVOL guide improvements; no manufactured or loosely related captures.
- Layout implementer: visual-guide stylesheet only; bounded images and sidebar-aware panel widths.
- Main agent: integrate findings, regression tests, measured browser verification, coverage report, publication. Preserve unrelated CCNA and generated-file changes.

See `ad-visual-image-coverage.md` for actual coverage and remaining capture paths. A question whose workflow contains one photo is not necessarily fully photographed.

## Inventory and next batches

All 410 question identities were inventoried. Current mapping: 80 AD DS and two hybrid questions; 328 remain unmapped. Do not describe the whole bank as photographed.

| Domain | Total | Mapped | Remaining |
|---|---:|---:|---:|
| AD DS | 80 | 80 | 0 (many exact captures still needed) |
| Hybrid management | 47 | 2 | 45 |
| Virtual machines | 47 | 0 | 47 |
| Networking | 57 | 0 | 57 |
| Storage/file services | 59 | 0 | 59 |
| Security | 45 | 0 | 45 |
| Monitoring/troubleshooting | 48 | 0 | 48 |
| Recovery/HA/migration | 27 | 0 | 27 |

For each batch, one agent reviews actual question identities and exact required screens; another verifies original screenshots and version/license; another owns layout/tests only if changes are needed. The parent integrates and reviews the result. Reuse verified images by explicit question mapping rather than duplicating binaries or assigning unrelated pictures. Prioritize missing AD control captures, then work through the other domains above. An exact screenshot that cannot be sourced stays on the capture backlog.

## Verified first delivery

- q018 corrected from Global-to-Universal conversion to same-domain Global grouping. The same scope dialog supports q017/q018 with explicit notes that its selected Universal option differs; an actual Global Members screenshot provides the role-membership example.
- Exact DFS Replication service Properties reference added; unknown OS version labeled, not called Server 2025.
- Clearly mismatched shared photos and unrelated extra examples removed, retaining useful diagrams and instructions. Source links point to the actual image source.
- Browser measurements on the actual Quiz and shared shell/styles: at CSS viewport 1280, guide 331→505 px and question 594→597 px when navigation closes. At 1440, guide 387→577 px and question 698→685 px. The small scope dialog remains 288×247. At 390×844 the guide starts collapsed, stacks below the question, and opens without horizontal overflow; the wide photo renders approximately 319×151.
- Automated tests cover all 80 AD mappings, all 106 AD steps, two WAC mappings, exam hint gating, source links, image failure and small-dialog attributes. Full app production build succeeds. Browser preview does not submit answers or progress to an account.

Detailed relevance audit: `az802-visual-relevance-audit.md`. This first delivery is not completion of all 410 question walkthroughs.
