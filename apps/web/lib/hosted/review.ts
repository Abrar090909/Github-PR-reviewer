import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { GraphDoc } from "@contour/schema";
import type { Octokit } from "octokit";
import { completeGemini, readObject, type HostedDiff } from "./analysis";
import { commentable, numberPatch, readPatch, type FileLines } from "./diff-lines";
import type { AnalysisJob } from "./queue";

export const SEVERITIES = ["high", "medium", "low"] as const;
export const CATEGORIES = ["correctness", "security", "reliability", "performance", "maintainability", "tests"] as const;

const MAX_FINDINGS = 8;
const MAX_PROMPT_BYTES = 300_000;

const ModelFinding = z.object({
  severity: z.enum(SEVERITIES),
  category: z.enum(CATEGORIES),
  file: z.string().min(1).max(1024),
  startLine: z.int().min(1),
  endLine: z.int().min(1),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(1500),
  suggestion: z.string().max(4000).optional(),
});
const ModelReview = z.object({ findings: z.array(ModelFinding).max(20) });

export type Finding = z.infer<typeof ModelFinding> & {
  /** Stable across pushes, so a finding already posted is not posted again. */
  fingerprint: string;
  /** Graph nodes backed by this file, so the review page can point at them. */
  nodes: string[];
  /** The inline review comment on GitHub, once posted. */
  url?: string;
};

export type Review =
  | { status: "complete"; headSha: string; findings: Finding[]; dropped: number }
  | { status: "failed"; headSha: string };

const SYSTEM_PROMPT = [
  "You are a senior engineer reviewing a pull request. Report only real defects the diff introduces or exposes:",
  "wrong behaviour, security holes, data loss, races, broken error handling, resource leaks, performance traps,",
  "and risky logic shipped without tests. Never report style, naming, formatting or praise.",
  `Report at most ${MAX_FINDINGS} findings, most severe first. When nothing is wrong, answer {"findings": []}.`,
  "Every finding names one file and head-side line numbers exactly as printed in the numbered diff.",
  "Removed lines have no number and cannot be pointed at.",
  "title: one line, sentence case, no trailing period, naming the code in backticks.",
  "body: one to three sentences on what goes wrong, when, and why it matters. Plain text and backticks only.",
  "suggestion: optional. The exact replacement text for lines startLine to endLine, only when the fix is local,",
  "complete and certain. Leave it out otherwise.",
  "high: breaks users, loses data or opens a hole. medium: a real bug in a less common path. low: worth fixing soon.",
  'Answer with one JSON object of the form {"findings": [...]} and no markdown fence.',
].join("\n");

function reviewPrompt(job: AnalysisJob, diff: HostedDiff): string {
  const sections: string[] = [];
  let bytes = 0;
  for (const [path, patch] of Object.entries(diff.patches)) {
    const section = `=== ${path}\n${numberPatch(patch)}`;
    bytes += Buffer.byteLength(section);
    if (bytes > MAX_PROMPT_BYTES) break;
    sections.push(section);
  }
  return [
    `Repository: ${job.repoFullName}`,
    `Pull request #${job.prNumber}${job.prTitle ? `: ${job.prTitle}` : ""}`,
    "",
    "Numbered diff (head-side line number, then the diff line):",
    ...sections,
  ].join("\n");
}

const fingerprint = (finding: { file: string; title: string }): string =>
  createHash("sha256")
    .update(`${finding.file}\n${finding.title.toLowerCase().replace(/\W+/g, " ").trim()}`)
    .digest("hex")
    .slice(0, 16);

const nodesForFile = (graph: GraphDoc, file: string): string[] =>
  graph.nodes
    .filter((node) => node.files.some((ref) => ref.path === file) || node.evidence?.some((entry) => entry.file === file))
    .map((node) => node.id);

/**
 * Keeps the findings GitHub can place: a known file, lines the diff shows,
 * and a suggestion only when it replaces whole visible lines. Everything else
 * is dropped rather than posted somewhere it does not belong.
 */
