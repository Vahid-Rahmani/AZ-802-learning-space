import { commandsForMode, createSimState, simCommands, type SimCommand, type SimState } from "./commands.ts";
import type { SimDeviceRole } from "./device.ts";
import { ambiguousCommand, helpLines, incompleteCommand, invalidInput } from "./help.ts";
import { modeAfterExit, promptFor } from "./modes.ts";
import { tokenize, type SimMode, type SimToken } from "./tokens.ts";

export type SimResult = {
  lines: string[];
  /** Empty when the session closed, so a transcript never carries a prompt that no longer exists. */
  prompt: string;
  mode: SimMode;
  closed: boolean;
  matched: string | null;
};

/**
 * A console for one node of a lab's published topology: the node's own ports plus its role's real
 * defaults, so a router's ports start administratively down, a switch's access ports start in VLAN
 * 1, and a host console has no VLAN database at all. The browser workspace and validate:ccna-sim
 * both build every console through this one function, so a graded step can never read a different
 * device than the one the learner is typing on.
 */
export function createLabSession(
  node: { id?: string; label: string; role?: SimDeviceRole; ports: readonly { kind?: string; label: string }[] },
  hostname?: string,
) {
  const ethernet = node.ports
    .filter((port) => port.kind !== "console" && port.kind !== "wireless")
    .map((port) => port.label);
  const session = new IosSession(hostname || node.label, node.role ?? "switch", ethernet);
  // The console's own node id travels with the device, so the lab model can tell which device is
  // asking even though it holds copies of the state rather than this object.
  if (node.id) session.state.device.id = node.id;
  return session;
}

type Resolution =
  | { kind: "run"; command: SimCommand; args: string[]; negate: boolean }
  | { kind: "invalid"; offset: number }
  | { kind: "ambiguous" }
  | { kind: "incomplete" };

/** The engine is pure and deterministic: the same input on the same session always produces the
 * same lines, which is what validate:ccna-sim replays. */
export class IosSession {
  readonly state: SimState;
  private readonly history: string[] = [];
  private readonly role: SimDeviceRole;
  private readonly portLabels?: readonly string[];

  constructor(hostname = "Switch", role: SimDeviceRole = "switch", portLabels?: readonly string[]) {
    this.role = role;
    this.portLabels = portLabels;
    this.state = createSimState(hostname, role, portLabels);
  }

  get prompt() {
    return this.state.closed ? "" : promptFor(this.state.device.hostname, this.state.mode);
  }

  get commandHistory(): readonly string[] {
    return this.history;
  }

  get availableCommands(): readonly SimCommand[] {
    return commandsForMode(this.state);
  }

  reset() {
    const fresh = createSimState(this.state.device.hostname, this.role, this.portLabels);
    fresh.device.id = this.state.device.id;
    this.state.device = fresh.device;
    this.state.config = fresh.config;
    this.state.selected = fresh.selected;
    this.state.mode = "user";
    this.state.closed = false;
    this.history.length = 0;
  }

  execute(input: string): SimResult {
    const typed = input.trim();
    if (!typed || this.state.closed) return this.result([], null);
    this.history.push(typed);
    const tokens = tokenize(typed);
    const last = tokens[tokens.length - 1];
    if (last && last.value === "?") {
      const words = tokens.slice(0, -1).map((token) => token.value.toLowerCase());
      return this.result(helpLines(this.state, words), `help ${words.join(" ")}`.trim());
    }
    const resolution = this.resolve(tokens);
    if (resolution.kind === "invalid") return this.result(invalidInput(typed, resolution.offset), null);
    if (resolution.kind === "ambiguous") return this.result(ambiguousCommand(typed), null);
    if (resolution.kind === "incomplete") return this.result(incompleteCommand(), null);
    const { command, args, negate } = resolution;
    if (!negate) {
      if (command.transition === "up") {
        const next = modeAfterExit(this.state.mode);
        if (next === "closed") this.state.closed = true;
        else this.state.mode = next;
      } else if (command.transition) {
        this.state.mode = command.transition;
      }
      command.apply?.(this.state, args);
    } else {
      command.revert?.(this.state, args);
    }
    const lines = negate ? [] : [...(command.output?.(this.state, args) ?? [])];
    return this.result(lines, `${negate ? "no " : ""}${command.name}`);
  }

