import { emptyConfigState, saveStartup, startupConfigLines, type ConfigState } from "./config.ts";
import {
  connectedRouteLines, createDevice, createDeviceWithPorts, createVlan, expandInterfaceRange, findInterface,
  interfaceStatusLines, ipInterfaceBriefLines, ipv6ConnectedRouteLines, ipv6InterfaceBriefLines, normalizeIpv6,
  openInterfaceForConfig, parseIpv6Cidr, runningConfigLines, switchportDetailLines, trunkLines, vlanBriefLines,
  type SimCableLookup, type SimDeviceRole, type SimDeviceState, type SimInterface,
} from "./device.ts";
import { pingFrom, type LabNetwork } from "./lab-network.ts";
import type { SimMode } from "./tokens.ts";

export type SimState = {
  device: SimDeviceState;
  mode: SimMode;
  closed: boolean;
  selected: { interfaces: SimInterface[]; vlan: number | null };
  config: ConfigState;
  /** The lab this console belongs to. `ping` is the only command that needs the whole network. */
  network?: (() => LabNetwork | null) | null;
};

export function createSimState(hostname = "Switch", role: SimDeviceRole = "switch", portLabels?: readonly string[]): SimState {
  const device = portLabels?.length ? createDeviceWithPorts(hostname, role, portLabels) : createDevice(hostname, role);
  return { device, mode: "user", closed: false, selected: { interfaces: [], vlan: null }, config: emptyConfigState(), network: null };
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
  /** Extra availability rule, so `?` never lists what this device would refuse. */
  available?: (state: SimState) => boolean;
  validate?: (state: SimState, args: readonly string[]) => boolean;
  output?: (state: SimState, args: readonly string[]) => readonly string[];
};

export const simKeywordHelp: Record<string, string> = {
  show: "Show running system information",
  configure: "Enter configuration commands, one per line",
  no: "Negate a command or set its defaults",
  interface: "Select an interface to configure",
  switchport: "Set switching mode characteristics",
  ipv6: "IPv6 configuration commands",
};

const execModes = ["user", "privileged"] as const;
const configurationModes = ["global", "interface", "vlan", "line"] as const;
const everyMode = ["user", "privileged", "global", "interface", "vlan", "line"] as const;

const ipToInt = (value: string) => value.split(".").reduce((total, part) => (total << 8) + Number(part), 0) >>> 0;
const isVlanId = (value: string) => /^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= 4094;
const isWord = (value: string) => value.length >= 1 && value.length <= 32 && !/\s/.test(value);
const isIpv4 = (value: string) => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value) && value.split(".").every((part) => Number(part) <= 255);
/**
 * A usable IPv4 subnet mask is contiguous: 255.255.255.192, not 255.255.255.193. A real device
 * refuses the second one, and so does this engine, so a typo cannot look like a configured mask.
 */
const isIpv4Mask = (value: string) => {
  if (!isIpv4(value)) return false;
  const inverted = ~ipToInt(value) >>> 0;
  return (inverted & (inverted + 1)) === 0;
};
const isHostDevice = (state: SimState) => state.device.role === "host";
/** The Layer 2 command set belongs to a switch; a router ports are routed unless configured otherwise. */
const isSwitchDevice = (state: SimState) => state.device.role === "switch";
const hostNic = (state: SimState) => state.device.interfaces[0] ?? null;
const isIpv6Cidr = (value: string) => parseIpv6Cidr(value) !== null;
/** A router subinterface name such as Gi0/0.10 whose parent port already exists. */
const isSubinterfaceName = (state: SimState, raw: string) => state.device.role === "router" && /^[a-z]+\d+\/\d+\.\d{1,4}$/i.test(raw.trim());

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
const pingHost = (network: LabNetwork, state: SimState, targetIp: string) => pingFrom(network, deviceIdOf(state), targetIp);
/**
 * A console knows its own device id two ways: the id its node carried, or the identity of the device
 * object inside the model (the validator hands the same object). The id is what makes the browser
 * work, where the model holds copies and object identity can never match.
 */
const deviceIdOf = (state: SimState) => {
  const network = state.network?.() ?? null;
  if (!network) return "";
  if (state.device.id) return network.devices.some((device) => device.id === state.device.id) ? state.device.id : "";
  return network.devices.find((device) => device.state === state.device)?.id ?? "";
};