export function groundFindings(
  candidates: z.infer<typeof ModelFinding>[],
  lines: Record<string, FileLines>,
  graph: GraphDoc,
): { findings: Finding[]; dropped: number } {
  const seen = new Set<string>();
  const findings: Finding[] = [];
  for (const candidate of candidates) {
    if (findings.length >= MAX_FINDINGS) break;
    if (!commentable(lines[candidate.file], candidate.startLine, candidate.endLine)) continue;
    const id = fingerprint(candidate);
    if (seen.has(id)) continue;
    seen.add(id);
    const suggestion = candidate.suggestion?.replace(/\r\n/g, "\n").replace(/\n$/, "");
    findings.push({
      ...candidate,
      suggestion: suggestion && !suggestion.includes("```") ? suggestion : undefined,
      fingerprint: id,
      nodes: nodesForFile(graph, candidate.file),
    });
  }
  const rank = (finding: Finding) => SEVERITIES.indexOf(finding.severity);
  findings.sort((a, b) => rank(a) - rank(b));
  return { findings, dropped: candidates.length - findings.length };
}

type Requested = { ok: true; candidates: z.infer<typeof ModelFinding>[] } | { ok: false };

/** Asks the model for findings. Runs alongside the diagram analysis, which it does not need. */
export async function requestFindings(job: AnalysisJob, diff: HostedDiff): Promise<Requested> {
  try {
    const answer = await completeGemini([{ role: "user", text: reviewPrompt(job, diff) }], SYSTEM_PROMPT, 8_192);
    const parsed = ModelReview.safeParse(readObject(answer));
    return parsed.success ? { ok: true, candidates: parsed.data.findings } : { ok: false };
  } catch {
    // A review that fails must not cost the pull request its diagrams.
    return { ok: false };
  }
}

export function finishReview(job: AnalysisJob, diff: HostedDiff, graph: GraphDoc, requested: Requested): Review {
  if (!requested.ok) return { status: "failed", headSha: job.headSha };
  const lines = Object.fromEntries(Object.entries(diff.patches).map(([path, patch]) => [path, readPatch(patch)]));
  return { status: "complete", headSha: job.headSha, ...groundFindings(requested.candidates, lines, graph) };
}

export const SEVERITY_LABEL: Record<Finding["severity"], string> = { high: "High", medium: "Medium", low: "Low" };

export function findingComment(finding: Finding, mapUrl: string | undefined): string {
  return [
    `**${SEVERITY_LABEL[finding.severity]} · ${finding.category}** — ${finding.title}`,
    "",
    finding.body,
    ...(finding.suggestion === undefined ? [] : ["", "```suggestion", finding.suggestion, "```"]),
    ...(mapUrl ? ["", `<sub>Contour · <a href="${mapUrl}">see it on the map</a></sub>`] : []),
  ].join("\n");
}

/**
 * Posts new findings as one review with inline comments. A finding posted on
 * an earlier push keeps its comment and link instead of being repeated.
 */
export async function postReview(
  octokit: Octokit,
  job: AnalysisJob,
  review: Extract<Review, { status: "complete" }>,
  previous: Finding[],
  mapUrl: (finding: Finding) => string | undefined,
): Promise<Review> {
  const known = new Map(previous.filter((finding) => finding.url).map((finding) => [finding.fingerprint, finding.url!]));
  const findings = review.findings.map((finding) => ({ ...finding, url: known.get(finding.fingerprint) }));
  const fresh = findings.filter((finding) => finding.url === undefined);
  if (fresh.length === 0) return { ...review, findings };

  const [owner, repo] = job.repoFullName.split("/") as [string, string];
  const created = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: job.prNumber,
    commit_id: job.headSha,
    event: "COMMENT",
    body: `Contour found ${fresh.length} ${fresh.length === 1 ? "issue" : "issues"} in this push.`,
    comments: fresh.map((finding) => ({
      path: finding.file,
      line: finding.endLine,
      side: "RIGHT" as const,
      ...(finding.startLine < finding.endLine ? { start_line: finding.startLine, start_side: "RIGHT" as const } : {}),
      body: findingComment(finding, mapUrl(finding)),
    })),
  });

  const posted = await octokit.paginate(octokit.rest.pulls.listCommentsForReview, {
    owner,
    repo,
    pull_number: job.prNumber,
    review_id: created.data.id,
    per_page: 100,
  });
  for (const finding of fresh) {
    const match = posted.find((comment) => comment.path === finding.file && comment.line === finding.endLine);
    if (match) finding.url = match.html_url;
  }
  return { ...review, findings };
}
