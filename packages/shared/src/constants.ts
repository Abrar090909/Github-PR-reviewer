// ─── Risk Score Gradient ─────────────────────────────────────────────────────

export const RISK_COLORS = {
  low: "#3B82F6",    // blue
  medium: "#F59E0B", // amber
  high: "#DC2626",   // red
} as const;

export const RISK_THRESHOLDS = {
  low: 30,
  medium: 70,
} as const;

// ─── Delta Colors (PR Lens convention: added/modified/removed/unchanged) ──────

export const DELTA_COLORS = {
  added: "#3FB950",     // green — new component
  modified: "#D97706",  // amber-orange — changed component
  removed: "#F85149",   // red — deleted component
  unchanged: "#6E7681", // muted gray — context neighbor (shows blast radius)
  // legacy alias kept for backward compat
  new: "#3FB950",
} as const;

// ─── Coverage Indicator Colors ────────────────────────────────────────────────

export const COVERAGE_COLORS = {
  covered: "#0D9488",         // teal
  "none-in-diff": "#9CA3AF",  // gray
  "not-applicable": "none",
} as const;

// ─── Worker Config Defaults ───────────────────────────────────────────────────

export const DEFAULT_MAX_DIFF_LINES = 800;
export const DEFAULT_MAX_JOBS_PER_HOUR = 30;
export const DEDUP_TTL_SECONDS = 86400; // 24 hours

// ─── Renderer Layout Constants ────────────────────────────────────────────────

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;
export const NODE_PADDING = 16;
export const LANE_GAP = 40;
export const NODE_GAP = 20;
export const DIAGRAM_PADDING = 32;

// ─── SVG Animation ───────────────────────────────────────────────────────────

export const FLOW_DOT_DURATION = "2.5s";
export const FLOW_DOT_RADIUS = 4;

// ─── Monorepo scaling thresholds ─────────────────────────────────────────────

/** At or above this lane count, collapse to summary view */
export const MONOREPO_LANE_COLLAPSE_THRESHOLD = 6;
