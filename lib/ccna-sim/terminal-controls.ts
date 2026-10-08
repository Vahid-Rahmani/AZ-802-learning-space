/** A cursor is an index in history; history.length represents the unsubmitted draft. */
export function historyPosition(cursor: number, length: number, direction: -1 | 1) {
  return Math.max(0, Math.min(length, (cursor < 0 ? length : cursor) + direction));
}

export function completedInput(input: string, keyword: string) {
  if (/\s$/.test(input)) return `${input}${keyword} `;
  return input.replace(/\S*$/, keyword) + " ";
}
