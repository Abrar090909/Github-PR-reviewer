"use client";

/*
  Footer — structured around what the product actually links to.
  Not 4 equal columns (Product / Company / Resources / Legal template).
  Two groups: useful links for users, and the minimal legal/contact.
*/

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "48px 24px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>

          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <rect x="1" y="5" width="9" height="12" rx="2" fill="#3B82F6" opacity="0.9"/>
                <rect x="6" y="2" width="9" height="12" rx="2" fill="#E6EDF3" opacity="0.15"/>
                <rect x="12" y="8" width="9" height="12" rx="2" fill="#58A6FF" opacity="0.6"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Contour</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 18, maxWidth: 220 }}>
              Risk-scored architecture maps for every pull request.
            </p>
            <div style={{ display: "flex", gap: 14 }}>
              <a href="https://github.com/contour-dev/contour" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--text-dim)", textDecoration: "none", transition: "color 160ms" }}
                aria-label="GitHub"
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Product links — things users actually navigate */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Product</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Features",    href: "#features"     },
                { label: "How it works",href: "#how-it-works" },
                { label: "Pricing",     href: "#pricing"      },
                { label: "Changelog",   href: "/changelog"    },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", transition: "color 160ms" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Legal and contact */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Legal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Privacy Policy",    href: "/privacy"                   },
                { label: "Terms of Service",  href: "/terms"                     },
                { label: "Security",          href: "/security"                  },
                { label: "Contact",           href: "mailto:hello@contour.dev"   },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", transition: "color 160ms" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-dim)" }}>
          <span>© 2026 Contour</span>
          <span>Built with Next.js · Deployed on Vercel</span>
        </div>

      </div>
    </footer>
  );
}
