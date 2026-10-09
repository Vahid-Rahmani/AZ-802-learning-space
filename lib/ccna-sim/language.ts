/** The simulator surface is authored in exactly one language and never mixed
 * (content/ccna-simulator-plan.md §2). Every string the simulator itself shows lives here, so a
 * second-language pack cannot be introduced by accident, and validate:ccna-sim can prove it. */
export const simulatorLanguage = "en";

/** Persian and Arabic script, which must never appear inside simulator content. */
const nonLatinSimulatorScript = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isSingleLanguage(text: string) {
  return !nonLatinSimulatorScript.test(text);
}

export const simulatorText = {
  kicker: "CCNA simulator · practice model",
  notice: "This terminal is simulated by this site. It is a practice model, not a device, and its output is not device or certification evidence.",
  terminal: "Device terminal",
  reference: "Implemented commands",
  placeholder: "Type a command, for example: enable",
  run: "Run",
  reset: "Reset terminal",
  closed: "Connection closed. Restart this console to start again.",
  stage: "Implemented: CLI modes, help, VLANs, interface configuration and running/startup configuration. Lab-network connectivity and automatic objective grading are not implemented yet.",
  openLibrary: "Open the lab library",
  labMissing: "That lab is not in this course. Choose one in the lab library.",
};
