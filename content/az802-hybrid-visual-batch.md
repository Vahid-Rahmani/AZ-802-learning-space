# AZ-802 Hybrid visual walkthrough batch

Reviewed 2026-10-10. Adds 18 exact question bindings, seven workflows, 20 steps, 16 distinct original Microsoft reference screenshots and four explicitly authored diagrams. No question/answer bank changes or Azure resource operations.

| Questions | Workflow | Opening evidence |
| --- | --- | --- |
| 069 | Arc server representation | Azure Arc Machines / Connected example |
| 070, 071, 095 | Arc agent health | Actual azcmagent status and dependent services |
| 072 | Update assessment | Fleet update assessment inventory |
| 093, 322 | Periodic assessment | Per-machine update setting, not patch installation |
| 094 | Guest maintenance | Guest-scope maintenance configuration; authored rollout/health diagrams |
| 086 | Azure Monitor collection | DCR Resources tab |
| 087, 088, 321 | Windows events / DCR | Event source/severity selection; destination and Event verification steps |
| 073 | Automation schedule | Recurrence controls, then recorded job evidence |
| 074 | Automation managed identity | System-assigned identity |
| 320 | Automation authorization | Scoped role assignment example |
| 326 | Automation job evidence | Job page, not the draft Test pane |
| 083, 318 | Bastion browser connection | VM Connect menu and browser RDP connection page |

Existing WAC bindings 066 and 323 remain. Total coverage is 100/410 questions: 80 AD and 20 Hybrid; 310 still have no mapped visual walkthrough. This does not claim that all AD steps are photographed. The generated coverage inventory preserves the remaining AD capture work and lists the 27 unmapped Hybrid questions as a count.

## Evidence and version limits

- Original Microsoft Learn screenshots, not invented dialogs or unverified Windows Server 2025 captures. Each has a source, alt text and contextual caveat.
- Arc: https://learn.microsoft.com/en-us/azure/azure-arc/servers/onboard-portal and https://learn.microsoft.com/en-us/azure/azure-arc/servers/troubleshoot-vm-extensions . The stopped Arc Proxy in Microsoft's successful sample is not proof of HIMDS failure.
- Update Manager: https://learn.microsoft.com/en-us/azure/update-manager/assessment-options , https://learn.microsoft.com/en-us/azure/update-manager/manage-update-settings and https://learn.microsoft.com/en-us/azure/update-manager/scheduled-patching . A Host-scope/Preview schedule screenshot was rejected; only the correct Guest configuration is used.
- Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection and https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-windows-events . Explicitly distinguishes empty resource selection, restricted severities and older Event tooltip wording from an AMA deployment recommendation.
- Automation: https://learn.microsoft.com/en-us/azure/automation/shared-resources/schedules , https://learn.microsoft.com/en-us/azure/automation/learn/automation-tutorial-runbook-textual , https://learn.microsoft.com/en-us/azure/automation/quickstarts/enable-managed-identity and https://learn.microsoft.com/en-us/azure/automation/automation-runbook-execution . Old Workflow 5.1 / 2021 sample and Preview identity labels are disclosed; example roles are not universal permission recommendations.
- Bastion: https://learn.microsoft.com/en-us/azure/bastion/bastion-connect-vm-rdp-windows . Generic connection-control screenshots originate in Microsoft's SQL VM tutorial; SQL is not a Bastion requirement and the crop does not prove IP configuration.

## Separate bank review finding

Question 322's answer, Periodic assessment, matches the procedure. Its existing requirements text says the workspace must be reachable. Current Update Manager has no Log Analytics dependency (https://learn.microsoft.com/en-us/azure/update-manager/overview). The new walkthrough states the correct prerequisite; the answer bank was not silently changed. Track this requirements correction separately.

## Verification

- Expanded visual-guide test: all 100 exact bindings, all steps, identity/domain gating, focus, source links, image enlargement, failed-image fallback, mobile collapse and exam hints hidden until answering.
- Targeted lint and complete production build passed.
- Real Brave browser using the actual Quiz components and site CSS in a disposable local preview: representative Arc, assessment, Monitor, Automation and Bastion routes; no horizontal overflow at desktop, 390×844 and 312×675 CSS viewports. Mobile guide opens from a collapsed drawer. Monitor image loads and fits the mobile dialog. Before exam answer the guide is absent; after answer it is present.
- Bastion enlargement: native 789×520 screenshot displayed at 690×455, within viewport and not upscaled. Arc native 858×286 likewise displayed at native dimensions.
- UI preview writes no account progress and performs no Azure operations. Production publication must be verified separately from local UI tests.
