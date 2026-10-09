# AZ-802 visual relevance audit — 2026-10-09

Read-only review of all 410 runtime AZ-802 question identities, text, answer options, guide mappings, start steps, context, and every step of each mapped guide. Loaded course-data and visual-guides with an in-memory esbuild bundle. No question-bank edits. The graph scoped this review to the visual-guide modules; current source determined the findings. Local `group-members.png` was also visually inspected. Other image content classifications below use the existing capture catalog, captions and placement notes; this is not a fresh pixel review of every external image.

## Coverage

82 question bindings: all 80 AD DS questions and two hybrid questions. 328 questions have no `getQuestionVisualGuide` binding. This does not assert that they lack other learning media. All startStep IDs exist, and mapped IDs are unique. After the parent's q018 remap, there are 30 unique guides; 46 AD question bindings contain a photo somewhere, 33 open on a photo, and 33 contain local photos. A photo somewhere in a shared guide is not exact screenshot coverage for its question.

| Domain | Questions | Mapped | Unmapped IDs (`az802-q-` prefix) |
|---|---:|---:|---|
| AD DS | 80 | 80 | None |
| Hybrid management | 47 | 2 | 067–099, 316–322, 324–328 |
| Virtual machines | 47 | 0 | 100–133, 329–341 |
| Networking | 57 | 0 | 134–167, 342–354, 401–410 |
| Storage/file services | 59 | 0 | 168–213, 355–367 |
| Security | 45 | 0 | 214–245, 368–380 |
| Monitoring/troubleshooting | 48 | 0 | 246–280, 381–393 |
| Backup/recovery/HA/migration | 27 | 0 | 281–300, 394–400 |

## Question identity findings

One definite mismatch was present at the start: q018 asks which scope groups same-domain users by job function (Global), but opened `ad-convert-global-group-scope/conversion-check`, claiming the question concerned converting Global to Universal. The parent has remapped it to `ad-create-security-group-scope/group-scope` with Global-specific context. Its text/options need no rewriting. The original question's requirements paragraph also discusses conversion, but changing bank data is outside this audit.

No additional definite question-topic mismatch was found in the other 81 bindings. q050 correctly maps to authoritative object restore against its actual options; q051 separately maps to Recycle Bin. q044 correctly distinguishes existing-domain DNS checks from new-forest post-promotion checks. A conceptually aligned mapping can still show a related or wrong-screen photo.

## Related or mismatched photos, including whole-guide extras

IDs below include every question exposed to the shared placement, not just the question that opens on it. Existing notes often disclose the difference, but disclosure does not turn a related image into an exact screenshot. Keep aligned diagrams/commands until a matching capture exists.

