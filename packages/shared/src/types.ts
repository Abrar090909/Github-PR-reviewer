// ─── Delta / Coverage / Risk ──────────────────────────────────────────────────

/** "unchanged" marks context neighbors — they show blast radius without being the change itself. */
export type Delta = "added" | "modified" | "removed" | "unchanged" | "new";
export type TestCoverage = "covered" | "none-in-diff" | "not-applicable";
export type RiskLevel = "low" | "medium" | "high";
export type NodeKind = "service" | "app" | "module" | "function" | "route" | "job" | "queue" | "datastore" | "cache" | "external" | "ui" | "config" | "test" | "package" | "store" | "other";
export type LLMProvider = "anthropic" | "gemini" | "openai";
export type Sensitivity = "strict" | "balanced" | "lenient";
export type Lens = "architecture" | "data-flow" | "coverage" | "dataflow";
export type EdgeKind = "call" | "http" | "rpc" | "event" | "queue" | "data" | "dependency" | "render" | "other";
export type MessageKind = "sync" | "async" | "return" | "self";

// ─── Graph Document (core data contract) ─────────────────────────────────────

export interface Lane {
  id: string;
  label: string;
  subtitle?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  /** Secondary line on the card, e.g. a file path or symbol signature. */
  sublabel?: string;
  kind: NodeKind;
  /** Change state relative to base. "unchanged" = context neighbor showing blast radius. */
  delta: Delta;
  lane: string;
  /** Optional sub-cluster within the lane. */
  group?: string;
  /** Backing file paths, used to build diff permalinks. */
  files?: Array<{ path: string; startLine?: number; endLine?: number }>;

  // ── Risk side-feature fields (optional; populated by scoreDocument() post-LLM) ──
  riskScore?: number;        // 0–100
  riskReasons?: string[];
  behaviorDelta?: string | null;
  testCoverage?: TestCoverage;
  fanIn?: number;
  churnScore?: number;
}

export interface GraphEdge {
  id?: string;
  from: string;
  to: string;
  kind?: EdgeKind;
  delta?: Delta;
  label?: string;
  /** Render a travelling pulse animation along this edge. */
  animated?: boolean;
}

// ─── Data Flow (sequence diagram) ────────────────────────────────────────────

export interface FlowMessage {
  id: string;
  from: string;
  to: string;
  label: string;
  kind?: MessageKind;
  delta?: Delta;
  animated?: boolean;
}

export interface FlowParticipant {
  node: string;
  label?: string;
}

export interface Flow {
  id: string;
  title: string;
  summary?: string;
  participants: FlowParticipant[];
  messages: FlowMessage[];
}

// ─── Views (nested <details> drill-downs) ────────────────────────────────────

export interface ViewScope {
  kind: "all" | "selection";
  nodes?: string[];
  lanes?: string[];
  edges?: string[];
  flows?: string[];
}

export interface View {
  id: string;
  title: string;
  lens: Lens;
  summary?: string;
  scope?: ViewScope;
  defaultOpen?: boolean;
  children?: View[];
}

// ─── Stats chips (headline numbers) ──────────────────────────────────────────

export interface StatChip {
  label: string;
  value: string;
}

export interface Stats {
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  chips?: StatChip[];
}

// ─── Graph Document ───────────────────────────────────────────────────────────

export interface GraphDocument {
  schemaVersion: "1";
  kind: "graph";
  /** Human-readable title a reviewer would recognise. */
  title?: string;
  /** One paragraph answer to "what does this change do?" */
  summary?: string;
  lenses: Lens[];
  lanes: Lane[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Ordered data-flow sequences for the data-flow lens. */
  flows?: Flow[];
  /** Nested <details> drill-down sections. */
  views?: View[];
  /** Headline numbers for the comment header. */
  stats?: Stats;
}

// ─── Job Payload (enqueued to Redis/QStash) ──────────────────────────────────

export interface JobPayload {
  jobId: string;
  installationId: number;
  repoFullName: string;
  prNumber: number;
  headSha: string;
  deliveryId: string;
}

// ─── Analysis Result (stored in pr_analyses) ─────────────────────────────────

export interface AnalysisResult {
  id: string;
  installationId: number;
  repoFullName: string;
  prNumber: number;
  headSha: string;
  graphDocument: GraphDocument;
  commentId: number | null;
  createdAt: string;
}

// ─── Installation (stored in installations) ──────────────────────────────────

export interface Installation {
  id: number;
  accountLogin: string;
  preferredProvider: LLMProvider;
  sensitivity: Sensitivity;
  createdAt: string;
}

// ─── LLM Analysis Input ───────────────────────────────────────────────────────

export interface ParsedSymbol {
  name: string;
  filePath: string;
  kind: NodeKind;
  fanIn: number;
  hasTestReference: boolean;
}

export interface HotspotRecord {
  filePath: string;
  touchCount: number;
  lastTouchedAt: string;
}

export interface AnalysisInput {
  diff: string;
  changedFiles: string[];
  filesChanged: number;
  additions: number;
  deletions: number;
  repoFullName: string;
  prNumber: number;
  prTitle: string;
  baseSha?: string;
  headSha?: string;
  headRef?: string;
  /** Optional: enriched by static analysis after the LLM call */
  symbols?: ParsedSymbol[];
  hotspots?: HotspotRecord[];
  sensitivity?: Sensitivity;
}

// ─── Rendering Options ───────────────────────────────────────────────────────

export interface RenderOptions {
  lens: Lens;
  theme: "light" | "dark";
  maxWidth?: number;
}

export interface RenderOutput {
  svg: string;
  width: number;
  height: number;
}

// ─── Risk helpers ────────────────────────────────────────────────────────────

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return "low";
  if (score <= 70) return "medium";
  return "high";
}

export function getRiskLabel(score: number): string {
  const level = getRiskLevel(score);
  return level.charAt(0).toUpperCase() + level.slice(1);
}
