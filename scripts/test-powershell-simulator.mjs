import assert from "node:assert/strict";
import { allPowerShellSteps, createVirtualServer, executePowerShell, powerShellUnits } from "../lib/powershell-simulator.ts";

let state = createVirtualServer();
assert.equal(powerShellUnits.length, 9);
assert.ok(allPowerShellSteps.length >= 35);
let result = executePowerShell(state,"Get-ADDomain");
assert.ok(result.error?.includes("ActiveDirectoryServerDownException"), "AD should require a domain");
assert.equal(result.state, state, "Rejected commands must not mutate state");
result = executePowerShell(state, "Remove-ADUser; malicious-script");
assert.ok(result.error?.includes("safe simulator"));
assert.equal(result.state, state);
result = executePowerShell(state, "Get-UnknownCommand");
assert.ok(result.error?.includes("CommandNotFoundException"));

for (const item of allPowerShellSteps) {
  const result = executePowerShell(state, item.command);
  assert.equal(result.error, undefined, "Failed "+item.id+": "+result.error);
  assert.ok(result.output.length>0,"No output for "+item.id);
  assert.ok(result.state.completed.includes(item.id), "Did not complete "+item.id);
  state = result.state;
}
assert.equal(state.completed.length, allPowerShellSteps.length);
assert.equal(state.hostname, "TW-DC01");
assert.equal(state.ipv4, "192.168.10.10");
assert.equal(state.dns, "192.168.10.10");
assert.equal(state.domain, "techwork.local");
assert.ok(state.features.includes("AD-Domain-Services"));
assert.ok(state.features.includes("DHCP"));
assert.ok(state.features.includes("Web-Server"));
assert.ok(state.features.includes("Windows-Server-Backup"));
assert.ok(state.users.some(u=>u.login==="s.wagner" && !u.enabled), "User should be explicitly disabled");
assert.deepEqual(state.memberships.GG_Buchhaltung, ["s.wagner"]);
assert.equal(state.records["intranet.techwork.local"], "192.168.10.10");
assert.ok(state.scope?.includes("192.168.10.200"));
assert.ok(state.shares.some(s=>s.name==="Buchhaltung"&&s.path===String.raw`D:\Freigaben\Buchhaltung`));
assert.ok(state.permissions.some(p=>p.includes("GG_Buchhaltung")));
assert.ok(state.firewallRules.includes("Intranet-8080"));
assert.equal(state.services.W3SVC, "Running");
assert.equal(state.backups, 1);

const replay = executePowerShell(state, "Get-ADUser -Identity s.wagner");
assert.ok(replay.output.includes("Sara Wagner"));
const getRecords = executePowerShell(state, "Resolve-DnsName intranet.techwork.local");
assert.ok(getRecords.output.includes("192.168.10.10"));
const unknownUser = executePowerShell(state, "Get-ADUser -Identity no.such.user");
assert.ok(unknownUser.error);
assert.equal(unknownUser.state, state);
console.log("PowerShell simulator verified: "+allPowerShellSteps.length+" sequential tasks + prerequisite, injection, and state checks.");
