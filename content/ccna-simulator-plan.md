# CCNA in-browser IOS simulator — delivery plan

Status: **proposal, awaiting approval.** No application code is changed by this document.
Date: 2026-10-08. Target project: the Klybit web app (Next.js 16 + Vinext, deploys as a Cloudflare Worker via `npm run build` → `npm start`).

Companion documents: [ccna-lab-audit.md](ccna-lab-audit.md) (lab manifest, sources, validator results), `content/ccna-lab-manifest.json` (machine-readable lab data).

---

## 1. What this is, and the promise it changes

A **Cisco IOS practice simulator that runs in the browser**: the learner types real commands into a terminal, the simulated devices hold a real running configuration, and the lab's objectives are graded against that configuration instead of against a typed evidence note.

Two statements in `README.md` describe today's behaviour and must move together with the first shipped pack:

- “Practical outcomes are self-reported; the website never executes IOS commands or certifies a learner's network.”
- “Use independent desktop Packet Tracer files with the specified 2911/2960 models …”

After this work, for labs that have a simulator pack, the practical result is machine-checked **inside the model**. Packet Tracer files remain the out-of-browser route, and nothing here certifies a learner's real network or claims real-device acceptance: the simulator is a model, and its output is labelled as such in the UI and in the audit document.

## 2. Language — one language, decided once

Rule: **the simulator surface is authored in exactly one language and never mixed.** No bilingual widget, no subtitle layer and no second-language field inside the terminal, the scenario, the objectives, the guide or the feedback.

Command syntax and IOS output stay English in every variant, because they are the real interface being practised; the README already fixes this (“commands remain untranslated”).

Decision (confirmed by the user on 2026-10-08): **English-only simulator content**, which matches the repository convention that content is authored in English and translated for display by the existing flow outside the simulator. The application shell around the simulator (sidebar, page chrome, course switcher) is unchanged and is not part of this rule.

Enforcement is mechanical, not a convention: all strings live in one module (`lib/ccna-sim/language.ts`), and `validate:ccna-sim` refuses to pass when any simulator string, pack title, objective, hint or transcript contains Persian/Arabic script, or declares a second-language field (`fa`, `translation`, `subtitle`, `lang`).

Switching the single language later means re-authoring the packs' narrative strings and that one module; the engine, the checks, the slice count and the coverage numbers below do not change.

## 3. Reuse and licence before writing anything

The MIT-licensed `BlackSwanAust/ccna-lab-sim` repository is already credited in this project (`THIRD_PARTY_CCNA_LICENSE.txt`, `public/ccna-attribution.txt`, `lib/content/ccna-bank.ts`). I inspected its `index.html` at the pinned revision `8d1bdc7a1d28cca1776737e8863f7a4f237b92df` (78,804 bytes, 1,574 lines, no build step):

- 8 labs defined as device/link/task/hint/verification records — topics that overlap our 8 hands-on stages;
- 19 exact-match command handlers, most of them `show` output blocks hard-coded as text;
- grading is `typedCommands.includes("vlan 10")`, i.e. a substring test over what was typed;
- the prompt is always `<device>#`: no user-exec `>`, no `(config)#`, no `(config-if)#`; no `?` help, no abbreviation handling, no port/VLAN/MAC state.

Verdict: good **content raw material** (task wording skeletons, topology coordinates, the shape of the eight topics), and **not** a usable engine — substring grading is trivially cheatable and the missing modes are exactly what CCNA objectives test.

Rules for reuse: any adapted text carries the MIT notice and is listed in a new `content/ccna-sim-attribution.md`; no Cisco, NetAcad or paid-book text is copied; `show` output is generated from our own model rather than transcribed from vendor documentation.

## 4. What the learner sees — 4 panels (the product's parts)

One lab at a time, full-width, four resizable panels. The dependency already exists in the project: `react-resizable-panels` is wrapped in `components/ui/resizable.tsx`.