  /** Tab completion over the same catalog `?` prints. */
  complete(input: string): string[] {
    const words = tokenize(input).map((token) => token.value.toLowerCase());
    if (/\s$/.test(input)) words.push("");
    const last = words.length ? words[words.length - 1] : "";
    const path = words.slice(0, -1);
    const negated = path.length > 0 && "no".startsWith(path[0]);
    const requested = (negated ? path.slice(1) : path);
    if (negated && !requested.length && !last && !words.length) return [];
    const candidates = this.availableCommands.filter((command) => !negated || command.revert);
    const keywords = candidates
      .filter((command) => {
        const parts = command.name.split(" ");
        return requested.every((word, index) => index < parts.length && parts[index].startsWith(word))
          && (parts[requested.length] ?? "").startsWith(last);
      })
      .map((command) => command.name.split(" ")[requested.length])
      .filter((keyword): keyword is string => Boolean(keyword));
    const completion = [...new Set(keywords)].sort();
    if (!negated && !path.length && "no".startsWith(last) && !completion.includes("no") && this.availableCommands.some((command) => command.revert)) completion.push("no");
    return completion.sort();
  }

  private result(lines: string[], matched: string | null): SimResult {
    return { lines, prompt: this.prompt, mode: this.state.mode, closed: this.state.closed, matched };
  }

  private resolve(tokens: SimToken[], negate = false): Resolution {
    const first = tokens[0];
    if (first && "no".startsWith(first.value.toLowerCase())) {
      const rest = tokens.slice(1);
      if (!rest.length) return { kind: "incomplete" };
      const inner = this.resolve(rest, true);
      if (inner.kind !== "run" || !inner.command.revert) return { kind: "invalid", offset: first.offset };
      return { ...inner, negate: true };
    }
    let matched = [...this.availableCommands];
    const args: SimToken[] = [];
    let variadicArgs = false;
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      const asKeyword = matched.filter((command) => {
        const parts = command.name.split(" ");
        return index < parts.length && parts[index].startsWith(token.value.toLowerCase());
      });
      if (asKeyword.length) {
        const options = [...new Set(asKeyword.map((command) => command.name.split(" ")[index]))];
        if (options.length > 1 && !options.includes(token.value.toLowerCase())) return { kind: "ambiguous" };
        const exact = asKeyword.filter((command) => command.name.split(" ")[index] === token.value.toLowerCase());
        matched = exact.length ? exact : asKeyword;
        continue;
      }
      const withArgs = matched.filter((command) => index === command.name.split(" ").length + args.length && args.length < (command.args?.length ?? 0));
      if (withArgs.length === 1) {
        matched = withArgs;
        if (withArgs[0].variadic) {
          args.push({ value: tokens.slice(index).map((rest) => rest.value).join(" "), offset: token.offset });
          variadicArgs = true;
          break;
        }
        args.push(token);
        continue;
      }
      return { kind: "invalid", offset: token.offset };
    }
    const complete = matched.filter((command) => tokens.length === command.name.split(" ").length && !(command.args?.length));
    if (complete.length === 1) return this.checked(complete[0], [], tokens);
    const withArguments = matched.filter((command) => variadicArgs
      ? command.variadic === true && tokens.length > command.name.split(" ").length && (command.args?.length ?? 0) === args.length
      : tokens.length === command.name.split(" ").length + args.length && (command.args?.length ?? 0) === args.length);
    if (withArguments.length === 1) return this.checked(withArguments[0], args.map((token) => token.value), tokens, args);
    if (negate) {
      const targets = matched.filter((command) => command.revert && tokens.length === command.name.split(" ").length && (command.args?.length ?? 0) > args.length);
      if (targets.length === 1) return { kind: "run", command: targets[0], args: args.map((token) => token.value), negate: true };
    }
    if (matched.some((command) => tokens.length < command.name.split(" ").length)) return { kind: "incomplete" };
    const last = tokens[tokens.length - 1];
    return { kind: "invalid", offset: last ? last.offset : 0 };
  }

  /** Argument shape is checked before anything is applied, so a typo cannot half-configure a port. */
  private checked(command: SimCommand, values: string[], tokens: SimToken[], argTokens: SimToken[] = []): Resolution {
    if (command.validate && !command.validate(this.state, values)) {
      const last = argTokens[argTokens.length - 1] ?? tokens[tokens.length - 1];
      return { kind: "invalid", offset: last ? last.offset : 0 };
    }
    return { kind: "run", command, args: values, negate: false };
  }
}

export { simCommands };
