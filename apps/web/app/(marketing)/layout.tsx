import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Contour — AI PR Risk & Architecture Copilot",
  description:
    "Contour turns every pull request into a risk-scored architecture map. See what changed, what could break, and what's untested — directly inside GitHub.",
  keywords: ["PR review", "code review", "GitHub", "risk scoring", "architecture diagram", "AI coding"],
  openGraph: {
    title: "Contour — AI PR Risk & Architecture Copilot",
    description: "Risk-scored architecture diagrams for every PR. Built for teams shipping fast with AI coding agents.",
    type: "website",
    url: "https://contour.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contour — AI PR Risk & Architecture Copilot",
    description: "Risk-scored architecture diagrams for every PR.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