| # | Panel | Contents |
|---|-------|----------|
| 1 | Scenario & objectives (left) | the story, then objectives with 2–4 sub-steps each, live ticks, `CHECK RESULTS`, `Reset Lab`, `Save` |
| 2 | Terminal (centre, top) | real prompts and modes (`SW1>`, `SW1#`, `SW1(config)#`, `SW1(config-if)#`), `?` and Tab completion, command history, `Ctrl+L`, mode badge, `role="log"` output, keyboard-first |
| 3 | Topology & interface state (centre, bottom) | the lab's own topology plus a live `Port / Mode / VLAN / Status` table that changes as commands land |
| 4 | Guide (right) | the adaptive next step, then the results card: score %, incomplete objectives, stars, per-objective breakdown |

Targets: **`/ccna/sim?lab=<id>`** becomes the sixth CCNA route, reached from the lab card in `/ccna/build` and from the library card; below 900 px the terminal stacks above the topology; engine output stays identical at every width.

## 5. Engine — 12 modules

Pure TypeScript, no DOM, no server, no new dependency:

| # | Module | Responsibility |
|---|--------|----------------|
| 1 | `lib/ccna-sim/tokens.ts` | tokenizing, quoting, unambiguous abbreviation resolution (`conf t`, `int gi0/1`, `sh run`) |
| 2 | `lib/ccna-sim/modes.ts` | mode state machine, prompt rendering, `exit`/`end`/`disable` semantics |
| 3 | `lib/ccna-sim/help.ts` | `?`, `<cmd>?`, Tab completion, `% Ambiguous command` / `% Invalid input detected at '^' marker.` |
| 4 | `lib/ccna-sim/commands.ts` | the frozen command catalog: name, mode, argument shape, handler id, one-language description |
| 5 | `lib/ccna-sim/device.ts` | device model: interfaces, VLAN database, switchport state, L3 addressing, ACLs, port security, OSPF-lite |
| 6 | `lib/ccna-sim/config.ts` | running vs startup configuration, `copy run start`/`write memory`/`erase`, canonical `show run` serialization |
| 7 | `lib/ccna-sim/link.ts` | links, access/trunk filtering, native VLAN, allowed-VLAN lists, STP state, EtherChannel bundling |
| 8 | `lib/ccna-sim/host.ts` | PC model: address/gateway, ARP resolution, ping/traceroute results |
| 9 | `lib/ccna-sim/lab.ts` | pack loading, objective evaluation, adaptive-guide state |
| 10 | `lib/ccna-sim/grade.ts` | score, incomplete objectives, stars, breakdown |
| 11 | `lib/ccna-sim/session.ts` | the REPL: input → parse → execute → output, command log, determinism |
| 12 | `lib/ccna-sim/language.ts` | the single-language strings module |

UI: `app/ccna/sim/page.tsx` plus 6 components under `app/components/ccna-sim/` (workspace, terminal, topology panel, objectives panel, guide panel, results card) and `app/ccna-sim.css`, following the existing `app/ccna-lab-path.css` convention.

## 6. Command catalog — 7 groups, ≈96 commands

Frozen in `lib/ccna-sim/commands.ts` in slice S1; each lab pack may use at most 25 of them.

| Group | Target | Examples |
|-------|--------|----------|
| G1 session & modes | 9 | `enable`, `disable`, `exit`, `end`, `configure terminal` |
| G2 device verification | 14 | `show version`, `show running-config`, `show interfaces status`, `show ip interface brief`, `show cdp neighbors`, `show mac address-table` |
| G3 L2 configuration | 18 | `vlan`, `name`, `interface range`, `switchport mode access\|trunk`, `switchport trunk allowed vlan`, `spanning-tree portfast`, `channel-group` |
| G4 L3 configuration | 14 | `ip address`, `ipv6 address`, `ip default-gateway`, `ip route`, `ipv6 route`, `router ospf`, `network`, `passive-interface` |
| G5 services | 12 | `ip dhcp pool`, `default-router`, `ip dhcp excluded-address`, `ip helper-address`, `ip nat inside source`, `ntp server`, `ip domain-name` |
| G6 security & management | 19 | `enable secret`, `username … secret`, `line vty`, `transport input ssh`, `banner motd`, `access-list`, `ip access-group`, `switchport port-security` |
| G7 state & persistence | 10 | `show vlan brief`, `show interfaces trunk`, `show spanning-tree`, `show etherchannel summary`, `show ip route`, `show port-security`, `copy running-config startup-config` |

