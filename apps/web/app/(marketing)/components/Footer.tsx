import Link from "next/link";
import ContourLogo from "../../components/ContourLogo";
import { GITHUB_REPOSITORY_URL } from "@/lib/constants";

const PRODUCT = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/about" },
  { label: "Source on GitHub", href: GITHUB_REPOSITORY_URL },
];

const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
  { label: "Refunds and cancellations", href: "/refunds" },
  { label: "Digital delivery", href: "/delivery" },
  { label: "Contact", href: "/contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line px-4 pb-10 pt-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-medium">
            <ContourLogo size={24} />
            Contour
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-fg-2">Architecture and data-flow diagrams for every pull request</p>
        </div>
        {[
          { title: "Product", links: PRODUCT },
          { title: "Legal", links: LEGAL },
        ].map((group) => (
          <div key={group.title}>
            <p className="mb-4 text-sm font-medium">{group.title}</p>
            <ul className="space-y-3 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="link">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-6xl border-t border-line pt-6 text-[13px] text-fg-3">© 2026 Contour · MIT licensed</p>
    </footer>
  );
}
