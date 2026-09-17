import type { GraphNode } from "@contour/shared";
import { getRiskColorContinuous, truncateText, DELTA_COLORS } from "../theme/tokens.js";

export interface NodeCardOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  theme: "light" | "dark";
}

/**
 * Renders a single node card as an SVG <g> element string.
 *
 * Delta carries meaning via the left border bar:
 *   added     → green   (new component)
 *   modified  → amber   (changed component)
 *   removed   → red     (deleted component)
 *   unchanged → gray    (context neighbor — shows blast radius)
 *
 * Risk chip is rendered only when the node has a riskScore (optional side feature).
 */
export function renderNodeCard(node: GraphNode, opts: NodeCardOptions): string {
  const { x, y, width, height, theme } = opts;
  const isDark = theme === "dark";

  const isUnchanged = node.delta === "unchanged";

  // Unchanged nodes are deliberately muted so the changed ones pop
  const cardBg = isUnchanged
    ? (isDark ? "#161B22" : "#F6F8FA")
    : (isDark ? "#1C2128" : "#FFFFFF");
  const cardBorder = isDark ? "#30363D" : "#E5E7EB";
  const textColor = isUnchanged
    ? (isDark ? "#8B949E" : "#6E7681")
    : (isDark ? "#E6EDF3" : "#111827");
  const sublabelColor = isDark ? "#6E7681" : "#9CA3AF";

  const deltaKey = node.delta === "added" || node.delta === "new" ? "added" : node.delta;
  const deltaColor = (DELTA_COLORS as Record<string, string>)[deltaKey] ?? DELTA_COLORS.unchanged;

  const hasRisk = node.riskScore !== undefined && node.riskScore !== null;
  const DELTA_BAR_WIDTH = 4;
  const CHIP_RADIUS = 11;
  const CHIP_CX = x + width - 16;
  const CHIP_CY = y + 14;
  const PADDING_LEFT = DELTA_BAR_WIDTH + 10;
  const TEXT_MAX_WIDTH = width - PADDING_LEFT - (hasRisk ? 38 : 16);

  const label = truncateText(node.label, TEXT_MAX_WIDTH, 13);
  const sublabel = node.sublabel
    ? truncateText(node.sublabel, TEXT_MAX_WIDTH + 20, 11)
    : null;

  const hasUntested = node.testCoverage === "none-in-diff";

  const parts: string[] = [];

  // Card background + border
  parts.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" ry="6"` +
    ` fill="${cardBg}" stroke="${cardBorder}" stroke-width="1"/>`
  );

  // DeltaBar — 4px left edge, colored by delta type
  parts.push(
    `<rect x="${x}" y="${y + 6}" width="${DELTA_BAR_WIDTH}" height="${height - 12}" rx="2" ry="2" fill="${deltaColor}"/>`
  );

  // Label text
  parts.push(
    `<text x="${x + PADDING_LEFT}" y="${y + 20}" ` +
    `font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="${isUnchanged ? "400" : "600"}" ` +
    `fill="${textColor}" dominant-baseline="auto">${escapeXml(label)}</text>`
  );

  // Sublabel
  if (sublabel) {
    parts.push(
      `<text x="${x + PADDING_LEFT}" y="${y + 36}" ` +
      `font-family="Inter, system-ui, sans-serif" font-size="11" ` +
      `fill="${sublabelColor}">${escapeXml(sublabel)}</text>`
    );
  }

  // Untested tag — only for changed nodes
  if (hasUntested && !isUnchanged) {
    const tagY = y + height - 20;
    const tagX = x + PADDING_LEFT;
    parts.push(
      `<rect x="${tagX}" y="${tagY}" width="66" height="14" rx="3" ry="3" ` +
      `fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,2"/>`,
      `<text x="${tagX + 5}" y="${tagY + 10}" ` +
      `font-family="Inter, system-ui, sans-serif" font-size="9" fill="#9CA3AF">○ untested</text>`
    );
  }

  // Risk chip — only rendered when the risk side-feature has scored this node
  if (hasRisk) {
    const riskColor = getRiskColorContinuous(node.riskScore!);
    parts.push(
      `<circle cx="${CHIP_CX}" cy="${CHIP_CY}" r="${CHIP_RADIUS}" fill="${riskColor}"/>`,
      `<text x="${CHIP_CX}" y="${CHIP_CY + 1}" ` +
      `font-family="Inter, system-ui, sans-serif" font-size="9" font-weight="700" ` +
      `fill="white" text-anchor="middle" dominant-baseline="middle">${node.riskScore}</text>`
    );
  }

  return `<g class="node-card" data-node-id="${escapeXml(node.id)}" data-delta="${node.delta}">\n  ${parts.join("\n  ")}\n</g>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