## 7. Lab pack format — declarative, not text matching

```ts
export default {
  labId: "ccna-vlans",                 // must be an existing lab id in ccna-lab-path
  devices: [ { id: "SW1", kind: "switch", ports: ["Gi0/1", "Gi0/2"] }, { id: "PC1", kind: "pc" } ],
  links:   [ ["SW1.Gi0/1", "PC1.eth0"] ],
  start:   { config: {}, fault: null },// or a seeded fault for the troubleshooting track
  objectives: [
    { id: "o1", title: "Segment the access layer",
      steps: [ { text: "Create VLAN 10 on SW1", check: ({ device }) => device("SW1").vlan(10).exists } ] }
  ],
  hints: ["vlan 10 / name SALES", "interface Gi0/1 / switchport mode access"],
  maxCommands: 25
};
```

Checks are **declarative predicates over model state**. Substring matching of typed input is not expressible in this format, which is the deliberate fix for the flaw described in §3, and it is what makes the objective "did you configure it" rather than "did you type it".

## 8. State and persistence

- The existing `ServerLabState` keys (`answers`, `quizSubmitted`, `evidenceText`, `activeTab`, `questionIndex`) keep their exact meaning; the simulator adds one namespaced, versioned sub-object inside the same submission row (`simVersion: 1`), read and written through the existing `/api/lab-submissions` route with its unchanged authentication and ownership rules.
- Rows written before this feature must keep parsing; that is a test in S3, not an assumption.
- No new route, no new table, no per-command network call: the engine is pure client code, so there is no added server cost and the surface keeps working offline after load.
- `Reset Lab` clears simulator state only and leaves answers, quiz grades and evidence untouched.

## 9. Slices — the count: **6**, of which **4 are the minimum shippable core**

| Slice | Contents | Acceptance (measurable) | Size |
|-------|----------|-------------------------|------|
| **S0** Engine skeleton, terminal, modes, help | modules 1–4, 11, 12; terminal panel | session transcript replays byte-identically twice; `?` lists only implemented catalog entries; identical output on two runs (determinism); invalid input returns `% Invalid input detected at '^' marker.` with the caret under the offending token; abbreviations resolve; language-purity check passes; `tsc`, `validate:ccna-sim`, the existing CCNA validators and `npm run build` all green | S |
| **S1** Configuration surface & persistence | modules 5, 6; G1, G3–G6 command handlers | `show running-config` equals the checked-in expected configuration for the six hands-on lab end states; running vs startup split; `copy run start` and `write memory`; `no` forms; interface ranges | M |
| **S2** Topology, L2/L3 model | modules 7, 8; panel 3 | per-lab assertions executed headless against the engine (VLAN isolation, trunk native/allowed-VLAN faults, STP blocked port, EtherChannel bundling failure, ARP/ping reachability, static route path) — not through the DOM | L |
| **S3** Objectives, grading, results, save | modules 9, 10; panels 1 and 4; route `/ccna/sim` | real browser flow on `/ccna/sim?lab=ccna-vlans`: type, check results, see score and incomplete objectives; score deterministic; reload restores the stage from the server row; a pre-simulator row still loads; two-account isolation unchanged; README promise reworded in the same commit | M |
| **S4** Depth and fault injection | STP, port security, ACLs, OSPF-lite; seeded faults | each of the six troubleshooting-tier labs (band 11 — four ship in W3, two wait for their review notes) has a reproducible seed plus a solver transcript that repairs it to “all objectives pass”; the recompose from the seed is deterministic | L |
| **S5** Rollout waves and hardening | packs, a11y, mobile, budget, docs | the four waves below ship; per-lab pack loading is lazy and the library page payload is unchanged (measured before/after); 390 px has no horizontal overflow; terminal stays responsive with 2,000 lines; first-lab JS addition ≤ 60 KB gzip | L |

**Slice status (2026-10-09).** S0 and S3 are implemented, and S1 is being delivered in parts, because
one end-state fixture per hands-on lab needs a different part of the configuration surface.

