# SatzTat: Network Incident Desk — reviewed implementation plan

Original planning baseline: 2026-10-23. The two-case implementation is now complete;
see section 12 for released scope, verification and remaining limits. Sections
1–11 preserve the original design decisions, not a claim that all 24 missions exist.

## 1. تصمیم اصلی / Product decision

ایدهٔ «پروندهٔ خطا» به بازیِ حل مسئلهٔ شبکه در بخش آلمانی Klybit تبدیل می‌شود:
کاربر تیکت می‌گیرد، شواهد را بررسی می‌کند، خرابی را در یک سناریوی محدود رفع می‌کند
و بعد به آلمانی گزارش می‌دهد. تعمیر شبکه، جملهٔ درست و یادگیری مستقل سه نتیجهٔ متفاوت‌اند.

Start with **one complete DNS incident**, not 24 shallow screens. Preserve the 60
existing German lessons and their saved progress. Proposed companion route:
`/german/satztat`, linked from `/german`. Do not create another site or global theme.

The original attachment is design input, not an instruction to implement every
feature immediately. The user's latest sequencing is: plan, independent agent
review, project-graph connection, then visual/playable pilot and incremental rollout.

Working title: **SatzTat: Netzwerk-Einsatz** / Network Incident Desk.
One fictional company, Madar IT, supplies the characters, network and incident history.
The learner is its junior support engineer, not an attacker or a criminal investigator.

## 2. Learning contract

- First campaign: past counterfactuals, **Konjunktiv II der Vergangenheit**.
- Prerequisites: Perfekt, participles, auxiliary selection and subordinate-clause
  verb position. A short optional bridge helps without locking the player out.
- Treat this as an advanced extension of the current B1-to-B2-oriented practice,
  not proof that every B1 learner is ready or that completing it awards a CEFR level.
- Initially avoid modal-perfect/Ersatzinfinitiv, mixed-time counterfactuals and six
  simultaneous grammar families. Later campaigns may introduce other structures.
- Network knowledge is scaffolded: definitions, an accessible diagram and a guided
  technical path prevent language results from merely measuring prior IT experience.
- A mission is not a calendar day. Twenty-four missions need not take 24 days.
- No promise of 50% error reduction, 80% transfer or guaranteed retention; those are
  possible study hypotheses, not product claims or acceptance criteria.

Core loop:

`ticket → hypothesis → evidence → diagnosis → repair → retest → German report → new case → delayed review`

## 3. Existing infrastructure: verified, not assumed

| Existing source | Verified capability | Reuse boundary |
| --- | --- | --- |
| `app/german/page.tsx`, `GermanPage` | Account check, shared header, navigation, settings and account panel | Reuse/extract a small German shell when implementing; the current layout alone does not provide auth |
| `app/german/page.tsx`, `GermanWorkspace` | Lesson interaction, account-scoped browser saves, assistance tracking | Preserve its 60 lessons and save key; do not reinterpret its counters as mission mastery |
| `lib/content/german-learning.ts` | Authored models, variants, vocabulary and self-review checklists | Reference prerequisite lessons; use a separate mission schema |
| `lib/german-learning-engine.ts`, `normalizeGermanText` | NFC normalization and input limits | Useful utility; not semantic analysis |
| `compareCharacters`, `compareTypedCharacters` | Character comparison against a known answer | Model practice or post-submit feedback only; no live answer oracle in independent production |
| `isGermanAnswerCorrect` | Exact normalized-string comparison | Not a freeform grammar evaluator |
| `recordGermanAttempt` | Lesson-level recall/Leitner accounting | Do not feed game outcomes into it or change the existing schedule |
| `app/components/study-header.tsx`, `StudyHeader` | Shared theme, font size, translation and account controls | Retain the site's settings behavior |
| `app/product-theme.css` | Shared white/navy/blue product tokens, saved dark preference | No new global skin; game-specific illustration only |
| `scripts/test-german-ui.mjs` | React interaction/persistence test pattern | Does not prove browser geometry or a physical mobile keyboard |

Graph inspection confirmed `GermanPage → GermanWorkspace` and
`GermanWorkspace → recordGermanAttempt` as existing relationships. The new route,
mission reducer, language evaluator, error dossiers and media manifest below are
**proposals**, not capabilities discovered in the graph.

## 4. Pilot: Fall 01 — Der verschwundene Dateiserver

### Story and timeline

