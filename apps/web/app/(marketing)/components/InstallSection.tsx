"use client";

import { useState } from "react";
import { GITHUB_APP_INSTALL_URL } from "@/lib/constants";

/*
  Install section — two real options with honest capability descriptions.
  No 4-column-footer-style info layout.
  No fake terminal window.
  Arrows removed — install buttons describe themselves without a directional cue.
*/

export default function InstallSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText("npx skills add contour");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="install" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 14 }}>
            GET STARTED
          </p>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: "0 0 10px" }}>
            Two ways to install
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: 0 }}>
            GitHub App for automatic PR analysis. AI agent skill for local runs.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Option 1: GitHub App */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-muted)",
            borderRadius: 6,
            padding: 28,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              GitHub App
            </div>
            <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-dim)", marginBottom: 16 }}>
              recommended
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 24 }}>
              Install once; every PR in the selected repositories gets a risk-scored
              architecture comment automatically. No secrets to add to your repo —
              Contour manages its own credentials.
            </p>

            <a
              href={GITHUB_APP_INSTALL_URL}
              id="install-github-app-cta"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 18px",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 5,
                textDecoration: "none",
                transition: "opacity 160ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
              Install on GitHub
            </a>
          </div>

          {/* Option 2: AI agent skill */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 28,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              AI agent skill
            </div>
            <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--text-dim)", marginBottom: 16 }}>
              Cursor · Claude Code · Copilot
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 24 }}>
              Run Contour locally as part of your AI coding agent workflow. Analyzes
              the current branch diff and outputs the diagram to your terminal or
              attaches it to the PR you're about to open.
            </p>

            <button
              onClick={copy}
              id="copy-npx-command"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "9px 14px",
                background: "var(--bg-base)",
                border: "1px solid var(--border-muted)",
                borderRadius: 5,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "border-color 160ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-muted)")}
            >
              <span>$ npx skills add contour</span>
              <span style={{ fontSize: 11, color: copied ? "var(--delta-new)" : "var(--text-dim)" }}>
                {copied ? "copied" : "copy"}
              </span>
            </button>
          </div>
        </div>

        {/* Security facts — not bullet-and-checkmark template */}
        <div style={{
          marginTop: 32,
          padding: "16px 24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          display: "flex",
          gap: 40,
          flexWrap: "wrap",
        }}>
          {[
            "Free for public repos",
            "No source code stored in the database",
            "Webhook verified by HMAC-SHA256",
            "Uninstall removes all stored data",
          ].map((fact, i) => (
            <span key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {fact}
            </span>
          ))}
        </div>

      </div>
    </section>
  );
}
