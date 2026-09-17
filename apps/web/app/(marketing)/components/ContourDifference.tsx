export default function ContourDifference() {
  return (
    <section id="features" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 16 }}>
            WHAT CONTOUR DOES DIFFERENTLY
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", margin: 0 }}>
            Drawing diagrams is nice.
            <br />
            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Warning you about critical bugs is what matters.</span>
          </h2>
        </div>

        {/* Three simple, friendly capabilities */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* 1. Risk Score */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 40,
            padding: "28px 0",
            borderTop: "1px solid var(--border)",
            alignItems: "start",
          }} className="grid-cols-1 md:grid-cols-[220px_1fr]">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--risk-high)", marginBottom: 4 }}>
                1. Danger Score (0–100)
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>
                Instantly shows what's risky
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="grid-cols-1 sm:grid-cols-2">
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
                Whenever a code change touches sensitive areas — like passwords, payment processing,
                or database tables — Contour marks it in bright orange or red so you know where to look first.
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  "Flags changes to payments, login, or security",
                  "Counts how many other files depend on this code",
                  "Warns you if a heavily-edited file is likely to break",
                ].map(pt => (
                  <li key={pt} style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--border-muted)", marginTop: 3, flexShrink: 0 }}>—</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 2. Untested Code Indicator */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 40,
            padding: "28px 0",
            borderTop: "1px solid var(--border)",
            alignItems: "start",
          }} className="grid-cols-1 md:grid-cols-[220px_1fr]">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--risk-low)", marginBottom: 4 }}>
                2. Missing Test Alerts
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>
                Catches untested changes
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 640 }}>
              Did someone write a new backend feature but forgot to write a test?
              Contour immediately tags it with a dashed <span style={{ color: "var(--risk-mid)", fontFamily: "'Geist Mono', monospace" }}>"no tests added"</span> warning
              so you don't accidentally ship untested code to production.
            </p>
          </div>

          {/* 3. Plain English Summaries */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 40,
            padding: "28px 0",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            alignItems: "start",
          }} className="grid-cols-1 md:grid-cols-[220px_1fr]">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--risk-mid)", marginBottom: 4 }}>
                3. Plain English Explanations
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "'Geist Mono', monospace" }}>
                No jargon or cryptic diffs
              </div>
            </div>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 640 }}>
              Instead of making you decrypt 400 lines of Git additions and deletions, Contour gives you a simple,
              one-sentence summary for each piece of code — like: <em>"Retries failed credit card charges up to 3 times before failing."</em>
            </p>
          </div>
        </div>

        {/* Clear Feature Comparison Table */}
        <div style={{ marginTop: 48, overflowX: "auto" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 16 }}>
            Comparison: What makes Contour different
          </div>
          <div style={{ minWidth: 500, display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", borderTop: "1px solid var(--border)" }}>
            {[
              ["Feature", "Standard GitHub Diff", "Contour"],
              ["Interactive visual diagram", "❌ Just raw text", "✅ Yes, animated"],
              ["Danger risk scores (0–100)", "❌ No", "✅ Yes, automatic"],
              ["Untested code warnings", "❌ No", "✅ Yes, flags missing tests"],
              ["Simple one-sentence summary", "❌ No", "✅ Yes, for every component"],
              ["Zero configuration required", "✅ Yes", "✅ Yes, install with 1 click"],
            ].map((row, ri) => (
              row.map((cell, ci) => (
                <div key={`${ri}-${ci}`} style={{
                  padding: "10px 16px",
                  fontSize: 13,
                  color: ri === 0 ? "var(--text-primary)" : ci === 0 ? "var(--text-secondary)" : ci === 1 ? "var(--text-dim)" : "var(--text-primary)",
                  fontWeight: ri === 0 ? 600 : 400,
                  background: ri === 0 ? "var(--bg-surface)" : ri % 2 === 0 ? "var(--bg-subtle)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                  borderRight: ci < 2 ? "1px solid var(--border)" : "none",
                }}>
                  {cell}
                </div>
              ))
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
