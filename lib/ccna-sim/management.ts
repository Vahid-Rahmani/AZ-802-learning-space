import type { SimCommand, SimState } from "./commands.ts";

/** Educational state, not real RSA keys or a secure credential store. Use lab-only passwords. */
export type SimManagement = {
  domain: string; rsaBits: number; sshVersion: 1 | 2; timeout: number; retries: number;
  users: Record<string, { credential: string; kind: "secret" | "password"; privilege: number }>;
  vty: Array<{ loginLocal: boolean; transport: string[] }>;
};
export function defaultManagement(): SimManagement {
  return { domain: "", rsaBits: 0, sshVersion: 2, timeout: 120, retries: 3, users: {},
    vty: Array.from({ length: 16 }, () => ({ loginLocal: false, transport: ["telnet", "ssh"] })) };
}
export const copyManagement = (value?: SimManagement): SimManagement => value ? structuredClone(value) : defaultManagement();
const management = (state: SimState) => state.device.management ??= defaultManagement();
const lines = (state: SimState) => (state.selected.vty ?? []).map((id) => management(state).vty[id]);
const integer = (text: string, min: number, max: number) => /^\d+$/.test(text) && Number(text) >= min && Number(text) <= max;
const parseUser = (text: string) => /^(\S+)(?: privilege (\d+))? (secret|password)(?: 0)? (\S+)$/.exec(text);

export function managementConfigLines(value?: SimManagement): string[] {
  if (!value) return [];
  const result: string[] = [];
  if (value.domain) result.push(`ip domain-name ${value.domain}`);
  for (const [name, user] of Object.entries(value.users).sort(([a], [b]) => a.localeCompare(b))) {
    result.push(`username ${name} privilege ${user.privilege} ${user.kind} 0 ${user.credential}`);
  }
  if (value.rsaBits) result.push(`ip ssh version ${value.sshVersion}`);
  if (value.timeout !== 120) result.push(`ip ssh time-out ${value.timeout}`);
  if (value.retries !== 3) result.push(`ip ssh authentication-retries ${value.retries}`);
  for (let start = 0; start < value.vty.length;) {
    const entry = value.vty[start];
    let end = start;
    while (end + 1 < value.vty.length && JSON.stringify(value.vty[end + 1]) === JSON.stringify(entry)) end++;
    if (entry.loginLocal || entry.transport.join(" ") !== "telnet ssh") {
      result.push(`line vty ${start} ${end}`);
      if (entry.loginLocal) result.push(" login local");
      result.push(` transport input ${entry.transport.length ? entry.transport.join(" ") : "none"}`);
    }
    start = end + 1;
  }
  return result;
}

