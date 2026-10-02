import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), "__goldens__");

/**
 * Compares a render against its recorded bytes, or records it when
 * `UPDATE_GOLDENS` is set. The whole point of these files is that they are
 * read by a human before they are committed: a diff in one is a change to
 * what a reviewer sees, and only a person can say whether that is an
 * improvement.
 */
export const expectGolden = (name: string, actual: string): void => {
  const path = join(GOLDEN_DIR, name);

  if (process.env["UPDATE_GOLDENS"] === "1") {
    mkdirSync(GOLDEN_DIR, { recursive: true });
    writeFileSync(path, actual, "utf8");
    return;
  }

  // Git may check text fixtures out with CRLF on Windows. SVG output is
  // deliberately LF-only, so compare normalized text instead of reporting
  // every line as a visual regression when only the checkout convention differs.
  const expected = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  expect(actual.replace(/\r\n/g, "\n"), `${name} differs from its golden; re-run with UPDATE_GOLDENS=1 to record`).toBe(
    expected,
  );
};