/**
 * This console's own cables, so its `show` commands report the link that is really plugged in. When
 * the console has no lab attached the answer is undefined and the port falls back to its own state.
 */
const cableStateFor = (state: SimState): SimCableLookup | undefined => {
  const network = state.network?.() ?? null;
  const id = deviceIdOf(state);
  if (!network || !id) return undefined;
  return (portName) => {
    const link = network.links.find((candidate) =>
      (candidate.a.deviceId === id && candidate.a.port === portName)
      || (candidate.b.deviceId === id && candidate.b.port === portName));
    if (!link) return null;
    return link.status ?? "up";
  };
};
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
    available: isSwitchDevice,
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => { state.selected.vlan = Number(args[0]); createVlan(state.device, state.selected.vlan); },
  },
  { name: "name", modes: ["vlan"], help: "Set the VLAN name", args: ["<name>"], available: isSwitchDevice, validate: (_, args) => isWord(args[0]), apply: (state, args) => { const vlan = selectedVlan(state); if (vlan) vlan.name = args[0]; } },

  // Interface selection.
  {
    name: "interface", modes: ["global"], help: "Select an interface to configure", args: ["<interface>"], transition: "interface",
    validate: (state, args) => Boolean(findInterface(state.device, args[0])) || isSubinterfaceName(state, args[0]),
    apply: (state, args) => { const opened = openInterfaceForConfig(state.device, args[0]); state.selected.interfaces = opened ? [opened.port] : []; },
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
    available: isSwitchDevice,
    validate: (state) => state.selected.interfaces.every((port) => port.kind === "ethernet"),
    apply: (state) => eachSelected(state, (port) => { port.mode = "access"; port.modeExplicit = true; }),
  },
  {
    name: "switchport mode trunk", modes: ["interface"], help: "Set the interface to trunk mode",
    available: isSwitchDevice,
    validate: (state) => state.selected.interfaces.every((port) => port.kind === "ethernet"),
    apply: (state) => eachSelected(state, (port) => { port.mode = "trunk"; port.modeExplicit = true; }),
  },
  {
    name: "switchport access vlan", modes: ["interface"], help: "Set the access VLAN", args: ["<vlan-id>"],
    available: isSwitchDevice,
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => eachSelected(state, (port) => { port.accessVlan = Number(args[0]); }),
    revert: (state) => eachSelected(state, (port) => { port.accessVlan = 1; }),
  },
  {
    name: "switchport trunk native vlan", modes: ["interface"], help: "Set the trunk native VLAN", args: ["<vlan-id>"],
    available: isSwitchDevice,
    validate: (_, args) => isVlanId(args[0]),
    apply: (state, args) => eachSelected(state, (port) => { port.nativeVlan = Number(args[0]); }),
    revert: (state) => eachSelected(state, (port) => { port.nativeVlan = 1; }),
  },
  {
    name: "switchport trunk allowed vlan", modes: ["interface"], help: "Set the trunk allowed VLAN list", args: ["<vlan-list>|all"],
    available: isSwitchDevice,
    validate: (_, args) => parseVlans(args[0]) !== null,
    apply: (state, args) => eachSelected(state, (port) => { port.allowedVlans = parseVlans(args[0]) ?? "all"; }),
    revert: (state) => eachSelected(state, (port) => { port.allowedVlans = "all"; }),
  },
  {
    name: "switchport trunk allowed vlan add", modes: ["interface"], help: "Add VLANs to the allowed list", args: ["<vlan-list>"],
    available: isSwitchDevice,
    validate: (_, args) => parseVlans(args[0]) !== null && parseVlans(args[0]) !== "all",
    apply: (state, args) => { const added = parseVlans(args[0]); if (!Array.isArray(added)) return; eachSelected(state, (port) => { const current = port.allowedVlans === "all" ? [] : port.allowedVlans; port.allowedVlans = [...new Set([...current, ...added])].sort((left, right) => left - right); }); },
  },
  {
    name: "switchport trunk allowed vlan remove", modes: ["interface"], help: "Remove VLANs from the allowed list", args: ["<vlan-list>"],
    available: isSwitchDevice,
    validate: (_, args) => parseVlans(args[0]) !== null && parseVlans(args[0]) !== "all",
    apply: (state, args) => { const removed = parseVlans(args[0]); if (!Array.isArray(removed)) return; eachSelected(state, (port) => { const current = port.allowedVlans === "all" ? [] : port.allowedVlans; port.allowedVlans = current.filter((id) => !removed.includes(id)); }); },
  },
  {
    name: "ip address", modes: ["interface", "user"], help: "Set the interface address", args: ["<ip-address>", "<mask>"],
    // The user-exec form belongs to an endpoint console, which is where a real PC sets its address.
    available: (state) => state.mode !== "user",
    validate: (state, args) => isIpv4(args[0]) && isIpv4Mask(args[1]) && (state.mode !== "user" || isHostDevice(state)),
    apply: (state, args) => {
      if (state.mode === "user") { const nic = hostNic(state); if (nic) nic.address = { ip: args[0], mask: args[1] }; return; }
      eachSelected(state, (port) => { port.address = { ip: args[0], mask: args[1] }; });
    },
    revert: (state) => {
      if (state.mode === "user") { const nic = hostNic(state); if (nic) nic.address = null; return; }
      eachSelected(state, (port) => { port.address = null; });
    },
  },
  {
    name: "encapsulation dot1q", modes: ["interface"], help: "Set the 802.1Q VLAN tag of a subinterface", args: ["<vlan-id>"],
    validate: (state, args) => isVlanId(args[0]) && state.selected.interfaces.length > 0
      && state.selected.interfaces.every((port) => port.kind === "subinterface"),
    apply: (state, args) => eachSelected(state, (port) => { port.dot1q = Number(args[0]); }),
    revert: (state) => eachSelected(state, (port) => { port.dot1q = 0; }),
  },
  {
    name: "ip default-gateway", modes: ["global", "user"], help: "Set the default gateway", args: ["<ip-address>"],
    // Global configuration on an IOS device, user exec on an endpoint console.
    available: (state) => state.mode !== "user" && state.device.role !== "router",
    validate: (state, args) => isIpv4(args[0]) && (state.device.role === "host" || state.device.role === "switch"),
    apply: (state, args) => { state.device.gateway = args[0]; },
    revert: (state) => { state.device.gateway = null; },
  },
  {
    name: "ipv6 address", modes: ["interface", "user"], help: "Set the interface IPv6 address and prefix", args: ["<address>/<prefix>"],
    available: (state) => state.mode !== "user",
    validate: (state, args) => isIpv6Cidr(args[0]) && (state.mode !== "user" || isHostDevice(state)),
    apply: (state, args) => {
      const parsed = parseIpv6Cidr(args[0]);
      if (!parsed) return;
      if (state.mode === "user") { const nic = hostNic(state); if (nic) nic.ipv6 = { ...parsed }; return; }
      eachSelected(state, (port) => { port.ipv6 = { ...parsed }; });
    },
    revert: (state) => {
      if (state.mode === "user") { const nic = hostNic(state); if (nic) nic.ipv6 = null; return; }
      eachSelected(state, (port) => { port.ipv6 = null; });
    },
  },
  {
    name: "ipv6 unicast-routing", modes: ["global"], help: "Enable IPv6 unicast routing",
    // A router or a Layer 3 switch can forward IPv6; an endpoint console has no routing table at all.
    available: (state) => isSwitchDevice(state) || state.device.role === "router",
    apply: (state) => { state.device.ipv6Routing = true; },
    revert: (state) => { state.device.ipv6Routing = false; },
  },
  {
    name: "ipv6 default-gateway", modes: ["global", "user"], help: "Set this endpoint's IPv6 default gateway", args: ["<ipv6-address>"],
    available: (state) => state.mode !== "user" && state.device.role !== "router",
    validate: (state, args) => normalizeIpv6(args[0]) !== null && state.device.role !== "router",
    apply: (state, args) => { state.device.ipv6Gateway = normalizeIpv6(args[0]); },
    revert: (state) => { state.device.ipv6Gateway = null; },
  },
  {
    name: "ipconfig", modes: ["user"], help: "Show this endpoint's IP configuration",
    available: (state) => isHostDevice(state),
    validate: (state) => isHostDevice(state),
    output: (state) => {
      const nic = hostNic(state);
      // The endpoint's own interface name, so the report matches the port the lab publishes.
      const name = nic?.name ?? "Gi0/0";
      return [
        `${name.padEnd(16)}${nic?.address ? `${nic.address.ip} ${nic.address.mask}` : "unassigned"}`,
        `Default gateway ${state.device.gateway ?? "not set"}`,
        // The IPv6 half appears only on a dual-stack host, so a single-stack endpoint reports exactly
        // what its configuration holds instead of printing empty IPv6 fields.
        ...(nic?.ipv6 ? [`IPv6 Address    ${nic.ipv6.address}/${nic.ipv6.prefix}`, `IPv6 Gateway    ${state.device.ipv6Gateway ?? "not set"}`] : []),
      ];
    },
  },
  {
    name: "ping", modes: ["user", "privileged"], help: "Send ICMP echo requests to an address", args: ["<ip-address>"],
    available: (state) => isHostDevice(state),
    validate: (state, args) => (isIpv4(args[0]) || normalizeIpv6(args[0]) !== null) && isHostDevice(state),
    output: (state, args) => {
      const network = state.network?.() ?? null;
      if (!network) return ["% The lab network is not attached to this console."];
      const result = pingHost(network, state, args[0]);
      // A failed ping states why it failed, so the console never leaves a learner with a bare
      // "Success rate is 0 percent" and no way to tell what is wrong.
      return result.ok ? result.lines : [...result.lines, `% ${result.reason}`];
    },
  },
  {
    name: "shutdown", modes: ["interface"], help: "Administratively disable the interface",
    apply: (state) => eachSelected(state, (port) => { port.adminUp = false; }),
    revert: (state) => eachSelected(state, (port) => { port.adminUp = true; }),
  },

  // Verification.
  { name: "show running-config", modes: execModes, help: "Show the running configuration", output: (state) => runningConfigLines(state.device) },
  { name: "show startup-config", modes: execModes, help: "Show the saved startup configuration", output: (state) => startupConfigLines(state.config) },
  { name: "show vlan", modes: execModes, help: "Show the VLAN database", available: isSwitchDevice, output: (state) => vlanBriefLines(state.device) },
  { name: "show vlan brief", modes: execModes, help: "Show the VLAN database in brief", available: isSwitchDevice, output: (state) => vlanBriefLines(state.device) },
  { name: "show interfaces status", modes: execModes, help: "Show the port status table", available: isSwitchDevice, output: (state) => interfaceStatusLines(state.device, cableStateFor(state)) },
  { name: "show interfaces switchport", modes: execModes, help: "Show the switchport state of every port", available: isSwitchDevice, output: (state) => state.device.interfaces.flatMap((port) => [...switchportDetailLines(state.device, port), ""]) },
  { name: "show interfaces trunk", modes: execModes, help: "Show the trunk ports and their allowed VLANs", available: isSwitchDevice, output: (state) => trunkLines(state.device) },
  { name: "show ip interface brief", modes: execModes, help: "Show the interface addresses", output: (state) => ipInterfaceBriefLines(state.device, cableStateFor(state)) },
  { name: "show ipv6 interface brief", modes: execModes, help: "Show the interface IPv6 addresses", output: (state) => ipv6InterfaceBriefLines(state.device, cableStateFor(state)) },
  { name: "show ip route", modes: execModes, help: "Show the IPv4 routing table", output: (state) => connectedRouteLines(state.device) },
  { name: "show ip route connected", modes: execModes, help: "Show the directly connected IPv4 routes", output: (state) => connectedRouteLines(state.device) },
  { name: "show ipv6 route", modes: execModes, help: "Show the IPv6 routing table", output: (state) => ipv6ConnectedRouteLines(state.device) },
  { name: "show ipv6 route connected", modes: execModes, help: "Show the directly connected IPv6 routes", output: (state) => ipv6ConnectedRouteLines(state.device) },
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

/**
 * A host endpoint is not an IOS device: its console offers exactly the endpoint commands below, so
 * a PC can never answer `show vlan brief` or enter a configuration mode the way a switch does.
 */
const hostConsoleCommands = new Set(["exit", "ip address", "ipv6 address", "ip default-gateway", "ipv6 default-gateway", "ipconfig", "ping"]);

export function commandsForMode(state: SimState): readonly SimCommand[] {
  const available = simCommands.filter((command) => command.modes.includes(state.mode));
  if (state.device.role === "host") {
    return available.filter((command) => command.modes.includes("user") && hostConsoleCommands.has(command.name));
  }
  return available.filter((command) => !command.available || command.available(state));
}
