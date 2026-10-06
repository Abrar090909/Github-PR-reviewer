import type { DiffEvidence, GraphEdge, GraphNode } from "@contour/schema";
import { parseOptions } from "../args.js";
import { readGraphDoc } from "../document.js";
import { PrLensCliError, usageError } from "../errors.js";
import type { Terminal } from "../terminal.js";

export const USAGE = `contour explain <element-id> [graph-file]

Prints the Evidence Trace attached to a graph node or edge in a compact
human-readable tree.

  <element-id>   Id of the node or edge whose evidence to print (required)
  [graph-file]   Path to the graph document (default .contour/graph.json)

Each evidence entry is printed as:
  file:newStart-newEnd
    symbol (when present)
    reason

Exit codes follow the existing CLI conventions:
  1  unknown graph file, invalid document, unknown element id, or element
     with no evidence attached`;

const DEFAULT_GRAPH = ".contour/graph.json";

const formatRange = (ev: DiffEvidence): string => `${ev.file}:${ev.newStart}-${ev.newEnd}`;

const formatEntry = (ev: DiffEvidence, index: number, total: number): string => {
  const connector = index < total - 1 ? "├─" : "└─";
  const lines: string[] = [`${connector} ${formatRange(ev)}`];
  if (ev.symbol !== undefined) lines.push(`   symbol: ${ev.symbol}`);
  lines.push(`   reason: ${ev.reason}`);
  return lines.join("\n");
};

const formatEvidence = (id: string, kind: "node" | "edge", evidence: readonly DiffEvidence[]): string => {
  const header = `${kind} ${JSON.stringify(id)} — ${evidence.length} evidence ${evidence.length === 1 ? "entry" : "entries"}`;
  const entries = evidence.map((ev, i) => formatEntry(ev, i, evidence.length));
  return [header, ...entries].join("\n");
};

export const explainCommand = async (args: readonly string[], terminal: Terminal): Promise<void> => {
  const { positionals } = parseOptions(args, {});

  const [elementId, graphPath = DEFAULT_GRAPH] = positionals;
  if (elementId === undefined) throw usageError("expected an element id");

  const doc = await readGraphDoc(graphPath);

  const node: GraphNode | undefined = doc.nodes.find((n) => n.id === elementId);
  const edge: GraphEdge | undefined = doc.edges.find((e) => e.id === elementId);

  if (node === undefined && edge === undefined)
    throw new PrLensCliError(
      "INVALID_DOCUMENT",
      `graph has no node or edge with id ${JSON.stringify(elementId)}`,
    );

  const element = node ?? edge!;
  const kind: "node" | "edge" = node !== undefined ? "node" : "edge";
  const evidence = element.evidence ?? [];

  if (evidence.length === 0)
    throw new PrLensCliError(
      "INVALID_DOCUMENT",
      `${kind} ${JSON.stringify(elementId)} carries no evidence`,
    );

  terminal.out(formatEvidence(elementId, kind, evidence));
};
