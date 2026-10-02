import "server-only";

import { safeParseGraphDoc, SCHEMA_VERSION, type GraphDoc, type GraphDocInput, type Lens } from "@contour/schema";
import graphSchema from "@contour/schema/json-schema/graph-doc.schema.json";
import type { Octokit } from "octokit";
import type { AnalysisJob } from "./queue";

type ChangedFile = { path: string; additions?: number; deletions?: number };
type HostedDiff = {
  files: ChangedFile[];
  additions: number;
  deletions: number;
  patch: string;
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
    truncatedAt: bounded.truncated || allFiles.length > selected.length ? maxBytes : undefined,
  };
}

const fileList = (diff: HostedDiff): string => diff.files.map((file) => {
  const additions = file.additions === undefined ? "binary" : `+${file.additions}`;
  const deletions = file.deletions === undefined ? "" : ` -${file.deletions}`;
  return `  ${file.path} (${additions}${deletions})`;
}).join("\n");

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
      ? "Diff:"
      : `Diff (truncated at ${diff.truncatedAt} bytes; do not invent missing content):`,
    diff.patch,
  ].join("\n");
}

type Turn = { role: "user" | "model"; text: string };

async function completeGemini(turns: Turn[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error("GEMINI_API_KEY and GEMINI_MODEL are required");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      signal: AbortSignal.timeout(300_000),
    },
  );
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

const readObject = (text: string): Record<string, unknown> => {
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
      const parsed = safeParseGraphDoc(stampDocument(readObject(answer), job, diff, model));
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
