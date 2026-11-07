import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { GraphDoc } from "@contour/schema";
import type { Octokit } from "octokit";
import { completeGemini, type HostedDiff } from "./analysis";
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
type ModelFinding = z.infer<typeof ModelFinding>;

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
  "Never claim a library function, type or option does not exist: you cannot see the installed version, and APIs",
  "change between versions. Report only what the diff itself shows to be wrong.",
  `Report at most ${MAX_FINDINGS} findings, most severe first. When nothing is wrong, answer {"findings": []}.`,
  "Every finding names one file and head-side line numbers exactly as printed in the numbered diff.",
  "Removed lines have no number and cannot be pointed at.",
  "title: one line, sentence case, no trailing period, naming the code in backticks.",
  "body: one to three sentences on what goes wrong, when, and why it matters. Plain text and backticks only.",
  "suggestion: optional. The exact replacement text for lines startLine to endLine, only when the fix is local,",
  "complete and certain. Leave it out otherwise.",
  "high: breaks users, loses data or opens a hole. medium: a real bug in a less common path. low: worth fixing soon.",
  "Answer with one JSON object and no markdown fence, using exactly these keys:",
  '{"findings": [{"severity": "high" | "medium" | "low",',
  ` "category": ${CATEGORIES.map((category) => `"${category}"`).join(" | ")},`,
  ' "file": "<path as printed after ===>", "startLine": <number>, "endLine": <number>,',
  ' "title": "<one line>", "body": "<one to three sentences>", "suggestion": "<optional replacement text>"}]}',
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
  candidates: ModelFinding[],
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

// Models drift from the requested keys and labels ("start_line", "critical",
// "error handling"). Each finding is read on its own and mapped onto the
// contract, so one off-format finding costs only itself, not the review.
const KEYS: Record<keyof ModelFinding, string[]> = {
  severity: ["severity", "level", "priority"],
  category: ["category", "type", "kind"],
  file: ["file", "path", "filename", "file_path", "filePath"],
  startLine: ["startLine", "start_line", "lineStart", "line_start", "line", "start"],
  endLine: ["endLine", "end_line", "lineEnd", "line_end", "end"],
  title: ["title", "headline", "summary"],
  body: ["body", "description", "details", "explanation", "message"],
  suggestion: ["suggestion", "fix", "suggested_fix", "suggestedFix", "replacement"],
};

const SEVERITY_WORDS: [RegExp, ModelFinding["severity"]][] = [
  [/high|critical|blocker|major|severe/, "high"],
  [/medium|moderate|warn/, "medium"],
  [/low|minor|info|nit|trivial/, "low"],
];

const CATEGORY_WORDS: [RegExp, ModelFinding["category"]][] = [
  [/secur|vulnerab|inject|auth|xss|secret/, "security"],
  [/perform|perf|slow|latenc|memory|n\+1/, "performance"],
  [/test/, "tests"],
  [/reliab|error|exception|race|concurren|leak|timeout|retry|resilien/, "reliability"],
  [/maintain|readab|duplicat|complex|design/, "maintainability"],
  [/correct|bug|logic|wrong|incorrect|off.by|regress/, "correctness"],
];

const pick = (raw: Record<string, unknown>, key: keyof ModelFinding): unknown => {
  for (const name of KEYS[key]) if (raw[name] !== undefined && raw[name] !== null) return raw[name];
  return undefined;
};

const asLine = (value: unknown): number | undefined => {
  const line = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof line === "number" && Number.isInteger(line) && line >= 1 ? line : undefined;
};

/** Maps one finding as the model wrote it onto the contract, or undefined when it cannot be placed. */
export function normalizeFinding(value: unknown): ModelFinding | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const severityText = String(pick(raw, "severity") ?? "").toLowerCase();
  const categoryText = String(pick(raw, "category") ?? "").toLowerCase();
  const startLine = asLine(pick(raw, "startLine"));
  const suggestion = pick(raw, "suggestion");
  const parsed = ModelFinding.safeParse({
    severity: SEVERITY_WORDS.find(([pattern]) => pattern.test(severityText))?.[1] ?? "medium",
    category:
      CATEGORIES.find((category) => category === categoryText) ??
      CATEGORY_WORDS.find(([pattern]) => pattern.test(categoryText))?.[1] ??
      "correctness",
    file: pick(raw, "file"),
    startLine,
    endLine: asLine(pick(raw, "endLine")) ?? startLine,
    title: pick(raw, "title"),
    body: pick(raw, "body"),
    suggestion: typeof suggestion === "string" && suggestion.trim() ? suggestion : undefined,
  });
  return parsed.success ? parsed.data : undefined;
}

/** The JSON in a model answer: the whole text, a fenced block, or the outermost object or array. */
function parseAnswer(answer: string): unknown {
  const attempts = [
    answer.trim(),
    answer.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim(),
    answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1),
    answer.slice(answer.indexOf("["), answer.lastIndexOf("]") + 1),
  ];
  for (const text of attempts) {
    if (!text) continue;
    try {
      return JSON.parse(text);
    } catch {
      // Try the next reading.
    }
  }
  throw new Error("the answer was not JSON");
}

/** The findings in a model answer, read one by one; an object, an array, or {"findings": [...]}. */
export function readFindings(answer: string): { candidates: ModelFinding[]; unreadable: number } {
  const value = parseAnswer(answer);
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { findings?: unknown }).findings)
      ? (value as { findings: unknown[] }).findings
      : undefined;
  if (!list) throw new Error("the answer held no findings list");
  const candidates = list.slice(0, 20).map(normalizeFinding).filter((finding): finding is ModelFinding => finding !== undefined);
  return { candidates, unreadable: Math.min(list.length, 20) - candidates.length };
}

type Requested = { ok: true; candidates: ModelFinding[]; unreadable: number } | { ok: false; reason: string };

/** Asks the model for findings. Runs alongside the diagram analysis, which it does not need. */
export async function requestFindings(job: AnalysisJob, diff: HostedDiff): Promise<Requested> {
  let answer = "";
  try {
    answer = await completeGemini([{ role: "user", text: reviewPrompt(job, diff) }], SYSTEM_PROMPT, 8_192);
    return { ok: true, ...readFindings(answer) };
  } catch (error) {
    // A review that fails must not cost the pull request its diagrams. The answer's
    // opening goes into the log, so the next format surprise can be read, not guessed.
    const message = error instanceof Error ? error.message : String(error);
    const opening = answer ? `; the answer began: ${JSON.stringify(answer.slice(0, 240))}` : "";
    return { ok: false, reason: `${message}${opening}`.slice(0, 900) };
  }
}

export function finishReview(job: AnalysisJob, diff: HostedDiff, graph: GraphDoc, requested: Requested): Review {
  if (!requested.ok) {
    console.error(`contour review failed for ${job.repoFullName}#${job.prNumber}: ${requested.reason}`);
    return { status: "failed", headSha: job.headSha };
  }
  const lines = Object.fromEntries(Object.entries(diff.patches).map(([path, patch]) => [path, readPatch(patch)]));
  const grounded = groundFindings(requested.candidates, lines, graph);
  return { status: "complete", headSha: job.headSha, findings: grounded.findings, dropped: grounded.dropped + requested.unreadable };
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
