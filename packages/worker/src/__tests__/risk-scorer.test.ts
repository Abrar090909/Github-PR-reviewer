import { describe, it, expect } from "vitest";
import { scoreDocument, buildSummaryStats } from "../risk-scorer.js";
import type { GraphDocument, HotspotRecord } from "@contour/shared";

const BASE_DOC: GraphDocument = {
  schemaVersion: "1",
  kind: "graph",
  lenses: ["architecture"],
  lanes: [{ id: "services", label: "Services" }],
  nodes: [
    {
      id: "payment-service",
      label: "payment-service",
      kind: "service",
      delta: "modified",
      lane: "services",
      riskScore: 60,
      riskReasons: ["payment path"],
      behaviorDelta: null,
      testCoverage: "none-in-diff",
      fanIn: 5,
    },
    {
      id: "logger",
      label: "logger",
      kind: "function",
      delta: "modified",
      lane: "services",
      riskScore: 10,
      riskReasons: ["utility function"],
      behaviorDelta: null,
      testCoverage: "covered",
      fanIn: 0,
    },
  ],
  edges: [],
};

describe("scoreDocument()", () => {
  it("increases score for nodes with high fan-in", () => {
    const hotspots: HotspotRecord[] = [];
    const scored = scoreDocument(BASE_DOC, hotspots, "balanced");
    const payment = scored.nodes.find((n) => n.id === "payment-service")!;
    // Formula: LLM(60)*0.5 + fanIn(5->50)*0.25 + testPenalty(100)*0.10 = 52.5 ≈ 53
    // Score is boosted above a pure LLM-only estimate (30) by static signals
    expect(payment.riskScore).toBeGreaterThan(50);
  });

  it("keeps low-risk utility nodes low", () => {
    const hotspots: HotspotRecord[] = [];
    const scored = scoreDocument(BASE_DOC, hotspots, "balanced");
    const logger = scored.nodes.find((n) => n.id === "logger")!;
    expect(logger.riskScore).toBeLessThan(30);
  });

  it("amplifies scores in strict mode", () => {
    const hotspots: HotspotRecord[] = [];
    const balanced = scoreDocument(BASE_DOC, hotspots, "balanced");
    const strict = scoreDocument(BASE_DOC, hotspots, "strict");
    const balancedPayment = balanced.nodes.find((n) => n.id === "payment-service")!;
    const strictPayment = strict.nodes.find((n) => n.id === "payment-service")!;
    expect(strictPayment.riskScore!).toBeGreaterThan(balancedPayment.riskScore!);
  });

  it("reduces scores in lenient mode", () => {
    const hotspots: HotspotRecord[] = [];
    const balanced = scoreDocument(BASE_DOC, hotspots, "balanced");
    const lenient = scoreDocument(BASE_DOC, hotspots, "lenient");
    const balancedPayment = balanced.nodes.find((n) => n.id === "payment-service")!;
    const lenientPayment = lenient.nodes.find((n) => n.id === "payment-service")!;
    expect(lenientPayment.riskScore!).toBeLessThan(balancedPayment.riskScore!);
  });

  it("caps scores at 100", () => {
    const hotspots: HotspotRecord[] = [
      { filePath: "payment-service", touchCount: 100, lastTouchedAt: new Date().toISOString() },
    ];
    const veryHighDoc: GraphDocument = {
      ...BASE_DOC,
      nodes: [{ ...BASE_DOC.nodes[0], riskScore: 95, fanIn: 15 }],
    };
    const scored = scoreDocument(veryHighDoc, hotspots, "strict");
    expect(scored.nodes[0].riskScore).toBeLessThanOrEqual(100);
  });

  it("returns scores as integers", () => {
    const scored = scoreDocument(BASE_DOC, [], "balanced");
    for (const node of scored.nodes) {
      expect(Number.isInteger(node.riskScore)).toBe(true);
    }
  });
});

describe("buildSummaryStats()", () => {
  it("counts deltas correctly", () => {
    const doc: GraphDocument = {
      ...BASE_DOC,
      nodes: [
        { ...BASE_DOC.nodes[0], delta: "new" },
        { ...BASE_DOC.nodes[0], id: "b", delta: "modified" },
        { ...BASE_DOC.nodes[0], id: "c", delta: "removed" },
      ],
    };
    const stats = buildSummaryStats(doc);
    expect(stats.newCount).toBe(1);
    expect(stats.modifiedCount).toBe(1);
    expect(stats.removedCount).toBe(1);
  });

  it("computes overall risk as average", () => {
    const doc: GraphDocument = {
      ...BASE_DOC,
      nodes: [
        { ...BASE_DOC.nodes[0], riskScore: 60 },
        { ...BASE_DOC.nodes[0], id: "b", riskScore: 40 },
      ],
    };
    const stats = buildSummaryStats(doc);
    expect(stats.overallRisk).toBe(50);
  });

  it("counts untested nodes", () => {
    const stats = buildSummaryStats(BASE_DOC);
    expect(stats.untestedCount).toBe(1); // only payment-service is none-in-diff
  });
});
