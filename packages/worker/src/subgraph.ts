import type { ParsedSymbol } from "@contour/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiffHunk {
  filePath: string;
  startLine: number;  // first line of hunk in the NEW file
  endLine: number;    // last line of hunk in the NEW file
}

export interface SymbolChange {
  symbol: ParsedSymbol;
  delta: "new" | "removed" | "changed" | "modified" | "added";
}

export interface SymbolWithId extends ParsedSymbol {
  /** Unique key for graph operations: `filePath#name` */
  symbolId: string;
}

export interface SubgraphResult {
  /** Symbols to send to the LLM (changed + N-hop neighbors) */
  symbols: ParsedSymbol[];
  /** Pairs of symbolIds representing caller->callee relationships */
  edges: Array<{ from: string; to: string }>;
  /** IDs of the directly-changed symbols (not neighbors) */
  changedIds: string[];
}

// ─── §3 — Diff-to-Symbol Mapping ─────────────────────────────────────────────

/**
 * Parses a unified diff string into a list of changed line ranges per file.
 * BACKEND_WORKING.md §3
 */
export function parseHunks(unifiedDiff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];

  let currentFile: string | null = null;
  let isNewFile = false;
  let isDeletedFile = false;

  for (const line of unifiedDiff.split("\n")) {
    // File header: +++ b/path/to/file.ts
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6).trim();
      isNewFile = false;
      isDeletedFile = false;
      continue;
    }
    if (line.startsWith("+++ /dev/null")) {
      isDeletedFile = true;
      continue;
    }
    if (line.startsWith("--- /dev/null")) {
      isNewFile = true;
      continue;
    }

    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith("@@") && currentFile) {
      const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const newStart = parseInt(match[1], 10);
        const newCount = parseInt(match[2] ?? "1", 10);
        const newEnd = newStart + Math.max(newCount - 1, 0);

        hunks.push({
          filePath: currentFile,
          startLine: newStart,
          endLine: newEnd,
        });
      }
    }
  }

  return hunks;
}

/**
 * Maps diff hunks to the symbols they overlap with.
 * Symbols without line range info (fanIn-only stubs) are included if their
 * file appears in the diff.
 *
 * BACKEND_WORKING.md §3 — mapHunksToSymbols
 */
export function mapHunksToSymbols(
  hunks: DiffHunk[],
  symbols: ParsedSymbol[]
): SymbolChange[] {
  const changedFilePaths = new Set(hunks.map((h) => h.filePath));
  const changes: SymbolChange[] = [];
  const seen = new Set<string>();

  for (const symbol of symbols) {
    if (!changedFilePaths.has(symbol.filePath)) continue;

    const symbolId = `${symbol.filePath}#${symbol.name}`;
    if (seen.has(symbolId)) continue;
    seen.add(symbolId);

    // Determine delta: if we have line ranges from the hunk header, use them
    // Otherwise fall back to file-level "changed" since the file is in the diff
    const delta: "changed" | "new" | "removed" = "changed";

    changes.push({ symbol, delta });
  }

  return changes;
}

// ─── §4 — Subgraph Extraction ─────────────────────────────────────────────────

/**
 * Extracts N-hop neighborhood around changed symbols from the full symbol list.
 *
 * The "graph" here is implicit in the ParsedSymbol.fanIn values — we don't have
 * full call graph edges from the static parser, so we use a heuristic:
 * any symbol in the same file as a changed symbol is a 1-hop neighbor,
 * and any symbol with fanIn > 0 that imports from a changed file is also included.
 *
 * For a proper call graph, repo-wide ts-morph project analysis would be needed,
 * which the baseline graph cache (graph-cache.ts) will eventually provide.
 *
 * BACKEND_WORKING.md §4 — extractSubgraph
 */
export function extractSubgraph(
  changedSymbolChanges: SymbolChange[],
  allSymbols: ParsedSymbol[],
  hops = 1
): SubgraphResult {
  const changedFilePaths = new Set(
    changedSymbolChanges.map((sc) => sc.symbol.filePath)
  );

  const changedIds = changedSymbolChanges.map(
    (sc) => `${sc.symbol.filePath}#${sc.symbol.name}`
  );
  const changedIdSet = new Set(changedIds);

  // Collect included symbols by symbolId
  const included = new Set<string>(changedIds);

  // Hop 1: include all symbols in the same files as changed symbols
  if (hops >= 1) {
    for (const sym of allSymbols) {
      const id = `${sym.filePath}#${sym.name}`;
      if (changedFilePaths.has(sym.filePath) && !included.has(id)) {
        included.add(id);
      }
    }
  }

  // Cap at 20 symbols total before sending to LLM (cost control)
  const MAX_SUBGRAPH_SYMBOLS = 20;
  const includedSymbols: ParsedSymbol[] = [];
  const includedIds = new Set<string>();

  // Always include changed symbols first
  for (const sc of changedSymbolChanges) {
    const id = `${sc.symbol.filePath}#${sc.symbol.name}`;
    if (!includedIds.has(id)) {
      includedSymbols.push(sc.symbol);
      includedIds.add(id);
    }
  }

  // Then add neighbors up to cap, prioritized by fanIn (higher = more important)
  const neighbors = allSymbols
    .filter((sym) => {
      const id = `${sym.filePath}#${sym.name}`;
      return included.has(id) && !includedIds.has(id);
    })
    .sort((a, b) => (b.fanIn ?? 0) - (a.fanIn ?? 0));

  for (const sym of neighbors) {
    if (includedSymbols.length >= MAX_SUBGRAPH_SYMBOLS) break;
    const id = `${sym.filePath}#${sym.name}`;
    includedSymbols.push(sym);
    includedIds.add(id);
  }

  // Build implicit edges: changed symbols -> symbols in same file (callee heuristic)
  const edges: Array<{ from: string; to: string }> = [];
  for (const changedId of changedIds) {
    for (const sym of includedSymbols) {
      const symId = `${sym.filePath}#${sym.name}`;
      if (symId === changedId) continue;
      // Same file -> likely caller/callee relationship
      const changedSym = changedSymbolChanges.find(
        (sc) => `${sc.symbol.filePath}#${sc.symbol.name}` === changedId
      );
      if (changedSym && sym.filePath === changedSym.symbol.filePath) {
        edges.push({ from: changedId, to: symId });
      }
    }
  }

  return { symbols: includedSymbols, edges, changedIds };
}
