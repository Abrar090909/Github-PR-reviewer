import { describe, expect, it } from "vitest";
import { applyPatch } from "../src/apply.js";
import { safeParseGraphDoc } from "../src/validate.js";
import { minimalGraphInput } from "../src/examples/minimal.js";
import { postmarkRefactorGraphInput } from "../src/examples/postmark-refactor.js";
import type { GraphDocInput } from "../src/graph.js";
import { graphIntegrityIssues } from "../src/integrity.js";
import type { DiffEvidence } from "../src/graph.js";

const clone = (doc: GraphDocInput): GraphDocInput => structuredClone(doc);

const evidenceEntry = (overrides: Partial<DiffEvidence> = {}): DiffEvidence => ({
  file: "src/api/handler.ts",
  newStart: 10,
  newEnd: 20,
  reason: "This function was modified by the PR.",
  ...overrides,
});

describe("DiffEvidence schema validation", () => {
  it("accepts valid node evidence", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry()];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("accepts valid edge evidence", () => {
    const doc = clone(postmarkRefactorGraphInput);
    doc.edges![0]!.evidence = [evidenceEntry({ file: "src/mailer.ts" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("accepts evidence with optional symbol field", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ symbol: "handleRequest" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("accepts evidence with oldStart and oldEnd", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ oldStart: 5, oldEnd: 15 })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid file path (absolute path)", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ file: "/absolute/path.ts" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid file path with backslash", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ file: "src\\windows\\path.ts" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid file path with .. segment", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ file: "src/../etc/passwd" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
  });

  it("rejects inverted line ranges (newEnd < newStart)", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ newStart: 20, newEnd: 10 })];
    const result = safeParseGraphDoc(doc);
    // The zod refine on DiffEvidence catches this
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("newEnd must be greater than or equal to newStart");
  });

  it("rejects inverted old-side line ranges (oldEnd < oldStart)", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ oldStart: 20, oldEnd: 10 })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("oldEnd must be greater than or equal to oldStart");
  });

  it("rejects newStart < 1", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ newStart: 0, newEnd: 5 })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
  });

  it("rejects empty reason", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry({ reason: "" })];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
  });
});

describe("DiffEvidence integrity validation (duplicate detection)", () => {
  it("rejects duplicate evidence entries on the same node", () => {
    const doc = clone(minimalGraphInput);
    const ev = evidenceEntry();
    doc.nodes[0]!.evidence = [ev, ev]; // exact duplicate
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("duplicate evidence entry");
  });

  it("rejects canonical-equivalent evidence (same file+newStart+newEnd, different symbol)", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [
      evidenceEntry({ symbol: "foo" }),
      evidenceEntry({ symbol: "bar" }), // same file/range, different symbol
    ];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain("duplicate evidence entry");
  });

  it("accepts distinct evidence entries on the same node", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [
      evidenceEntry({ newStart: 10, newEnd: 20 }),
      evidenceEntry({ newStart: 30, newEnd: 40 }),
    ];
    const result = safeParseGraphDoc(doc);
    expect(result.ok).toBe(true);
  });

  it("duplicate detection is deterministic regardless of input ordering", () => {
    const doc1 = clone(minimalGraphInput);
    const doc2 = clone(minimalGraphInput);
    const ev1 = evidenceEntry({ newStart: 1, newEnd: 5 });
    const ev2 = evidenceEntry({ newStart: 1, newEnd: 5 }); // duplicate
    doc1.nodes[0]!.evidence = [ev1, ev2];
    doc2.nodes[0]!.evidence = [ev2, ev1];
    const r1 = safeParseGraphDoc(doc1);
    const r2 = safeParseGraphDoc(doc2);
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
  });
});

describe("DiffEvidence round-trip through GraphDoc parse/serialize", () => {
  it("evidence survives a JSON round-trip", () => {
    const doc = clone(minimalGraphInput);
    const ev = evidenceEntry({ symbol: "checkHealth", oldStart: 1, oldEnd: 5 });
    doc.nodes[0]!.evidence = [ev];
    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;

    const json = JSON.stringify(parsed.value);
    const reparsed = safeParseGraphDoc(JSON.parse(json));
    if (!reparsed.ok) throw reparsed.error;

    expect(reparsed.value.nodes[0]?.evidence?.[0]).toEqual(ev);
  });

  it("graphIntegrityIssues is empty for valid evidence", () => {
    const doc = clone(minimalGraphInput);
    doc.nodes[0]!.evidence = [evidenceEntry()];
    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;
    expect(graphIntegrityIssues(parsed.value)).toEqual([]);
  });
});

describe("DiffEvidence with PatchDoc operations", () => {
  it("evidence survives when an element is updated without touching evidence", () => {
    const doc = clone(minimalGraphInput);
    const ev = evidenceEntry();
    doc.nodes[0]!.evidence = [ev];
    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;

    const result = applyPatch(parsed.value, [
      { op: "update_node", id: doc.nodes[0]!.id, patch: { label: "Updated Health Route" } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;

    const updatedNode = result.value.nodes.find((n) => n.id === doc.nodes[0]!.id);
    expect(updatedNode?.label).toBe("Updated Health Route");
    expect(updatedNode?.evidence).toEqual([ev]);
  });

  it("updating an element's evidence obeys PatchDoc semantics", () => {
    const doc = clone(minimalGraphInput);
    const ev1 = evidenceEntry({ newStart: 10, newEnd: 20 });
    const ev2 = evidenceEntry({ newStart: 30, newEnd: 40 });
    doc.nodes[0]!.evidence = [ev1];
    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;

    const result = applyPatch(parsed.value, [
      { op: "update_node", id: doc.nodes[0]!.id, patch: { evidence: [ev2] } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;

    const updatedNode = result.value.nodes.find((n) => n.id === doc.nodes[0]!.id);
    expect(updatedNode?.evidence).toEqual([ev2]);
  });

  it("removing a node removes its evidence naturally with the element", () => {
    const doc = clone(postmarkRefactorGraphInput);
    const ev = evidenceEntry({ file: "src/mailer.ts" });
    const targetNodeId = "send-single-email";
    const targetNode = doc.nodes.find((n) => n.id === targetNodeId);
    if (targetNode) targetNode.evidence = [ev];

    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;

    const result = applyPatch(parsed.value, [{ op: "remove_node", id: targetNodeId }]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;

    expect(result.value.nodes.find((n) => n.id === targetNodeId)).toBeUndefined();
  });

  it("removing an edge removes its evidence naturally with the element", () => {
    const doc = clone(postmarkRefactorGraphInput);
    const ev = evidenceEntry({ file: "src/mailer.ts" });
    const targetEdgeId = "process-to-single";
    const targetEdge = doc.edges!.find((e) => e.id === targetEdgeId);
    if (targetEdge) targetEdge.evidence = [ev];

    const parsed = safeParseGraphDoc(doc);
    if (!parsed.ok) throw parsed.error;

    const result = applyPatch(parsed.value, [{ op: "remove_edge", id: targetEdgeId }]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw result.error;

    expect(result.value.edges.find((e) => e.id === targetEdgeId)).toBeUndefined();
  });
});