At 09:00, an employee reports: “Ich erreiche den Dateiserver über seine IP-Adresse,
aber nicht über seinen Namen.” A DNS record still points to a retired address.
The learner investigates and repairs it at 09:15. At 09:30, the incident manager
asks what would have happened if the record had been corrected before the outage.
That explicit earlier alternative makes the past-counterfactual report meaningful.

### Authored technical fixture

| Entity | Initial state |
| --- | --- |
| PC-A | `10.24.0.10/24`; DNS server `10.24.0.53` |
| SW1 | One working LAN; links and VLAN assignment already correct |
| DNS1 | `10.24.0.53`; authoritative for the fictional `madar.test` zone |
| FILE1 | `10.24.0.20`; SMB service available on TCP 445 |
| `files.madar.test` | Incorrect A record: `10.24.0.99` |
| PC-A resolver cache | Initially contains `files.madar.test → 10.24.0.99` |
| Firewall | Required DNS, ICMP and SMB tests are explicitly permitted in this fixture |

Everything is a **bounded, authored story simulation**. It is not a live Windows
server, Cisco firmware, general-purpose terminal or production network connection.

Evidence actions read the same state revision:

- `ipconfig /all`: correct client/subnet/DNS configuration.
- `ping 10.24.0.20`: succeeds, but does not by itself prove SMB works.
- `Test-NetConnection 10.24.0.20 -Port 445`: succeeds.
- `nslookup files.madar.test 10.24.0.53`: directly queries DNS1 and returns `.99` initially.
- `Test-NetConnection files.madar.test -Port 445`: fails at the stale address.
- Inspect the DNS record and client cache through labelled evidence cards.

Repair has explicit effects: correct the A record to `.20`, then refresh the client
cache through the modelled action or simulated TTL expiry. Cache refresh alone
does not repair the wrong authoritative record; correcting the record alone does
not magically remove an existing stale client cache entry.

Technical verification requires the correct authoritative answer, current client
resolution and a successful service test **after** the change. Repeating a read-only
command, opening a card or clicking “done” cannot satisfy repair objectives.

### One playable session

1. Open the case; read the short ticket and desired service outcome.
2. Check the two prerequisites or take the optional bridge.
3. Record an initial technical hypothesis and a short German baseline response.
4. Inspect the topology and choose diagnostic evidence; unrelated choices are safe
   and get factual feedback, not lost lives.
5. Correct the record, handle the explicit cache state and retest.
6. Write the 09:30 postmortem independently, without seeing a model sentence.
7. For a supported error, show one error code and a targeted hint; allow self-repair.
8. Show a complete sample only on request, with durable assisted-attempt status.
9. Open a held-out mini-case, then save progress and the next review.

Authored target, **one example, not the only valid German sentence**:

> Wenn wir den DNS-Eintrag früher korrigiert hätten, wäre der Dateiserver unter seinem Namen erreichbar gewesen.

Accepted authored alternate order:

> Der Dateiserver wäre unter seinem Namen erreichbar gewesen, wenn wir den DNS-Eintrag früher korrigiert hätten.

A changed address alone is not a valid transfer test. The held-out case must change
the relevant causal evidence, actors or diagnostic contrast, and its answer must
not appear in the training hints, vocabulary examples or media.

## 5. Assessment: three independent results

| Result | Evidence | What it cannot imply |
| --- | --- | --- |
| Technical repair verified | State predicates and fresh diagnostic observations | German competence |
| Supported language evidence observed | Authored accepted form, intended meaning and assistance provenance | Universal freeform grammar understanding |
| Story completed | Repair plus an accepted report or clearly labelled self-review | Independent transfer or delayed retention |

Independent-transfer credit additionally requires a held-out item, an unassisted
first submission and no prior exposure to its answer. A self-reviewed alternative
may advance the story but does not fabricate automatic language verification.

The proposed local evaluator has three outcomes: `verified`, `needs-repair` for
known supported errors, and `not-assessed` for unsupported formulations. It must:

- Accept reviewed variants; never rely on one literal answer or just the presence
  of `hätte` and `wäre`.
- Diagnose only authored errors it can actually distinguish: auxiliary choice,
  participle, supported verb-order errors, or known time/negation contradictions.
- Separate meaning, target structure and mechanical spelling/punctuation feedback.
- Keep unfamiliar plausible answers neutral and offer model comparison/self-review.
- Never call a local matcher “AI grammar analysis”. A future model service needs a
  separate server-side design, uncertainty handling and explicit privacy review.
