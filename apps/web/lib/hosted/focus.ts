import { createHash } from "node:crypto";
import type { GraphDoc } from "@contour/schema";
import type { Finding } from "./review";

export type FocusFile = { path: string; reason: string; score: number };

/**
 * Which changed files a reviewer should open first, and why. A file ranks by
 * how much of the system its changed parts connect to, more when it sits on
 * the edge the change is about, and more again when the review found issues
 * in it. Deterministic, so the order only moves when the change does.
 */
export function readFirst(graph: GraphDoc, findings: readonly Finding[], limit = 5): FocusFile[] {
  const degree = new Map<string, number>();
  const hero = new Set<string>();
  for (const edge of graph.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    if (edge.emphasis === "hero") {
      hero.add(edge.from);
      hero.add(edge.to);
    }
  }

  const files = new Map<string, { score: number; nodes: Set<string>; links: number; hero: boolean; issues: number }>();
  const entry = (path: string) => {
    const current = files.get(path) ?? { score: 0, nodes: new Set<string>(), links: 0, hero: false, issues: 0 };
    files.set(path, current);
    return current;
  };

  for (const node of graph.nodes) {
    if (node.delta === "unchanged") continue;
    const paths = new Set([...node.files.map((ref) => ref.path), ...(node.evidence ?? []).map((item) => item.file)]);
    for (const path of paths) {
      const file = entry(path);
      file.nodes.add(node.label);
      file.links += degree.get(node.id) ?? 0;
      file.hero ||= hero.has(node.id);
      file.score += 1 + (degree.get(node.id) ?? 0) + (hero.has(node.id) ? 3 : 0);
    }
  }
  for (const finding of findings) {
    const file = entry(finding.file);
    file.issues += 1;
    file.score += finding.severity === "high" ? 6 : finding.severity === "medium" ? 3 : 1;
  }

  return [...files.entries()]
    .map(([path, file]) => {
      const parts = [...file.nodes].slice(0, 2).map((label) => `\`${label}\``).join(", ");
      const reasons = [
        file.issues ? `${file.issues} review ${file.issues === 1 ? "finding" : "findings"}` : "",
        file.hero ? "on the main connection of this change" : "",
        parts ? `backs ${parts}${file.links ? `, ${file.links} ${file.links === 1 ? "connection" : "connections"}` : ""}` : "",
      ].filter(Boolean);
      return { path, score: file.score, reason: reasons.join(" · ") };
    })
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

/** A link to a line in the pull request's "Files changed" view. */
export const diffLink = (repoFullName: string, prNumber: number, path: string, line?: number): string =>
  `https://github.com/${repoFullName}/pull/${prNumber}/files#diff-${createHash("sha256").update(path).digest("hex")}${
    line ? `R${line}` : ""
  }`;
