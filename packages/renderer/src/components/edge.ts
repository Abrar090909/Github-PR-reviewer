import type { GraphEdge, GraphNode } from "@contour/shared";
import { FLOW_DOT_DURATION, FLOW_DOT_RADIUS } from "@contour/shared";
import type { NodePosition } from "../layout/grid-lane.js";
import { getEdgePort } from "../layout/grid-lane.js";

export interface EdgeRenderOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: Map<string, NodePosition>;
  theme: "light" | "dark";
}

/**
 * Renders all edges as SVG paths + animateMotion flow-dots.
 *
 * Rules (per UI/UX spec §3.3):
 * - Solid lines by default (1.5px)
 * - Dashed strokes ONLY for "removed" connections
 * - FlowDot animates ONLY on edges touching a "new" or "modified" node
 * - Static edges between two untouched nodes rendered without motion
 */
export function renderEdges(opts: EdgeRenderOptions): string {
  const { nodes, edges, positions, theme } = opts;

  const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));
  const edgeColor = theme === "dark" ? "#4B5563" : "#D1D5DB";
  const dotColor = theme === "dark" ? "#60A5FA" : "#3B82F6";

  const parts: string[] = [];

  // Defs: arrowhead marker
  parts.push(`<defs>
  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3 z" fill="${edgeColor}"/>
  </marker>
</defs>`);

  for (const edge of edges) {
    const fromPos = positions.get(edge.from);
    const toPos = positions.get(edge.to);
    if (!fromPos || !toPos) continue;

    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);

    const isRemoved = fromNode?.delta === "removed" || toNode?.delta === "removed";
    const isActive =
      fromNode?.delta === "new" ||
      fromNode?.delta === "modified" ||
      toNode?.delta === "new" ||
      toNode?.delta === "modified";

    const [x1, y1] = getEdgePort(fromPos, "right");
    const [x2, y2] = getEdgePort(toPos, "left");

    // Bezier control points for smooth curves
    const cpDx = Math.abs(x2 - x1) * 0.5;
    const pathD = `M ${x1} ${y1} C ${x1 + cpDx} ${y1}, ${x2 - cpDx} ${y2}, ${x2} ${y2}`;

    const strokeDash = isRemoved ? 'stroke-dasharray="6,3"' : "";

    parts.push(
      `<path d="${pathD}" fill="none" stroke="${edgeColor}" stroke-width="1.5" ` +
      `${strokeDash} marker-end="url(#arrowhead)" opacity="0.7"/>`
    );

    // Edge label
    if (edge.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 8;
      const labelColor = theme === "dark" ? "#8B949E" : "#6B7280";
      parts.push(
        `<text x="${midX}" y="${midY}" font-family="JetBrains Mono, monospace" ` +
        `font-size="9" fill="${labelColor}" text-anchor="middle">${escapeXml(edge.label ?? "")}</text>`
      );
    }

    // FlowDot — only on active edges (touching new/modified nodes)
    if (isActive) {
      parts.push(`<circle r="${FLOW_DOT_RADIUS}" fill="${dotColor}" opacity="0.9">
  <animateMotion dur="${FLOW_DOT_DURATION}" repeatCount="indefinite" rotate="auto">
    <mpath href="#path-${edge.from}-${edge.to}"/>
  </animateMotion>
</circle>
<path id="path-${edge.from}-${edge.to}" d="${pathD}" fill="none" stroke="none"/>`);
    }
  }

  return parts.join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
