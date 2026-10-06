import { minimalGraph } from "@contour/schema/examples";
import { describe, expect, it, vi } from "vitest";
import {
  parseDiffIndex,
  isRangeInDiff,
  groundEvidence,
  formatGroundingIssue,
} from "../src/diff-grounding.js";
import { extractGraph, type KnownFields } from "../src/extract.js";
import { PrLensCliError } from "../src/errors.js";

const SAMPLE_DIFF = `
diff --git a/src/index.ts b/src/index.ts
index 1234567..89abcdef 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,6 +10,12 @@ export function run() {
+  const a = 1;
+  const b = 2;
+  return a + b;
 }
diff --git a/src/utils.ts b/src/utils.ts
index abcdef1..2345678 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -50,4 +50,8 @@ export function helper() {
+  // new helper logic
+  return true;
 }
`;

describe("diff grounding unit logic", () => {
  it("parses diff index from unified diff output", () => {
    const index = parseDiffIndex(SAMPLE_DIFF);
    expect(index.has("src/index.ts")).toBe(true);
    expect(index.has("src/utils.ts")).toBe(true);
    expect(index.has("src/absent.ts")).toBe(false);

    // src/index.ts hunk is +10,12 (range 10-21)
    expect(isRangeInDiff(index, "src/index.ts", 12, 15)).toBe(true);
    // line outside hunk (e.g. 50)
    expect(isRangeInDiff(index, "src/index.ts", 100, 110)).toBe(false);
  });

  it("detects evidence citing a file absent from the diff", () => {
    const index = parseDiffIndex(SAMPLE_DIFF);
    const issue = groundEvidence(index, {
      file: "src/nonexistent.ts",
      newStart: 10,
      newEnd: 15,
    });
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe("file-absent");
    if (issue) {
      expect(formatGroundingIssue(issue)).toContain("not in the diff");
    }
  });

  it("detects evidence citing lines outside changed hunks", () => {
    const index = parseDiffIndex(SAMPLE_DIFF);
    const issue = groundEvidence(index, {
      file: "src/index.ts",
      newStart: 80,
      newEnd: 90,
    });
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe("range-outside-hunks");
    if (issue) {
      expect(formatGroundingIssue(issue)).toContain("do not overlap any changed hunk");
    }
  });

  it("accepts evidence citing valid lines within changed hunks", () => {
    const index = parseDiffIndex(SAMPLE_DIFF);
    const issue = groundEvidence(index, {
      file: "src/index.ts",
      newStart: 12,
      newEnd: 16,
    });
    expect(issue).toBeUndefined();
  });
});

describe("extractGraph diff grounding integration", () => {
  const knownWithDiff: KnownFields = {
    provenance: {
      repo: { owner: "Abrar090909", name: "contour" },
      base: { sha: "1111111" },
      head: { sha: "2222222" },
      generator: { name: "contour-cli", version: "0.1.0", model: "test-model" },
    },
    stats: { filesChanged: 2, additions: 20, deletions: 0 },
    lenses: ["architecture"],
    generatedAt: "2026-08-20T21:00:00.000Z",
    diffPatch: SAMPLE_DIFF,
  };

  const modelDocWithEvidence = (evidence: unknown[]): Record<string, unknown> => {
    const { schemaVersion: _v, provenance: _p, ...rest } = structuredClone(minimalGraph);
    return {
      ...rest,
      nodes: [
        {
          ...rest.nodes[0],
          evidence,
        },
      ],
    };
  };

  it("triggers a repair round when evidence cites a file absent from the diff", async () => {
    const ungroundedEvidence = [
      {
        file: "src/absent.ts",
        newStart: 1,
        newEnd: 10,
        reason: "Claimed evidence for absent file",
      },
    ];
    const groundedEvidence = [
      {
        file: "src/index.ts",
        newStart: 10,
        newEnd: 15,
        reason: "Valid grounded evidence",
      },
    ];

    const complete = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(modelDocWithEvidence(ungroundedEvidence)))
      .mockResolvedValueOnce(JSON.stringify(modelDocWithEvidence(groundedEvidence)));

    const { document, attempts } = await extractGraph(
      { system: "s", user: "u", maxOutputTokens: 1024, known: knownWithDiff },
      complete,
    );

    expect(attempts).toBe(2);
    expect(document.nodes[0]?.evidence).toHaveLength(1);
    expect(document.nodes[0]?.evidence?.[0]?.file).toBe("src/index.ts");

    const repairPrompt = complete.mock.calls[1]?.[0]?.turns[2]?.text;
    expect(repairPrompt).toContain("not in the diff");
  });

  it("triggers a repair round when evidence cites lines outside changed hunks", async () => {
    const ungroundedEvidence = [
      {
        file: "src/index.ts",
        newStart: 500,
        newEnd: 550,
        reason: "Lines far outside changed hunk",
      },
    ];
    const groundedEvidence = [
      {
        file: "src/index.ts",
        newStart: 10,
        newEnd: 15,
        reason: "Corrected line range",
      },
    ];

    const complete = vi
      .fn()
      .mockResolvedValueOnce(JSON.stringify(modelDocWithEvidence(ungroundedEvidence)))
      .mockResolvedValueOnce(JSON.stringify(modelDocWithEvidence(groundedEvidence)));

    const { document, attempts } = await extractGraph(
      { system: "s", user: "u", maxOutputTokens: 1024, known: knownWithDiff },
      complete,
    );

    expect(attempts).toBe(2);
    expect(document.nodes[0]?.evidence?.[0]?.newStart).toBe(10);

    const repairPrompt = complete.mock.calls[1]?.[0]?.turns[2]?.text;
    expect(repairPrompt).toContain("do not overlap any changed hunk");
  });

  it("fails when ungrounded evidence cannot be repaired twice", async () => {
    const ungroundedEvidence = [
      {
        file: "src/ghost.ts",
        newStart: 1,
        newEnd: 10,
        reason: "Persistent hallucination",
      },
    ];

    const complete = vi.fn().mockResolvedValue(JSON.stringify(modelDocWithEvidence(ungroundedEvidence)));

    await expect(
      extractGraph(
        { system: "s", user: "u", maxOutputTokens: 1024, known: knownWithDiff },
        complete,
      ),
    ).rejects.toThrow(PrLensCliError);
    expect(complete).toHaveBeenCalledTimes(2);
  });
});
