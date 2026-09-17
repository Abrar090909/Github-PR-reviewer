import { PILL_CLEARANCE, PILL_HEIGHT, PILL_PADDING_X, PILL_TEXT_SIZE } from "../design.js";
import type { Box, Point } from "../geometry.js";
import { measure } from "../text.js";
import type { Curve, RoutedEdge } from "./edges.js";

type Size = { width: number; height: number };

type Run = {
  axis: "x" | "y";
  cross: number;
  lo: number;
  hi: number;
};

const EPSILON = 0.01;

const longestRun = (curve: Curve): Run | undefined => {
  let best: { run: Run; length: number } | undefined;
  let start = curve.from;
  for (const segment of curve.segments) {
    const end = segment.to;
    if (segment.kind === "line") {
      const horizontal = Math.abs(end.y - start.y) < EPSILON;
      const [lo, hi] = horizontal
        ? [Math.min(start.x, end.x), Math.max(start.x, end.x)]
        : [Math.min(start.y, end.y), Math.max(start.y, end.y)];
      if (best === undefined || hi - lo > best.length)
        best = {
          run: { axis: horizontal ? "x" : "y", cross: horizontal ? start.y : start.x, lo, hi },
          length: hi - lo,
        };
    }
    start = end;
  }
  return best?.run;
};

const centred = (centre: Point, size: Size): Box => ({
  x: centre.x - size.width / 2,
  y: centre.y - size.height / 2,
  width: size.width,
  height: size.height,
});

const centreOn = (run: Run, along: number): Point => {
  switch (run.axis) {
    case "x": return { x: along, y: run.cross };
    case "y": return { x: run.cross, y: along };
    default: throw new Error(`Unhandled run axis: ${run.axis}`);
  }
};

const collides = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width + PILL_CLEARANCE &&
  b.x < a.x + a.width + PILL_CLEARANCE &&
  a.y < b.y + b.height + PILL_CLEARANCE &&
  b.y < a.y + a.height + PILL_CLEARANCE;

const slideAlong = (
  run: Run,
  size: Size,
  settled: readonly Box[],
  reach: number,
): number | undefined => {
  const halfAlong = (run.axis === "x" ? size.width : size.height) / 2;
  const preferred = (run.lo + run.hi) / 2;
  const lo = Math.min(run.lo + halfAlong - reach, preferred);
  const hi = Math.max(run.hi - halfAlong + reach, preferred);

  const blocked = settled.flatMap((box) => {
    const [alongLo, alongHi, crossLo, crossHi] =
      run.axis === "x"
        ? [box.x, box.x + box.width, box.y, box.y + box.height]
        : [box.y, box.y + box.height, box.x, box.x + box.width];
    const halfCross = (run.axis === "x" ? size.height : size.width) / 2;
    if (run.cross - halfCross >= crossHi + PILL_CLEARANCE) return [];
    if (run.cross + halfCross <= crossLo - PILL_CLEARANCE) return [];
    return [{ from: alongLo - PILL_CLEARANCE - halfAlong, to: alongHi + PILL_CLEARANCE + halfAlong }];
  });

  let best: number | undefined;
  const consider = (candidate: number) => {
    if (candidate < lo || candidate > hi) return;
    if (blocked.some((b) => b.from < candidate && candidate < b.to)) return;
    if (
      best === undefined ||
      Math.abs(candidate - preferred) < Math.abs(best - preferred) ||
      (Math.abs(candidate - preferred) === Math.abs(best - preferred) && candidate < best)
    )
      best = candidate;
  };

  consider(preferred);
  for (const b of blocked) {
    consider(b.from);
    consider(b.to);
  }
  return best;
};

const stepAside = (anchor: Point, axis: "x" | "y", size: Size, settled: readonly Box[]): Box => {
  const step = (axis === "x" ? size.height : size.width) + PILL_CLEARANCE;
  for (let k = 1; ; k += 1)
    for (const sign of [-1, 1]) {
      const centre =
        axis === "x"
          ? { x: anchor.x, y: anchor.y + sign * k * step }
          : { x: anchor.x + sign * k * step, y: anchor.y };
      const box = centred(centre, size);
      if (!settled.some((other) => collides(box, other))) return box;
    }
};

const settle = (
  curve: Curve,
  anchor: Point,
  size: Size,
  settled: readonly Box[],
): Box => {
  const run = longestRun(curve);
  if (run !== undefined)
    for (const reach of [0, PILL_HEIGHT]) {
      const along = slideAlong(run, size, settled, reach);
      if (along !== undefined) return centred(centreOn(run, along), size);
    }

  const atAnchor = centred(anchor, size);
  if (!settled.some((other) => collides(atAnchor, other))) return atAnchor;
  return stepAside(anchor, run?.axis ?? "x", size, settled);
};

export const placeLabelPills = (routed: readonly RoutedEdge[]): Map<string, Box> => {
  const settled: Box[] = [];
  const boxes = new Map<string, Box>();

  for (const { edge, curve, labelAnchor } of routed) {
    if (edge.label === undefined || labelAnchor === undefined) continue;
    const size = {
      width: measure(edge.label, "sans-bold", PILL_TEXT_SIZE) + PILL_PADDING_X * 2,
      height: PILL_HEIGHT,
    };
    const box = settle(curve, labelAnchor, size, settled);
    settled.push(box);
    boxes.set(edge.id!, box);
  }

  return boxes;
};