- **S3 — delivered for five labs, not for the catalog:** the browser flow (type, see the result and the
  incomplete objectives, reload restores the stage, two-account isolation unchanged) is held down by
  `npm run test:ccna-sim-ui` and by `npm run test:ccna-sim-labs`, which drives the real component for
  **every** authored lab and asserts per lab: a fresh lab is unsolved, repeated read commands credit
  nothing, another device's commands on the wrong console credit nothing, the lab's own solution reaches
  100%, cutting a cable withdraws its steps and reconnecting restores them, extra configuration is still
  accepted and cannot create credit, Resume restores the cables, the configuration and the progress, and
  Reset clears the selected lab only. Which labs are graded, and which capability each ungraded lab is
  waiting on, is generated into `content/ccna-lab-readiness.md`; the per-lab findings of this batch are
  in `content/ccna-sim-lab-report.md`.
- **S1a — delivered:** interfaces, `interface range`, the VLAN database, access/trunk keywords with
  native and allowed VLANs, SVI addressing, `shutdown`/`no shutdown`, the `no` form for every
  negatable command, running-versus-startup configuration with `copy run start`, `write memory` and
  `erase startup-config`, and the `show` commands `running-config`, `startup-config`, `vlan`,
  `vlan brief`, `interfaces status`, `interfaces switchport` and `ip interface brief`. The end state it
  proves is the `ccna-vlans` lab, committed as a golden transcript.
- **S1b — partly delivered:** the addressing end state is proven by `ccna-addressing`, and `ccna-routing`
  now grades its addresses, both static routes and the end-to-end path from device state. Still missing:
  the services end state (DHCP and NAT keywords) for `ccna-services`, and OSPF for `ccna-routing`, whose
  three protocol steps are declared ungraded until an OSPF engine exists.
- **S1c — partly delivered:** `ccna-security` grades the SSH end state (domain name, ≥2048-bit RSA key,
  local secret user, `login local` and `transport input ssh` on all five VTY lines). Still missing: the
  ordered access list, which needs an ACL engine before a denial can be produced rather than described;
  those steps are declared ungraded and are never counted.
- **S1d — remaining:** the EtherChannel end state (`channel-group`, `etherchannel summary`) for
  `ccna-etherchannel`. Its devices and both bundle members now match its published outline, but no step
  is graded until the engine models a port-channel.

Sizes are relative estimates, not commitments. S0–S3 is the minimum that is genuinely worth shipping: after S3 a learner can configure a lab in the browser and be graded on the result. S4 and S5 add depth and reach. A lab is only a stage once its own objectives are predicates over device state; a lab whose engine capability is missing stays ungraded and says so, and `npm run audit:ccna-readiness -- --check` fails if a lab is ever marked graded while the engine cannot prove what its own text asks for.

## 10. Coverage — how many labs, computed from the manifest

109 labs today: 8 hands-on, 101 catalog, 96 with a diagram, 12 `needs-review`, 624 objective labels.

Excluded by kind (7): band 08 wireless (`ccna-wireless`, `ccna-topology-027`) and band 10 automation (`ccna-automation`, `ccna-topology-098`…`-101`) need a controller GUI and a structured-data surface, not an IOS terminal.

| Wave | Labs | Bands covered |
|------|------|---------------|
| **W1** hands-on spine | **6** | `ccna-addressing`, `ccna-vlans`, `ccna-etherchannel`, `ccna-routing`, `ccna-services`, `ccna-security` |
| **W2** foundations & switching | **27** | band 01 (8), band 02 except the hands-on lab (8), band 03 except its hands-on and its one needs-review lab (5), band 04 (4), band 05 except its hands-on lab (2) |
| **W3** routing & troubleshooting | **24** | band 06 except its hands-on and needs-review lab (20), band 11 except its two needs-review labs (4) |
| **W4** services & security | **34** | band 07 except its hands-on and two needs-review labs (14), band 09 except its hands-on lab (20) |
| | **91 labs with a simulator pack** | |

The remaining **18 labs get no pack yet, deliberately**:

