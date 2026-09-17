const STEPS = [
  {
    num: "01",
    title: "Install the GitHub App with 1 click",
    body: "Add Contour to your GitHub repository in seconds. No complex config files, no secret keys to copy, and zero maintenance.",
    aside: "Free for open-source & public repos",
  },
  {
    num: "02",
    title: "Open a Pull Request like usual",
    body: "Whenever you or your team push code or open a PR, Contour automatically wakes up and analyzes which files changed.",
    aside: null,
  },
  {
    num: "03",
    title: "Contour creates your visual map",
    body: "In under 30 seconds, Contour traces how your backend, API, and database connect — and checks if you added tests.",
    aside: "Powered by smart AST analysis",
  },
  {
    num: "04",
    title: "Review the map right inside GitHub",
    body: "Contour leaves a clean interactive diagram in the PR comments. See what could break, approve with confidence, and merge.",
    aside: null,
  },
];

const SIMPLE_CHECKLIST = [
  { label: "Automatic", detail: "Runs automatically whenever new commits are pushed" },
  { label: "Safe",      detail: "Your private source code is never stored in any database" },
  { label: "Fast",      detail: "Ready in under 30 seconds — no slowdown to your CI tests" },
  { label: "Clear",     detail: "Anyone on your team can understand the PR at a glance" },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80 }} className="grid-cols-1 md:grid-cols-2">

        {/* Left: numbered steps */}
        <div>
          <p style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 20 }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: 40 }}>
            Simple to install.
            <br />
            Effortless to review.
          </h2>

          <div style={{ position: "relative" }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{
                display: "flex",
                gap: 24,
                paddingBottom: i < STEPS.length - 1 ? 36 : 0,
                position: "relative",
              }}>
                {/* Number + connector line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 4,
                    border: "1px solid var(--border-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12, fontWeight: 600,
                    color: "var(--text-secondary)",
                    background: "var(--bg-surface)",
                    flexShrink: 0,
                  }}>
                    {step.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "var(--border)", marginTop: 8 }} />
                  )}
                </div>

                <div style={{ paddingTop: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: "var(--text-primary)", marginBottom: 6 }}>
                    {step.title}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
                    {step.body}
                  </p>
                  {step.aside && (
                    <div style={{
                      marginTop: 8, fontSize: 11,
                      fontFamily: "'Geist Mono', monospace",
                      color: "var(--delta-new)",
                    }}>
                      ✓ {step.aside}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: simple guarantee block */}
        <div style={{ paddingTop: 40 }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--border)",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Geist Mono', monospace",
              color: "var(--text-secondary)",
            }}>
              Why developers love it
            </div>
            <div style={{ padding: "20px" }}>
              {SIMPLE_CHECKLIST.map((item, i) => (
                <div key={item.label} style={{
                  display: "flex",
                  gap: 16,
                  paddingBottom: i < SIMPLE_CHECKLIST.length - 1 ? 16 : 0,
                  marginBottom: i < SIMPLE_CHECKLIST.length - 1 ? 16 : 0,
                  borderBottom: i < SIMPLE_CHECKLIST.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--delta-new)",
                    minWidth: 80,
                    flexShrink: 0,
                  }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}>
                    {item.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, padding: "18px 20px", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              Works right inside GitHub
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
              You don't need to open another tab or learn another complicated dashboard.
              Contour posts the map right where your team already reviews code.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
