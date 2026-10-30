import type { Config } from "tailwindcss";

// The page sits on the renderer's own dark canvas, so the diagrams it shows
// blend into it instead of floating on a different black.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#090c10",
          900: "#0d1117",
          850: "#11161d",
          800: "#161b22",
          700: "#1f252e",
        },
        fg: {
          DEFAULT: "#e6edf3",
          2: "#9198a1",
          3: "#7d8590",
        },
        line: "rgb(230 237 243 / 0.08)",
        // The coil in the logo; used for the few things that matter.
        accent: "#52a191",
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
