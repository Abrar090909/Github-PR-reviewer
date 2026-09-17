import type { Flow, GraphDocument, GraphEdge, GraphNode, Lane, View, ViewScope } from "@contour/shared";

/** The slice of a document one SVG draws. */
export type ScopedGraph = {
  lanes: Lane[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  flows: Flow[];
};

export const findView = (views: readonly View[], id: string): View | undefined => {
  for (const view of views) {
    if (view.id === id) return view;
    const nested = findView(view.children ?? [], id);
    if (nested) return nested;
  }
  return undefined;
};

export const flattenViews = (views: readonly View[]): View[] =>
  views.flatMap((view) => [view, ...flattenViews(view.children ?? [])]);

/**
 * Turns a view's scope into the elements to draw.
 * Normalizes "new" delta alias → "added" for PR Lens compatibility.
 */
export const resolveScope = (doc: GraphDocument, scope: ViewScope): ScopedGraph => {
  const normalizedNodes = doc.nodes.map((n) => ({
    ...n,
    // "new" is Contour's alias for "added" — normalize for the PR Lens renderer
    delta: (n.delta === "new" ? "added" : n.delta) as GraphNode["delta"],
    // PR Lens uses "subtitle" not "sublabel"
    subtitle: (n as any).sublabel ?? (n as any).subtitle,
    // PR Lens nodes require badges array
    badges: (n as any).badges ?? [],
    // PR Lens nodes require files array
    files: n.files ?? [],
  }));
  const normalizedEdges = doc.edges.map((e, i) => ({
    ...e,
    id: e.id ?? `edge-${i}`,
    kind: e.kind ?? "other",
    delta: (e.delta ?? "unchanged") as GraphEdge["delta"],
    emphasis: (e as any).emphasis ?? "normal",
    animated: e.animated ?? false,
  }));
  const flows = doc.flows ?? [];

  switch (scope.kind) {
    case "all":
      return { lanes: [...doc.lanes], nodes: normalizedNodes, edges: normalizedEdges, flows: [...flows] };
    case "selection": {
      const selectedLanes = new Set(scope.lanes ?? []);
      const selectedEdges = new Set(scope.edges ?? []);
      const selectedFlows = new Set(scope.flows ?? []);
      const scopeFlows = flows.filter((flow) => selectedFlows.has(flow.id));

      const nodeIds = new Set<string>(scope.nodes ?? []);
      for (const node of normalizedNodes) if (selectedLanes.has(node.lane)) nodeIds.add(node.id);
      for (const edge of normalizedEdges) {
        if (!selectedEdges.has(edge.id!)) continue;
        nodeIds.add(edge.from);
        nodeIds.add(edge.to);
      }
      for (const flow of scopeFlows)
        for (const participant of flow.participants) nodeIds.add(participant.node);

      const nodes = normalizedNodes.filter((node) => nodeIds.has(node.id));
      const scopeEdgeList = (scope.edges ?? []);
      const edges =
        scopeEdgeList.length > 0
          ? normalizedEdges.filter((edge) => selectedEdges.has(edge.id!))
          : normalizedEdges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));

      const laneIds = new Set<string>(scope.lanes ?? []);
      for (const node of nodes) laneIds.add(node.lane);

      return { lanes: doc.lanes.filter((lane) => laneIds.has(lane.id)), nodes, edges, flows: scopeFlows };
    }
    default:
      throw new Error(`Unhandled view scope kind: ${(scope as any).kind}`);
  }
};
