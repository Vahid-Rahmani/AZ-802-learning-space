import { configBodyLines, configByteCount, type SimDeviceState } from "./device.ts";

/** Split of the running configuration from the saved startup configuration, with the same
 * vocabulary a learner meets on a real device. The saved copy holds the configuration body, so
 * `show startup-config` never repeats the running-config preamble. */
export type StartupConfig = string[] | null;

export type ConfigState = { startup: StartupConfig };

export function emptyConfigState(): ConfigState {
  return { startup: null };
}

export const saveStartup = (device: SimDeviceState): string[] => configBodyLines(device);

export function hasUnsavedChanges(device: SimDeviceState, state: ConfigState) {
  return state.startup === null || state.startup.join("\n") !== configBodyLines(device).join("\n");
}

export function startupConfigLines(state: ConfigState): string[] {
  if (!state.startup) return ["startup-config is not present"];
  return [`Using ${configByteCount(state.startup)} out of 524288 bytes`, "", ...state.startup];
}