| IDs | Placement / classification | Exact control or evidence needed |
|---|---|---|
| 010, 011 | `paths`: `promotion-review.png` is later Review Options, not Paths; 010's database **file** is not visibly identified by a folder path. Extra `checks` is completed Results/restart, not Prerequisites Check. | Promotion **Paths** with three folders; for q010, NTDS folder showing `ntds.dit` or a focused identifier diagram. Separate Prerequisites Check capture for that extra step. |
| 017, 018 | `group-scope`: correct New Group control, but source selects **Universal**, whereas these answers require Domain local / Global. | New Group or existing group's General tab with the required scope selected. q019's Universal selection matches. |
| 020, 021 | `chain`: `group-members.png` shows Accounts → Global only, whereas q020 asks the Domain Local → Permissions end. `nest`: `user-memberships.png` is a USER Member Of tab with privileged groups, not nesting the Global role group into a Domain Local resource group. `acl`: Domain Users Modify is not the exercise's Domain Local group. | Global GROUP Member Of showing the Domain Local parent (or Domain Local GROUP Members containing the Global group), then folder Security/Advanced with `DL-Finance-Read` and its required rights. q020 should focus on this latter ACL/chain end. |
| 022–024 | Only guide photo is `privilege/folder-security.png`, a Domain Users Full control lab entry. It neither shows a managed service account nor demonstrates least privilege; 022/023 therefore have a photo-containing guide but no account-creation/install screenshot. | q022: gMSA creation/retrieval-host authorization and `Test-ADServiceAccount`. q023: sMSA single-host association/install/test. q024: dedicated service identity with only required rights, or retain its aligned privilege diagram. |
| 027–029 | `account/aduc-ous.png` is an OU/container overview rather than the paired computer account/secret or secure-channel outcome. | Actual computer object Properties for q027; `Test-ComputerSecureChannel` output for q028; repair and subsequent successful test on a member computer for q029. |
| 030, 031, 310, 311 | `contents/dns-srv.png` is DNS locator discovery, not the partial directory replica or PowerShell `Get-ADForest`. The other starts have no photo. q311's start also opens UGMC, a related alternative to placing a GC. | q030: focused full-own-domain/partial-other-domain diagram or directory query evidence. q031/310: NTDS Settings Properties Global Catalog and universal-membership concept. q311: actual branch GC placement/control; keep UGMC explicitly as an alternative. |
| 044, 045 | `dns-check/dns-test.png` uses nslookup while the path/command says Resolve-DnsName: equivalent lookup, not an exact command capture. Extra `dns-srv-view` is ordinary `_ldap._tcp`, not specifically the domain-controller `_ldap._tcp.dc._msdcs` query. | Capture the stated Resolve-DnsName query/results, or align the example command/path to the actual nslookup screen. Capture the exact DC-locator namespace if naming it. `dns-client/dns-adapter.png` is an aligned control; its unchecked IPv6 must not be taught as required. |
| 046 | `credentials` reference has last-controller checked despite this guide's healthy EXTRA-controller scenario. | Same Credentials page with forced removal and last-controller both unchecked. Existing warning is essential until replaced. |
| 048, 049 | Shared extra `application/repadmin.png` shows `/syncall` action/naming contexts, not read-only inventory or selected replica-set configuration. q048 opens an aligned Configuration diagram, not this photo. | Read-only `Get-ADRootDSE` naming-context output; for q049, application partition's actual replica membership/selected DCs. Do not present `/syncall` as a read-only inspection. |
| 051 | `recycle-enable` shows menu entry rather than the irreversible confirmation described by the path. | Confirmation dialog for enabling Recycle Bin, or split menu and confirmation into separate steps. Deleted Objects / Restore captures otherwise align. |
| 055–059 | Shared `gpo-order/gpmc-ou-link.png` is **same-OU link order**, not LSDOU or parent/child processing; path says Group Policy Inheritance but image is Linked Group Policy Objects. `gpo-block/gpmc-inheritance.png` is a precedence list, not Block Inheritance control. | q056: LSDOU/nested-OU diagram or relevant hierarchy/result; q057: parent and child settings with winning child GPO evidence; q058: OU context menu Block Inheritance and the resulting inheritance. q055 domain-root links and q059 Enforced column align, but these questions also expose the loose shared extras. |
| 060–062 | `gpo-report/client-gpresult.png` is `/r` summary, not HTML settings report; correct tool for q060 but different stated screen. `gpo-model/aduc-ou-hierarchy.png` is domain Status, merely showing Modeling/Results tree nodes. `gpo-filter/gpmc-gpos.png` is GPO list/status/WMI columns, not Security Filtering or permissions. Extra `gpo-event-log` is the source DC's log; insufficient for diagnosing a different target client. | q060: `/h` report with user/computer settings or align step to `/r`. q061: **Group Policy Modeling** wizard and simulated report, avoiding conflation with Results. q062: GPO Scope Security Filtering plus Delegation Advanced Read/Apply permissions. Extra event screen must be from the actual affected client. |
| 063–065 | 063/064 loopback starts have no photos, yet their shared guide appends four Drive Map preference photos unrelated to enabling loopback/Merge/Replace. For q065, Common tab is relevant, but Security Group targeting is the wrong condition and General/saved-list extras do not show registry existence. | q063: loopback administrative-template setting; q064: actual Merge/Replace selector/result. q065: Item-level targeting → **Registry Match** with hive/key/value and existence condition. Move optional Drive Maps examples to a separate guide rather than count them as loopback screenshots. |
| 306, 307 | `sid/drive-map-target-editor.png` displays a group SID, so supports identifying SID, but is targeting rather than ACL/token flow. Extra `inspect-logon-names/ad-user-name.png` is NEW-user confirmation, not existing-user Account tab, and does not show sAMAccountName. | q306: SID read from actual principal, optionally token/ACL evidence. q307: existing-user Account tab with pre-Windows-2000 name or `Get-ADUser` output including SamAccountName. Keep the existing creation capture only as a clearly optional UPN comparison. |
| 314 (also extra step on 050) | System-state Add Items image is aligned but includes Bare metal recovery as well; cannot demonstrate that system-state-only is a full-server backup. | Optional clearer System State selection for this question, preserving distinction from bare-metal recovery. No semantic mapping defect here. |

