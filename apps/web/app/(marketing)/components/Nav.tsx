"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ContourLogo from "../../components/ContourLogo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderBottom: scrolled ? "1px solid #1F1F1F" : "1px solid transparent",
        background: scrolled ? "rgba(0, 0, 0, 0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        transition: "background 200ms ease, border-color 200ms ease",
      }}
    >
      <div className="nav-inner" style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Brand */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <ContourLogo size={36} />
          <span style={{ fontWeight: 600, fontSize: 16, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            Contour
          </span>
        </Link>

        {/* Links — desktop only */}
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{ fontSize: 13, color: "#888888", textDecoration: "none", transition: "color 150ms" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#EDEDED")}
              onMouseLeave={e => (e.currentTarget.style.color = "#888888")}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* GitHub Star Pill Button matching reference */}
        <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <a
            className="nav-star"
            href="https://github.com/Abrar090909/Github-PR-reviewer"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 13,
              fontWeight: 500,
              color: "#EDEDED",
              background: "#111111",
              border: "1px solid #2B2B2B",
              padding: "6px 14px",
              borderRadius: 9999,
              textDecoration: "none",
              transition: "border-color 150ms, background 150ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#444444";
              e.currentTarget.style.background = "#181818";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#2B2B2B";
              e.currentTarget.style.background = "#111111";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Star on GitHub</span>
          </a>
          <button
            className="mobile-nav-toggle md:hidden"
            type="button"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="mobile-nav-panel md:hidden" id="mobile-navigation">
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
          ].map((item) => (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
