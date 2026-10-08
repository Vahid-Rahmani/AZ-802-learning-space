export type SimMode = "user" | "privileged" | "global" | "interface" | "vlan" | "line";

export type SimToken = { value: string; offset: number };

/** Splits a typed line into tokens, keeping each token's offset so an error caret can point at it. */
export function tokenize(line: string): SimToken[] {
  const tokens: SimToken[] = [];
  const pattern = /"[^"]*"|\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    tokens.push({ value: match[0].replace(/^"|"$/g, ""), offset: match.index });
  }
  return tokens;
}

export type KeywordMatch = { kind: "match"; keyword: string } | { kind: "ambiguous"; options: string[] } | { kind: "none" };

/** Cisco resolves an unambiguous prefix (`conf t`), refuses an ambiguous one and fails the rest. */
export function matchKeyword(typed: string, keywords: readonly string[]): KeywordMatch {
  const exact = keywords.find((keyword) => keyword === typed);
  if (exact) return { kind: "match", keyword: exact };
  const prefixed = keywords.filter((keyword) => keyword.startsWith(typed));
  if (prefixed.length === 1) return { kind: "match", keyword: prefixed[0] };
  if (prefixed.length > 1) return { kind: "ambiguous", options: prefixed };
  return { kind: "none" };
}
