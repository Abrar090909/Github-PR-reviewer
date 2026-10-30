/**
 * PR diff grounding: parses unified diff output and checks model evidence
 * against the actual changed hunks to prevent hallucinated file/line citations.
 */

/** A single changed hunk on the new (head) side of the diff. */
export type DiffHunk = {
  newStart: number;
  newEnd: number;
};

/** Per-file index: set of changed file paths → their new-side hunk ranges. */
export type DiffIndex = Map<string, DiffHunk[]>;

/**
 * Parses a unified diff (as produced by `git diff --unified=N`) into a
 * deterministic index from repository-relative file paths to their
 * new-side line ranges. Only files with at least one changed hunk are indexed.
 *
 * Hunk header format: @@ -oldStart[,oldLen] +newStart[,newLen] @@
 */
export const parseDiffIndex = (patch: string): DiffIndex => {
  const index: DiffIndex = new Map();
  let currentFile: string | undefined;

  for (const line of patch.split("\n")) {
    // "diff --git a/foo b/foo" — start of a new file section
    const diffLine = /^diff --git a\/.+ b\/(.+)$/.exec(line);
    if (diffLine) {
      currentFile = diffLine[1];
      if (currentFile !== undefined && !index.has(currentFile)) {
        index.set(currentFile, []);
      }
      continue;
    }

    // "+++ b/foo" — also captures the file path (handles renames)
    const plusPlusLine = /^\+\+\+ b\/(.+)$/.exec(line);
    if (plusPlusLine) {
      currentFile = plusPlusLine[1];
      if (currentFile !== undefined && !index.has(currentFile)) {
        index.set(currentFile, []);
      }
      continue;
    }

    // "@@ -oldStart,oldLen +newStart,newLen @@" — hunk header
    const hunkHeader = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunkHeader && currentFile !== undefined) {
      const newStart = parseInt(hunkHeader[1]!, 10);
      const newLen = hunkHeader[2] !== undefined ? parseInt(hunkHeader[2], 10) : 1;
      // A hunk with length 0 means only deletions; it still covers newStart.
      const newEnd = newLen === 0 ? newStart : newStart + newLen - 1;
      const hunks = index.get(currentFile);
      if (hunks !== undefined) {
        hunks.push({ newStart, newEnd });
      }
    }
  }

  return index;
};

/**
 * Returns true if the range [start, end] overlaps at least one changed hunk.
 * Partial overlap counts: evidence starting in a changed block is valid.
 */
export const isRangeInDiff = (index: DiffIndex, file: string, start: number, end: number): boolean => {
  const hunks = index.get(file);
  if (hunks === undefined) return false;
  return hunks.some((hunk) => start <= hunk.newEnd && end >= hunk.newStart);
};

/** Validation result for a single evidence entry against the diff. */
export type EvidenceGroundingIssue =
  | { kind: "file-absent"; file: string }
  | { kind: "range-outside-hunks"; file: string; newStart: number; newEnd: number };

/**
 * Checks a single evidence entry against the diff index.
 * Returns an issue if the file is absent from the diff or the new-side range
 * falls entirely outside the changed hunks.
 */
export const groundEvidence = (
  index: DiffIndex,
  evidence: { file: string; newStart: number; newEnd: number },
): EvidenceGroundingIssue | undefined => {
  if (!index.has(evidence.file)) {
    return { kind: "file-absent", file: evidence.file };
  }
  if (!isRangeInDiff(index, evidence.file, evidence.newStart, evidence.newEnd)) {
    return {
      kind: "range-outside-hunks",
      file: evidence.file,
      newStart: evidence.newStart,
      newEnd: evidence.newEnd,
    };
  }
  return undefined;
};

/**
 * Formats an EvidenceGroundingIssue as a human-readable validation message
 * suitable for the model-repair path.
 */
export const formatGroundingIssue = (issue: EvidenceGroundingIssue): string => {
  switch (issue.kind) {
    case "file-absent":
      return `evidence references '${issue.file}' which is not in the diff`;
    case "range-outside-hunks":
      return (
        `evidence references '${issue.file}' lines ${issue.newStart}–${issue.newEnd} ` +
        `which do not overlap any changed hunk in the diff`
      );
  }
};
