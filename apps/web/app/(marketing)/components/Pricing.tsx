"use client";

import { useState } from "react";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";

/*
  Pricing — 3 real tiers (Free / Team / Enterprise) because the product
  genuinely has three distinct customer groups. Team is highlighted because
  it's the tier that funds the company, not because "middle tier is always best".
  No "Most Popular" capsule badge. No three-column mirror-image layout.
  Annual toggle reduces price — the actual discount is shown.
*/

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: { monthly: "$0", annually: "$0" },
    for: "Public open-source repos",
    features: [
      "Unlimited public repo analyses",
      "Architecture + coverage lenses",
      "Behavior delta descriptions",
      "Gemini as the LLM (default)",
    ],
    cta: "Install free",
    href: GITHUB_APP_INSTALL_URL,
    highlight: false,
  },
  {
    id: "team",
    name: "Team",
    price: { monthly: "$16", annually: "$13" },
    per: "/ dev / month",
    for: "Private repos, growing teams",
    features: [
      "Everything in Free",
      "Unlimited private repo analyses",
      "Cross-PR hotspot memory",
      "Claude and OpenAI provider support",
      "Bring your own LLM API key",
      "Sensitivity tuning per repo",
    ],
    cta: "Start 14-day trial",
    href: GITHUB_APP_INSTALL_URL,
    highlight: true,
    highlightReason: "This tier funds development and is the right fit for most teams.",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: { monthly: "Custom", annually: "Custom" },
    for: "Large orgs with compliance needs",
    features: [
      "Everything in Team",
      "SSO / SAML",
      "Self-hosted LLM support",
      "SOC 2 report on request",
      "SLA commitment",
      "Dedicated support channel",
    ],
    cta: "Contact us",
    href: "mailto:enterprise@contour.dev",
    highlight: false,
  },
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "annually">("monthly");

  return (
    <section id="pricing" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 14 }}>
              PRICING
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: 0 }}>
              Free for open source. Paid for private.
            </h2>
          </div>

          {/* Billing toggle */}
          <div style={{ display: "flex", gap: 2, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, padding: 3 }}>
            {(["monthly", "annually"] as const).map(opt => (
              <button
                key={opt}
                id={`billing-${opt}`}
                onClick={() => setBilling(opt)}
                style={{
                  fontSize: 13,
                  padding: "5px 14px",
                  borderRadius: 4,
                  border: "none",
                  background: billing === opt ? "var(--bg-raised)" : "transparent",
                  color: billing === opt ? "var(--text-primary)" : "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 160ms",
                }}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                {opt === "annually" && billing === opt && (
                  <span style={{ fontSize: 11, color: "var(--delta-new)", fontFamily: "'IBM Plex Mono', monospace" }}>
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
          {PLANS.map(plan => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              style={{
                background: plan.highlight ? "var(--bg-raised)" : "var(--bg-surface)",
                border: `1px solid ${plan.highlight ? "var(--border-muted)" : "var(--border)"}`,
                borderRadius: 6,
                padding: 24,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace", marginBottom: 16 }}>
                  {plan.for}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "'IBM Plex Mono', monospace",
                    letterSpacing: "-0.02em",
                  }}>
                    {billing === "annually" ? plan.price.annually : plan.price.monthly}
                  </span>
                  {plan.per && (
                    <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{plan.per}</span>
                  )}
                </div>
              </div>

              <ul style={{ margin: "0 0 24px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--border-muted)", flexShrink: 0, marginTop: 2 }}>—</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                target={plan.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "9px 16px",
                  borderRadius: 5,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  background: plan.highlight ? "var(--accent)" : "transparent",
                  color: plan.highlight ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${plan.highlight ? "var(--accent)" : "var(--border-muted)"}`,
                  transition: "opacity 160ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", marginTop: 24 }}>
          14-day trial on private repos. No credit card required.
        </p>

      </div>
    </section>
  );
}
