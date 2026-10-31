import "server-only";

import { render, type Box, type RenderAtlas } from "@contour/renderer";
import type { GraphDoc, Lens, View } from "@contour/schema";
import { diffLink, readFirst, type FocusFile } from "./focus";
import type { Finding, Review } from "./review";

/** One diagram the page can show: a drill-down view, or a whole lens when there are none. */
export type Stage = {
  key: string;
  title: string;
  summary?: string;
  lens: Lens;
  width: number;
  height: number;
  dark: string;
  light: string;
  /** Clickable parts, in the stage's own coordinates. */
  parts: { id: string; box: Box }[];
};

export type Step = { heading: string; body: string; stage: number; boxes: Box[] };

export type PartLink = { label: string; href: string; detail?: string };

export type Part = {
  id: string;
  label: string;
  kind: string;
  delta: string;
  lane?: string;
  subtitle?: string;
  summary?: string;
  connections: { direction: "in" | "out"; other: string; label?: string }[];
  lines: PartLink[];
  findings: string[];
};

export type MapModel = {
  title: string;
  summary?: string;
  repo: string;
  prNumber: number;
  prUrl: string;
  headSha: string;
  stats: { files?: number; additions?: number; deletions?: number };
  stages: Stage[];
  steps: Step[];
  parts: Record<string, Part>;
  findings: Finding[];
  reviewStatus: Review["status"] | "none";
  readFirst: (FocusFile & { href: string })[];
};

const flatten = (views: readonly View[]): View[] => views.flatMap((view) => [view, ...flatten(view.children)]);

const dataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const union = (boxes: Box[]): Box | undefined => {
  if (boxes.length === 0) return undefined;
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
};

function drawStage(graph: GraphDoc, key: string, title: string, lens: Lens, view?: string, summary?: string) {
  const dark = render(graph, { lens, theme: "dark", view });
  const light = render(graph, { lens, theme: "light", view });
  return {
    stage: {
      key,
      title,
      summary,
      lens,
      width: dark.width,
      height: dark.height,
      dark: dataUri(dark.svg),
      light: dataUri(light.svg),
      parts: Object.entries(dark.atlas.nodes).map(([id, box]) => ({ id, box })),
    } satisfies Stage,
    atlas: dark.atlas,
  };
}

export function buildMap(
  graph: GraphDoc,
  review: Review | null,
  meta: { repo: string; prNumber: number; headSha: string },
): MapModel {
  const drawn: { stage: Stage; atlas: RenderAtlas; view?: string }[] = [];
  const views = flatten(graph.views);
  for (const view of views) {
    try {
      drawn.push({ ...drawStage(graph, `view=${view.id}`, view.title, view.lens, view.id, view.summary), view: view.id });
    } catch {
      // A view the renderer cannot draw (nothing in scope) is left out, not fatal.
    }
  }
  for (const lens of graph.lenses) {
    if (drawn.some((entry) => entry.stage.lens === lens)) continue;
    if (lens === "data-flow" && graph.flows.length === 0) continue;
    try {
      drawn.push(drawStage(graph, lens, lens === "architecture" ? "Architecture" : "Data flow", lens));
    } catch {
      // Same as above.
    }
  }

  const stageForFlow = (flow: string) => {
    const index = drawn.findIndex((entry) => entry.atlas.messages[flow] !== undefined);
    return index >= 0 ? index : drawn.findIndex((entry) => entry.stage.lens === "data-flow");
  };

  let current = 0;
  const steps: Step[] = (graph.walkthrough?.steps ?? []).flatMap((step) => {
    const stage = step.stage;
    if (stage?.kind === "view") current = Math.max(0, drawn.findIndex((entry) => entry.view === stage.view));
    if (stage?.kind === "flow") current = Math.max(0, stageForFlow(stage.flow));
    const entry = drawn[current];
    if (!entry) return [];
    const { atlas } = entry;
    const boxes: Box[] = [];
    if (step.focus.kind === "selection") {
      for (const id of step.focus.lanes) if (atlas.lanes[id]) boxes.push(atlas.lanes[id]);
      for (const id of step.focus.nodes) if (atlas.nodes[id]) boxes.push(atlas.nodes[id]);
      for (const id of step.focus.edges) if (atlas.edges[id]) boxes.push(atlas.edges[id]);
      const flow = step.stage?.kind === "flow" ? step.stage.flow : undefined;
      for (const id of step.focus.messages) {
        const box = flow ? atlas.messages[flow]?.[id] : Object.values(atlas.messages).find((steps) => steps[id])?.[id];
        if (box) boxes.push(box);
      }
    } else if (step.stage?.kind === "flow") {
      const whole = union(Object.values(atlas.messages[step.stage.flow] ?? {}));
      if (whole) boxes.push(whole);
    }
    return [{ heading: step.heading, body: step.body, stage: current, boxes }];
  });

  const findings = review?.status === "complete" ? review.findings : [];
  const labels = new Map(graph.nodes.map((node) => [node.id, node.label]));
  const lanes = new Map(graph.lanes.map((lane) => [lane.id, lane.label]));
  const link = (path: string, line?: number) => diffLink(meta.repo, meta.prNumber, path, line);

  const parts = Object.fromEntries(
    graph.nodes.map((node) => {
      const lines: PartLink[] = [
        ...(node.evidence ?? []).map((item) => ({
          label: `${item.file}:${item.newStart}${item.newEnd > item.newStart ? `-${item.newEnd}` : ""}`,
          href: link(item.file, item.newStart),
          detail: item.symbol ? `${item.symbol} — ${item.reason}` : item.reason,
        })),
        ...node.files
          .filter((ref) => !(node.evidence ?? []).some((item) => item.file === ref.path))
          .map((ref) => ({
            label: ref.startLine ? `${ref.path}:${ref.startLine}${ref.endLine && ref.endLine > ref.startLine ? `-${ref.endLine}` : ""}` : ref.path,
            href: link(ref.path, ref.startLine),
          })),
      ];
      const part: Part = {
        id: node.id,
        label: node.label,
        kind: node.kind,
        delta: node.delta,
        lane: lanes.get(node.lane),
        subtitle: node.subtitle,
        summary: node.summary,
        connections: graph.edges
          .filter((edge) => edge.from === node.id || edge.to === node.id)
          .map((edge) => ({
            direction: edge.from === node.id ? ("out" as const) : ("in" as const),
            other: labels.get(edge.from === node.id ? edge.to : edge.from) ?? "",
            label: edge.label,
          })),
        lines,
        findings: findings.filter((finding) => finding.nodes.includes(node.id)).map((finding) => finding.fingerprint),
      };
      return [node.id, part];
    }),
  );

  return {
    title: graph.title,
    summary: graph.summary,
    repo: meta.repo,
    prNumber: meta.prNumber,
    prUrl: `https://github.com/${meta.repo}/pull/${meta.prNumber}`,
    headSha: meta.headSha,
    stats: { files: graph.stats?.filesChanged, additions: graph.stats?.additions, deletions: graph.stats?.deletions },
    stages: drawn.map((entry) => entry.stage),
    steps,
    parts,
    findings,
    reviewStatus: review?.status ?? "none",
    readFirst: readFirst(graph, findings).map((file) => ({ ...file, href: link(file.path) })),
  };
}
