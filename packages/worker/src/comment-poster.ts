import { Octokit } from "octokit";
import type { GraphDocument, GraphNode, View } from "@contour/shared";
import { renderLight, renderDark } from "@contour/renderer";
import { getRiskLabel, getRiskLevel } from "@contour/shared";
import { buildSummaryStats } from "./risk-scorer.js";
import { logger } from "./logger.js";

/**
 * How the comment is recognised on a second run.
 * Nothing else may spell this string — a marker that drifts orphans comments.
 */
export const STICKY_MARKER = "<!-- contour-sticky -->";

export interface PostCommentOptions {
  octokit: Octokit;
  repoFullName: string;
  prNumber: number;
  existingCommentId: number | null;
  doc: GraphDocument;
}

/** Creates or updates the single sticky Contour comment on the PR. */
export async function postComment(opts: PostCommentOptions): Promise<number> {
  const { octokit, repoFullName, prNumber, existingCommentId, doc } = opts;
  const [owner, repo] = repoFullName.split("/");

  const body = buildCommentBody(doc);

  logger.info(
    { owner, repo, prNumber, existingCommentId, action: existingCommentId ? "update" : "create" },
    "Posting comment"
  );

  if (existingCommentId) {
    const response = await octokit.request(
      "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
      { owner, repo, comment_id: existingCommentId, body }
    );
    return response.data.id;
  } else {
    const response = await octokit.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      { owner, repo, issue_number: prNumber, body }
    );
    return response.data.id;
  }
}

// ─── Comment body builder ─────────────────────────────────────────────────────

