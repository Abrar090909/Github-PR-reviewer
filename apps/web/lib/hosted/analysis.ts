import "server-only";

import { safeParseGraphDoc, SCHEMA_VERSION, type GraphDoc, type GraphDocInput, type Lens } from "@contour/schema";
import graphSchema from "@contour/schema/json-schema/graph-doc.schema.json";
import type { Octokit } from "octokit";
import { numberPatch, readPatch } from "./diff-lines";
import type { AnalysisJob } from "./queue";

type ChangedFile = { path: string; additions?: number; deletions?: number };
export type HostedDiff = {
  files: ChangedFile[];
  additions: number;
  deletions: number;
  patch: string;
  /** Each file's own patch, as GitHub returned it, for grounding review comments. */
  patches: Record<string, string>;
  truncatedAt?: number;
};

const LENSES: readonly Lens[] = ["architecture", "data-flow"];
const MAX_OUTPUT_TOKENS = 32_768;

const SYSTEM_PROMPT = [
  "You read a pull request diff and produce one Contour graph document for a code reviewer.",
  "Describe the architecture and ordered data flow. Do not perform a code review or report bugs.",
  "Emit only fields named by the JSON schema. Unknown fields are rejected.",
  "Every edge endpoint and flow participant must reference a declared node id.",
  "Every node must reference a declared lane id.",
  "Use repository-relative POSIX file paths.",
  "Include unchanged neighboring components when the diff proves they interact with changed code.",
  "Use three or four meaningful runtime or system-boundary lanes where possible.",
  "Prefer one useful data flow over several speculative flows.",
  "Give the document a concise title and a short explanation of what the change does.",
  "Write a walkthrough of 3 to 6 steps in the order a reviewer needs them. Each step is one change: something added,",
  "removed, replaced or moved. heading: up to 48 characters, built from change words (added, removed, now, moved).",
  "body: one line up to 140 characters on what happens now that did not before. stage names the view or flow to show;",
  "focus selects the 2 or 3 nodes, edges or flow messages the step is about. The first step is the headline change;",
  "the last step may be an overview of everything touched.",
  "For every added, modified or removed node, add evidence: the file and the head-side line range, read from the",
  "numbers printed in the diff, with one sentence on why those lines are this node. Removed lines have no number.",
  "Answer with one JSON object and no markdown fence.",
].join("\n");

const utf8Prefix = (value: string, maxBytes: number): { text: string; truncated: boolean } => {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length <= maxBytes) return { text: value, truncated: false };
  return { text: bytes.subarray(0, maxBytes).toString("utf8"), truncated: true };
};

export async function fetchPullRequestDiff(
  octokit: Octokit,
  job: AnalysisJob,
): Promise<HostedDiff> {
  const [owner, repo] = job.repoFullName.split("/");
  if (!owner || !repo) throw new Error(`invalid repository name: ${job.repoFullName}`);

  const allFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: job.prNumber,
    per_page: 100,
  });
  const maxFiles = Number(process.env.MAX_FILES_PER_PR || 300);
  const selected = allFiles.slice(0, maxFiles);
  const rawPatch = selected.map((file) => [
    `diff --git a/${file.previous_filename ?? file.filename} b/${file.filename}`,
    `status ${file.status}`,
    `--- a/${file.previous_filename ?? file.filename}`,
    `+++ b/${file.filename}`,
    file.patch ?? "[binary or patch unavailable]",
  ].join("\n")).join("\n");

  const maxBytes = Number(process.env.MAX_DIFF_BYTES_PER_CALL || 400_000);
  const bounded = utf8Prefix(rawPatch, maxBytes);
  return {
    files: selected.map((file) => ({
      path: file.filename,
      additions: file.patch === undefined ? undefined : file.additions,
      deletions: file.patch === undefined ? undefined : file.deletions,
    })),
    additions: selected.reduce((sum, file) => sum + file.additions, 0),
    deletions: selected.reduce((sum, file) => sum + file.deletions, 0),
    patch: bounded.text,
    patches: Object.fromEntries(selected.flatMap((file) => (file.patch ? [[file.filename, file.patch]] : []))),
    truncatedAt: bounded.truncated || allFiles.length > selected.length ? maxBytes : undefined,
  };
}

const fileList = (diff: HostedDiff): string => diff.files.map((file) => {
  const additions = file.additions === undefined ? "binary" : `+${file.additions}`;
  const deletions = file.deletions === undefined ? "" : ` -${file.deletions}`;
  return `  ${file.path} (${additions}${deletions})`;
}).join("\n");

/** Each file's patch with head-side numbers, within the same byte budget as the raw diff. */
function numberedDiff(diff: HostedDiff): string {
  const budget = Number(process.env.MAX_DIFF_BYTES_PER_CALL || 400_000);
  const sections: string[] = [];
  let bytes = 0;
  for (const [path, patch] of Object.entries(diff.patches)) {
    const section = `=== ${path}\n${numberPatch(patch)}`;
    bytes += Buffer.byteLength(section);
    if (bytes > budget) break;
    sections.push(section);
  }
  return sections.join("\n");
}

/**
 * Evidence the model wrote for lines the diff does not show is dropped, the
 * same rule review findings follow, so "changed lines" on the map are real.
 */