- Hide per-character grading before submission in independent/transfer modes;
  retain live green/red feedback in explicitly assisted model practice.
- Keep German target text `lang="de"`, `translate="no"`; optional translation of
  instructions must be recorded as language assistance where it reveals meaning.

Technical guidance and language guidance need separate flags. Neither a language
mistake nor a polite but imperfect sentence should unrealistically break a repaired
network. Communication consequences may affect report clarity or handover dialogue,
not rewrite technical truth.

## 6. Proposed 24-mission map

All missions remain within the past-counterfactual campaign; the network situations
vary while language support gradually decreases. These are content proposals.

| Chapter | ID | Network incident / decision | Language emphasis |
| --- | --- | --- | --- |
| Discover | 01 | Stale DNS record plus client cache | Baseline; earlier action and past consequence |
| Discover | 02 | Loose workstation cable | `wäre … angeschlossen gewesen` |
| Discover | 03 | Disabled network adapter | `hätten … aktiviert`; consequence |
| Discover | 04 | Wrong subnet mask | Perfekt bridge; past auxiliary selection |
| Discover | 05 | Unrenewed DHCP lease | Participle and clear actor |
| Discover | 06 | Forgotten configuration save | Guided incident report |
| Repair reports | 07 | Wrong default gateway | Self-correct a supported auxiliary error |
| Repair reports | 08 | Wrong access VLAN | Subordinate-clause verb position |
| Repair reports | 09 | Missing allowed VLAN on trunk | Main-clause inversion after `wenn` |
| Repair reports | 10 | Guest-network isolation | Distinguish intended restriction from outage |
| Repair reports | 11 | Expired application certificate | Network reachability is not service correctness |
| Repair reports | 12 | Missed monitoring alert | Concise causal report with reduced hints |
| Change requests | 13 | Printer moved to another subnet | New vocabulary and alternate clause order |
| Change requests | 14 | DNS server migration | Correct actor, action and earlier timing |
| Change requests | 15 | Branch return-route change | Explain an evidence-supported consequence |
| Change requests | 16 | Wi-Fi change window | Distinguish actual events from alternatives |
| Change requests | 17 | Restore rehearsal | Explain prevention without inventing a guarantee |
| Change requests | 18 | Incident handover | Independent report for a colleague |
| Cold cases | 19 | Name/address contrast, unseen cause | No grammar-rule label or answer oracle |
| Cold cases | 20 | Compare branch symptoms | New causal context; no model exposure |
| Cold cases | 21 | Access-policy incident | Intended meaning and negation |
| Cold cases | 22 | Backup-path failure | Independent transfer in new context |
| Cold cases | 23 | Multi-evidence outage | Separate contributing causes |
| Cold cases | 24 | Final technical handover/postmortem | Unassisted report plus later review |

Every authored case needs initial state, evidence, allowed changes, technical
predicates, German prompt, accepted variants, supported errors, layered hints,
solution, glossary, held-out relationship, media provenance and a regression fixture.
Advanced technical cases must remain scaffolded and honestly bounded.

## 7. Visual direction and media plan

Reuse Klybit's navy/blue/white theme and optional saved dark appearance. Use an adult
incident-desk aesthetic: clean topology, device icons, evidence cards and a timeline.
No decorative crime-scene imagery, mandatory countdown, lives, public leaderboard
or celebratory animation that interrupts typing.

Desktop composition:

```text
Shared Klybit header · German for IT / SatzTat · settings/account
Case 01 · Ticket + short goal                         [case map]
+-----------------------+-------------------------------------+
| Network scene         | Current task / hypothesis / report  |
| PC-A — SW1 — FILE1     | One main action at a time           |
|          └ DNS1       | German input; keyboard helpers      |
| Inspect device        | Check → hint → self-correct         |
+-----------------------+-------------------------------------+
Evidence tray / diagnostic results / change timeline
Technical result | Language evidence | Next review
```

On mobile, stack the current task first, then expandable scene and evidence. Keep
native text entry, natural scrolling and the main action usable above the keyboard.
No mandatory dragging or hover. Give the diagram a text/table equivalent, statuses
icons and labels as well as colour, clear focus and reduced-motion support.

The diagnostic case names in section 6 are author-facing only. Learner-facing case
titles describe symptoms and must not reveal the root cause before investigation.
In P1, example result/save states must be explicitly labelled as examples; do not
show working-looking verification or saved progress before those functions exist.

