import "server-only";

import type { GraphDoc, RenderAsset, RenderManifest, View } from "@contour/schema";

export const COMMENT_MARKER = "<!-- contour-hosted -->";

const escape = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const text = (value: string): string =>
  escape(value.replace(/\s+/g, " ").trim()).replace(/([@#])(?=[\w-])/g, "$1&#8203;");

type Pair = { light?: RenderAsset; dark?: RenderAsset };

function picture(pair: Pair, alt: string): string {
  const fallback = pair.light ?? pair.dark;
  if (!fallback?.url) return "";
  const image = `<img alt="${text(alt)}" src="${escape(fallback.url)}" width="${fallback.width}">`;
  if (!pair.light?.url || !pair.dark?.url) return `<a href="${escape(fallback.url)}">${image}</a>`;
  return [
    `<a href="${escape(fallback.url)}">`,
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${escape(pair.dark.url)}">`,
    `  ${image}`,
    "</picture>",
    "</a>",
  ].join("\n");
}

export function composeHostedComment(graph: GraphDoc, manifest: RenderManifest): string {
  const flattenViews = (views: readonly View[]): View[] =>
    views.flatMap((view) => [view, ...flattenViews(view.children)]);
  const views = new Map(flattenViews(graph.views).map((view) => [view.id, view]));
  const groups = new Map<string, { label: string; pair: Pair; expanded: boolean }>();
  for (const asset of manifest.assets) {
    const key = asset.view ?? asset.lens;
    const view = asset.view ? views.get(asset.view) : undefined;
    const label = view?.title ?? (asset.lens === "architecture" ? "Architecture" : "Data flow");
    const current = groups.get(key) ?? { label, pair: {}, expanded: asset.view === undefined || view?.defaultOpen === true };
    current.pair[asset.theme] = asset;
    groups.set(key, current);
  }

  const stats = graph.stats;
  const chips = stats ? [
    stats.filesChanged === undefined ? undefined : `${stats.filesChanged} ${stats.filesChanged === 1 ? "file" : "files"}`,
    stats.additions === undefined ? undefined : `+${stats.additions}`,
    stats.deletions === undefined ? undefined : `−${stats.deletions}`,
    ...stats.chips.map((chip) => `${chip.label} ${chip.value}`),
  ].filter((chip): chip is string => Boolean(chip)) : [];

  const diagrams = [...groups.values()].map(({ label, pair, expanded }) => {
    const rendered = picture(pair, `${graph.title} — ${label}`);
    if (!rendered) return "";
    if (expanded) return rendered;
    return `<details>\n<summary><b>${text(label)}</b></summary>\n\n${rendered}\n\n</details>`;
  });

  return [
    COMMENT_MARKER,
    `<h3>${text(graph.title)}</h3>`,
    graph.summary ? `<p>${text(graph.summary)}</p>` : "",
    chips.length ? `<p>${chips.map((chip) => `<code>${text(chip)}</code>`).join(" · ")}</p>` : "",
    ...diagrams,
    "---",
    `<sub>◈ Rendered by <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://contour.dev"}">Contour</a></sub>`,
  ].filter(Boolean).join("\n\n").concat("\n");
}