- **11 behind `needs-review`** — five integrated capstone labs (band 12, which the catalog itself does not enumerate), one VLAN lab (VTP is not in the published blueprint), one routing lab (Frame Relay), two services labs, two troubleshooting labs whose summaries contradict their neighbours. A simulator must not paper over a content doubt that is already recorded in the manifest.
- **7 by kind** — the wireless and automation labs above.

## 11. Verification and guardrails

New: `scripts/validate-ccna-sim.mjs` and `npm run validate:ccna-sim`. It refuses to pass on:

- a pack whose `labId` is not a real lab, or that belongs to a `needs-review` lab;
- a pack that uses a command missing from `lib/ccna-sim/commands.ts`, or more than 25 commands;
- an objective with no check, a check that is not a declarative predicate, or a pack with zero objectives;
- a transcript that does not replay byte-identically through the engine;
- mixed-language content (the mechanical form of §2);
- a lab with a pack but no entry point from both `/ccna/build` and the library;
- any edit to a frozen AZ-802 / AZ-900 / Docker file rather than an addition.

Added later, same commit as the device-model repair below: `npm run test:ccna-sim-ui` (the workspace component in jsdom, driving real keyboard and click events) and `npm run audit:ccna-readiness` (the per-lab readiness table, with `--check` failing a lab that claims graded work it cannot prove). `scripts/validate-ccna-guidance.mjs` was removed with the transcript-credit rule it tested: a `show` command can no longer be evidence for a graded step at all, so the rule it guarded does not exist.

Two repairs after the first production check of that work. **Closed consoles name their own recovery:** `exit` at user exec really does end an IOS session, so the console stops accepting keys; the surface printed nothing, and a learner could not tell a dead session from a broken page. The console now prints `simulatorText.closed`, and its wording names the control that exists on this surface ("Restart this console"), which resets only that console; `test:ccna-sim-ui` holds it down with `exit`, the notice, the restart and the fresh `SW1>` prompt. **The frozen-file baseline is line-ending independent:** `validate-ccna-labs` used to hash raw bytes, so a checkout git had not rewritten yet failed the gate on files nobody had changed. It now hashes content with CRLF normalised to LF, and a one-line append to a frozen file still fails it.

Must stay green, unchanged: `validate:ccna-labs`, `validate:ccna-topologies`, `verify:ccna-lab-sources`, `validate:az802`, `validate:az900`, `validate:questions`, `tsc`, `npm run build`.

Browser acceptance is manual, per slice, recorded by extending [ccna-lab-audit.md](ccna-lab-audit.md) — never by replacing its earlier evidence.

## 12. Risks

| Risk | Mitigation |
|------|-----------|
| Learners read simulator output as real device output | visible “practice model” badge; no certification language anywhere; README reworded in the same commit as the first pack |
| Content cost across 91 packs | the 13 scenario types become templates; author only tasks, hints and expected state; gate packs on `reviewed` labs |
| Grading integrity | declarative state predicates only; substring matching explicitly not repeated (§3, §7) |
| Content doubts inside a shipped lab | 11 labs stay unpacked until their recorded reason is resolved |
| Bundle growth on the library route | lazy per-lab packs, measured budget in S5 |
| Trademark and licence | no vendor text copied; MIT notice for adapted material; existing Cisco disclaimers untouched |

## 13. Non-goals for v1

No drag-and-drop topology builder, no classroom or multi-user features, no wireless controller GUI, no REST/JSON automation surface, no AI helper inside the terminal, no Packet Tracer file export, and no claim of real-device or provider acceptance.

## 14. Decision recorded, and the first step

The single-language decision is confirmed: **English-only simulator content** (§2). Nothing else is open — the slice count, the module count and the 91/18 coverage split do not depend on it.

First step on approval: slice S0, ending with a working `/ccna/sim?lab=ccna-addressing` served locally, plus the validator and the golden transcript that proves determinism.

## 15. Recorded after the device-model repair (2026-10-09)

A learner reported four faults in `ccna-addressing`: `enable` on R1 answered "Unknown command", `show vlan brief` on SW1 was refused although the guide offered it, the topology showed a port connected while the console said `administratively down`, and switching device tabs lost the console.

