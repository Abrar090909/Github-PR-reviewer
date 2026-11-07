import type { GraphDoc } from "@contour/schema";

/**
 * The schema draws an edge still unless the document asks for a pulse, and a
 * model rarely asks, which leaves the architecture view a still picture with
 * no data moving through it. When a document marks no edge as animated, every
 * live edge pulses; a removed edge stays still, because nothing flows through
 * code that is gone. A document that chose its pulses keeps them.
 */
export function withMotion(graph: GraphDoc): GraphDoc {
  if (graph.edges.some((edge) => edge.animated)) return graph;
  return { ...graph, edges: graph.edges.map((edge) => ({ ...edge, animated: edge.delta !== "removed" })) };
}