/** Available on every IOS console, independently of its lab or objectives. */
export const managementCommands: readonly SimCommand[] = [
  ...["ip domain-name", "ip domain name"].map((name): SimCommand => ({
    name, modes: ["global"], help: "Set the domain name", args: ["<domain>"],
    validate: (_, args) => /^[a-z0-9][a-z0-9.-]*$/i.test(args[0]),
    apply: (state, args) => { management(state).domain = args[0]; }, revert: (state) => { management(state).domain = ""; },
  })),
  { name: "username", modes: ["global"], help: "Configure a local lab user; use invented passwords only", args: ["<name privilege 1-15 secret|password value>"], variadic: true,
    validate: (_, args) => { const user = parseUser(args[0]); return Boolean(user && integer(user[2] ?? "1", 1, 15)) || /^\S+$/.test(args[0]); },
    error: (_, args) => parseUser(args[0]) ? null : "% Incomplete command.",
    apply: (state, args) => { const user = parseUser(args[0])!; Object.defineProperty(management(state).users, user[1], { enumerable: true, configurable: true, writable: true, value: { privilege: Number(user[2] ?? 1), kind: user[3] as "secret" | "password", credential: user[4] } }); },
    revert: (state, args) => { delete management(state).users[args[0]?.split(" ")[0]]; },
  },
  { name: "crypto key generate rsa modulus", modes: ["global"], help: "Configure simulated RSA key size", args: ["<bits>"],
    validate: (_, args) => integer(args[0], 1024, 4096) && Number(args[0]) % 256 === 0,
    error: (state) => !management(state).domain ? "% No domain specified. Configure ip domain-name first." : ["Router", "Switch"].includes(state.device.hostname) ? "% Please define a hostname other than Router or Switch." : null,
    apply: (state, args) => { management(state).rsaBits = Number(args[0]); },
    output: () => ["RSA key configuration recorded in the practice model; no real key pair is generated."],
  },
  { name: "crypto key generate rsa", modes: ["global"], help: "Choose a simulated RSA key size interactively",
    error: (state) => !management(state).domain ? "% No domain specified. Configure ip domain-name first." : ["Router", "Switch"].includes(state.device.hostname) ? "% Please define a hostname other than Router or Switch." : null,
    apply: (state) => { state.rsaPrompt = true; },
    output: () => ["Choose the RSA key size for this practice model (no real cryptography)."],
  },
  { name: "crypto key zeroize rsa", modes: ["global"], help: "Remove simulated RSA key configuration", apply: (state) => { management(state).rsaBits = 0; } },
  { name: "ip ssh version", modes: ["global"], help: "Set SSH version", args: ["<1|2>"], validate: (_, args) => ["1", "2"].includes(args[0]), apply: (state, args) => { management(state).sshVersion = Number(args[0]) as 1 | 2; } },
  { name: "ip ssh time-out", modes: ["global"], help: "Set SSH timeout", args: ["<1-120>"], validate: (_, args) => integer(args[0], 1, 120), apply: (state, args) => { management(state).timeout = Number(args[0]); }, revert: (state) => { management(state).timeout = 120; } },
  { name: "ip ssh authentication-retries", modes: ["global"], help: "Set authentication retries", args: ["<0-5>"], validate: (_, args) => integer(args[0], 0, 5), apply: (state, args) => { management(state).retries = Number(args[0]); }, revert: (state) => { management(state).retries = 3; } },
  { name: "line vty", modes: ["global"], help: "Select VTY lines", args: ["<first>", "<last>"], transition: "line", validate: (_, args) => integer(args[0], 0, 15) && integer(args[1], 0, 15) && Number(args[1]) >= Number(args[0]), apply: (state, args) => { state.selected.vty = Array.from({ length: Number(args[1]) - Number(args[0]) + 1 }, (_, i) => Number(args[0]) + i); } },
  { name: "login local", modes: ["line"], help: "Use local users for VTY authentication", apply: (state) => lines(state).forEach((line) => { line.loginLocal = true; }), revert: (state) => lines(state).forEach((line) => { line.loginLocal = false; }) },
  { name: "transport input", modes: ["line"], help: "Allow incoming SSH or Telnet", args: ["<ssh|telnet|all|none>"], variadic: true,
    validate: (_, args) => /^(all|none|ssh|telnet|ssh telnet|telnet ssh)$/.test(args[0]),
    apply: (state, args) => lines(state).forEach((line) => { line.transport = args[0] === "none" ? [] : args[0] === "all" ? ["telnet", "ssh"] : args[0].split(" "); }),
    revert: (state) => lines(state).forEach((line) => { line.transport = ["telnet", "ssh"]; }),
  },
  { name: "show ip ssh", modes: ["user", "privileged"], help: "Show simulated SSH configuration", output: (state) => {
    const value = management(state);
    return [value.rsaBits ? `SSH Enabled - version ${value.sshVersion}.0 (practice model)` : "SSH Disabled - no RSA key configuration",
      `Authentication timeout: ${value.timeout} secs; Authentication retries: ${value.retries}`,
      "Simulated configuration, not a real encrypted network service."];
  } },
];
