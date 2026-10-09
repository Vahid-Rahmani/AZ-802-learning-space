import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Static responsive/accessibility contract smoke test for the CCNA lab workspace.
 *
 * This is intentionally not presented as a browser test: this repository does not
 * ship Playwright/Webdriver dependencies. It catches regressions in the DOM/CSS
 * contracts that the manual desktop/mobile smoke pass relies on.
 */

const root = resolve(import.meta.dirname, "..");
const files = {
  workspace: resolve(root, "app/components/ccna-simulation-workspace.tsx"),
  simulatorCss: resolve(root, "app/ccna/simulator.css"),
  simulatorPage: resolve(root, "app/ccna/sim/page.tsx"),
};

const source = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([name, path]) => [name, await readFile(path, "utf8")])));
const checks = [
  ["workspace exposes mobile panel tabs", source.workspace.includes('role="tablist"') && source.workspace.includes('aria-controls') && source.workspace.includes('role="tabpanel"')],
  ["panel tabs support keyboard focus management", source.workspace.includes("ArrowRight") && source.workspace.includes("ArrowLeft") && source.workspace.includes("requestAnimationFrame")],
  ["device console tabs are present", source.workspace.includes("ccna-simulation-device-tabs") && source.workspace.includes('role="tab"')],
  ["terminal has native inline mobile keyboard input", source.workspace.includes('ref={terminalInputRef}') && source.workspace.includes('inputMode="text"') && source.workspace.includes('onChange=') && source.workspace.includes('onCompositionStart=')],
  ["hidden simulator navigation cannot dim the mobile screen", source.simulatorCss.includes('body[data-sidebar-state="open"] .study-app.ccna-shell[data-simulator="true"]::before { content: none; display: none; }')],
  ["topology nodes and ports are keyboard controls", source.workspace.includes('className={`ccna-simulation-node') && source.workspace.includes('className={`ccna-simulation-port') && source.workspace.includes('aria-pressed')],
  ["lab state persists through localStorage", source.workspace.includes("localStorage.getItem(storageKey)") && source.workspace.includes("localStorage.setItem(storageKey")],
  ["cable connect/disconnect handlers remain wired", source.workspace.includes("connectSimulationPorts") && source.workspace.includes("disconnectSimulationLink")],
  ["responsive simulator breakpoints exist", source.simulatorCss.includes("@media (max-width: 899px)") && source.simulatorCss.includes("@media (max-width: 560px)")],
  ["mobile panel navigation can scroll", source.simulatorCss.includes(".ccna-simulation-tabs") && source.simulatorCss.includes("overflow-x: auto")],
  ["device tabs can scroll on narrow screens", source.simulatorCss.includes(".ccna-simulation-device-tabs") && source.simulatorCss.includes("overscroll-behavior-inline")],
  ["simulator avoids application-role keyboard trap", !source.workspace.includes('role="application"')],
  ["simulator route supports a selected lab", source.simulatorPage.includes("useSearchParams") && source.simulatorPage.includes("getCcnaSimulationPack")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);
const warnings = [];
if (source.workspace.includes("Device terminal")) warnings.push("legacy generic terminal label is still present; replace it with the selected-device console label before release");

for (const [label, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
for (const warning of warnings) console.warn(`WARN ${warning}`);

if (failures.length) {
  console.error(`\n${failures.length} responsive contract check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\nResponsive contract smoke passed (${checks.length} checks). Browser interaction still requires the manual desktop/mobile pass.`);
}
