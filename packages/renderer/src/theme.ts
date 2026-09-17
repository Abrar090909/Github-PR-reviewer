/**
 * Light and dark palette definitions.
 * Ported from PR Lens renderer — colors are baked in per theme since SVGs
 * are served as images and cannot see the page's CSS custom properties.
 */

export type Theme = "light" | "dark";
export const THEMES: readonly Theme[] = ["light", "dark"] as const;

export type Palette = {
  background: string;
  dot: string;
  lane: string;
  card: string;
  cardBorder: string;
  foreground: string;
  muted: string;
  edge: string;
  chip: string;
  pill: string;
  pillBorder: string;
  lifeline: string;
  added: string;
  addedText: string;
  addedFill: string;
  addedBorder: string;
  modified: string;
  modifiedText: string;
  modifiedFill: string;
  modifiedBorder: string;
  removed: string;
  removedText: string;
  removedFill: string;
  removedBorder: string;
  neutralFill: string;
  shadow: string;
};

const LIGHT: Palette = {
  background: "#f4f5f7",
  dot: "rgba(140,149,159,.5)",
  lane: "rgba(255,255,255,.55)",
  card: "#ffffff",
  cardBorder: "#d1d9e0",
  foreground: "#1f2328",
  muted: "#59636e",
  edge: "#8c959f",
  chip: "#f1f3f5",
  pill: "#ffffff",
  pillBorder: "#d8dee4",
  lifeline: "#d1d9e0",
  added: "#1f883d",
  addedText: "#116329",
  addedFill: "#b9f0c4",
  addedBorder: "rgba(31,136,61,.55)",
  modified: "#bf8700",
  modifiedText: "#7d4e00",
  modifiedFill: "#fae17d",
  modifiedBorder: "rgba(154,103,0,.55)",
  removed: "#cf222e",
  removedText: "#a40e26",
  removedFill: "#ffcecb",
  removedBorder: "rgba(207,34,46,.5)",
  neutralFill: "#f1f3f5",
  shadow: "rgba(31,35,40,.14)",
};

const DARK: Palette = {
  background: "#0d1117",
  dot: "rgba(110,118,129,.22)",
  lane: "rgba(110,118,129,.07)",
  card: "#1c2128",
  cardBorder: "#3d444d",
  foreground: "#e6edf3",
  muted: "#9198a1",
  edge: "#6e7681",
  chip: "rgba(110,118,129,.18)",
  pill: "#0d1117",
  pillBorder: "#21262d",
  lifeline: "#30363d",
  added: "#3fb950",
  addedText: "#3fb950",
  addedFill: "rgba(46,160,67,.15)",
  addedBorder: "rgba(63,185,80,.4)",
  modified: "#d29922",
  modifiedText: "#d29922",
  modifiedFill: "rgba(187,128,9,.15)",
  modifiedBorder: "rgba(210,153,34,.4)",
  removed: "#f85149",
  removedText: "#f85149",
  removedFill: "rgba(248,81,73,.12)",
  removedBorder: "rgba(248,81,73,.4)",
  neutralFill: "rgba(110,118,129,.18)",
  shadow: "rgba(0,0,0,.28)",
};

export const paletteFor = (theme: Theme): Palette => {
  switch (theme) {
    case "light": return LIGHT;
    case "dark": return DARK;
    default: throw new Error(`Unhandled theme: ${theme}`);
  }
};
