import { Octokit } from "octokit";
import type { HotspotRecord } from "@contour/shared";

export interface DiffResult {
  unifiedDiff: string;
  changedFiles: string[];
  existingCommentId: number | null;
  prTitle: string;
  prBody: string;
  additions: number;
  deletions: number;
  headRef: string;
  baseSha: string;
  headSha: string;
}

/**
 * Fetches unified diff, changed files list, and existing Contour comment ID
 * for a given PR — all in a single batch to minimize GitHub API calls.
 */
export async function fetchDiff(
  octokit: Octokit,
  repoFullName: string,
  prNumber: number
): Promise<DiffResult> {
  const [owner, repo] = repoFullName.split("/");

  // Use GraphQL for batched fetch: PR details + files list in one round trip
  const prData = await octokit.graphql<{
    repository: {
      pullRequest: {
        title: string;
        body: string;
        headRefName: string;
        headRefOid: string;
        baseRefOid: string;
        comments: { nodes: Array<{ id: string; databaseId: number; body: string; author: { login: string } }> };
        files: { nodes: Array<{ path: string }> };
      };
    };
  }>(
    `query FetchPR($owner: String!, $repo: String!, $prNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          title
          body
          headRefName
          headRefOid
          baseRefOid
          comments(first: 50) {
            nodes {
              id
              databaseId
              body
              author { login }
            }
          }
          files(first: 100) {
            nodes { path }
          }
        }
      }
    }`,
    { owner, repo, prNumber }
  );

  const pr = prData.repository.pullRequest;

  // Find existing Contour sticky comment (detect both current and legacy markers)
  const contourBotLogin = process.env.GITHUB_APP_NAME ?? "pr-reviewer-2026[bot]";
  const existingComment = pr.comments.nodes.find(
    (c) =>
      c.body.includes("<!-- contour-sticky -->") ||
      c.author.login === contourBotLogin
  );

  // Fetch raw unified diff via REST (Accept: application/vnd.github.v3.diff)
  const diffResponse = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: prNumber,
    headers: { accept: "application/vnd.github.v3.diff" },
  });

  const rawDiff = String(diffResponse.data);

  // Parse additions/deletions from diff stat lines (+++ / ---)
  let additions = 0;
  let deletions = 0;
  for (const line of rawDiff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("--")) deletions++;
  }

  return {
    unifiedDiff: rawDiff,
    changedFiles: pr.files.nodes.map((f) => f.path),
    existingCommentId: existingComment?.databaseId ?? null,
    prTitle: pr.title,
    prBody: pr.body ?? "",
    additions,
    deletions,
    headRef: pr.headRefName ?? "",
    baseSha: pr.baseRefOid ?? "",
    headSha: pr.headRefOid ?? "",
  };
}

/**
 * Looks up hotspot records for the changed files from Supabase.
 */
export async function fetchHotspots(
  supabaseClient: { from: (table: string) => any },
  installationId: number,
  repoFullName: string,
  filePaths: string[]
): Promise<HotspotRecord[]> {
  try {
    const { data } = await supabaseClient
      .from("file_hotspots")
      .select("file_path, touch_count, last_touched_at")
      .eq("installation_id", installationId)
      .eq("repo_full_name", repoFullName)
      .in("file_path", filePaths);

    return (data ?? []).map((row: any) => ({
      filePath: row.file_path,
      touchCount: row.touch_count,
      lastTouchedAt: row.last_touched_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Upserts hotspot records for all files touched by this PR.
 */
export async function updateHotspots(
  supabaseClient: { from: (table: string) => any },
  installationId: number,
  repoFullName: string,
  filePaths: string[]
): Promise<void> {
  try {
    const rows = filePaths.map((path) => ({
      installation_id: installationId,
      repo_full_name: repoFullName,
      file_path: path,
      touch_count: 1,
      last_touched_at: new Date().toISOString(),
    }));

    await supabaseClient
      .from("file_hotspots")
      .upsert(rows, {
        onConflict: "installation_id, repo_full_name, file_path",
        ignoreDuplicates: false,
      });
  } catch {
    // Non-critical in development
  }
}
