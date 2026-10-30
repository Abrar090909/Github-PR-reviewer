"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import ContourLogo from "../../components/ContourLogo";
import { GITHUB_APP_INSTALL_URL, GITHUB_REPOSITORY_URL } from "@/lib/constants";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ease-out ${
        scrolled || menuOpen ? "border-line bg-ink-900/90 backdrop-blur-md" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[calc(72rem+48px)] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-medium">
          <ContourLogo size={28} />
          Contour
        </Link>

        <div className="hidden items-center gap-8 text-sm md:flex">
          {LINKS.map((item) => (
            <a key={item.href} href={item.href} className="link">
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a href={GITHUB_REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="link hidden text-sm sm:inline">
            Source
          </a>
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary hidden h-9 px-4 sm:inline-flex">
            Add to GitHub
          </a>
          <button
            type="button"
            className="btn-secondary h-9 w-9 px-0 md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-navigation" className="border-t border-line px-4 pb-4 pt-2 md:hidden">
          {[...LINKS, { label: "Source", href: GITHUB_REPOSITORY_URL }].map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex h-11 items-center rounded-lg px-3 text-[15px] text-fg-2 hover:bg-ink-800 hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="btn-primary mt-2 w-full sm:hidden">
            Add to GitHub
          </a>
        </div>
      )}
    </nav>
  );
}
