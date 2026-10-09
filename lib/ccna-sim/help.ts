import { commandsForMode, simKeywordHelp, type SimCommand, type SimState } from "./commands.ts";

const keywordColumn = 20;

const line = (keyword: string, help: string) => `${keyword.padEnd(keywordColumn)}${help}`;
const isNo = (word: string) => "no".startsWith(word);

function keywordLines(commands: readonly SimCommand[], depth: number, words: readonly string[]) {
  const keywords = [...new Set(commands.map((command) => command.name.split(" ")[depth]).filter((keyword): keyword is string => Boolean(keyword)))].sort();
  return keywords.map((keyword) => {
    const entry = commands.find((command) => command.name.split(" ")[depth] === keyword);
    return line(keyword, simKeywordHelp[[...words, keyword].join(" ")] ?? entry?.help ?? "");
  });
}

/** `?` help, derived from the catalog so the terminal can never promise a command it does not
 * implement. `no ?` and `no <path> ?` list only the commands that carry a `no` form. */
export function helpLines(state: SimState, words: readonly string[]): string[] {
  const available = commandsForMode(state);
  const negated = words.length > 0 && isNo(words[0]);
  const path = negated ? words.slice(1) : words;
  const candidates = negated ? available.filter((command) => command.revert) : available;
  if (negated && !path.length) {
    return candidates.length ? keywordLines(candidates, 0, []) : ["% Unrecognized command"];
  }
  const matched = path.length
    ? candidates.filter((command) => {
        const parts = command.name.split(" ");
        return path.every((word, index) => index < parts.length && parts[index].startsWith(word));
      })
    : candidates;
  if (!matched.length) return ["% Unrecognized command"];
  const depth = path.length;
  const keywords = [...new Set(matched.map((command) => command.name.split(" ")[depth]).filter((keyword): keyword is string => Boolean(keyword)))].sort();
  if (!keywords.length) {
    const args = matched.flatMap((command) => (command.args ?? []).map((argument) => line(argument, command.help)));
    return args.length ? args : ["<cr>"];
  }
  const lines = keywordLines(matched, depth, path);
  if (!negated && !path.length && available.some((command) => command.revert)) lines.push(line("no", simKeywordHelp.no));
  return lines;
}

/** Cisco's caret form: the marker sits under the token that could not be parsed. */
export function invalidInput(typed: string, offset: number): string[] {
  const caretOffset = Math.max(0, Math.min(offset, typed.length));
  return [`${" ".repeat(caretOffset)}^`, "% Invalid input detected at '^' marker."];
}

export const ambiguousCommand = (typed: string) => [`% Ambiguous command:  "${typed}"`];
export const incompleteCommand = () => ["% Incomplete command."];
