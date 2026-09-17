import type { GraphEdge, GraphNode } from "@contour/shared";

/**
 * Layer index per node: how far down the diagram it sits.
 * Longest path from a source. Cycles have their closing edge dropped.
 */
export const rankNodes = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  hints: Readonly<Record<string, number>>,
): Map<string, number> => {
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  for (const node of nodes) {
    forward.set(node.id, []);
    backward.set(node.id, []);
  }

  const withinGraph = edges.filter(
    (edge) => edge.from !== edge.to && forward.has(edge.from) && forward.has(edge.to),
  );
  for (const edge of withinGraph) forward.get(edge.from)?.push(edge.to);

  for (const [from, to] of forwardEdgesWithoutCycles(nodes, forward)) backward.get(to)?.push(from);

  const ranks = new Map<string, number>();
  const settle = (id: string): number => {
    const known = ranks.get(id);
    if (known !== undefined) return known;

    let rank = hints[id] ?? 0;
    for (const predecessor of backward.get(id) ?? []) rank = Math.max(rank, settle(predecessor) + 1);
    ranks.set(id, rank);
    return rank;
  };

  for (const node of nodes) settle(node.id);
  return ranks;
};

const forwardEdgesWithoutCycles = (
  nodes: readonly GraphNode[],
  forward: ReadonlyMap<string, readonly string[]>,
): [string, string][] => {
  const kept: [string, string][] = [];
  const open = new Set<string>();
  const closed = new Set<string>();

  for (const root of nodes) {
    if (closed.has(root.id)) continue;

    const stack: { id: string; next: number }[] = [{ id: root.id, next: 0 }];
    open.add(root.id);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) break;

      const successors = forward.get(frame.id) ?? [];
      if (frame.next >= successors.length) {
        open.delete(frame.id);
        closed.add(frame.id);
        stack.pop();
        continue;
      }

      const successor = successors[frame.next];
      frame.next += 1;
      if (successor === undefined || open.has(successor)) continue;

      kept.push([frame.id, successor]);
      if (closed.has(successor)) continue;

      open.add(successor);
      stack.push({ id: successor, next: 0 });
    }
  }

  return kept;
};
