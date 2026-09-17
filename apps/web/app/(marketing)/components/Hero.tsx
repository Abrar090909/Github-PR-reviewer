"use client";

import { useState } from "react";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";

export default function Hero() {
  const [activeTab, setActiveTab] = useState<"architecture" | "dataflow">("architecture");
  const [copiedCli, setCopiedCli] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>("orchestrator");

  const handleCopyCli = () => {
    navigator.clipboard.writeText("npx @contour/cli review");
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-20 px-4 sm:px-6 max-w-[1280px] mx-auto overflow-hidden">
      
      {/* ── Center-Based Hero Header ────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center max-w-[900px] mx-auto mb-12 sm:mb-16">
        
        {/* Infinite Scrolling Capsule Badge */}
        <div className="relative w-[350px] max-w-[calc(100vw-32px)] h-[32px] overflow-hidden rounded-full bg-[#111111] border border-[#262626] text-[12px] font-mono mb-6 flex items-center select-none [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)]">
          <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
            <span className="inline-flex items-center text-[#16A34A] font-bold uppercase tracking-wider pr-8">
              CONTOUR V1.0 / VISUAL CODE REVIEWS FOR GITHUB
            </span>
            <span className="inline-flex items-center text-[#16A34A] font-bold uppercase tracking-wider pr-8">
              CONTOUR V1.0 / VISUAL CODE REVIEWS FOR GITHUB
            </span>
          </div>
        </div>

        {/* Shorter, Visualization-focused USP Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.14] mb-5">
          Interactive architecture maps{" "}
          <br className="hidden sm:inline" />
          <span className="text-[#888888]">for every pull request.</span>
        </h1>

        {/* Short, plain-English subtext without em dashes */}
        <p className="text-base sm:text-lg text-[#999999] leading-relaxed max-w-[640px] mb-8 font-normal">
          Contour turns pull requests into interactive, animated diagrams inside GitHub.
          Explore how files connect, trace data flows, and spot missing tests in seconds.
        </p>

        {/* CTAs — clean, no downarrow */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-4">
          <a
            href={GITHUB_APP_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-black font-semibold text-sm transition-all duration-150 shadow-lg shadow-[#22C55E]/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>Install on GitHub</span>
          </a>

          <a
            href="#live-example"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#111111] hover:bg-[#181818] text-[#EDEDED] font-medium text-sm border border-[#2A2A2A] transition-all duration-150"
          >
            <span>Explore live demo</span>
          </a>
        </div>

        {/* Quick CLI command */}
        <div className="inline-flex items-center gap-2 text-xs font-mono text-[#777777] mt-1">
          <span>Run locally:</span>
          <code className="text-[#A1A1A1] bg-[#111111] px-2 py-0.5 rounded border border-[#222222]">
            npx @contour/cli review
          </code>
          <button
            onClick={handleCopyCli}
            className="hover:text-white transition-colors p-1 cursor-pointer"
            title="Copy command"
          >
            {copiedCli ? (
              <span className="text-[#22C55E] text-[11px]">copied!</span>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* ── Centered Architecture & Data Flow Canvas ───────────────────── */}
      <div className="w-full max-w-[1080px] mx-auto">
        <div className="rounded-2xl border border-[#222222] bg-[#07080B] dot-grid overflow-hidden shadow-2xl">
          
          {/* PR Context / Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#1A1D24] px-5 py-3 bg-[#0A0C10] gap-2.5">
            <div className="flex items-center gap-2.5 text-xs font-mono">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="18" r="3"/>
                  <circle cx="6" cy="6" r="3"/>
                  <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
                  <line x1="6" y1="9" x2="6" y2="21"/>
                </svg>
                Pull Request #2841
              </span>
              <span className="text-[#555555]">/</span>
              <span className="text-[#888888] truncate max-w-[220px] sm:max-w-none">
                {activeTab === "architecture" ? "New Checkout & Payment System" : "Firestore Broadcast Pipeline"}
              </span>
              <span className="hidden md:inline-flex px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[11px]">
                Risk: Medium
              </span>
            </div>

            {/* Switcher */}
            <div className="flex items-center gap-1 bg-[#12141A] p-1 rounded-lg border border-[#222630] text-xs self-end sm:self-auto">
              <button
                onClick={() => setActiveTab("architecture")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "architecture"
                    ? "bg-[#222630] text-white font-medium"
                    : "text-[#888888] hover:text-[#CCCCCC]"
                }`}
              >
                Architecture
              </button>
              <button
                onClick={() => setActiveTab("dataflow")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  activeTab === "dataflow"
                    ? "bg-[#222630] text-white font-medium"
                    : "text-[#888888] hover:text-[#CCCCCC]"
                }`}
              >
                Data flow
              </button>
            </div>
          </div>

          {/* ── VIEW 1: Architecture View ─────────────────────────────── */}
          {activeTab === "architecture" && (
            <div className="relative w-full overflow-x-auto">
              {/* Lane Columns Header */}
              <div className="grid grid-cols-3 border-b border-[#1A1D24] px-4 sm:px-8 py-2.5 text-[11px] font-mono tracking-wider text-[#5A6270] uppercase select-none">
                <div>API GATEWAY</div>
                <div className="text-center sm:text-left sm:pl-10">SERVICES</div>
                <div className="text-right sm:text-left sm:pl-14">DATA</div>
              </div>

              <svg
                className="w-full h-auto min-w-[720px] block"
                viewBox="0 0 780 390"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="hero-glow-green" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Column Separators */}
                <line x1="250" y1="0" x2="250" y2="390" stroke="#161922" strokeWidth="1" strokeDasharray="4 6" />
                <line x1="530" y1="0" x2="530" y2="390" stroke="#161922" strokeWidth="1" strokeDasharray="4 6" />

                {/* Path 1: API -> Orchestrator */}
                <path
                  d="M 188 82 C 244 82, 244 125, 300 125"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M 188 82 C 244 82, 244 125, 300 125"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="1.8"
                  className="flow-anim"
                />
                <circle r="4.5" fill="#4ADE80" filter="url(#hero-glow-green)">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 188 82 C 244 82, 244 125, 300 125" />
                </circle>

                {/* Path 2: Orchestrator -> Ledger */}
                <path
                  d="M 474 135 C 528 135, 528 195, 582 195"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="2.5"
                  opacity="0.25"
                />
                <path
                  d="M 474 135 C 528 135, 528 195, 582 195"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="1.8"
                  className="flow-anim"
                />
                <circle r="4.5" fill="#4ADE80" filter="url(#hero-glow-green)">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M 474 135 C 528 135, 528 195, 582 195" />
                </circle>

                {/* Path 3: Orchestrator -> Legacy Worker (Dashed red) */}
                <path
                  d="M 474 115 C 530 115, 535 240, 474 268"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.45"
                />
                <circle r="3" fill="#F87171" opacity="0.6">
                  <animateMotion dur="3.2s" repeatCount="indefinite" path="M 474 115 C 530 115, 535 240, 474 268" />
                </circle>

                {/* Edge Pill: sends payment */}
                <g transform="translate(244, 103)">
                  <rect x="-42" y="-10" width="84" height="20" rx="10" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    sends payment
                  </text>
                </g>

                {/* Edge Pill: saves order */}
                <g transform="translate(528, 165)">
                  <rect x="-38" y="-10" width="76" height="20" rx="10" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    saves order
                  </text>
                </g>

                {/* Edge Pill: deleted */}
                <g transform="translate(534, 115)">
                  <rect x="-28" y="-9" width="56" height="18" rx="9" fill="#1F0E0E" stroke="#4A1818" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#F87171" fontSize="9" fontFamily="Geist Mono, monospace">
                    deleted
                  </text>
                </g>

                {/* NODE 1: POST /checkout — Clean neutral border, NO orange arc/stripe */}
                <g transform="translate(24, 56)" className="cursor-pointer" onClick={() => setHoveredNode("checkout")}>
                  <rect
                    x="0" y="0" width="164" height="54" rx="8"
                    fill="#111317"
                    stroke="#272A34"
                    strokeWidth="1"
                  />
                  <polygon points="16,23 16,31 24,27" fill="#D97706" />
                  <text x="32" y="29" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                    POST /checkout
                  </text>
                  <text x="32" y="42" fill="#8B949E" fontSize="10" fontFamily="Geist Mono, monospace">
                    User clicks pay
                  </text>
                  <g transform="translate(100, -9)">
                    <rect x="0" y="0" width="56" height="18" rx="9" fill="#261A0C" stroke="#D97706" strokeWidth="1" />
                    <text x="28" y="12" textAnchor="middle" fill="#F59E0B" fontSize="8.5" fontWeight="700" fontFamily="Geist Mono, monospace">
                      CHANGED
                    </text>
                  </g>
                </g>

                {/* NODE 2: payment-worker — Clean neutral border */}
                <g transform="translate(300, 100)" className="cursor-pointer" onClick={() => setHoveredNode("orchestrator")}>
                  <rect
                    x="0" y="0" width="174" height="60" rx="8"
                    fill="#111317"
                    stroke="#272A34"
                    strokeWidth="1"
                  />
                  <rect x="14" y="18" width="13" height="13" rx="2" fill="none" stroke="#22C55E" strokeWidth="1.5" />
                  <rect x="18" y="22" width="5" height="5" fill="#22C55E" />
                  <text x="35" y="26" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                    payment-worker
                  </text>
                  <text x="35" y="42" fill="#78887F" fontSize="10" fontFamily="Geist Mono, monospace">
                    Charges credit card
                  </text>
                  <g transform="translate(126, -9)">
                    <rect x="0" y="0" width="40" height="18" rx="9" fill="#0B2615" stroke="#22C55E" strokeWidth="1" />
                    <text x="20" y="12" textAnchor="middle" fill="#4ADE80" fontSize="8.5" fontWeight="700" fontFamily="Geist Mono, monospace">
                      NEW
                    </text>
                  </g>
                </g>

                {/* NODE 3: orders-database — Clean neutral border */}
                <g transform="translate(582, 172)" className="cursor-pointer" onClick={() => setHoveredNode("ledger")}>
                  <rect
                    x="0" y="0" width="170" height="54" rx="8"
                    fill="#111317"
                    stroke="#272A34"
                    strokeWidth="1"
                  />
                  <g transform="translate(14, 18)" stroke="#8A92A6" strokeWidth="1.3" fill="none">
                    <ellipse cx="7" cy="4" rx="7" ry="2.5" />
                    <path d="M0 4v8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V4" />
                    <path d="M0 8c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
                  </g>
                  <text x="38" y="28" fill="#EDEDED" fontSize="12" fontWeight="600" fontFamily="Geist, sans-serif">
                    orders-database
                  </text>
                  <text x="38" y="42" fill="#737C8E" fontSize="10" fontFamily="Geist Mono, monospace">
                    Saves receipt record
                  </text>
                </g>

                {/* NODE 4: old-email-sender — Dashed removed card */}
                <g transform="translate(300, 245)" className="cursor-pointer opacity-75" onClick={() => setHoveredNode("legacy")}>
                  <rect
                    x="0" y="0" width="174" height="54" rx="8"
                    fill="#140F11"
                    stroke="#EF4444"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                  />
                  <rect x="15" y="19" width="13" height="13" rx="2" fill="none" stroke="#7A3232" strokeWidth="1.4" />
                  <text x="36" y="29" fill="#A39396" fontSize="11.5" fontFamily="Geist, sans-serif">
                    old-email-sender
                  </text>
                  <text x="36" y="42" fill="#6D5D60" fontSize="10" fontFamily="Geist Mono, monospace">
                    Removed slow SMTP call
                  </text>
                  <g transform="translate(106, -9)">
                    <rect x="0" y="0" width="60" height="18" rx="9" fill="#280D0D" stroke="#EF4444" strokeWidth="1" />
                    <text x="30" y="12" textAnchor="middle" fill="#F87171" fontSize="8" fontWeight="700" fontFamily="Geist Mono, monospace">
                      REMOVED
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          )}

          {/* ── VIEW 2: Data Flow View (Matching User Reference Image) ─────── */}
          {activeTab === "dataflow" && (
            <div className="relative w-full overflow-x-auto">
              <svg
                className="w-full h-auto min-w-[760px] block"
                viewBox="0 0 800 460"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Arrow markers */}
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#D97706" />
                  </marker>
                  <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#22C55E" />
                  </marker>
                  <marker id="arrow-green-rev" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 10 1 L 0 5 L 10 9 z" fill="#22C55E" />
                  </marker>
                </defs>

                {/* Column 1 Card: queue route */}
                <g transform="translate(48, 28)">
                  <rect x="0" y="0" width="180" height="60" rx="8" fill="#111317" stroke="#272A34" strokeWidth="1" />
                  <polygon points="20,25 20,35 29,30" fill="#D97706" />
                  <text x="38" y="34" fill="#FFFFFF" fontSize="13" fontWeight="600" fontFamily="Geist, sans-serif">
                    queue route
                  </text>
                  {/* Badge: +38 / -12 CHANGED */}
                  <g transform="translate(48, -10)">
                    <rect x="0" y="0" width="124" height="20" rx="10" fill="#261A0C" stroke="#D97706" strokeWidth="1" />
                    <text x="36" y="13.5" textAnchor="middle" fill="#888888" fontSize="9" fontFamily="Geist Mono, monospace">+38 / -12</text>
                    <text x="92" y="13.5" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="700" fontFamily="Geist Mono, monospace">CHANGED</text>
                  </g>
                </g>
                {/* Vertical Lifeline 1 */}
                <line x1="138" y1="88" x2="138" y2="440" stroke="#222630" strokeWidth="1" strokeDasharray="4 6" />

                {/* Column 2 Card: Firestore */}
                <g transform="translate(300, 28)">
                  <rect x="0" y="0" width="180" height="60" rx="8" fill="#111317" stroke="#272A34" strokeWidth="1" />
                  <g transform="translate(18, 22)" stroke="#8A92A6" strokeWidth="1.3" fill="none">
                    <ellipse cx="7" cy="4" rx="7" ry="2.5" />
                    <path d="M0 4v9c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V4" />
                    <path d="M0 8.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
                  </g>
                  <text x="42" y="28" fill="#FFFFFF" fontSize="13" fontWeight="600" fontFamily="Geist, sans-serif">
                    Firestore
                  </text>
                  <text x="42" y="44" fill="#7A8498" fontSize="10.5" fontFamily="Geist Mono, monospace">
                    Firestore collection
                  </text>
                  <g transform="translate(108, -10)">
                    <rect x="0" y="0" width="66" height="20" rx="10" fill="#261A0C" stroke="#D97706" strokeWidth="1" />
                    <text x="33" y="13.5" textAnchor="middle" fill="#F59E0B" fontSize="9" fontWeight="700" fontFamily="Geist Mono, monospace">CHANGED</text>
                  </g>
                </g>
                {/* Vertical Lifeline 2 */}
                <line x1="390" y1="88" x2="390" y2="440" stroke="#222630" strokeWidth="1" strokeDasharray="4 6" />

                {/* Column 3 Card: sendBroadcastBulk */}
                <g transform="translate(552, 28)">
                  <rect x="0" y="0" width="186" height="60" rx="8" fill="#0E1612" stroke="#22C55E" strokeWidth="1" />
                  <text x="24" y="36" fill="#22C55E" fontSize="15" fontStyle="italic" fontFamily="serif" fontWeight="600">f</text>
                  <text x="40" y="28" fill="#FFFFFF" fontSize="12.5" fontWeight="600" fontFamily="Geist, sans-serif">
                    sendBroadcastBulk
                  </text>
                  <text x="40" y="44" fill="#7C8B82" fontSize="10.5" fontFamily="Geist Mono, monospace">
                    onWrite trigger
                  </text>
                  <g transform="translate(92, -10)">
                    <rect x="0" y="0" width="88" height="20" rx="10" fill="#0B2615" stroke="#22C55E" strokeWidth="1" />
                    <text x="26" y="13.5" textAnchor="middle" fill="#888888" fontSize="9" fontFamily="Geist Mono, monospace">new</text>
                    <text x="62" y="13.5" textAnchor="middle" fill="#4ADE80" fontSize="9" fontWeight="700" fontFamily="Geist Mono, monospace">NEW</text>
                  </g>
                </g>
                {/* Vertical Lifeline 3 */}
                <line x1="645" y1="88" x2="645" y2="440" stroke="#222630" strokeWidth="1" strokeDasharray="4 6" />

                {/* ── Message 1: enqueue broadcast job (Amber arrow queue -> Firestore) ── */}
                <path d="M 138 140 L 385 140" stroke="#D97706" strokeWidth="1.8" markerEnd="url(#arrow-amber)" />
                <circle r="3.5" fill="#F59E0B">
                  <animateMotion dur="2s" repeatCount="indefinite" path="M 138 140 L 385 140" />
                </circle>
                <g transform="translate(262, 140)">
                  <rect x="-62" y="-10" width="124" height="20" rx="10" fill="#1B140B" stroke="#4D3310" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#F59E0B" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    enqueue broadcast job
                  </text>
                </g>

                {/* ── Message 2: onWrite trigger (Green arrow Firestore -> sendBroadcastBulk) ── */}
                <path d="M 390 185 L 640 185" stroke="#22C55E" strokeWidth="1.8" markerEnd="url(#arrow-green)" />
                <circle r="3.5" fill="#4ADE80">
                  <animateMotion dur="2.2s" repeatCount="indefinite" path="M 390 185 L 640 185" />
                </circle>
                <g transform="translate(515, 185)">
                  <rect x="-48" y="-10" width="96" height="20" rx="10" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    onWrite trigger
                  </text>
                </g>

                {/* ── Message 3: GET suppression dump (Rightward) ── */}
                <path d="M 645 230 L 710 230" stroke="#22C55E" strokeWidth="1.8" />
                <g transform="translate(720, 230)">
                  <text x="0" y="3.5" fill="#22C55E" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    GET suppression dump
                  </text>
                </g>

                {/* ── Message 4: suppressed addresses (Dashed leftward arrow) ── */}
                <path d="M 715 275 L 650 275" stroke="#22C55E" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#arrow-green-rev)" />
                <g transform="translate(730, 275)">
                  <rect x="-4" y="-9" width="124" height="18" rx="9" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="58" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9" fontFamily="Geist Mono, monospace">
                    suppressed addresses
                  </text>
                </g>

                {/* ── Message 5: POST /email/batch · 500 msgs (Rightward) ── */}
                <path d="M 645 320 L 690 320" stroke="#22C55E" strokeWidth="1.8" />
                <g transform="translate(700, 320)">
                  <rect x="-4" y="-9" width="154" height="18" rx="9" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="73" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9" fontFamily="Geist Mono, monospace">
                    POST /email/batch · 500 msgs
                  </text>
                </g>

                {/* ── Message 6: per-message results (Dashed leftward arrow) ── */}
                <path d="M 715 365 L 650 365" stroke="#22C55E" strokeWidth="1.6" strokeDasharray="4 3" markerEnd="url(#arrow-green-rev)" />
                <g transform="translate(730, 365)">
                  <rect x="-4" y="-9" width="122" height="18" rx="9" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="57" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9" fontFamily="Geist Mono, monospace">
                    per-message results
                  </text>
                </g>

                {/* ── Message 7: write results (Green arrow sendBroadcastBulk -> Firestore) ── */}
                <path d="M 645 410 L 396 410" stroke="#22C55E" strokeWidth="1.8" markerEnd="url(#arrow-green-rev)" />
                <circle r="3.5" fill="#4ADE80">
                  <animateMotion dur="2.4s" repeatCount="indefinite" path="M 645 410 L 396 410" />
                </circle>
                <g transform="translate(520, 410)">
                  <rect x="-40" y="-10" width="80" height="20" rx="10" fill="#0D1F14" stroke="#1E4620" strokeWidth="1" />
                  <text x="0" y="3.5" textAnchor="middle" fill="#4ADE80" fontSize="9.5" fontFamily="Geist Mono, monospace">
                    write results
                  </text>
                </g>
              </svg>
            </div>
          )}

          {/* Simple Explanation Bar */}
          <div className="border-t border-[#1C1F26] px-4 sm:px-6 py-3 bg-[#080A0E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[#22C55E]">● Status:</span>
              <span className="text-[#EDEDED]">
                {activeTab === "architecture"
                  ? "Interactive graph: shows connected services and untested code."
                  : "Sequence flow: shows order of execution and asynchronous triggers."}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[#666666] self-end sm:self-auto shrink-0">
              <span className="text-[#4ADE80] font-medium">● Auto-flow active</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Simple Trust Strip ────────────────────────────────────── */}
      <div className="mt-14 pt-8 border-t border-[#181818] flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-[13px] text-[#777777] font-medium">
        <div className="flex items-center gap-2 hover:text-[#D4D4D4] transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          <span>No code stored on our servers</span>
        </div>
        <div className="flex items-center gap-2 hover:text-[#D4D4D4] transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
          <span>Works with any GitHub repository</span>
        </div>
        <div className="flex items-center gap-2 hover:text-[#D4D4D4] transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          <span>Installs in 30 seconds</span>
        </div>
        <div className="flex items-center gap-2 hover:text-[#D4D4D4] transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" />
          <span>100% Free for Open Source</span>
        </div>
      </div>

    </section>
  );
}
