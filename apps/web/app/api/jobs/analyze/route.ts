import { createHash, randomBytes } from "node:crypto";
import { renderAll } from "@contour/renderer";
import type { GraphDoc, RenderManifest } from "@contour/schema";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createInstallationOctokit } from "@/lib/github";
import { analyzePullRequest, fetchPullRequestDiff } from "@/lib/hosted/analysis";
import { COMMENT_MARKER, composeHostedComment } from "@/lib/hosted/comment";
import {
  appBaseUrl,
  verifyQStashRequest,
  type AnalysisJob,
} from "@/lib/hosted/queue";
import { createRateLimiter } from "@/lib/rate-limiter";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const maxDuration = 300;

const isSha = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);

function parseJob(value: unknown): AnalysisJob {
  if (typeof value !== "object" || value === null) throw new Error("job must be an object");
  const job = value as Record<string, unknown>;
  if (
    typeof job.deliveryId !== "string" ||
    typeof job.installationId !== "number" ||
    typeof job.repositoryId !== "number" ||
    typeof job.repoFullName !== "string" ||
    !/^[^/]+\/[^/]+$/.test(job.repoFullName) ||
    typeof job.prNumber !== "number" ||
    !isSha(job.baseSha) ||
    !isSha(job.headSha)
  ) throw new Error("job fields are invalid");
  return {
    deliveryId: job.deliveryId,
    installationId: job.installationId,
    repositoryId: job.repositoryId,
    repoFullName: job.repoFullName,
    prNumber: job.prNumber,
    baseSha: job.baseSha,
    headSha: job.headSha,
    baseRef: typeof job.baseRef === "string" ? job.baseRef : undefined,
    headRef: typeof job.headRef === "string" ? job.headRef : undefined,
    prTitle: typeof job.prTitle === "string" ? job.prTitle : undefined,
  };
}

const tokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");

async function updateOrCreateComment(
  octokit: ReturnType<typeof createInstallationOctokit>,
  job: AnalysisJob,
  body: string,
  existingCommentId: number | undefined,
): Promise<number> {
  const [owner, repo] = job.repoFullName.split("/") as [string, string];
  if (existingCommentId) {
    try {
      const updated = await octokit.rest.issues.updateComment({ owner, repo, comment_id: existingCommentId, body });
      return updated.data.id;
    } catch (error) {
      if (!(typeof error === "object" && error !== null && "status" in error && error.status === 404)) throw error;
    }
  }
  const created = await octokit.rest.issues.createComment({ owner, repo, issue_number: job.prNumber, body });
  return created.data.id;
}

async function previousCommentId(
  job: AnalysisJob,
  octokit: ReturnType<typeof createInstallationOctokit>,
): Promise<number | undefined> {
  const { data, error } = await db
    .from("pr_analyses")
    .select("comment_id")
    .eq("installation_id", job.installationId)
    .eq("repository_id", job.repositoryId)
    .eq("pr_number", job.prNumber)
    .not("comment_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (typeof data?.comment_id === "number") return data.comment_id;

  const [owner, repo] = job.repoFullName.split("/") as [string, string];
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: job.prNumber,
    per_page: 100,
  });
  return comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(COMMENT_MARKER))?.id;
}

async function createProcessingAnalysis(job: AnalysisJob): Promise<string> {
  const { data, error } = await db.from("pr_analyses").upsert({
    installation_id: job.installationId,
    repository_id: job.repositoryId,
    repo_full_name: job.repoFullName,
    pr_number: job.prNumber,
    base_sha: job.baseSha,
    head_sha: job.headSha,
    status: "processing",
    error_message: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "repo_full_name,head_sha" }).select("id").single();
  if (error || !data) throw error ?? new Error("analysis row was not returned");
  return data.id as string;
}

async function storeAssets(
  analysisId: string,
  graph: GraphDoc,
): Promise<{ manifest: RenderManifest; token: string }> {
  const rendered = renderAll(graph);
  const token = randomBytes(32).toString("base64url");
  const base = appBaseUrl();

  const rows = rendered.assets.map(({ asset, svg }) => ({
    analysis_id: analysisId,
    asset_id: asset.id,
    path: asset.path ?? `${asset.id}.svg`,
    lens: asset.lens,
    theme: asset.theme,
    view_id: asset.view,
    width: asset.width,
    height: asset.height,
    svg,
  }));

  const { error: deleteError } = await db.from("analysis_assets").delete().eq("analysis_id", analysisId);
  if (deleteError) throw deleteError;
  const { error: insertError } = await db.from("analysis_assets").insert(rows);
  if (insertError) throw insertError;

  const manifest: RenderManifest = {
    ...rendered.manifest,
    assets: rendered.manifest.assets.map((asset) => ({
      ...asset,
      path: undefined,
      url: `${base}/api/assets/${analysisId}/${encodeURIComponent(asset.id)}?token=${encodeURIComponent(token)}`,
    })),
  };
  return { manifest, token };
}