function buildCommentBody(doc: GraphDocument): string {
  // Render both themes — used as inline SVG in the <picture> element
  let lightSvg: string | null = null;
  let darkSvg: string | null = null;
  let lightUri: string | null = null;
  let darkUri: string | null = null;

  try {
    lightSvg = renderLight(doc).svg;
    darkSvg = renderDark(doc).svg;
    lightUri = svgToDataUri(lightSvg);
    darkUri = svgToDataUri(darkSvg);
  } catch (err) {
    logger.warn({ err }, "SVG render failed, falling back to Mermaid only");
  }

  const blocks: string[] = [];

  blocks.push(STICKY_MARKER);

  // ── Title + summary ──────────────────────────────────────────────────────
  const title = doc.title ?? "PR Architecture Map";
  blocks.push(`<h3>${esc(title)}</h3>`);

  if (doc.summary) {
    blocks.push(`<p>${esc(doc.summary)}</p>`);
  }

  // ── Stats header chips ───────────────────────────────────────────────────
  blocks.push(buildStatsLine(doc));

  // ── PRIMARY: Bespoke PR Lens SVG diagram (dark + light themed) ───────────
  // GitHub renders <picture> with prefers-color-scheme, showing the right
  // theme automatically. This is the same technique PR Lens uses.
  if (lightUri && darkUri) {
    blocks.push(
      [
        `<picture>`,
        `  <source media="(prefers-color-scheme: dark)" srcset="${darkUri}">`,
        `  <img alt="${esc(title)} — architecture diagram" src="${lightUri}" width="100%">`,
        `</picture>`,
      ].join("\n")
    );
  }

  // ── Data Flow SVG (if the doc has a data-flow lens) ──────────────────────
  if (doc.lenses?.includes("data-flow")) {
    try {
      const { renderLight: rl, renderDark: rd } = require("@contour/renderer");
      const dfLightUri = svgToDataUri(rl(doc, { lens: "data-flow" }).svg);
      const dfDarkUri = svgToDataUri(rd(doc, { lens: "data-flow" }).svg);
      blocks.push(
        [
          `<details>`,
          `<summary><b>▶ Data Flow Sequence</b></summary>`,
          ``,
          `<picture>`,
          `  <source media="(prefers-color-scheme: dark)" srcset="${dfDarkUri}">`,
          `  <img alt="${esc(title)} — data flow diagram" src="${dfLightUri}" width="100%">`,
          `</picture>`,
          ``,
          `</details>`,
        ].join("\n")
      );
    } catch {
      // renderLight/renderDark already imported at top — try direct call
      try {
        const dfLightUri = svgToDataUri(renderLight(doc, { lens: "data-flow" } as any).svg);
        const dfDarkUri = svgToDataUri(renderDark(doc, { lens: "data-flow" } as any).svg);
        blocks.push(
          [
            `<details>`,
            `<summary><b>▶ Data Flow Sequence</b></summary>`,
            ``,
            `<picture>`,
            `  <source media="(prefers-color-scheme: dark)" srcset="${dfDarkUri}">`,
            `  <img alt="${esc(title)} — data flow diagram" src="${dfLightUri}" width="100%">`,
            `</picture>`,
            ``,
            `</details>`,
          ].join("\n")
        );
      } catch {
        // Silently skip if data-flow render fails
      }
    }
  }

  // ── Nested views (<details> drill-downs with sub-diagrams) ───────────────
  if (doc.views && doc.views.length > 0) {
    for (const view of doc.views) {
      blocks.push(renderView(view, doc));
    }
  }

  // ── Sequence flows via Mermaid (text fallback + accessibility) ───────────
  const flows = buildMermaidFlows(doc);
  if (flows) {
    blocks.push(
      [
        `<details>`,
        `<summary><b>▶ Sequence Diagram (text)</b></summary>`,
        ``,
        flows,
        ``,
        `</details>`,
      ].join("\n")
    );
  }

  // ── Mermaid flowchart (text fallback — for screen readers / copy-paste) ──
  blocks.push(
    [
      `<details>`,
      `<summary><b>▶ Architecture Diagram (text / Mermaid)</b></summary>`,
      ``,
      buildMermaidDiagram(doc),
      ``,
      `</details>`,
    ].join("\n")
  );

  // ── Risk analysis — collapsible side-feature ─────────────────────────────
  const riskSection = buildRiskSection(doc);
  if (riskSection) {
    blocks.push(riskSection);
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  blocks.push(
    `---\n<sub>Analyzed by <a href="https://github.com/apps/pr-reviewer-2026">Contour</a> · powered by PR Lens renderer</sub>`
  );

  return blocks.filter((b) => b !== "").join("\n\n") + "\n";
}

// ─── Stats line ───────────────────────────────────────────────────────────────

function buildStatsLine(doc: GraphDocument): string {
  const chips: string[] = [];

  if (doc.stats) {
    if (doc.stats.filesChanged !== undefined) chips.push(`${doc.stats.filesChanged} files`);
    if (doc.stats.additions !== undefined) chips.push(`+${doc.stats.additions}`);
    if (doc.stats.deletions !== undefined) chips.push(`−${doc.stats.deletions}`);
    for (const chip of doc.stats.chips ?? []) {
      chips.push(`${chip.label}: ${chip.value}`);
    }
  }

  // Append overall risk if scoring was run
  const scoredNodes = doc.nodes.filter((n) => n.riskScore !== undefined);
  if (scoredNodes.length > 0) {
    const stats = buildSummaryStats(doc);
    const riskLabel = getRiskLabel(stats.overallRisk);
    chips.push(`Risk: ${stats.overallRisk}/${riskLabel}`);
  }

  if (chips.length === 0) return "";
  return `<p>${chips.map((c) => `<code>${esc(c)}</code>`).join(" · ")}</p>`;
}

// ─── Mermaid Diagram Generators ─────────────────────────────────────────────

function buildMermaidDiagram(doc: GraphDocument): string {
  const lines: string[] = ["```mermaid", "flowchart LR"];

  // Styling classes
  lines.push("  classDef added fill:#238636,stroke:#2ea043,stroke-width:2px,color:#ffffff;");
  lines.push("  classDef modified fill:#b08800,stroke:#d29922,stroke-width:2px,color:#ffffff;");
  lines.push("  classDef removed fill:#da3633,stroke:#f85149,stroke-width:2px,color:#ffffff;");
  lines.push("  classDef unchanged fill:#21262d,stroke:#30363d,stroke-width:1px,color:#8b949e;");

  // Lanes as subgraphs
  for (const lane of doc.lanes) {
    const laneNodes = doc.nodes.filter((n) => n.lane === lane.id);
    if (laneNodes.length === 0) continue;
    lines.push(`  subgraph ${cleanId(lane.id)}["${escapeMermaid(lane.label)}"]`);
    for (const node of laneNodes) {
      const deltaClass = node.delta === "new" ? "added" : node.delta;
      lines.push(`    ${cleanId(node.id)}["${escapeMermaid(node.label)}"]:::${deltaClass}`);
    }
    lines.push("  end");
  }

  // Nodes without matching lane
  const laneless = doc.nodes.filter((n) => !doc.lanes.some((l) => l.id === n.lane));
  for (const node of laneless) {
    const deltaClass = node.delta === "new" ? "added" : node.delta;
    lines.push(`  ${cleanId(node.id)}["${escapeMermaid(node.label)}"]:::${deltaClass}`);
  }

  // Edges
  for (const edge of doc.edges) {
    const from = cleanId(edge.from);
    const to = cleanId(edge.to);
    if (edge.label) {
      lines.push(`  ${from} -->|"${escapeMermaid(edge.label)}"| ${to}`);
    } else {
      lines.push(`  ${from} --> ${to}`);
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function buildMermaidFlows(doc: GraphDocument): string {
  if (!doc.flows || doc.flows.length === 0) return "";
  const blocks: string[] = [];

  for (const flow of doc.flows) {
    const lines: string[] = [
      `<details open>`,
      `<summary><b>Sequence Flow: ${esc(flow.title)}</b></summary>`,
      "",
      "```mermaid",
      "sequenceDiagram",
      "  autonumber",
    ];

    for (const participant of flow.participants ?? []) {
      const pId = cleanId(participant.node);
      const pLabel = participant.label ? escapeMermaid(participant.label) : pId;
      lines.push(`  participant ${pId} as ${pLabel}`);
    }

    for (const msg of flow.messages ?? []) {
      const from = cleanId(msg.from);
      const to = cleanId(msg.to);
      const arrow = msg.kind === "async" ? "-->>" : "->>";
      lines.push(`  ${from}${arrow}${to}: ${escapeMermaid(msg.label)}`);
    }

    lines.push("```", "", "</details>");
    blocks.push(lines.join("\n"));
  }

  return blocks.join("\n\n");
}

function cleanId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeMermaid(str: string): string {
  return str.replace(/["#[\]();]/g, " ").trim();
}

// ─── View drill-downs ─────────────────────────────────────────────────────────

function renderView(view: View, doc: GraphDocument): string {
  const body: string[] = [];
  if (view.summary) body.push(`<p>${esc(view.summary)}</p>`);
  body.push(buildMermaidDiagram(doc));

  for (const child of view.children ?? []) {
    body.push(renderView(child, doc));
  }

  const openAttr = view.defaultOpen ? " open" : "";
  return [
    `<details${openAttr}>`,
    `<summary><b>${esc(view.title)}</b></summary>`,
    "",
    ...body,
    `</details>`,
  ].join("\n");
}

// ─── Risk section (collapsible) ───────────────────────────────────────────────

function buildRiskSection(doc: GraphDocument): string {
  const scoredNodes = doc.nodes.filter((n) => n.riskScore !== undefined);
  if (scoredNodes.length === 0) return "";

  const stats = buildSummaryStats(doc);
  const top3 = stats.top3HighRisk;

  const tableRows = top3
    .map(
      (n) =>
        `| ${esc(n.label)} | ${n.riskScore} (${getRiskLabel(n.riskScore!)}) | ${n.delta} | ` +
        `${n.testCoverage === "none-in-diff" ? "⚠️ untested" : "✅"} | ` +
        `${(n.riskReasons ?? []).slice(0, 2).join(", ")} |`
    )
    .join("\n");

  const untestedNote = stats.untestedCount > 0
    ? `\n\n> ⚠️ **${stats.untestedCount} file${stats.untestedCount > 1 ? "s" : ""}** changed without test coverage in this diff.`
    : "\n\n> ✅ All changed files have test coverage in this diff.";

  const behaviorLines = doc.nodes
    .filter((n) => (n.riskScore ?? 0) >= 71 && n.behaviorDelta)
    .map((n) => `> **${esc(n.label)}** (risk ${n.riskScore}): ${esc(n.behaviorDelta ?? "")}`)
    .join("\n");

  return [
    `<details>`,
    `<summary><b>⚠️ Risk Analysis — overall ${stats.overallRisk}/100 (${getRiskLabel(stats.overallRisk)})</b></summary>`,
    "",
    "### Top Risk Nodes",
    "",
    "| Component | Risk Score | Delta | Coverage | Reasons |",
    "|---|---|---|---|---|",
    tableRows,
    untestedNote,
    behaviorLines ? `\n### Behavior Changes\n\n${behaviorLines}` : "",
    "",
    `</details>`,
  ].filter((l) => l !== undefined).join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Escape model-authored text before embedding in HTML/markdown. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\s+/g, " ")
    .trim();
}