Media sequence:

1. **Pilot:** code-native SVG topology and state-driven diagnostic cards. This is
   the primary interactive visual, not a static screenshot pretending to simulate.
2. **After pilot approval:** a few real, relevant DNS Manager/command screenshots,
   with permission/source, capture version, alt text and all sensitive data redacted.
   If an illustration is recreated, label it as a teaching reconstruction.
3. **Later:** optional short captioned diagnostic clips with transcript and explicit
   play controls. No autoplay/background video. Any solution-revealing clip belongs
   after the independent attempt or behind an assistance-labelled reveal.

For each asset store its teaching purpose, supported incident, provenance/license,
alt text/transcript, dimensions/poster and spoiler/assistance classification. If no
legitimate useful asset exists, use a labelled code-native reconstruction instead
of unrelated stock media. No media is produced or licensed by this plan.

## 8. Implementation and persistence boundaries

Original proposed file split; the released pilot consolidates its small pure
engine as documented in section 12. The following list is not an inventory of
implemented files:

- `app/german/satztat/page.tsx`: entry, navigation and shared shell integration.
- `app/german/satztat/satztat.css`: local responsive scene and report styling.
- `app/components/satztat-workspace.tsx`: current task, evidence and report flow.
- `lib/content/satztat-missions.ts`: reviewed campaign content and pilot fixture.
- `lib/satztat-engine.ts`: pure story reducer, evidence revision and technical checks.
- `lib/satztat-language.ts`: bounded, three-outcome language assessment.
- `lib/satztat-progress.ts`: durable attempts, review schedule and save validation.
- `public/german/satztat/`: only approved assets, when added later.

New account-scoped key: `klybit-satztat:v1:<userId>`. Never overwrite
`klybit-german:v1:<userId>`. The new route must perform the existing account check;
do not assume `app/german/layout.tsx` authenticates nested pages.

Save mission/content version, current scene/step, technical state and evidence
revision, drafts, submissions, first-attempt result, technical/language assistance,
revealed-item IDs, retries, transfer-item exposure and review dates. Persist relevant
assistance before showing a reveal. Reload/view changes cannot erase exposure.

Review policy starts with intervals of 1, 3, 7 and 14 days **after eligible reviews**;
do not silently borrow the existing lesson engine's different first-promotion rule.
Use an injectable clock in tests. Repeating the same case today cannot advance
multiple review levels. Missed days are rescheduled without punishment. Browser
clock/local saves are convenience evidence, not tamper-proof certification.

Corrupt/blocked storage must not crash the session or claim it saved successfully.
Provide versioned export and scoped reset with confirmation. This pilot does not
add cloud sync, microphone recording, paid APIs or third-party analytics.

## 9. Step-by-step delivery gates

| Gate | Deliverable | Exit condition |
| --- | --- | --- |
| P0 · this step | Plan, independent critique, honest graph connection map | Proposed and existing capabilities clearly separated |
| P1 | Visual prototype for one case | User can inspect desktop/mobile layout; no pretend grading |
| P2 | One complete DNS vertical slice | Initial fault, real state changes, technical verification, report assessment, transfer, resume |
| P3 | Error dossier and due review | Persistent provenance, alternate examples and clock-controlled tests |
| P4 | Chapter 1, then chapters 2–4 | Each case independently reviewed/tested before expansion |
| P5 | Relevant media and release | Provenance, captions, visual/mobile checks and non-regression complete |

Required tests before describing the pilot as usable:

- Fresh start is unsolved; unrelated/read-only actions cannot satisfy repair steps.
- Wrong DNS answer, stale cache and unavailable service produce distinct outcomes.
- Old diagnostic results cannot verify a new revision until retested.
- Technical success never grants language/transfer credit; language success never
  repairs the technical state.
- Both accepted clause orders pass. Empty/unrelated answers gain no credit.
- Known errors get supported hints; unknown alternatives remain ungraded.
- Model reveal, hints, retries, translation and reload retain correct provenance.
- Independent tasks have no pre-submit character/grammar oracle or spoiler media.
- Held-out tasks have meaningfully different causes and no exposed answer key.
- Export/resume/reset, separate accounts, corrupt storage and blocked storage work.
- Existing German lessons, saves, theme settings and other courses are unchanged.
- Review timing and same-day repetition use a controlled clock.
- Keyboard/IME/umlauts, focus, labels and text alternatives work.
- Real browser/mobile keyboard and layout are inspected before claiming visual QA;
  React/JSDOM and CSS-contract tests alone are not that inspection.

