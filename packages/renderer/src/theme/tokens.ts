import {
  RISK_COLORS,
  DELTA_COLORS,
  COVERAGE_COLORS,
  RISK_THRESHOLDS,
  NODE_WIDTH,
  NODE_HEIGHT,
  FLOW_DOT_DURATION,
} from "@contour/shared";

// ─── Color Helpers ────────────────────────────────────────────────────────────

export function getRiskColor(score: number): string {
  if (score <= RISK_THRESHOLDS.low) return RISK_COLORS.low;
  if (score <= RISK_THRESHOLDS.medium) return RISK_COLORS.medium;
  return RISK_COLORS.high;
}

/**
 * Interpolates continuously across the risk gradient rather than
 * using hard bucket jumps — matches the UI/UX spec requirement.
 */
export function getRiskColorContinuous(score: number): string {
  if (score <= 30) {
    // blue → amber interpolation
    const t = score / 30;
    return interpolateHex(RISK_COLORS.low, RISK_COLORS.medium, t);
  } else {
    // amber → red interpolation
    const t = (score - 30) / 70;
    return interpolateHex(RISK_COLORS.medium, RISK_COLORS.high, t);
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
  );
}

function interpolateHex(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export { DELTA_COLORS, COVERAGE_COLORS, NODE_WIDTH, NODE_HEIGHT, FLOW_DOT_DURATION };

// ─── Font metrics (embedded width table — no live font engine needed) ─────────
// Approximate character widths for Inter 12px, used for text measurement in SVG.
// Values are fractional em units × 12.

const CHAR_WIDTHS: Record<string, number> = {
  " ": 3.3, "!": 4, '"': 4.3, "#": 7.2, "$": 6.8, "%": 8, "&": 8, "'": 2.3,
  "(": 4, ")": 4, "*": 5, "+": 7.2, ",": 3.3, "-": 4, ".": 3.3, "/": 4,
  "0": 6.8, "1": 6.8, "2": 6.8, "3": 6.8, "4": 6.8, "5": 6.8, "6": 6.8,
  "7": 6.8, "8": 6.8, "9": 6.8, ":": 3.3, ";": 3.3, "<": 7.2, "=": 7.2,
  ">": 7.2, "?": 6, "@": 11.5, "A": 7.8, "B": 7.4, "C": 7.4, "D": 8,
  "E": 6.5, "F": 6.1, "G": 8.3, "H": 8, "I": 3, "J": 4.3, "K": 7.8,
  "L": 6.5, "M": 9.4, "N": 8, "O": 8.7, "P": 7, "Q": 8.7, "R": 7.6,
  "S": 6.8, "T": 6.5, "U": 8, "V": 7.8, "W": 10.8, "X": 7.4, "Y": 7,
  "Z": 7, "[": 4, "\\": 4, "]": 4, "^": 7.2, "_": 6, "`": 4.3,
  "a": 6.5, "b": 7, "c": 5.8, "d": 7, "e": 6.5, "f": 3.6, "g": 7,
  "h": 7, "i": 2.8, "j": 2.8, "k": 6.5, "l": 2.8, "m": 10.4, "n": 7,
  "o": 6.8, "p": 7, "q": 7, "r": 4.3, "s": 5.4, "t": 4.7, "u": 7,
  "v": 6.5, "w": 9, "x": 6.1, "y": 6.5, "z": 5.8,
};

export function measureText(text: string, fontSize = 12): number {
  return Array.from(text).reduce(
    (sum, ch) => sum + (CHAR_WIDTHS[ch] ?? 6.8),
    0
  ) * (fontSize / 12);
}

/** Truncates text to fit within maxWidth pixels, appending "…" if needed. */
export function truncateText(text: string, maxWidth: number, fontSize = 12): string {
  if (measureText(text, fontSize) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && measureText(truncated + "…", fontSize) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
}
