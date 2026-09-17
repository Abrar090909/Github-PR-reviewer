import Hero from "./(marketing)/components/Hero";
import ProblemFraming from "./(marketing)/components/ProblemFraming";
import ContourDifference from "./(marketing)/components/ContourDifference";
import LiveExample from "./(marketing)/components/LiveExample";
import HowItWorks from "./(marketing)/components/HowItWorks";
import InstallSection from "./(marketing)/components/InstallSection";
import Pricing from "./(marketing)/components/Pricing";
import Footer from "./(marketing)/components/Footer";
import Nav from "./(marketing)/components/Nav";
import type { Metadata } from "next";

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

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-[#EDEDED] font-sans overflow-x-hidden">
      <Nav />
      <Hero />
      <ProblemFraming />
      <ContourDifference />
      <LiveExample />
      <HowItWorks />
      <InstallSection />
      <Pricing />
      <Footer />
    </main>
  );
}
