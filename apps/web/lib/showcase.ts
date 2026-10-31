import "server-only";
import { render, type RenderOptions } from "@contour/renderer";
import { postmarkRefactorGraph as graph } from "@contour/schema/examples";

/**
 * The landing page shows what the renderer really draws, not a mock of it:
 * the bundled postmark-refactor document, rendered at build time by the same
 * engine that posts PR comments. Each SVG is served as its own static file
 * (see app/diagrams), so it caches, loads lazily below the fold, and keeps its
 * own styles and ids inside it the way GitHub shows it.
 */

export type Diagram = {
  src: string;
  /** The same diagram in the renderer's light theme. */
  srcLight: string;
  width: number;
  height: number;
  alt: string;
};

const SOURCES = {
  overview: { lens: "architecture", view: "overview", alt: "Architecture of the change across three lanes" },
  "new-batch-path": { lens: "architecture", view: "new-batch-path", alt: "Architecture of the new batch sending path" },
  "send-pipeline": { lens: "data-flow", view: "send-pipeline-view", alt: "Data flow of sending a broadcast" },
} as const satisfies Record<string, Pick<RenderOptions, "lens" | "view"> & { alt: string }>;

export type DiagramName = keyof typeof SOURCES;
export const DIAGRAM_NAMES = Object.keys(SOURCES) as DiagramName[];

export const renderDiagram = (name: DiagramName, theme: "dark" | "light" = "dark") => {
  const { lens, view } = SOURCES[name];
  return render(graph, { lens, view, theme });
};

const diagram = (name: DiagramName): Diagram => {
  const { width, height } = renderDiagram(name);
  return { src: `/diagrams/${name}.svg`, srcLight: `/diagrams/${name}-light.svg`, width, height, alt: SOURCES[name].alt };
};

const views: Record<string, Diagram> = {
  overview: diagram("overview"),
  "new-batch-path": diagram("new-batch-path"),
};
const flows: Record<string, Diagram> = {
  "send-pipeline": diagram("send-pipeline"),
};

const DELTA_WORD = { added: "added", modified: "changed", removed: "removed", unchanged: "unchanged" } as const;

export const example = {
  title: graph.title,
  summary: graph.summary,
  stats: graph.stats,
  pullRequest: graph.provenance.pullRequest,
  architecture: views.overview!,
  focused: views["new-batch-path"]!,
  dataFlow: flows["send-pipeline"]!,
  /** The diagram as text, for anyone who cannot see it. */
  parts: graph.nodes.map((node) => ({
    label: node.label,
    delta: DELTA_WORD[node.delta],
    lane: graph.lanes.find((lane) => lane.id === node.lane)?.label ?? "",
  })),
  connections: graph.edges.map((edge) => ({
    from: graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from,
    to: graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to,
    label: edge.label,
  })),
  files: graph.nodes
    .flatMap((node) => node.files.map((file) => ({ path: file.path, delta: node.delta })))
    .filter((file, index, all) => all.findIndex((other) => other.path === file.path) === index),
  steps: (graph.walkthrough?.steps ?? []).flatMap((step) => {
    const stage = step.stage?.kind === "flow" ? flows[step.stage.flow] : views[step.stage?.view ?? "overview"];
    return stage ? [{ id: step.id, heading: step.heading, body: step.body, diagram: stage }] : [];
  }),
};
