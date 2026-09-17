import type { GraphDocument, GraphNode, Lane } from "@contour/shared";
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  NODE_GAP,
  LANE_GAP,
  DIAGRAM_PADDING,
  MONOREPO_LANE_COLLAPSE_THRESHOLD,
} from "@contour/shared";

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaneLayout {
  id: string;
  label: string;
  x: number;
  width: number;
  contentY: number;
  contentHeight: number;
}

export interface LayoutResult {
  nodePositions: Map<string, NodePosition>;
  laneLayouts: LaneLayout[];
  totalWidth: number;
  totalHeight: number;
  isCollapsed: boolean;
  collapseSummary: LaneSummary[] | null;
}

export interface LaneSummary {
  laneId: string;
  laneLabel: string;
  newCount: number;
  modifiedCount: number;
  removedCount: number;
}

const LANE_HEADER_HEIGHT = 36;
const LANE_BOTTOM_PADDING = 24;

export function computeLayout(doc: GraphDocument): LayoutResult {
  const activeLaneIds = new Set(doc.nodes.map((n) => n.lane));
  const usedLanes = doc.lanes.filter((l) => activeLaneIds.has(l.id));

  // Monorepo collapse: 6+ lanes → summary view
  if (usedLanes.length >= MONOREPO_LANE_COLLAPSE_THRESHOLD) {
    const summary = buildCollapseSummary(doc, usedLanes);
    return {
      nodePositions: new Map(),
      laneLayouts: [],
      totalWidth: 0,
      totalHeight: 0,
      isCollapsed: true,
      collapseSummary: summary,
    };
  }

  // Single-node compact: no lane headers
  if (doc.nodes.length === 1) {
    return buildSingleNodeLayout(doc.nodes[0]);
  }

  return buildFullLayout(doc, usedLanes);
}

function buildCollapseSummary(doc: GraphDocument, lanes: Lane[]): LaneSummary[] {
  return lanes.map((lane) => {
    const laneNodes = doc.nodes.filter((n) => n.lane === lane.id);
    return {
      laneId: lane.id,
      laneLabel: lane.label,
      newCount: laneNodes.filter((n) => n.delta === "new" || n.delta === "added").length,
      modifiedCount: laneNodes.filter((n) => n.delta === "modified").length,
      removedCount: laneNodes.filter((n) => n.delta === "removed").length,
    };
  });
}

function buildSingleNodeLayout(node: GraphNode): LayoutResult {
  const positions = new Map<string, NodePosition>();
  positions.set(node.id, {
    x: DIAGRAM_PADDING,
    y: DIAGRAM_PADDING,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  });
  return {
    nodePositions: positions,
    laneLayouts: [],
    totalWidth: NODE_WIDTH + DIAGRAM_PADDING * 2,
    totalHeight: NODE_HEIGHT + DIAGRAM_PADDING * 2,
    isCollapsed: false,
    collapseSummary: null,
  };
}

function buildFullLayout(doc: GraphDocument, usedLanes: Lane[]): LayoutResult {
  const positions = new Map<string, NodePosition>();
  const laneLayouts: LaneLayout[] = [];

  // Group nodes by lane, preserve order
  const nodesByLane = new Map<string, GraphNode[]>();
  for (const lane of usedLanes) {
    nodesByLane.set(
      lane.id,
      doc.nodes.filter((n) => n.lane === lane.id)
    );
  }

  let currentX = DIAGRAM_PADDING;
  let maxColumnHeight = 0;

  for (const lane of usedLanes) {
    const laneNodes = nodesByLane.get(lane.id) ?? [];
    const columnHeight =
      laneNodes.length * (NODE_HEIGHT + NODE_GAP) - NODE_GAP + LANE_HEADER_HEIGHT + LANE_BOTTOM_PADDING;
    maxColumnHeight = Math.max(maxColumnHeight, columnHeight);

    laneLayouts.push({
      id: lane.id,
      label: lane.label,
      x: currentX,
      width: NODE_WIDTH,
      contentY: DIAGRAM_PADDING + LANE_HEADER_HEIGHT,
      contentHeight: columnHeight,
    });

    laneNodes.forEach((node, idx) => {
      positions.set(node.id, {
        x: currentX,
        y: DIAGRAM_PADDING + LANE_HEADER_HEIGHT + idx * (NODE_HEIGHT + NODE_GAP),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    currentX += NODE_WIDTH + LANE_GAP;
  }

  const totalWidth = currentX - LANE_GAP + DIAGRAM_PADDING;
  const totalHeight = maxColumnHeight + DIAGRAM_PADDING * 2;

  return {
    nodePositions: positions,
    laneLayouts,
    totalWidth,
    totalHeight,
    isCollapsed: false,
    collapseSummary: null,
  };
}

/** Computes the midpoint of a node's edge connection port (right or left side). */
export function getEdgePort(
  pos: NodePosition,
  side: "left" | "right" | "center"
): [number, number] {
  const cy = pos.y + pos.height / 2;
  switch (side) {
    case "left": return [pos.x, cy];
    case "right": return [pos.x + pos.width, cy];
    case "center": return [pos.x + pos.width / 2, pos.y + pos.height / 2];
  }
}