function groundEvidence(body: Record<string, unknown>, diff: HostedDiff): Record<string, unknown> {
  if (!Array.isArray(body.nodes)) return body;
  const shown = Object.fromEntries(Object.entries(diff.patches).map(([path, patch]) => [path, readPatch(patch).visible]));
  const nodes = body.nodes.map((node: unknown) => {
    if (typeof node !== "object" || node === null || !Array.isArray((node as { evidence?: unknown }).evidence)) return node;
    const evidence = ((node as { evidence: unknown[] }).evidence).filter((entry) => {
      if (typeof entry !== "object" || entry === null) return false;
      const { file, newStart, newEnd } = entry as { file?: unknown; newStart?: unknown; newEnd?: unknown };
      const lines = typeof file === "string" ? shown[file] : undefined;
      if (!lines || typeof newStart !== "number" || typeof newEnd !== "number" || newEnd < newStart) return false;
      for (let line = newStart; line <= newEnd; line += 1) if (lines.has(line)) return true;
      return false;
    });
    const rest = { ...(node as Record<string, unknown>) };
    delete rest.evidence;
    return evidence.length ? { ...rest, evidence } : rest;
  });
  return { ...body, nodes };
}

function extractionPrompt(job: AnalysisJob, diff: HostedDiff): string {
  return [
    `Repository: ${job.repoFullName}`,
    `Base commit: ${job.baseSha}${job.baseRef ? ` (${job.baseRef})` : ""}`,
    `Head commit: ${job.headSha}${job.headRef ? ` (${job.headRef})` : ""}`,
    `Lenses: ${LENSES.join(", ")}`,
    "",
    `Changed files (${diff.files.length}, +${diff.additions} -${diff.deletions}):`,
    fileList(diff),
    "",
    "Omit schemaVersion, kind, generatedAt, provenance, and numeric stats fields. The server fills them.",
    "",
    "JSON Schema:",
    JSON.stringify(graphSchema),
    "",
    diff.truncatedAt === undefined
      ? "Diff, with head-side line numbers:"
      : `Diff, with head-side line numbers (truncated at ${diff.truncatedAt} bytes; do not invent missing content):`,
    numberedDiff(diff),
  ].join("\n");
}

export type Turn = { role: "user" | "model"; text: string };

// Gemini sheds load with 429 and 5xx ("the model is experiencing high demand"),
// which usually clears within seconds; a pull request should not lose its
// diagram to that.
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

export async function completeGemini(
  turns: Turn[],
  systemPrompt: string = SYSTEM_PROMPT,
  maxOutputTokens: number = MAX_OUTPUT_TOKENS,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error("GEMINI_API_KEY and GEMINI_MODEL are required");

  const send = () => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens },
      }),
      signal: AbortSignal.timeout(240_000),
    },
  );
  let response = await send();
  for (const delay of RETRY_DELAYS_MS) {
    if (!RETRY_STATUSES.has(response.status)) break;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, delay));
    response = await send();
  }
  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini failed (${response.status}): ${body.slice(0, 500)}`);

  const parsed = JSON.parse(body) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; finishReason?: string }>;
  };
  const candidate = parsed.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.thought !== true)
    .map((part) => part.text ?? "")
    .join("");
  if (!text.trim()) throw new Error(`Gemini returned no document (${candidate?.finishReason ?? "unknown"})`);
  return text;
}

export const readObject = (text: string): Record<string, unknown> => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("model response contained no JSON object");
  const value: unknown = JSON.parse(text.slice(start, end + 1));
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("model response was not a JSON object");
  return value as Record<string, unknown>;
};

function stampDocument(
  body: Record<string, unknown>,
  job: AnalysisJob,
  diff: HostedDiff,
  model: string,
): GraphDocInput {
  return {
    ...body,
    schemaVersion: SCHEMA_VERSION,
    kind: "graph",
    generatedAt: new Date().toISOString(),
    lenses: [...LENSES],
    provenance: {
      repo: { owner: job.repoFullName.split("/")[0]!, name: job.repoFullName.split("/")[1]!, host: "github.com" },
      base: { sha: job.baseSha, ref: job.baseRef },
      head: { sha: job.headSha, ref: job.headRef },
      pullRequest: {
        number: job.prNumber,
        title: job.prTitle,
        url: `https://github.com/${job.repoFullName}/pull/${job.prNumber}`,
      },
      generator: { name: "contour-hosted", version: "1", model },
    },
    stats: {
      ...(typeof body.stats === "object" && body.stats !== null ? body.stats : {}),
      filesChanged: diff.files.length,
      additions: diff.additions,
      deletions: diff.deletions,
    },
  } as GraphDocInput;
}

export async function analyzePullRequest(job: AnalysisJob, diff: HostedDiff): Promise<GraphDoc> {
  const turns: Turn[] = [{ role: "user", text: extractionPrompt(job, diff) }];
  const model = process.env.GEMINI_MODEL || "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const answer = await completeGemini(turns);
    try {
      const parsed = safeParseGraphDoc(stampDocument(groundEvidence(readObject(answer), diff), job, diff, model));
      if (parsed.ok) return parsed.value;
      if (attempt === 2) throw new Error(parsed.error.message);
      turns.push(
        { role: "model", text: answer },
        { role: "user", text: `The document failed validation:\n${parsed.error.message}\nReturn the whole corrected JSON object only.` },
      );
    } catch (error) {
      if (attempt === 2) throw error;
      turns.push(
        { role: "model", text: answer },
        { role: "user", text: `The response was invalid: ${error instanceof Error ? error.message : String(error)}. Return one complete JSON object only.` },
      );
    }
  }

  throw new Error("analysis produced no document");
}
