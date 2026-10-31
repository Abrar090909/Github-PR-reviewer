import { expect, test } from "vitest";
import { postmarkRefactorGraph as graph } from "@contour/schema/examples";
import type { RenderManifest } from "@contour/schema";
import { commentable, numberPatch, readPatch } from "@/lib/hosted/diff-lines";
import { groundFindings, findingComment, type Finding } from "@/lib/hosted/review";
import { diffLink, readFirst } from "@/lib/hosted/focus";
import { composeHostedComment } from "@/lib/hosted/comment";
import { buildMap } from "@/lib/hosted/map";

const PATCH = [
  "@@ -10,4 +10,5 @@ export function send() {",
  "   const a = 1;",
  "-  const b = 2;",
  "+  const b = 3;",
  "+  const c = 4;",
  "   return a + b;",
  "\\ No newline at end of file",
].join("\n");

test("head-side lines are read from the hunk, skipping removed lines", () => {
  const lines = readPatch(PATCH);
  expect([...lines.visible]).toEqual([10, 11, 12, 13]);
  expect([...lines.added]).toEqual([11, 12]);
});

test("the model sees each head-side line numbered, and removed lines unnumbered", () => {
  expect(numberPatch(PATCH).split("\n").slice(1, 5)).toEqual([
    "   10    const a = 1;",
    "      -  const b = 2;",
    "   11 +  const b = 3;",
    "   12 +  const c = 4;",
  ]);
});

test("a range is commentable only when GitHub shows every line of it", () => {
  const lines = readPatch(PATCH);
  expect(commentable(lines, 11, 12)).toBe(true);
  expect(commentable(lines, 12, 14)).toBe(false);
  expect(commentable(undefined, 1, 1)).toBe(false);
});

const candidate = (overrides: Partial<Finding> = {}) => ({
  severity: "medium" as const,
  category: "correctness" as const,
  file: "functions/src/broadcast/sendBroadcastBulk.ts",
  startLine: 11,
  endLine: 12,
  title: "`sendBroadcastBulk` drops the last batch",
  body: "The loop stops one batch early.",
  ...overrides,
});

test("findings outside the diff, in unknown files or repeated are dropped, the rest ranked by severity", () => {
  const lines = { "functions/src/broadcast/sendBroadcastBulk.ts": readPatch(PATCH) };
  const { findings, dropped } = groundFindings(
    [
      candidate(),
      candidate({ startLine: 40, endLine: 41, title: "Out of the diff" }),
      candidate({ file: "nowhere.ts", title: "Unknown file" }),
      candidate(),
      candidate({ severity: "high", startLine: 10, endLine: 10, title: "Worse" }),
    ],
    lines,
    graph,
  );
  expect(dropped).toBe(3);
  expect(findings.map((finding) => finding.title)).toEqual(["Worse", "`sendBroadcastBulk` drops the last batch"]);
  expect(findings[0]!.nodes).toContain("send-broadcast-bulk");
});

test("a suggestion that would break out of its code block is not offered", () => {
  const lines = { "functions/src/broadcast/sendBroadcastBulk.ts": readPatch(PATCH) };
  const { findings } = groundFindings([candidate({ suggestion: "```\nrm -rf /\n```" })], lines, graph);
  expect(findings[0]!.suggestion).toBeUndefined();
});

test("an inline comment carries the severity, the reason, a committable suggestion and the map link", () => {
  const body = findingComment(
    { ...candidate({ suggestion: "  const c = 5;" }), fingerprint: "abc", nodes: [] },
    "https://example.test/r/1#finding=abc",
  );
  expect(body).toContain("**Medium · correctness**");
  expect(body).toContain("```suggestion\n  const c = 5;\n```");
  expect(body).toContain("see it on the map");
});

test("read-first ranks files by how much they connect, and says why", () => {
  const ranked = readFirst(graph, []);
  expect(ranked.length).toBeGreaterThan(0);
  expect(ranked.length).toBeLessThanOrEqual(5);
  expect(ranked[0]!.reason).toMatch(/backs/);
  const scores = ranked.map((file) => file.score);
  expect([...scores].sort((a, b) => b - a)).toEqual(scores);
});

test("diff links point at the file's anchor in Files changed", () => {
  expect(diffLink("o/r", 4, "a.ts", 12)).toMatch(/^https:\/\/github\.com\/o\/r\/pull\/4\/files#diff-[0-9a-f]{64}R12$/);
});

const manifest: RenderManifest = {
  ...({} as RenderManifest),
  assets: [
    { id: "architecture-dark", lens: "architecture", theme: "dark", width: 800, height: 400, url: "https://img.test/a-dark.svg" },
    { id: "architecture-light", lens: "architecture", theme: "light", width: 800, height: 400, url: "https://img.test/a-light.svg" },
  ] as RenderManifest["assets"],
};

test("the comment links diagrams to the map, plays the walkthrough, and lists the review and files to read", () => {
  const body = composeHostedComment(graph, manifest, {
    repoFullName: "o/r",
    prNumber: 4,
    headSha: "0123456789abcdef0123456789abcdef01234567",
    mapUrl: "https://contour.test/r/id?t=tok",
    review: { status: "complete", headSha: "0123456789abcdef0123456789abcdef01234567", dropped: 0, findings: [
      { ...candidate({ severity: "high" }), fingerprint: "f1", nodes: [], url: "https://github.com/o/r/pull/4#discussion_r1" },
    ] },
  });
  expect(body.startsWith("<!-- contour-hosted -->")).toBe(true);
  expect(body).toContain('href="https://contour.test/r/id?t=tok#architecture"');
  expect(body).toContain("▶ Play the walkthrough");
  expect(body).toContain("<b>Review</b> · 1 finding (1 high)");
  expect(body).toContain("(https://github.com/o/r/pull/4#discussion_r1)");
  expect(body).toContain("Read these files first");
  expect(body).toContain(`${graph.walkthrough!.steps.length} steps`);
});

test("a failed review says so without hiding the diagrams", () => {
  const body = composeHostedComment(graph, manifest, {
    repoFullName: "o/r", prNumber: 4, headSha: "0".repeat(40), mapUrl: "https://contour.test/r/id?t=tok",
    review: { status: "failed", headSha: "0".repeat(40) },
  });
  expect(body).toContain("the review could not run");
  expect(body).toContain("a-dark.svg");
});

test("the map model draws every view, resolves each walkthrough step to boxes, and links parts to their lines", () => {
  const model = buildMap(graph, null, { repo: "o/r", prNumber: 4, headSha: "0".repeat(40) });
  expect(model.stages.length).toBeGreaterThanOrEqual(2);
  expect(model.stages.some((stage) => stage.lens === "data-flow")).toBe(true);
  expect(model.stages[0]!.dark.startsWith("data:image/svg+xml")).toBe(true);
  expect(model.steps).toHaveLength(graph.walkthrough!.steps.length);
  for (const step of model.steps) expect(model.stages[step.stage]).toBeDefined();
  expect(model.steps.some((step) => step.boxes.length > 0)).toBe(true);
  const bulk = model.parts["send-broadcast-bulk"]!;
  expect(bulk.delta).toBe("added");
  expect(bulk.connections.length).toBeGreaterThan(0);
  expect(model.reviewStatus).toBe("none");
});
