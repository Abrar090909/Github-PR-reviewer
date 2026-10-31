/**
 * What a per-file patch says about lines on the head side of a pull request.
 *
 * GitHub accepts an inline review comment only on a line the diff shows, so a
 * finding is posted only when every line it names is one of these. The model
 * is shown the same patch with head-side numbers written in, so it can name
 * lines without counting hunks itself.
 */

export type FileLines = {
  /** Head-side lines the diff shows: added or unchanged context. */
  visible: Set<number>;
  /** Head-side lines the pull request added. */
  added: Set<number>;
};

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function readPatch(patch: string): FileLines {
  const visible = new Set<number>();
  const added = new Set<number>();
  let line = 0;
  for (const text of patch.split("\n")) {
    const hunk = HUNK.exec(text);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (line === 0 || text.startsWith("\\")) continue;
    if (text.startsWith("-")) continue;
    visible.add(line);
    if (text.startsWith("+")) added.add(line);
    line += 1;
  }
  return { visible, added };
}

/** The patch with each head-side line numbered, e.g. `  12 + const x = 1`. Removed lines get no number. */
export function numberPatch(patch: string): string {
  let line = 0;
  return patch
    .split("\n")
    .map((text) => {
      const hunk = HUNK.exec(text);
      if (hunk) {
        line = Number(hunk[1]);
        return text;
      }
      if (line === 0 || text.startsWith("\\")) return text;
      if (text.startsWith("-")) return `      ${text}`;
      const numbered = `${String(line).padStart(5)} ${text}`;
      line += 1;
      return numbered;
    })
    .join("\n");
}

/** True when every line from start to end is shown by the diff, so GitHub will take a comment on them. */
export function commentable(lines: FileLines | undefined, start: number, end: number): boolean {
  if (!lines || end < start) return false;
  for (let line = start; line <= end; line += 1) if (!lines.visible.has(line)) return false;
  return true;
}
