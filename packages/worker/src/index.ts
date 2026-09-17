import { createClient } from "@supabase/supabase-js";
import { Octokit } from "octokit";
import { v4 as uuidv4 } from "uuid";
import type { JobPayload, GraphDocument } from "@contour/shared";
import { fetchDiff, fetchHotspots, updateHotspots } from "./diff-fetcher.js";
import { fetchRepoSnapshot, filterSourceFiles, cleanupSnapshot } from "./repo-fetcher.js";
import { parseChangedFiles } from "./parser/index.js";
import { parseHunks, mapHunksToSymbols, extractSubgraph } from "./subgraph.js";
import { scoreDocument } from "./risk-scorer.js";
import { postComment } from "./comment-poster.js";
import { GeminiProvider } from "./llm/gemini.js";
import { AnthropicProvider } from "./llm/anthropic.js";
import { OpenAIProvider } from "./llm/openai.js";
import { logger } from "./logger.js";
import { createAppAuth } from "@octokit/auth-app";

const supabase = createClient(
  process.env.SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key"
);

/**
 * Main job processor — PR Lens-style architecture diagram as primary output,
 * risk scoring as an optional post-processing overlay.
 *
 * Pipeline:
 *  1. Load installation config
 *  2. Check SHA cache (skip LLM re-billing on duplicate push)
 *  3. Create installation-scoped Octokit
 *  4. Fetch diff + PR metadata
 *  5. LLM call: diff → GraphDoc (lanes/nodes/edges/flows/views)
 *  6. Persist GraphDoc to DB
 *  7. [Best-effort] AST parse + risk scoring overlay
 *  8. Update hotspot DB
 *  9. Post / update sticky PR comment
 */
