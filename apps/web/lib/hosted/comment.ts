import "server-only";

import type { GraphDoc, RenderAsset, RenderManifest, View } from "@contour/schema";
import { diffLink, readFirst } from "./focus";
import { SEVERITY_LABEL, type Review } from "./review";

export const COMMENT_MARKER = "<!-- contour-hosted -->";

const escape = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const text = (value: string): string =>
  escape(value.replace(/\s+/g, " ").trim()).replace(/([@#])(?=[\w-])/g, "$1&#8203;");

/** Markdown-safe inline text: backticks stay code, mentions and refs stay inert. */
const inline = (value: string): string =>
  value.replace(/\s+/g, " ").trim().replace(/([@#])(?=[\w-])/g, "$1&#8203;").replace(/</g, "&lt;");

type Pair = { light?: RenderAsset; dark?: RenderAsset };

function picture(pair: Pair, alt: string, href: string): string {
  const fallback = pair.light ?? pair.dark;
  if (!fallback?.url) return "";
  const image = `<img alt="${text(alt)}" src="${escape(fallback.url)}" width="${fallback.width}">`;
  if (!pair.light?.url || !pair.dark?.url) return `<a href="${escape(href)}">${image}</a>`;
  return [
    `<a href="${escape(href)}">`,
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${escape(pair.dark.url)}">`,
    `  ${image}`,
    "</picture>",
    "</a>",
  ].join("\n");
}

const flattenViews = (views: readonly View[]): View[] => views.flatMap((view) => [view, ...flattenViews(view.children)]);

export type CommentContext = {
  repoFullName: string;
  prNumber: number;
  headSha: string;
  /** The interactive review page for this analysis, token included. */
  mapUrl: string;
  review: Review;
};

const TIPS = [
  "Click a diagram to open it on the interactive map. Scroll to zoom, drag to pan, and click any part to see the lines it changed.",
  "On the map, press <kbd>W</kbd> to play the walkthrough, <kbd>←</kbd> <kbd>→</kbd> to step, <kbd>F</kbd> to fit and <kbd>Esc</kbd> to stop.",
  "A finding with a small, certain fix carries a GitHub suggestion. Commit it straight from the inline comment.",
  "Every finding is checked against this diff before it is posted. One that points at lines the pull request did not change is dropped.",
  "Each push redraws the map in this same comment. Findings already posted are linked again, not repeated.",
  "Switch GitHub to dark mode and the diagrams follow.",
  "Prefer your own model key and CI? Use the self-hosted Action: <code>Abrar090909/Github-PR-reviewer/packages/action@master</code>.",
];

export function composeHostedComment(graph: GraphDoc, manifest: RenderManifest, context: CommentContext): string {
  const views = new Map(flattenViews(graph.views).map((view) => [view.id, view]));
  const groups = new Map<string, { label: string; lens: string; anchor: string; pair: Pair; expanded: boolean }>();
  for (const asset of manifest.assets) {
    const key = asset.view ?? asset.lens;
    const view = asset.view ? views.get(asset.view) : undefined;
    const current = groups.get(key) ?? {
      label: view?.title ?? (asset.lens === "architecture" ? "Architecture" : "Data flow"),
      lens: asset.lens,
      anchor: asset.view ? `view=${encodeURIComponent(asset.view)}` : asset.lens,
      pair: {},
      expanded: asset.view === undefined || view?.defaultOpen === true,
    };
    current.pair[asset.theme] = asset;
    groups.set(key, current);
  }

  const map = (anchor: string) => `${context.mapUrl}#${anchor}`;
  const steps = graph.walkthrough?.steps ?? [];
  const review = context.review;
  const findings = review.status === "complete" ? review.findings : [];
  const stats = graph.stats;

  const chips = [
    stats?.filesChanged === undefined ? "" : `${stats.filesChanged} ${stats.filesChanged === 1 ? "file" : "files"}`,
    stats?.additions === undefined ? "" : `+${stats.additions}`,
    stats?.deletions === undefined ? "" : `−${stats.deletions}`,
    ...(stats?.chips ?? []).map((chip) => `${chip.label} ${chip.value}`),
    review.status === "complete" ? `${findings.length} ${findings.length === 1 ? "finding" : "findings"}` : "",
  ].filter(Boolean);

  // The overview of each lens is shown; deeper drill-downs fold away.
  const diagrams = [...groups.values()].map(({ label, lens, anchor, pair, expanded }, index) => {
    const drawn = picture(pair, `${graph.title} — ${label}`, map(anchor));
    if (!drawn) return "";
    const action =
      lens === "architecture" && index === 0 && steps.length > 0
        ? `<p align="center"><a href="${escape(map("walkthrough"))}"><b>▶ Play the walkthrough</b></a> · <a href="${escape(map(anchor))}">Open the interactive map</a></p>`
        : `<p align="center"><a href="${escape(map(anchor))}">Open on the map</a></p>`;
    const block = `<p><b>${text(label)}</b></p>\n\n${drawn}\n\n${action}`;
    return expanded ? block : `<details>\n<summary><b>${text(label)}</b></summary>\n\n${block}\n\n</details>`;
  });

  const walkthrough = steps.length
    ? [
      `<details>`,
      `<summary><b>Walkthrough</b> · ${steps.length} steps</summary>`,
      "",
      ...steps.map((step, index) => `${index + 1}. [**${inline(step.heading)}**](${map(`step=${index + 1}`)}) — ${inline(step.body)}`),
      "",
      `</details>`,
    ].join("\n")
    : "";

  const counts = (["high", "medium", "low"] as const)
    .map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length] as const)
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => `${count} ${SEVERITY_LABEL[severity].toLowerCase()}`);

  const reviewBlock =
    review.status === "failed"
      ? `<p><b>Review</b> · the review could not run on <code>${review.headSha.slice(0, 7)}</code>. The diagrams above are complete; the next push tries again.</p>`
      : findings.length === 0
        ? `<p><b>Review</b> · no issues found in <code>${review.headSha.slice(0, 7)}</code>.</p>`
        : [
          `<details open>`,
          `<summary><b>Review</b> · ${findings.length} ${findings.length === 1 ? "finding" : "findings"} (${counts.join(", ")}) on <code>${review.headSha.slice(0, 7)}</code></summary>`,
          "",
          ...findings.map((finding) => {
            const where = `\`${inline(finding.file)}:${finding.startLine}${finding.endLine > finding.startLine ? `-${finding.endLine}` : ""}\``;
            const title = finding.url ? `[${inline(finding.title)}](${finding.url})` : inline(finding.title);
            return `- **${SEVERITY_LABEL[finding.severity]}** · ${finding.category} · ${title} · ${where}${finding.suggestion ? " · fix suggested" : ""}`;
          }),
          "",
          `</details>`,
        ].join("\n");

  const focus = readFirst(graph, findings);
  const focusBlock = focus.length
    ? [
      `<details>`,
      `<summary><b>Read these files first</b></summary>`,
      "",
      ...focus.map((file, index) => `${index + 1}. [\`${inline(file.path)}\`](${diffLink(context.repoFullName, context.prNumber, file.path)})${file.reason ? ` — ${inline(file.reason)}` : ""}`),
      "",
      `</details>`,
    ].join("\n")
    : "";

  const tips = [`<details>`, `<summary>Tips</summary>`, "", ...TIPS.map((tip) => `- ${tip}`), "", `</details>`].join("\n");

  return [
    COMMENT_MARKER,
    `<h3>${text(graph.title)}</h3>`,
    graph.summary ? `<p>${text(graph.summary)}</p>` : "",
    chips.length ? `<p>${chips.map((chip) => `<code>${text(chip)}</code>`).join(" · ")}</p>` : "",
    ...diagrams,
    walkthrough,
    reviewBlock,
    focusBlock,
    tips,
    "---",
    `<sub>◈ <a href="${escape(context.mapUrl)}">Contour</a> · drawn from <code>${context.headSha.slice(0, 7)}</code></sub>`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .concat("\n");
}
