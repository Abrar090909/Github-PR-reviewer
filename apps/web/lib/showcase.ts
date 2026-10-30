import "server-only";
import { render, type RenderOptions } from "@contour/renderer";
import { postmarkRefactorGraph as graph } from "@contour/schema/examples";

/**
 * The landing page shows what the renderer really draws, not a mock of it:
 * the bundled postmark-refactor document, rendered at build time by the same
 * engine that posts PR comments. Each SVG goes in as an image, the way GitHub
 * shows it, so its own styles and ids stay inside it and its pulses still run.
 */

export type Diagram = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const diagram = (options: Pick<RenderOptions, "lens" | "view">, alt: string): Diagram => {
  const { svg, width, height } = render(graph, { ...options, theme: "dark" });
  return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width, height, alt };
};

const views: Record<string, Diagram> = {
  overview: diagram({ lens: "architecture", view: "overview" }, "Architecture of the change across three lanes"),
  "new-batch-path": diagram({ lens: "architecture", view: "new-batch-path" }, "The new batch sending path"),
};
const flows: Record<string, Diagram> = {
  "send-pipeline": diagram({ lens: "data-flow", view: "send-pipeline-view" }, "Data flow of sending a broadcast"),
};

export const example = {
  title: graph.title,
  summary: graph.summary,
  stats: graph.stats,
  pullRequest: graph.provenance.pullRequest,
  architecture: views.overview!,
  dataFlow: flows["send-pipeline"]!,
  steps: (graph.walkthrough?.steps ?? []).flatMap((step) => {
    const stage = step.stage?.kind === "flow" ? flows[step.stage.flow] : views[step.stage?.view ?? "overview"];
    return stage ? [{ id: step.id, heading: step.heading, body: step.body, diagram: stage }] : [];
  }),
};
