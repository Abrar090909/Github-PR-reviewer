import type { GraphDocument } from "@contour/shared";
import { getRiskLabel, DELTA_COLORS, COVERAGE_COLORS, getRiskLevel } from "@contour/shared";

/**
 * Renders the single-line SummaryStrip shown at the top of the GitHub comment.
 *
 * Format (per UI/UX spec §3.1):
 * ● 3 new · ● 1 changed · ● 1 removed · Overall risk: 62 (Medium) · 2 files without test coverage
 */
export function renderSummaryStrip(doc: GraphDocument, theme: "light" | "dark"): string {
  const newCount = doc.nodes.filter((n) => n.delta === "new" || n.delta === "added").length;
  const changedCount = doc.nodes.filter((n) => n.delta === "modified").length;
  const removedCount = doc.nodes.filter((n) => n.delta === "removed").length;
  const untestedCount = doc.nodes.filter((n) => n.testCoverage === "none-in-diff").length;

  const scores = doc.nodes
    .map((n) => n.riskScore)
    .filter((s): s is number => typeof s === "number");
  const overallRisk = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const riskLabel = getRiskLabel(overallRisk);

  const textColor = theme === "dark" ? "#8B949E" : "#6B7280";
  const bg = theme === "dark" ? "#161B22" : "#F9FAFB";
  const borderColor = theme === "dark" ? "#30363D" : "#E5E7EB";

  const STRIP_HEIGHT = 32;
  const STRIP_WIDTH = 700;
  const TEXT_Y = STRIP_HEIGHT / 2 + 1;

  const segments: Array<{ text: string; color: string; bold?: boolean }> = [];

  if (newCount > 0) {
    segments.push({ text: "● ", color: DELTA_COLORS.new });
    segments.push({ text: `${newCount} new`, color: textColor });
    segments.push({ text: " · ", color: textColor });
  }
  if (changedCount > 0) {
    segments.push({ text: "● ", color: DELTA_COLORS.modified });
    segments.push({ text: `${changedCount} changed`, color: textColor });
    segments.push({ text: " · ", color: textColor });
  }
  if (removedCount > 0) {
    segments.push({ text: "● ", color: DELTA_COLORS.removed });
    segments.push({ text: `${removedCount} removed`, color: textColor });
    segments.push({ text: " · ", color: textColor });
  }

  // Overall risk badge
  const riskLevel = getRiskLevel(overallRisk);
  const riskColors = { low: "#3B82F6", medium: "#F59E0B", high: "#DC2626" };
  segments.push({ text: "Overall risk: ", color: textColor });
  segments.push({ text: `${overallRisk} (${riskLabel})`, color: riskColors[riskLevel], bold: true });

  if (untestedCount > 0) {
    segments.push({ text: " · ", color: textColor });
    segments.push({ text: `${untestedCount} file${untestedCount > 1 ? "s" : ""} without test coverage`, color: COVERAGE_COLORS["none-in-diff"] });
  }

  // Build tspan elements with x offset tracking
  // We use a simple approach: one text element with tspan children
  let tspans = "";
  let xOffset = 16; // left padding

  for (const seg of segments) {
    const weight = seg.bold ? 'font-weight="600"' : "";
    tspans += `<tspan x="${xOffset}" y="${TEXT_Y}" fill="${seg.color}" ${weight}>${escapeXml(seg.text)}</tspan>`;
    // Approximate x advance (6px per char at 12px font)
    xOffset += seg.text.length * 6.5;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_WIDTH}" height="${STRIP_HEIGHT}" role="img" aria-label="PR summary">
  <rect width="${STRIP_WIDTH}" height="${STRIP_HEIGHT}" rx="6" fill="${bg}" stroke="${borderColor}" stroke-width="1"/>
  <text font-family="Inter, system-ui, sans-serif" font-size="12" dominant-baseline="middle">
    ${tspans}
  </text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
