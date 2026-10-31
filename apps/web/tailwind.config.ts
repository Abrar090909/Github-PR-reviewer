import type { Config } from "tailwindcss";

// The page sits on the renderer's own dark canvas, so the diagrams it shows
// blend into it instead of floating on a different black.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Channels live in globals.css so a page can switch themes with one attribute.
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--fg) / <alpha-value>)",
          2: "rgb(var(--fg-2) / <alpha-value>)",
          3: "rgb(var(--fg-3) / <alpha-value>)",
        },
        line: "rgb(var(--fg) / 0.1)",
        // The green the diagrams draw live connections in: the brand accent everywhere.
        accent: "#3fb950",
        // The renderer's delta palette. Meaning only, never decoration.
        added: "#3fb950",
        modified: "#d29922",
        removed: "#f85149",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
