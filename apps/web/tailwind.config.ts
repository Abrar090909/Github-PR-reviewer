import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Risk gradient (continuous, from spec §2.3)
        risk: {
          low: "#3B82F6",    // blue-500
          medium: "#F59E0B", // amber-400
          high: "#DC2626",   // red-600
        },
        // Delta colors (matching git conventions)
        delta: {
          new: "#16A34A",      // green-600
          modified: "#D97706", // amber-600
          removed: "#DC2626",  // red-600
        },
        // Coverage indicator
        coverage: {
          covered: "#0D9488",        // teal-600
          uncovered: "#9CA3AF",      // gray-400
        },
        // Base palette (pure dark Vercel/Cloudflare style)
        canvas: {
          DEFAULT: "#000000",
          dark: "#000000",
        },
        surface: "#0A0A0A",
        border: "#1F1F1F",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "monospace"],
      },
      animation: {
        "halo-bloom": "haloBloom 300ms ease-out forwards",
        "flow-dot": "flowDot 1.5s ease-in-out infinite",
        "fade-in-up": "fadeInUp 400ms ease-out forwards",
        "slide-in": "slideIn 300ms ease-out forwards",
      },
      keyframes: {
        haloBloom: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        flowDot: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      boxShadow: {
        "risk-low": "0 0 24px 8px rgba(59, 130, 246, 0.2)",
        "risk-medium": "0 0 32px 12px rgba(245, 158, 11, 0.25)",
        "risk-high": "0 0 48px 20px rgba(220, 38, 38, 0.3)",
        card: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
        "card-hover": "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
