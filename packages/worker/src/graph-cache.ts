import type { ParsedSymbol } from "@contour/shared";
import { logger } from "./logger.js";

/**
 * A serializable representation of the whole-repo symbol graph,
 * cached in Supabase keyed by (repoFullName, baseSHA).
 *
 * Implements BACKEND_WORKING.md §2.5
 */
export interface RepoGraph {
  repoFullName: string;
  baseSha: string;
  builtAt: string; // ISO timestamp
  symbols: ParsedSymbol[];
}

type SupabaseClient = { from: (table: string) => any };

/**
 * Loads a cached whole-repo symbol graph for the given base SHA.
 * Returns null on cache miss or error.
 *
 * BACKEND_WORKING.md §2.5
 */
export async function loadCachedGraph(
  supabase: SupabaseClient,
  repoFullName: string,
  baseSha: string
): Promise<RepoGraph | null> {
  try {
    const { data, error } = await supabase
      .from("repo_graphs")
      .select("graph_data, built_at")
      .eq("repo_full_name", repoFullName)
      .eq("base_sha", baseSha)
      .single();

    if (error || !data) return null;

    logger.info({ repoFullName, baseSha }, "Loaded cached repo graph");
    return {
      repoFullName,
      baseSha,
      builtAt: data.built_at,
      symbols: (data.graph_data as { symbols: ParsedSymbol[] }).symbols,
    };
  } catch (err) {
    logger.warn({ repoFullName, baseSha, err }, "Graph cache load failed -- cache miss");
    return null;
  }
}

/**
 * Persists a freshly built whole-repo symbol graph to Supabase.
 * Uses upsert so re-builds on the same SHA are idempotent.
 *
 * BACKEND_WORKING.md §2.5
 */
export async function saveCachedGraph(
  supabase: SupabaseClient,
  graph: RepoGraph
): Promise<void> {
  try {
    const { error } = await supabase.from("repo_graphs").upsert(
      {
        repo_full_name: graph.repoFullName,
        base_sha: graph.baseSha,
        graph_data: { symbols: graph.symbols },
        built_at: graph.builtAt,
      },
      { onConflict: "repo_full_name, base_sha" }
    );

    if (error) {
      logger.warn({ error, repoFullName: graph.repoFullName }, "Failed to save graph cache");
    } else {
      logger.info(
        { repoFullName: graph.repoFullName, baseSha: graph.baseSha, symbolCount: graph.symbols.length },
        "Saved repo graph to cache"
      );
    }
  } catch (err) {
    logger.warn({ err }, "Graph cache save threw -- ignoring");
  }
}

/**
 * Merges a freshly-parsed partial set of symbols (re-parsed changed files)
 * into a previously cached graph by replacing only the updated files.
 *
 * This makes incremental updates cheap: only re-parse changed files, then
 * patch the cached symbol table. BACKEND_WORKING.md §2.5
 */
export function patchGraph(
  cachedGraph: RepoGraph,
  updatedSymbols: ParsedSymbol[],
  changedFiles: string[]
): RepoGraph {
  const changedFileSet = new Set(changedFiles);

  // Keep all cached symbols that are NOT in the changed file set
  const baseSymbols = cachedGraph.symbols.filter(
    (sym) => !changedFileSet.has(sym.filePath)
  );

  // Append the freshly-parsed symbols for the changed files
  const merged = [...baseSymbols, ...updatedSymbols];

  return {
    ...cachedGraph,
    symbols: merged,
    builtAt: new Date().toISOString(),
  };
}