Cause, proven from the code: only an *authored* pack has devices with a console role, and the workspace chose its console implementation from that role. The 106 labs without an authored pack therefore had a **canned transcript** instead of the engine — a fixed string table that did not contain `enable` or `show vlan brief`, that printed `administratively down` regardless of the cables, and that could never carry a second device's state. The engine that would have answered all four correctly was already there and unused for those labs.

What changed:

- **One device model.** Every lab now builds every console through `createLabSession`, one console per node with a stable node id. The canned transcript path (`terminalResponse`, `terminalFor`, `SimulationTerminalPack`) is deleted, and `validate:ccna-sim` fails if it comes back. A device whose real control surface is a vendor GUI (access point, cloud) has no console role, and the workspace says so instead of inventing one.
- **Status from cable and admin state, everywhere.** The canvas dot, the interface table and `show interfaces status` / `show ip interface brief` all read `portLinkStatus` from the same model, so one port cannot be "connected" on screen and down in its own console.
- **Per-console state.** Each console keeps its own transcript, history, draft and device state; switching tabs no longer touches another device. A snapshot is restored per device, and a snapshot from an older device model keeps its transcript while its device state is rebuilt from the lab's current defaults — with a visible explanation.
- **No transcript credit.** A step is credited only by a predicate over live device state. A lab with no authored objective shows its own evidence checks as a read-only observation list and credits nothing.
- **Engine: IPv6 and mask arithmetic.** `ipv6 address <addr>/<prefix>`, `ipv6 default-gateway`, `ipv6 unicast-routing`, `show ipv6 interface brief`, `show ip route connected`, `show ipv6 route connected`, `show interfaces trunk` and IPv6 ping are implemented from the model. The subnet comparison was computing every mask as /8, /16, /24 or /32 (it counted 255 octets), so a /26 lab treated `.64` as a neighbour of `.10`; it now ANDs the real dotted mask, and an non-contiguous mask is refused the way a device refuses it.

What the engine still cannot prove, stated rather than faked: no static or dynamic routing (no OSPF adjacency, metric or AD), no EtherChannel, no spanning tree, no HSRP/VRRP, no DHCP/DNS/NTP/syslog/TFTP services, no NAT, no ACL/SSH/AAA/password model, no port security, no CDP/LLDP/VTP/MAC-table model, and no wireless or REST/JSON surface. A lab that needs one of these is reported as `no-route` (for routing) or left unauthored, and `content/ccna-lab-readiness.md` lists every lab with the exact missing capability and the commit that shipped the packs that exist.

State of the coverage after this repair, then after the task-completion batch that followed it: **5 labs graded from device state** (`ccna-addressing` 11 graded steps, `ccna-routing` 8, `ccna-security` 7, `ccna-vlans` 10, `ccna-topology-017` 16 — 52 in total), **104 labs with no authored objective yet**, of which 88 ask for at least one capability the matrix above does not implement. No lab is marked complete on the strength of another lab's work, and none of the missing capabilities is labelled as done.

Two labs are graded in part on purpose. `ccna-routing` grades its addresses, both static routes and the end-to-end path from each device's own table, and declares ungraded its two OSPF steps (converting the static routes and repairing an area mismatch); `ccna-security` grades the SSH identity and VTY state its own login is gated on, and declares ungraded the intentional echo denial and the permitted-flow check. Those four steps need a routing protocol or a packet filter the engine does not have. Every lab additionally leaves its "repeat the build in your own Packet Tracer file" step ungraded: that work happens outside this model. An ungraded step is never counted, is named as not evaluated in the learner's own words, and cannot be reached by typing anything.

One repair belongs to this batch's tooling rather than to the product: the acceptance suite typed commands by
sending synthetic keydowns to the terminal, which stopped being the input path when the console gained a real
inline `<input>` for soft keyboards. It now drives that input, and it restarts a console the learner's own
`exit` closed instead of silently abandoning the rest of the step. A harness on the old path reported every
lab at 0/N, which would have read as a grading failure and was not one.