## 10. Independent agent review and disposition

Reviewer: `satztat_network_plan`, one read-only agent requested by the user.
Verdict: **GO for planning and one DNS pilot; REVISE before implementing 24 missions.**

Accepted revisions: separate mission state/evaluator; preserve 60 lessons; preserve
assistance across reload; distinguish IP/name/service/cache; scaffold IT knowledge;
keep one grammar family initially; unknown valid alternatives ungraded; genuinely
unseen cold cases; SVG/evidence first and optional relevant media later.

The agent did not claim to implement, test or deploy the game. This document also
makes no such claim. The next product decision is approving the one-case visual
prototype, not authorizing a second full-site redesign.

Final review of both planning artifacts: **APPROVED FOR VISUAL PILOT**. The agent
verified the six referenced graph symbol IDs and accepted the DNS/cache/timeline
corrections. This approval does not cover full-campaign implementation, deployment
or claims of educational effectiveness.

## 11. Sources and project graph

- Original user attachment: SatzTat 24 grammar-case proposal, adapted to networking.
- IDS grammis, Konjunktiv II terminology and analytical past form:
  https://grammis.ids-mannheim.de/terminologie/401
- Microsoft Learn, DNS client troubleshooting and direct-query/cache distinction:
  https://learn.microsoft.com/windows-server/networking/dns/troubleshoot/troubleshoot-dns-client
- Verified repository symbols are listed in section 3; proposed additions in section 8.
- `content/satztat-network-plan.graph.json` records the planning nodes, their status,
  existing-source references and proposed relationships. It is not runtime code.
- Host-model token usage is not available in this record. Graph indexing uses local
  structural operations; no external model API is required for indexing this plan.

## 12. Two-case implementation and release review

Implemented scope: `/german/satztat`, linked from German navigation and a visible
German dashboard card. There are **two playable cases**, not 24 placeholders:

1. FILE1: wrong authoritative record plus a stale client cache.
2. ARCHIVE1: different subnet/client and wrong configured resolver, with a healthy
   authoritative record. It unlocks after the first story is complete.

Actual files: `app/german/satztat/{page.tsx,layout.tsx,satztat.css}`,
`app/components/satztat-workspace.tsx`, `lib/content/satztat-missions.ts` and
`lib/satztat-engine.ts`. The engine owns bounded language assessment, typed network
state, revision-bound diagnostics, report provenance, parsing and delayed recall.
No general-purpose device engine or paid model was added.

The scene is code-native interactive graphics, with an accessible device list,
inline diagnostic result and bounded auto-scrolling evidence log. Both cases offer
the same repair categories so available buttons do not reveal the root cause.
Reports use native German text input, umlaut helpers, post-submission feedback,
known valid variants and neutral unknown outcomes. Self-review has an explicit
input guard and never grants automatic language or transfer credit.

Progress/export/reset use the separate account-scoped `klybit-satztat:v1:` namespace.
Historical case completion, failed later recall and assisted retries have distinct
labels. Models and previous hints do not silently reappear in independent recall.
Translation assistance is recorded. The first submitted report is the baseline;
there is no claim of a separate pre-instruction learning-effect study.

Verification performed:

- `node --experimental-strip-types scripts/test-satztat-engine.mjs`: 15 groups pass.
- `node scripts/test-satztat-ui.mjs`: both cases through actual React forms/buttons;
  repairs, fresh checks, alternate reports, supported errors, no pre-submit answer
  oracle, durable assistance/reload, transfer, failed recall verdict, unknown/self-
  review guards, IME, isolation, reset, blocked storage, translation and auth fixture.
- `node scripts/test-german-ui.mjs`: existing 60 lessons and their behavior pass.
- `node scripts/test-product-theme.mjs`: shared-theme regression passes.
- Full TypeScript check passes. Production build is part of the release gate.

Independent agent's final actual-code verdict: **APPROVED FOR THE TWO-CASE PLAYABLE
RELEASE**. No concrete code/content integration blocker remained.

Limits: auth and translation in UI tests are fixtures; browser geometry, native
mobile keyboard and real-user production interaction have not been visually
verified in this environment. No screenshots/videos were fabricated, and no media
is required to use the released code-native scene. The other 22 missions, richer
media and a general grammar evaluator remain future work.
