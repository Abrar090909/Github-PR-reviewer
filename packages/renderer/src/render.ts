import type { GraphDocument, Lens, View, ViewScope } from "@contour/shared";
import { ContourRenderError } from "./errors.js";
import { findView, flattenViews, resolveScope, type ScopedGraph } from "./scope.js";
import { paletteFor, THEMES, type Theme } from "./theme.js";
import { paintArchitecture } from "./svg/architecture.js";
import { paintDataFlow } from "./svg/dataflow.js";
import { svgDocument } from "./svg/document.js";
import type { RenderAtlas } from "./atlas.js";
import type { LayoutHints } from "./layout/architecture.js";

export type { Theme, Palette } from "./theme.js";
export type { RenderAtlas } from "./atlas.js";

export type RenderOptions = {
  lens: Lens;
  theme: Theme;
  /** Id of the drill-down section to draw. Omitted renders the whole document. */
  view?: string;
  /** Optional layout hints. */
  layout?: LayoutHints;
};

export type RenderedSvg = {
  svg: string;
  width: number;
  height: number;
  lens: Lens;
  theme: Theme;
  view: string | undefined;
  animated: boolean;
  atlas: RenderAtlas;
};

const WHOLE_DOCUMENT: ViewScope = { kind: "all" };

const paint = (
  lens: Lens,
  graph: ScopedGraph,
  doc: GraphDocument,
  theme: Theme,
  layout?: LayoutHints,
): { width: number; height: number; body: string; animated: boolean; atlas: RenderAtlas } => {
  const palette = paletteFor(theme);

  switch (lens) {
    case "architecture": {
      if (graph.nodes.length === 0)
        throw new ContourRenderError("NOTHING_TO_RENDER", "no nodes are in scope for this view");
      const painting = paintArchitecture(graph, (doc as any).layout as LayoutHints | undefined ?? layout, palette);
      return { ...painting, animated: graph.edges.some((edge) => (edge as any).animated) };
    }
    case "data-flow":
    case "dataflow": {
      const flows = graph.flows ?? [];
      if (flows.length === 0)
        throw new ContourRenderError("NO_FLOW_IN_SCOPE", "the data-flow lens needs a flow to draw");
      const painting = paintDataFlow(flows, doc.nodes, palette);
      return {
        ...painting,
        animated: flows.some((flow) => flow.messages.some((message: any) => message.animated)),
      };
    }
    case "coverage":
      // Coverage lens falls back to architecture view
      if (graph.nodes.length === 0)
        throw new ContourRenderError("NOTHING_TO_RENDER", "no nodes are in scope for coverage view");
      const painting = paintArchitecture(graph, layout, palette);
      return { ...painting, animated: false };
    default:
      throw new ContourRenderError("LENS_NOT_DECLARED", `Unknown lens: ${lens}`);
  }
};

/**
 * A schema-valid GraphDocument in, one self-contained SVG out.
 *
 * Same document + options = byte-identical SVG on any machine.
 */
export const render = (doc: GraphDocument, options: RenderOptions): RenderedSvg => {
  const view =
    options.view === undefined ? undefined : requireView(doc.views ?? [], options.view);
  const scope = view?.scope ?? WHOLE_DOCUMENT;
  const graph = resolveScope(doc, scope);

  const { width, height, body, animated, atlas } = paint(
    options.lens,
    graph,
    doc,
    options.theme,
    options.layout,
  );

  const svg = svgDocument({
    width,
    height,
    palette: paletteFor(options.theme),
    title: view?.title ?? doc.title ?? "PR Architecture Diagram",
    description: view?.summary ?? doc.summary,
    body,
  });

  return {
    svg,
    width,
    height,
    lens: options.lens,
    theme: options.theme,
    view: view?.id,
    animated,
    atlas,
  };
};

const requireView = (views: readonly View[], id: string): View => {
  const view = findView(views, id);
  if (view === undefined)
    throw new ContourRenderError("UNKNOWN_VIEW", `this document has no view '${id}'`);
  return view;
};

/** Convenience: render in light theme */
export const renderLight = (doc: GraphDocument, lens: Lens = "architecture"): RenderedSvg =>
  render(doc, { lens, theme: "light" });

/** Convenience: render in dark theme */
export const renderDark = (doc: GraphDocument, lens: Lens = "architecture"): RenderedSvg =>
  render(doc, { lens, theme: "dark" });

/** All views in both themes — for comment posters */
export type RenderedPair = { light: RenderedSvg; dark: RenderedSvg };

export const renderBothThemes = (doc: GraphDocument, lens: Lens = "architecture"): RenderedPair => ({
  light: renderLight(doc, lens),
  dark: renderDark(doc, lens),
});
