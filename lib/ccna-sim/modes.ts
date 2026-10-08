import type { SimMode } from "./tokens.ts";

const suffixes: Record<SimMode, string> = {
  user: ">",
  privileged: "#",
  global: "(config)#",
  interface: "(config-if)#",
  vlan: "(config-vlan)#",
  line: "(config-line)#",
};

export const simModes: readonly SimMode[] = ["user", "privileged", "global", "interface", "vlan", "line"];

export function promptFor(hostname: string, mode: SimMode) {
  return `${hostname}${suffixes[mode]}`;
}

export function isConfigurationMode(mode: SimMode) {
  return mode === "global" || mode === "interface" || mode === "vlan" || mode === "line";
}

/** `exit` leaves the current level: configuration returns to global, privileged to user exec,
 * and user exec closes the session, which is what a real console does. */
export function modeAfterExit(mode: SimMode): SimMode | "closed" {
  if (mode === "global") return "privileged";
  if (mode === "privileged") return "user";
  if (mode === "user") return "closed";
  return "global";
}
