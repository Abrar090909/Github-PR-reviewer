import {
  LANE_BOTTOM_PADDING,
  LANE_GAP,
  LANE_PADDING_X,
  ROW_GAP,
  TRACK_PITCH_MIN,
} from "../design.js";
import type { ScopedGraph } from "../scope.js";
import {
  layoutArchitecture,
  type ArchitectureLayout,
  type GapExpansions,
  type LayoutGrid,
  type LayoutHints,
} from "./architecture.js";
import { channelTraffic, routeEdges, type ChannelTraffic, type RoutedEdge } from "./edges.js";

/**
 * Layout and routing with the pitch floor held: any gap whose traffic would
 * compress its tracks below TRACK_PITCH_MIN is widened to exactly what that
 * traffic needs, and the graph is laid out again around the wider gap.
 */
export const relieveCongestion = (
  graph: ScopedGraph,
  hints: LayoutHints | undefined,
): { layout: ArchitectureLayout; routed: RoutedEdge[] } => {
  let expansions: GapExpansions = { corridors: new Map(), bands: new Map() };
  let layout = layoutArchitecture(graph, hints, expansions);

  for (let round = 0; round < 3; round += 1) {
    const needed = expansionsFor(channelTraffic(graph.edges, layout), layout.grid);
    if (sameExpansions(needed, expansions)) break;
    expansions = needed;
    layout = layoutArchitecture(graph, hints, expansions);
  }

  return { layout, routed: routeEdges(graph.edges, layout) };
};

const widthNeeded = (traffic: number): number =>
  (traffic - 1) * TRACK_PITCH_MIN + 12; // TRACK_CLEARANCE * 2

const CORRIDOR_WIDTH = LANE_PADDING_X * 2 + LANE_GAP;

const expansionsFor = (traffic: ChannelTraffic, grid: LayoutGrid): GapExpansions => {
  const corridors = new Map<number, number>();
  for (const [index, count] of traffic.corridors) {
    const extra = widthNeeded(count) - CORRIDOR_WIDTH;
    if (extra > 0) corridors.set(index, extra);
  }

  const bands = new Map<number, number>();
  for (const [index, count] of traffic.bands) {
    const width = index === grid.rows.length ? LANE_BOTTOM_PADDING : ROW_GAP;
    const extra = widthNeeded(count) - width;
    if (extra > 0) bands.set(index, extra);
  }

  return { corridors, bands };
};

const sameExpansions = (a: GapExpansions, b: GapExpansions): boolean =>
  sameEntries(a.corridors, b.corridors) && sameEntries(a.bands, b.bands);

const sameEntries = (a: ReadonlyMap<number, number>, b: ReadonlyMap<number, number>): boolean =>
  a.size === b.size && [...a].every(([key, value]) => b.get(key) === value);
