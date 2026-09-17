export default function ProblemFraming() {
  return (
    <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }} className="grid-cols-1 md:grid-cols-2">

        {/* Left: argument */}
        <div>
          <p style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", color: "var(--text-dim)", letterSpacing: "0.08em", marginBottom: 20 }}>
            WHY REVIEWS ARE HARD TODAY
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.22, letterSpacing: "-0.025em", color: "var(--text-primary)", marginBottom: 20 }}>
            Code is fast to write.
            <br />
            Reviewing it is still painful.
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 16 }}>
            Whether code is written by ChatGPT, Cursor, or your coworkers, Pull Requests
            are getting larger and harder to follow. Reading 500 lines across 15 separate files
            makes it nearly impossible to spot breaking changes.
          </p>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75 }}>
            Saying "Looks good to me" shouldn't be a shot in the dark.
            Contour gives you a high-level visual map so you immediately know what parts
            are safe and what parts need careful testing.
          </p>
        </div>

        {/* Right: three plain-English stats */}
        <div style={{ paddingTop: 20 }}>
          {[
            {
              figure: "68%",
              text: "of developers say modern AI-assisted PRs are much harder to review thoroughly",
              color: "var(--risk-high)",
            },
            {
              figure: "4.7×",
              text: "higher chance of missing a silent bug when reviewing large multi-file diffs",
              color: "var(--risk-mid)",
            },
            {
              figure: "0 sec",
              text: "time required to understand how changed files connect with Contour's automatic map",
              color: "var(--risk-low)",
            },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex",
              gap: 20,
              paddingBottom: 28,
              marginBottom: 28,
              borderBottom: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 30,
                fontWeight: 700,
                color: item.color,
                minWidth: 80,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}>
                {item.figure}
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65, margin: 0, paddingTop: 4 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