`group-members.png` is a strong **exact membership example** for an optional q018 Global-role membership step: visually shows Accounting-Managers → Members containing users from the same domain's Accounting OU, while the underlying list identifies those department/role groups as Security Group - Global. It does not show selecting the Global scope control. This makes it useful for q018 but only partial evidence for q020's full AGDLP chain.

## All mapped questions accounted for

These remaining groups have aligned text/start/context and no additional definite loose-photo finding beyond the shared-guide rows above. None should be promoted to exact photo coverage merely because a guide has a photo elsewhere.

| IDs | Guide / assessment |
|---|---|
| 001–009 | FSMO ownership/recovery: aligned concepts/commands; no photos. |
| 012 | SYSVOL/DFSR: aligned concept/commands; no photos. |
| 013, 014, 301 | RODC wizard/read-only/PRP controls align; older images, PRP heading/list-eligibility notes remain required. |
| 015, 043, 302, 303 | RODC policy/staging: aligned concepts/commands; no photos. |
| 016 | OU creation controls align; Azure Arc names are only example values. |
| 019 | Universal scope selection aligns; membership across domains needs separate evidence. |
| 025, 026 | FGPP controls align. Old field examples, privileged reference group and misleading Deleted Objects heading are explicitly qualified; use live test users/group. |
| 032, 033 | Sites/subnets: aligned paths/concepts/commands; no photos. |
| 034, 035, 038 | Replication links/notification/schedule: aligned; no photos. |
| 036, 037 | repadmin partners and dcdiag health align. q036 has no opening photo; q037 photo shows test start, not all-tests-passed evidence. |
| 039–042, 315 | Trust type/direction/selective authentication align; no photos. |
| 047 | Permanently lost DC metadata cleanup aligns; no photos. |
| 050 | Authoritative restore aligns; opening restore step has no photo. Shared backup photo limitation is above. |
| 052, 053, 312, 313 | Functional-level inventory/scope/prerequisite/raise concepts align; no photos. |
| 054, 304, 305 | OU-scoped task delegation/read rights align; no photos. |
| 066, 323 | WAC resource/browser controls align; official older WAC reference images, not verified Server 2025 captures. |
| 308, 309 | FGPP local-account exclusion and equal-precedence tie align; no photos. |

Correction files: mappings in `lib/content/ad-visual-guides-{accounts,identity,network,operations}.ts`; shared image placements/extras in `lib/content/ad-visual-screenshots.ts`; forest/demotion/DNS base workflows in `lib/content/ad-visual-guides.ts`. No commit, build, push, graph update or bank rewrite was performed by this audit agent.

## Integration outcome

The findings above record the pre-cleanup audit, not the final image assignments. Integration corrected q018, removed the clearly wrong-screen placements and unrelated Drive Map/new-user extras, restored the original exact forest Paths and Prerequisites screenshots, and added a relevant Global-group Members example. The actual DFS Replication Properties reference is now attached to q012. Shared image metadata/catalog entries and existing assets were retained for future exact placements; unassigned captures are not counted as coverage.

Current coverage: all 80 AD questions have mapped guidance; 35 AD bindings contain any photo, 23 open on a photo, 24 contain licensed local lab captures. The separately hosted DFSR reference has its own credit. Two WAC questions have official reference screenshots. 328 questions still need mapped visual walkthroughs. See ad-visual-image-coverage.md for remaining paths.
