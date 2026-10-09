# Device engine update — 2026-10-09

This is an additive implementation record. The concurrently edited
`ccna-simulator-plan.md` is not overwritten.

## Delivered

- All router and switch consoles expose their supported commands independently
  of lab objectives. PC consoles remain endpoint consoles, not IOS routers.
- Domain name, local lab users, simulated RSA configuration (explicit modulus or
  interactive prompt), SSH version/timeouts/retries, VTY ranges, login local,
  transport input, show ip ssh, removal, and running/startup configuration.
- A PC can `ssh -l username address` into a configured reachable router or switch.
  Authentication and network reachability are checked. Its independent remote
  console edits the SAME target device object as the destination tab and grader.
  No real encrypted socket or RSA key pair is created. Use invented passwords:
  educational credentials/configuration are stored in browser lab state.
- SSH login input is masked and omitted from typed history/drafts. Remote login
  itself is not restored on reload; device configuration and progress are.
- Switch management SVIs answer from the VLAN's actual cable path.
- Curved cables re-route with dragged endpoints and vertical curves clear device
  cards. Connection records and settings are retained.
- Progress percentage and step ticks are derived from current device-state
  predicates; reads alone earn nothing. Extra configuration is allowed after
  completion. Changing a required setting revokes the affected credit.
- `show version` no longer claims a real firmware image or invented uptime.

## Explicit limits / remaining work

This is a Cisco IOS-style educational model, not full Cisco IOS emulation and not
a per-hardware-model firmware implementation. SSH clients originate on PCs;
router/switch-originated sessions, nested SSH, AAA, ACL policy, real crypto,
static/dynamic routing and the other missing engine capabilities remain work.
Authentication does not emulate timeout timers, VTY occupancy or session quotas.
Only 3 of 109 labs currently have authored device-state objectives (37 steps).
The other 106 are observation-only: do not assign fabricated predicates or claim
100% completion. Their reference topology and individual objectives still need
authoring. This update does not complete the whole 109-lab roadmap.

## Evidence

Engine acceptance: `node --experimental-strip-types scripts/test-ccna-management.mjs`.
UI acceptance: `npm run test:ccna-sim-ui`. Existing console/grade parity and
unsolved starts: `npm run validate:ccna-sim`. Geometry:
`node --experimental-strip-types scripts/validate-ccna-canvas.mjs`.

Configuration reference:
https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html
https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/ssh/secure-shell-configuration-guide/m-secure-shell-version-2.html