export async function processJob(payload: JobPayload): Promise<void> {
  const { jobId, installationId, repoFullName, prNumber, headSha } = payload;

  logger.info({ jobId, installationId, repoFullName, prNumber, headSha }, "Processing job");

  // ── 1. Load installation config ─────────────────────────────────────────────
  let preferredProvider: "gemini" | "openai" | "anthropic" = "gemini";
  let sensitivity: "strict" | "balanced" | "lenient" = "balanced";

  try {
    const { data: installation } = await supabase
      .from("installations")
      .select("*")
      .eq("id", installationId)
      .single();

    if (installation) {
      preferredProvider = installation.preferred_provider ?? "gemini";
      sensitivity = installation.sensitivity ?? "balanced";
    }
  } catch (err) {
    logger.warn({ err }, "Could not load installation from DB, using defaults");
  }

  // ── 2. Check SHA cache ───────────────────────────────────────────────────────
  let cached: { graph_document: GraphDocument; comment_id: number | null } | null = null;
  try {
    const { data } = await supabase
      .from("pr_analyses")
      .select("graph_document, comment_id")
      .eq("repo_full_name", repoFullName)
      .eq("head_sha", headSha)
      .single();
    cached = data;
  } catch {
    // Cache miss / DB unavailable — proceed normally
  }

  // ── 3. Create installation-scoped Octokit ────────────────────────────────────
  const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!rawPrivateKey) {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY environment variable");
  }
  const privateKey = rawPrivateKey.includes("-----BEGIN")
    ? rawPrivateKey
    : Buffer.from(rawPrivateKey, "base64").toString("utf-8");

  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Number(process.env.GITHUB_APP_ID) || process.env.GITHUB_APP_ID!,
      privateKey,
      installationId,
    },
  });

  // ── Cache hit path: re-post existing comment without re-running LLM ─────────
  if (cached) {
    logger.info({ jobId, headSha }, "Cache hit — skipping LLM call");
    await postComment({
      octokit,
      repoFullName,
      prNumber,
      existingCommentId: cached.comment_id,
      doc: cached.graph_document,
    });
    return;
  }

  // ── 4. Fetch diff + PR metadata ──────────────────────────────────────────────
  const diffResult = await fetchDiff(octokit, repoFullName, prNumber);

  const MAX_DIFF_BYTES = parseInt(process.env.MAX_DIFF_BYTES ?? "49152"); // 48 KB default
  const cappedDiff =
    Buffer.byteLength(diffResult.unifiedDiff, "utf8") > MAX_DIFF_BYTES
      ? diffResult.unifiedDiff.slice(0, MAX_DIFF_BYTES) +
        "\n[...diff truncated for cost control]"
      : diffResult.unifiedDiff;

  // ── 5. LLM call: diff → GraphDoc (architecture map) ─────────────────────────
  const provider = createLLMProvider(preferredProvider);

  let graphDoc: GraphDocument;
  try {
    graphDoc = await provider.analyze({
      diff: cappedDiff,
      changedFiles: diffResult.changedFiles,
      filesChanged: diffResult.changedFiles.length,
      additions: diffResult.additions,
      deletions: diffResult.deletions,
      repoFullName,
      prNumber,
      prTitle: diffResult.prTitle,
      headRef: diffResult.headRef,
      baseSha: diffResult.baseSha,
      headSha,
    });

    // Stamp the stats from the real diff (LLM-emitted ones are discarded)
    graphDoc = {
      ...graphDoc,
      stats: {
        ...(graphDoc.stats ?? {}),
        filesChanged: diffResult.changedFiles.length,
        additions: diffResult.additions,
        deletions: diffResult.deletions,
      },
    };
  } catch (err) {
    logger.error({ err }, "LLM analysis failed — using degraded render");
    graphDoc = buildDegradedDocument(diffResult.prTitle, diffResult.changedFiles);
  }

  // ── 6. Persist base GraphDoc ─────────────────────────────────────────────────
  const analysisId = uuidv4();
  try {
    await supabase.from("pr_analyses").upsert(
      {
        id: analysisId,
        installation_id: installationId,
        repo_full_name: repoFullName,
        pr_number: prNumber,
        head_sha: headSha,
        graph_document: graphDoc,
        comment_id: diffResult.existingCommentId,
      },
      { onConflict: "repo_full_name, head_sha" }
    );
  } catch {
    // Non-critical in local dev
  }

  // ── 7. Best-effort risk scoring overlay ──────────────────────────────────────
  // AST parsing + hotspot lookup runs after the diagram is built.
  // If it fails, the comment still posts — just without risk chips.
  try {
    const tokenResp = await octokit.auth({ type: "installation" }) as { token: string };
    const prData = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner: repoFullName.split("/")[0],
      repo: repoFullName.split("/")[1],
      pull_number: prNumber,
    });
    const headRef = prData.data.head.ref;

    const repoDir = await fetchRepoSnapshot(tokenResp.token, repoFullName, headRef);
    try {
      const filteredFiles = await filterSourceFiles(repoDir, diffResult.changedFiles);
      const symbols = await parseChangedFiles(filteredFiles, repoDir).catch(() => []);

      const hunks = parseHunks(diffResult.unifiedDiff);
      const symbolChanges = mapHunksToSymbols(hunks, symbols);
      const subgraph = extractSubgraph(
        symbolChanges.length > 0
          ? symbolChanges
          : symbols.slice(0, 10).map((s) => ({ symbol: s, delta: "modified" as const })),
        symbols,
        1
      );

      const hotspots = await fetchHotspots(supabase, installationId, repoFullName, diffResult.changedFiles);

      // Enrich nodes with fanIn + churnScore from static analysis
      const enrichedNodes = graphDoc.nodes.map((node) => {
        const match = subgraph.symbols.find(
          (s) => s.name === node.label || s.filePath.includes(node.sublabel ?? "")
        );
        const hotspot = hotspots.find((h) => h.filePath.includes(node.sublabel ?? ""));
        return {
          ...node,
          fanIn: match?.fanIn,
          churnScore: hotspot ? Math.min(hotspot.touchCount / 20, 1) * 100 : undefined,
          testCoverage: node.testCoverage ?? (match?.hasTestReference ? "covered" : "none-in-diff"),
        };
      });

      graphDoc = scoreDocument({ ...graphDoc, nodes: enrichedNodes }, hotspots, sensitivity);
    } finally {
      await cleanupSnapshot(repoDir);
    }
  } catch (err) {
    logger.warn({ err }, "Best-effort risk scoring failed — diagram posts without risk scores");
  }

  // ── 8. Update hotspot DB ──────────────────────────────────────────────────────
  await updateHotspots(supabase, installationId, repoFullName, diffResult.changedFiles);

  // ── 9. Post comment ──────────────────────────────────────────────────────
  const commentId = await postComment({
    octokit,
    repoFullName,
    prNumber,
    existingCommentId: diffResult.existingCommentId,
    doc: graphDoc,
  });

  // Store comment ID
  try {
    await supabase
      .from("pr_analyses")
      .update({ comment_id: commentId, graph_document: graphDoc })
      .eq("id", analysisId);
  } catch {
    // Non-critical
  }

  logger.info({ jobId, commentId }, "Job complete");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createLLMProvider(preferred: "gemini" | "openai" | "anthropic") {
  switch (preferred) {
    case "gemini": return new GeminiProvider();
    case "openai": return new OpenAIProvider();
    default: return new AnthropicProvider();
  }
}

/** Minimal fallback when LLM completely fails — shows file list as nodes. */
function buildDegradedDocument(prTitle: string, changedFiles: string[]): GraphDocument {
  return {
    schemaVersion: "1",
    kind: "graph",
    title: prTitle || "PR Analysis",
    summary: "LLM analysis unavailable — showing file-level summary.",
    lenses: ["architecture"],
    lanes: [{ id: "files", label: "Changed Files" }],
    nodes: changedFiles.slice(0, 20).map((f, i) => ({
      id: `file-${i}`,
      label: f.split("/").pop() ?? f,
      sublabel: f,
      kind: "module" as const,
      delta: "modified" as const,
      lane: "files",
    })),
    edges: [],
    stats: { filesChanged: changedFiles.length },
  };
}
