import type { GraphDocument, GraphNode, HotspotRecord, Sensitivity } from "@contour/shared";
import { getRiskLevel } from "@contour/shared";

/**
 * Risk Scorer — merges LLM risk hints with static signals to produce
 * the final blast-radius score for each node.
 *
 * Formula:
 *   finalScore = clamp(
 *     llmScore * 0.5 +
 *     fanInScore * 0.25 +
 *     churnScore * 0.15 +
 *     testPenalty * 0.10
 *   , 0, 100)
 *
 * Each sub-score is normalized to 0–100 range before weighting.
 */
export function scoreDocument(
  doc: GraphDocument,
  hotspots: HotspotRecord[],
  sensitivity: Sensitivity
): GraphDocument {
  const hotspotMap = new Map(hotspots.map((h) => [h.filePath, h]));

  const scoredNodes = doc.nodes.map((node) => {
    // Don't score unchanged context neighbors
    if (node.delta === "unchanged") return node;
    const finalScore = computeBlastRadius(node, hotspotMap, sensitivity);
    return { ...node, riskScore: finalScore };
  });

  return { ...doc, nodes: scoredNodes };
}

function computeBlastRadius(
  node: GraphNode,
  hotspotMap: Map<string, HotspotRecord>,
  sensitivity: Sensitivity
): number {
  const llmScore = node.riskScore ?? 50; // LLM's initial estimate (0–100); default 50 when absent

  // Fan-in score: normalized to 0–100 (cap at 10 callers = 100%)
  const fanIn = node.fanIn ?? 0;
  const fanInScore = Math.min(fanIn / 10, 1) * 100;

  // Churn score: from hotspot history
  const hotspot = hotspotMap.get(node.id) ?? hotspotMap.get(extractFilePath(node));
  const touchCount = hotspot?.touchCount ?? 0;
  const churnScore = Math.min(touchCount / 20, 1) * 100; // cap at 20 touches = 100%

  // Test penalty: add 15 points if no test coverage in diff
  const testPenalty = node.testCoverage === "none-in-diff" ? 100 : 0;

  // Weighted combination
  const raw =
    llmScore * 0.50 +
    fanInScore * 0.25 +
    churnScore * 0.15 +
    testPenalty * 0.10;

  // Sensitivity adjustment
  const sensitivityMultiplier =
    sensitivity === "strict" ? 1.15 :
    sensitivity === "lenient" ? 0.85 :
    1.0;

  return Math.round(Math.min(Math.max(raw * sensitivityMultiplier, 0), 100));
}

function extractFilePath(node: GraphNode): string {
  return node.sublabel ?? node.id;
}

/**
 * Builds the summary stats for the PR comment header strip.
 */
export function buildSummaryStats(doc: GraphDocument): {
  newCount: number;
  modifiedCount: number;
  removedCount: number;
  overallRisk: number;
  untestedCount: number;
  top3HighRisk: GraphNode[];
} {
  const newCount = doc.nodes.filter((n) => n.delta === "added" || n.delta === "new").length;
  const modifiedCount = doc.nodes.filter((n) => n.delta === "modified").length;
  const removedCount = doc.nodes.filter((n) => n.delta === "removed").length;
  const untestedCount = doc.nodes.filter((n) => n.testCoverage === "none-in-diff").length;

  const scoredNodes = doc.nodes.filter((n) => n.riskScore !== undefined);
  const scores = scoredNodes.map((n) => n.riskScore!);
  const overallRisk = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const top3HighRisk = [...scoredNodes]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3);

  return { newCount, modifiedCount, removedCount, overallRisk, untestedCount, top3HighRisk };
}