async function processJob(job: AnalysisJob): Promise<{ status: string; analysisId?: string }> {
  const redis = getRedis();
  const lockKey = `analysis-lock:${job.installationId}:${job.repositoryId}:${job.headSha}`;
  const locked = await redis.set(lockKey, job.deliveryId, { nx: true, ex: 900 });
  if (!locked) return { status: "already-processing" };

  let analysisId: string | undefined;
  try {
    const { data: cached, error: cacheError } = await db
      .from("pr_analyses")
      .select("id,status")
      .eq("repo_full_name", job.repoFullName)
      .eq("head_sha", job.headSha)
      .maybeSingle();
    if (cacheError) throw cacheError;
    if (cached?.status === "complete") return { status: "cached", analysisId: cached.id as string };

    const limiter = createRateLimiter(redis, {
      maxRequests: Number(process.env.MAX_JOBS_PER_HOUR || 30),
      windowSeconds: 3600,
    });
    const allowed = await limiter.check(`analysis-rate:${job.installationId}`);
    if (!allowed.allowed) throw new Error(`installation rate limit exceeded; retry after ${allowed.retryAfter}s`);

    const octokit = createInstallationOctokit(job.installationId);
    analysisId = await createProcessingAnalysis(job);
    const commentId = await previousCommentId(job, octokit);

    const [owner, repo] = job.repoFullName.split("/") as [string, string];
    const current = await octokit.rest.pulls.get({ owner, repo, pull_number: job.prNumber });
    if (current.data.head.sha !== job.headSha) {
      await db.from("pr_analyses").update({ status: "stale", updated_at: new Date().toISOString() }).eq("id", analysisId);
      return { status: "stale", analysisId };
    }

    const { error: repositoryError } = await db.from("installation_repositories").upsert({
      installation_id: job.installationId,
      repository_id: job.repositoryId,
      repo_full_name: job.repoFullName,
      private: current.data.base.repo.private,
      added_at: new Date().toISOString(),
    });
    if (repositoryError) throw repositoryError;

    const diff = await fetchPullRequestDiff(octokit, job);
    if (diff.files.length === 0) throw new Error("pull request has no changed files");
    const graph = await analyzePullRequest(job, diff);
    const stored = await storeAssets(analysisId, graph);
    const { error: preparedError } = await db.from("pr_analyses").update({
      graph_document: graph,
      asset_token_hash: tokenHash(stored.token),
      updated_at: new Date().toISOString(),
    }).eq("id", analysisId);
    if (preparedError) throw preparedError;
    const body = composeHostedComment(graph, stored.manifest);

    const latest = await octokit.rest.pulls.get({ owner, repo, pull_number: job.prNumber });
    if (latest.data.head.sha !== job.headSha) {
      await db.from("pr_analyses").update({
        graph_document: graph,
        asset_token_hash: tokenHash(stored.token),
        status: "stale",
        updated_at: new Date().toISOString(),
      }).eq("id", analysisId);
      return { status: "stale", analysisId };
    }

    const postedCommentId = await updateOrCreateComment(octokit, job, body, commentId);
    const { error: completeError } = await db.from("pr_analyses").update({
      graph_document: graph,
      comment_id: postedCommentId,
      asset_token_hash: tokenHash(stored.token),
      status: "complete",
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", analysisId);
    if (completeError) throw completeError;
    return { status: "complete", analysisId };
  } catch (error) {
    if (analysisId) await db.from("pr_analyses").update({
      status: "failed",
      error_message: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq("id", analysisId);
    throw error;
  } finally {
    const owner = await redis.get<string>(lockKey);
    if (owner === job.deliveryId) await redis.del(lockKey);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  try {
    if (!verifyQStashRequest(req.headers.get("upstash-signature") ?? "", rawBody))
      return NextResponse.json({ error: "invalid QStash signature" }, { status: 401 });

    const job = parseJob(JSON.parse(rawBody));
    return NextResponse.json(await processJob(job));
  } catch (error) {
    console.error("[analysis-worker]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "analysis failed" },
      { status: 500 },
    );
  }
}
