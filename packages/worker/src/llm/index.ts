import type { GraphDocument, AnalysisInput, LLMProvider as LLMProviderType } from "@contour/shared";

/** Provider-agnostic interface for LLM analysis. */
export interface LLMProvider {
  analyze(input: AnalysisInput): Promise<GraphDocument>;
  readonly name: LLMProviderType;
}

export { AnthropicProvider } from "./anthropic.js";
export { GeminiProvider } from "./gemini.js";
export { OpenAIProvider } from "./openai.js";

/** Factory — selects provider by installation preference. */
export function createProvider(preferred: LLMProviderType): LLMProvider {
  switch (preferred) {
    case "gemini":
      return new (require("./gemini.js").GeminiProvider)();
    case "openai":
      return new (require("./openai.js").OpenAIProvider)();
    case "anthropic":
    default:
      return new (require("./anthropic.js").AnthropicProvider)();
  }
}

/**
 * System prompt: Contour maps the architecture and data flow of a pull request.
 * Risk scoring is a separate post-processing step — the LLM's only job here is to
 * produce an accurate graph of what the system looks like and what changed in it.
 */
export const SYSTEM_PROMPT = [
  "You are Contour, an expert at reading pull request diffs and producing architecture maps.",
  "",
  "You are not a review bot. You never report bugs, risks, security findings, or style issues — there is no field for them. Your only job is to describe what the system looks like, how data moves through it, and to mark what this change did to each component.",
  "",
  "Output a single JSON object matching the schema below. No prose, no markdown fence, no explanation outside the JSON.",
  "",
  "Schema:",
  JSON.stringify({
    schemaVersion: "1",
    kind: "graph",
    title: "string — short title a reviewer would recognise",
    summary: "string — one paragraph: what does this change do?",
    lenses: ["architecture"] as string[],
    lanes: [{ id: "string", label: "string", subtitle: "string (optional — e.g. the platform/runtime)" }],
    nodes: [{
      id: "string (kebab-case, unique)",
      label: "string",
      sublabel: "string (optional — file path or symbol)",
      kind: "service|app|module|function|route|job|queue|datastore|cache|external|ui|config|other",
      delta: "added|modified|removed|unchanged",
      lane: "string (must match a lane id)",
      files: [{ path: "string (repo-relative POSIX path)", startLine: "number (optional)", endLine: "number (optional)" }],
    }],
    edges: [{
      id: "string (unique)",
      from: "string (node id)",
      to: "string (node id)",
      kind: "call|http|rpc|event|queue|data|dependency|render|other",
      delta: "added|modified|removed|unchanged",
      label: "string (optional)",
      animated: "boolean (optional — true for the main data path)",
    }],
    flows: [{
      id: "string",
      title: "string",
      summary: "string (optional)",
      participants: [{ node: "string (node id)", label: "string (optional)" }],
      messages: [{
        id: "string",
        from: "string (node id)",
        to: "string (node id)",
        label: "string",
        kind: "sync|async|return|self",
        delta: "added|modified|removed|unchanged",
        animated: "boolean (default true)",
      }],
    }],
    views: [{
      id: "string",
      title: "string",
      lens: "architecture|data-flow",
      summary: "string (optional)",
      defaultOpen: "boolean",
      children: [],
    }],
  }, null, 2),
  "",
  "Rules enforced by the validator:",
  "- Every edge endpoint must be a declared node id. Every node must reference a declared lane id.",
  "- Ids: kebab-case, alphanumeric plus . _ : / - only, unique within their collection.",
  "- File paths: repository-relative, POSIX (no leading slash, no backslash, no drive letter, no .. segment).",
  "- Include UNCHANGED neighbor nodes that the changed code touches — they are the context that makes blast radius legible. A diagram of only changed nodes says nothing about impact.",
  "- Lanes represent runtime/tier/boundary (e.g. 'API', 'Worker', 'Database', 'Client') — not folder names. Use 3-4 lanes maximum.",
  "- Add a 'data-flow' lens and flows[] only when the change has a real ordered sequence worth animating.",
  "- Mark at most one or two edges animated:true — the main data path of the change.",
  "- Stats chips (e.g. {label:'Queue depth', value:'500→1'}) go in views or can be omitted; do NOT put files/additions/deletions in chips — those are filled in by the system.",
].join("\n");

/** Repair prompt when the model returns malformed JSON. */
export const buildJsonRepairPrompt = (reason: string): string =>
  [
    `That answer could not be read as JSON: ${reason}`,
    "",
    "Return the whole document again as a single JSON object and nothing else — no prose around it, no markdown fence. If the previous answer was truncated, shorten the document so it fits: fewer nodes and one flow beat a document that never ends.",
  ].join("\n");

/** Repair prompt when the document parses but fails schema validation. */
export const buildSchemaRepairPrompt = (errors: string[]): string =>
  [
    "That document was rejected. Problems found:",
    "",
    errors.map((e) => `  - ${e}`).join("\n"),
    "",
    "Return the whole corrected document as JSON alone. Fix only what was named — do not restructure parts that were valid.",
  ].join("\n");

/** Builds the user prompt from an AnalysisInput. */
export function buildUserPrompt(input: AnalysisInput): string {
  const fileList = input.changedFiles
    .map((f) => `  ${f}`)
    .join("\n");

  const diffBudget = 12_000; // ~3k tokens
  const diff = input.diff.length > diffBudget
    ? input.diff.slice(0, diffBudget) + "\n\n[...diff truncated — describe what you can see and do not invent the rest]"
    : input.diff;

  return [
    `Repository: ${input.repoFullName}`,
    `PR #${input.prNumber}: ${input.prTitle}`,
    `Changed files (${input.filesChanged}, +${input.additions} -${input.deletions}):`,
    fileList,
    "",
    "The diff follows.",
    "",
    "```diff",
    diff,
    "```",
  ].join("\n");
}
