# Hybrid visual walkthrough completion · 2026-10-10

## Scope and counts

Added 27 explicit question mappings: 067, 068, 075–082, 084, 085, 089–092, 096–099, 316, 317, 319, 324, 325, 327, 328.

All 47 Hybrid-management questions now have a reviewed visual walkthrough. Together with 80 AD DS questions, coverage is 127/410; 283 other questions remain unmapped. Coverage means a reviewed teaching guide, **not** a genuine screenshot for every concept or a live server simulator.

This batch adds 11 workflows with 31 steps: 11 original Microsoft screenshot references and 20 explicitly authored explanatory diagrams. Question 328 reuses the existing Arc agent-health connectivity step rather than introducing a duplicate or unrelated image. Those previously existing workflow steps are excluded from the new-asset counts.

## Content review

- WinRM execution, endpoint testing, hostname/security distinctions and second-hop diagnosis.
- JEA effective capability, endpoint/run-as boundaries and attributable audit evidence.
- Windows Server SSH service confirmation and firewall-profile photos; key authentication and host identity use accurate authored diagrams.
- WAC shared-gateway planning, installer HTTPS-mode and certificate photos, gateway registration and hybrid service entry points.
- RDS Session Host versus administrative RDP, private session-host topology, RD Gateway CAP/RAP and separate NPS/MFA evaluation.
- Azure Policy initiatives and assignments, audit versus configuration effects, guest compliance and Arc extension least privilege.
- Hybrid application dependencies and end-to-end operating concerns.

Every binding opens on its question-specific concept. SSH installation is not offered as a picture of key authentication. The Arc extension image is explicitly a Linux example. The guest-report picture is explicitly a 2019 Azure VM capture, and the RDS pictures are explicitly Windows Server 2016 references. The older WAC Preview service hub is not described as a current catalog or a Server 2025 desktop.

Original sources include Microsoft Learn and Microsoft ITOps Talk; URLs, source attribution, version limitations, navigation and image context are attached to each step. No credentials, firewall rule, server, tenant, resource or consent were changed.

## Bank review findings (not silently edited)

- q080's existing public-key deployment command installs OpenSSH rather than deploying a key; the guide explicitly separates these actions.
- q079's existing Windows Server 2016 capability prerequisite should be reviewed against the current native OpenSSH support documentation. The new picture is specifically Server 2025.
- q325's existing delegation example requires technical review: Microsoft documents that KCD/RBCD do not solve a second WinRM hop, while the question describes a file-share hop. The guide avoids copying an unverified delegation command.
- q327's existing statement that keys cannot be reused is too broad; the guide explicitly covers theft, protection and unsafe reuse.

Question texts, answer options, correct-answer indices and bank commands remain unchanged in this batch. These findings are separate bank-review work, not a claim that the bank is now fully validated.

## Verification

- All 47 Hybrid and 80 AD bindings render through the real guide component; every step, question focus, source link, image/diagram presence and exam/mixed-mode gating checked.
- Additional regression checks distinguish SSH service, firewall and keys, JEA capability/audit, second-hop and Arc connectivity focus.
- New source image requests returned HTTP 200 with image content types (11 new references; reused Arc references also checked).
- Targeted lint passed; production build completed. Existing large-bundle and route-classification warnings remain.
- Real browser: natural 999×145 image enlarged at its native dimensions; tall 543×733 image fitted to available height without distortion.
- Mobile CSS viewport 390×844: guide initially collapsed, tall screenshot modal fully within viewport, no horizontal overflow, close action works; exam guide absent before answering and present after answering.
- Actual UI question focus reviewed for WAC, Policy, Arc extensions, RDS, SSH keys, second-hop, JEA, hybrid design and Arc diagnostics.

No layout CSS or unrelated CCNA files changed. Browser verification uses a disposable local preview of the actual Quiz, header, appearance provider and styles, without user-account writes. Deployment marker verification is separate from authenticated production interaction.
