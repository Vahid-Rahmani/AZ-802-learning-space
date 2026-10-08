import { emptyConfigState, saveStartup, startupConfigLines, type ConfigState } from "./config.ts";
import {
  createDevice, createVlan, expandInterfaceRange, findInterface, interfaceStatusLines,
  ipInterfaceBriefLines, runningConfigLines, switchportDetailLines, vlanBriefLines,
  type SimDeviceState, type SimInterface,
} from "./device.ts";
import type { SimMode } from "./tokens.ts";

export type SimState = {
  device: SimDeviceState;
  mode: SimMode;
  closed: boolean;
  selected: { interfaces: SimInterface[]; vlan: number | null };
  config: ConfigState;
};

export function createSimState(hostname = "Switch"): SimState {
  return { device: createDevice(hostname), mode: "user", closed: false, selected: { interfaces: [], vlan: null }, config: emptyConfigState() };
}

export type SimCommand = {
  /** Canonical keyword path, e.g. "switchport trunk allowed vlan". Any unambiguous prefix is accepted. */
  name: string;
  modes: readonly SimMode[];
  help: string;
  args?: readonly string[];
  /** The last argument consumes the rest of the line, the way `description` accepts spaces. */
  variadic?: boolean;
  transition?: SimMode | "up";
  apply?: (state: SimState, args: readonly string[]) => void;
  /** Present only where a real device accepts the `no` form; `no <command>` calls this. */
  revert?: (state: SimState, args: readonly string[]) => void;
  validate?: (state: SimState, args: readonly string[]) => boolean;
  output?: (state: SimState, args: readonly string[]) => readonly string[];
};

export const simKeywordHelp: Record<string, string> = {
  show: "Show running system information",
  configure: "Enter configuration commands, one per line",
  no: "Negate a command or set its defaults",
  interface: "Select an interface to configure",
  switchport: "Set switching mode characteristics",
};

const execModes = ["user", "privileged"] as const;
const configurationModes = ["global", "interface", "vlan", "line"] as const;
const everyMode = ["user", "privileged", "global", "interface", "vlan", "line"] as const;

const isVlanId = (value: string) => /^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= 4094;
const isWord = (value: string) => value.length >= 1 && value.length <= 32 && !/\s/.test(value);
const isIpv4 = (value: string) => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value) && value.split(".").every((part) => Number(part) <= 255);

function parseVlans(text: string): number[] | "all" | null {
  if (text.toLowerCase() === "all") return "all";
  const ids: number[] = [];
  for (const part of text.split(",")) {
    const range = /^(\d{1,4})-(\d{1,4})$/.exec(part);
    if (range) {
      const from = Number(range[1]); const to = Number(range[2]);
      if (!isVlanId(range[1]) || !isVlanId(range[2]) || to < from) return null;
      for (let index = from; index <= to; index++) ids.push(index);
      continue;
    }
    if (!isVlanId(part)) return null;
    ids.push(Number(part));
  }
  return [...new Set(ids)].sort((left, right) => left - right);
}

/** Interface sub-commands apply to every interface `interface` or `interface range` selected. */
const eachSelected = (state: SimState, update: (port: SimInterface) => void) => state.selected.interfaces.forEach(update);
const selectedVlan = (state: SimState) => (state.selected.vlan === null ? null : createVlan(state.device, state.selected.vlan));

export const simCommands: readonly SimCommand[] = [
  // Session and modes.
  { name: "enable", modes: ["user", "privileged"], help: "Turn on privileged commands", transition: "privileged" },
  { name: "disable", modes: ["privileged"], help: "Turn off privileged commands", transition: "user" },
  { name: "exit", modes: everyMode, help: "Exit from the current mode", transition: "up" },
  { name: "end", modes: configurationModes, help: "Exit from configuration mode", transition: "privileged" },
  { name: "configure terminal", modes: ["privileged"], help: "Enter configuration mode", transition: "global" },
  { name: "hostname", modes: ["global"], help: "Set the system name", args: ["<name>"], validate: (_, args) => isWord(args[0]), apply: (state, args) => { state.device.hostname = args[0]; } },

  // VLAN database.
  {
    name: "vlan", modes: ["global"], help: "Create or enter a VLAN", args: ["<vlan-id>"], transition: "vlan",
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => { state.selected.vlan = Number(args[0]); createVlan(state.device, state.selected.vlan); },
  },
  { name: "name", modes: ["vlan"], help: "Set the VLAN name", args: ["<name>"], validate: (_, args) => isWord(args[0]), apply: (state, args) => { const vlan = selectedVlan(state); if (vlan) vlan.name = args[0]; } },

  // Interface selection.
  {
    name: "interface", modes: ["global"], help: "Select an interface to configure", args: ["<interface>"], transition: "interface",
    validate: (state, args) => Boolean(findInterface(state.device, args[0])),
    apply: (state, args) => { const port = findInterface(state.device, args[0]); state.selected.interfaces = port ? [port] : []; },
  },
  {
    name: "interface range", modes: ["global"], help: "Select a range of interfaces", args: ["<interface-range>"], transition: "interface",
    validate: (state, args) => { const { ports, unknown } = expandInterfaceRange(state.device, args[0]); return ports.length > 0 && unknown.length === 0; },
    apply: (state, args) => { state.selected.interfaces = expandInterfaceRange(state.device, args[0]).ports; },
  },

  // Interface configuration.
  { name: "description", modes: ["interface"], help: "Set the interface description", args: ["<text>"], variadic: true, apply: (state, args) => eachSelected(state, (port) => { port.description = args[0]; }), revert: (state) => eachSelected(state, (port) => { port.description = ""; }) },
  {
    name: "switchport mode access", modes: ["interface"], help: "Set the interface to access mode",
    validate: (state) => state.selected.interfaces.every((port) => port.kind === "ethernet"),
    apply: (state) => eachSelected(state, (port) => { port.mode = "access"; port.modeExplicit = true; }),
  },
  {
    name: "switchport mode trunk", modes: ["interface"], help: "Set the interface to trunk mode",
    validate: (state) => state.selected.interfaces.every((port) => port.kind === "ethernet"),
    apply: (state) => eachSelected(state, (port) => { port.mode = "trunk"; port.modeExplicit = true; }),
  },
  {
    name: "switchport access vlan", modes: ["interface"], help: "Set the access VLAN", args: ["<vlan-id>"],
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => eachSelected(state, (port) => { port.accessVlan = Number(args[0]); }),
    revert: (state) => eachSelected(state, (port) => { port.accessVlan = 1; }),
  },
  {
    name: "switchport trunk native vlan", modes: ["interface"], help: "Set the trunk native VLAN", args: ["<vlan-id>"],
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => eachSelected(state, (port) => { port.nativeVlan = Number(args[0]); }),
    revert: (state) => eachSelected(state, (port) => { port.nativeVlan = 1; }),
  },
  {
    name: "switchport trunk allowed vlan", modes: ["interface"], help: "Set the trunk allowed VLAN list", args: ["<vlan-list>|all"],
    validate: (_, args) => parseVlans(args[0]) !== null,
    apply: (state, args) => eachSelected(state, (port) => { port.allowedVlans = parseVlans(args[0]) ?? "all"; }),
    revert: (state) => eachSelected(state, (port) => { port.allowedVlans = "all"; }),
  },
  {
    name: "switchport trunk allowed vlan add", modes: ["interface"], help: "Add VLANs to the allowed list", args: ["<vlan-list>"],
    validate: (_, args) => parseVlans(args[0]) !== null && parseVlans(args[0]) !== "all",
    apply: (state, args) => { const added = parseVlans(args[0]); if (!Array.isArray(added)) return; eachSelected(state, (port) => { const current = port.allowedVlans === "all" ? [] : port.allowedVlans; port.allowedVlans = [...new Set([...current, ...added])].sort((left, right) => left - right); }); },
  },
  {
    name: "switchport trunk allowed vlan remove", modes: ["interface"], help: "Remove VLANs from the allowed list", args: ["<vlan-list>"],
    validate: (_, args) => parseVlans(args[0]) !== null && parseVlans(args[0]) !== "all",
    apply: (state, args) => { const removed = parseVlans(args[0]); if (!Array.isArray(removed)) return; eachSelected(state, (port) => { const current = port.allowedVlans === "all" ? [] : port.allowedVlans; port.allowedVlans = current.filter((id) => !removed.includes(id)); }); },
  },
  {
    name: "ip address", modes: ["interface"], help: "Set the interface address", args: ["<ip-address>", "<mask>"],
    validate: (_, args) => isIpv4(args[0]) && isIpv4(args[1]),
    apply: (state, args) => eachSelected(state, (port) => { port.address = { ip: args[0], mask: args[1] }; }),
    revert: (state) => eachSelected(state, (port) => { port.address = null; }),
  },
  {
    name: "shutdown", modes: ["interface"], help: "Administratively disable the interface",
    apply: (state) => eachSelected(state, (port) => { port.adminUp = false; }),
    revert: (state) => eachSelected(state, (port) => { port.adminUp = true; }),
  },

  // Verification.
  { name: "show running-config", modes: execModes, help: "Show the running configuration", output: (state) => runningConfigLines(state.device) },
  { name: "show startup-config", modes: execModes, help: "Show the saved startup configuration", output: (state) => startupConfigLines(state.config) },
  { name: "show vlan", modes: execModes, help: "Show the VLAN database", output: (state) => vlanBriefLines(state.device) },
  { name: "show vlan brief", modes: execModes, help: "Show the VLAN database in brief", output: (state) => vlanBriefLines(state.device) },
  { name: "show interfaces status", modes: execModes, help: "Show the port status table", output: (state) => interfaceStatusLines(state.device) },
  { name: "show interfaces switchport", modes: execModes, help: "Show the switchport state of every port", output: (state) => state.device.interfaces.flatMap((port) => [...switchportDetailLines(state.device, port), ""]) },
  { name: "show ip interface brief", modes: execModes, help: "Show the interface addresses", output: (state) => ipInterfaceBriefLines(state.device) },
  {
    name: "show version",
    modes: execModes,
    help: "Show the running system version",
    output: (state) => [
      "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2(7)E3, RELEASE SOFTWARE (fc2)",
      "ROM: Bootstrap program is C2960 boot loader",
      "BOOTLDR: C2960 Boot Loader (C2960-HBOOT-M) Version 15.2(7r)E3, RELEASE SOFTWARE (fc1)",
      "",
      `${state.device.hostname} uptime is 1 hour, 42 minutes`,
      'System image file is "flash:c2960-lanbasek9-mz.152-7.E3.bin"',
    ],
  },

  // Persistence.
  {
    name: "copy running-config startup-config", modes: ["privileged"], help: "Save the running configuration",
    apply: (state) => { state.config.startup = saveStartup(state.device); },
    output: () => ["Destination filename [startup-config]?", "Building configuration...", "[OK]"],
  },
  {
    name: "write memory", modes: ["privileged"], help: "Save the running configuration",
    apply: (state) => { state.config.startup = saveStartup(state.device); },
    output: () => ["Building configuration...", "[OK]"],
  },
  {
    name: "erase startup-config", modes: ["privileged"], help: "Erase the saved startup configuration",
    apply: (state) => { state.config.startup = null; },
    output: () => ["Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]", "[OK]"],
  },
];

export function commandsForMode(mode: SimMode): readonly SimCommand[] {
  return simCommands.filter((command) => command.modes.includes(mode));
}
