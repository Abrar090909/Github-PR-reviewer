# Contour — UI/UX Specification
### Landing Page & In-GitHub Visualization

Reference: PR Lens (prlens.dev) — dark canvas, animated dashed-line data flow, and a signature circular "lens" that reveals the diagram floating over the raw diff text. Contour reuses the *interaction logic* (flow direction, before/after reveal) but not the *visual language*. Where PR Lens is dark, glowing, and canvas-like, Contour is light, dense, and dashboard-like — closer to Linear/Vercel than to a terminal.

---

## 1. Design Principles (How Contour Differs, Deliberately)

| Dimension | PR Lens | Contour |
|---|---|---|
| Base theme | Dark canvas (`#010409`), glowing neon edges | Light-first dashboard (`#FAFAFA` base), ink-on-paper contrast |
| Node style | Dark cards, colored outline border denotes delta | Light cards, colored **left-edge bar** denotes delta (quieter, scannable) |
| Signature reveal | Circular magnifying "lens" dragged over the raw diff | A **risk halo** — a soft radial glow that blooms outward from a node on hover, sized by risk score, not a literal lens shape |
| Edge animation | Dashed lines with traveling glow dot, always-on | Thin solid lines by default; animated flow-dots only appear on hover/focus (reduces always-on motion fatigue) |
| Data density | Sparse, cinematic, one idea per screen | Dense, data-forward — risk score, coverage badge, and behavior delta visible without a click |
| Color role | Color = decoration/mood | Color = strict semantic signal (risk score gradient, coverage state) — never purely decorative |

**Rationale:** PR Lens is optimized to feel impressive on first view (a demo/marketing motion). Contour is optimized to be scanned daily by someone triaging 8 PRs before standup — density and semantic color carry more weight than cinematic reveal.

---

## 2. Landing Page — Structure & UX

### 2.1 Section Map

1. **Hero** — headline + live interactive diagram (not a lens-drag, see 2.2)
2. **Problem framing** — "You didn't write this PR. Can you still review it?" — short, direct copy contrasting AI-generated code volume vs. reviewer bandwidth
3. **The Contour difference** — 3-column comparison: Visualize / Score Risk / Flag Untested — this is the section that most differs from PR Lens, since risk + coverage are Contour's wedge, not diagramming alone
4. **Live example walkthrough** — a real OSS PR redrawn with risk scores and coverage flags overlaid (equivalent to PR Lens's "Hall of Fame," but every example must show at least one flagged high-risk, untested node — the point is to demonstrate the wedge, not just the render)
5. **How it works** — 4-step horizontal flow (Install → PR opens → Contour comments → You review what matters), icons only, no diagram jargon
6. **Install / Setup section** — GitHub App CTA + `npx skills add` one-liner, mirroring the dual install paths shown in the reference (App vs. Action)
7. **Pricing** — free-for-OSS / paid-for-private, single toggle, no dark patterns
8. **Footer** — GitHub link, docs link, changelog

### 2.2 Hero Interaction (Contour's signature moment, replacing the "lens drag")

Instead of a circular lens the user drags over static diff text (PR Lens's mechanic), Contour's hero shows:

- A code diff panel on the left (static, dimmed to ~40% opacity — legible but visually secondary)
- A **risk-scored node graph** on the right, always rendered, already "revealed"
- On scroll or hover over any node, a **soft radial gradient halo** blooms behind that node — halo radius and color intensity are literally driven by the node's risk score (a 90-risk node blooms wide and warm-orange; a 10-risk node barely glows, cool gray-blue)
- A thin animated flow-dot travels along the edge connected to the hovered node only — not the whole graph at once (contrast with PR Lens's always-animated full-graph motion)

This keeps the "reveal structure behind the diff" idea from the reference, but reframes the reveal around *risk*, not *shape alone* — reinforcing the product's core differentiator in the very first interaction a visitor has.

### 2.3 Visual System

- **Typography:** a single geometric sans (e.g., Inter or Geist) for UI text; a monospace (e.g., JetBrains Mono) reserved strictly for code/diff content — never used for headlines, to avoid the "terminal aesthetic" PR Lens leans into.
- **Color tokens:**
  - Background: `#FAFAFA` (light), `#0B0D10` (dark mode toggle, optional v2)
  - Risk gradient: `#3B82F6` (0–30, low) → `#F59E0B` (31–70, medium) → `#DC2626` (71–100, high) — a continuous gradient, not three hard buckets, applied consistently to halos, badges, and score text
  - Delta colors: New `#16A34A`, Changed `#D97706`, Removed `#DC2626` (kept close to conventional git colors so reviewers don't have to relearn a palette)
  - Coverage indicator: solid teal dot = covered, hollow gray dot = none-in-diff, no dot = not applicable
- **Motion:** all animation capped at 200–300ms ease-out for UI chrome; the flow-dot travel animation runs at a fixed 1.5s loop, only while a node is focused/hovered — motion is a *response to attention*, not ambient decoration.
- **Accessibility:** risk gradient never relies on color alone — every risk badge also carries a numeric score and a text label ("High," "Medium," "Low"); coverage dots always paired with a text label on hover/focus, not color-only.

---

## 3. In-GitHub Visualization — Structure & UX

This is the sticky PR comment — the highest-frequency touchpoint, seen dozens of times a week by an active user. GitHub strips `<script>` tags from rendered comments, so **everything here must work as static SVG + `<animateMotion>` markup only** (matching the reference's own constraint) — no JS-dependent interactivity inside the comment itself.

### 3.1 Comment Anatomy (top to bottom)

1. **Header bar:** bot identity, "commented Xm ago," commit SHA — plain GitHub comment chrome, unstyled (not a Contour design surface)
2. **Summary strip:** a single-line badge row — `● 3 new · ● 1 changed · ● 1 removed · Overall risk: 62 (Medium) · 2 files without test coverage` — this is Contour's equivalent of PR Lens's `+3 new · ~1 changed · -1 removed` strip, but with the risk/coverage summary appended, since that's the information a reviewer needs before deciding whether to open the full canvas
3. **Architecture lens (default view):** node-and-lane diagram, same lane structure as the reference (API / Services / Data columns), but:
   - Each node's **left edge** carries a 4px color bar for delta (new/changed/removed) — quieter than a full colored outline
   - Each node carries a small circular **risk chip** in its top-right corner (numeric score, color per the gradient) — always visible, not requiring a click
   - Nodes with zero test coverage in this diff get a small dashed-outline "untested" tag beneath the label
4. **Behavior delta line(s):** directly beneath the diagram, one short plain-English sentence per high-risk node only (not every node — keeps the comment scannable): *"checkout-service: now retries failed charges up to 3× instead of failing immediately (risk 78, no test in this PR)."*
5. **Data flow lens (toggle, collapsed by default):** sequence-style swimlane view, same visual grammar as the reference's data-flow diagram (vertical lifelines, horizontal labeled arrows) — collapsed by default in Contour since architecture + risk is the primary view; data flow is secondary detail, not the default
6. **"Open full canvas" link:** takes the reviewer to the web dashboard for pan/zoom/drill-down and the animated "walk the change" playback — the comment itself stays static and information-dense rather than trying to be fully interactive within GitHub's constraints

### 3.2 Node Card Anatomy (SVG)

```
┌───────────────────────────────┐
│▐ label text            (78)●  │  ← left color bar (delta), risk chip top-right
│▐ sublabel / path               │
│▐ ○ untested                    │  ← only rendered if testCoverage = none-in-diff
└───────────────────────────────┘
```

- Card background: white/`#FFFFFF` with a 1px `#E5E7EB` border (light mode default) — legible against both GitHub's light and dark comment themes without needing a separate dark variant, since the SVG is embedded as a flat image either way.
- Risk chip: filled circle, color per gradient, white numeral, positioned consistently top-right across all nodes for fast left-to-right, top-to-bottom scanning.

### 3.3 Edge / Flow Animation (SVG-only, matches reference's technical constraint)

- Edges are thin (`1.5px`) solid lines by default — not dashed — reserving dashed strokes exclusively for **removed** connections (matching the git-diff convention already established for delta colors).
- A small circular dot travels along each edge using `<animateMotion>`, looping every 2.5s, so motion still reads in a static GitHub comment exactly as it does in the reference — but only on edges touching a **changed or new** node; edges between two untouched nodes render static, reducing visual noise on large graphs.
- On the web dashboard's "walk the change" mode (JS-enabled, outside the GitHub comment), the same edges instead animate sequentially in causal order, controlled by a play/pause bar and the `W` keyboard shortcut — same UX pattern as the reference, different visual skin (light background, ink-colored playback scrubber instead of a dark video-style bar).

### 3.4 Scaling Rules (large PRs / monorepos)

Matching the reference's "it scales with the diff" principle:
- 1 file / 1 lane touched → render a single compact node, no lanes shown
- Multi-lane feature → full lane view as above
- Monorepo-scale (6+ lanes) → collapse to a lane-level summary first (`API: 2 changed · Services: 4 new · Data: 1 changed`), with a "Show all 37 components" expand link in the comment rather than rendering an oversized diagram inline — protects comment load time and reviewer scan time.

---

## 4. Component Inventory (for implementation handoff)

| Component | Used in | States |
|---|---|---|
| `RiskChip` | Both | 0–30 / 31–70 / 71–100 (color + numeral, always both) |
| `DeltaBar` | Both | new / changed / removed (color only, 4px, left edge of card) |
| `CoverageTag` | GitHub comment, dashboard | covered (hidden) / none-in-diff (dashed tag) / not-applicable (hidden) |
| `RiskHalo` | Landing page hero, dashboard hover | radius + color driven by riskScore, 0 on unfocused nodes |
| `FlowDot` | Both (SVG `animateMotion`) | only on edges touching changed/new nodes |
| `SummaryStrip` | GitHub comment header | counts + overall risk + untested-file count |
| `PlaybackBar` | Dashboard only (not in GitHub comment) | play / pause / step, keyboard `W` |

---

## 5. What We Deliberately Did Not Copy From PR Lens

- The dark, cinematic canvas aesthetic — Contour is a daily-use triage tool, not a demo-first product; density beats spectacle here.
- Always-on ambient animation across the whole graph — Contour animates only what the reviewer is currently attending to, to avoid motion fatigue in a comment seen dozens of times a day.
- The literal circular lens-drag mechanic — reused the underlying idea (reveal structure over raw code) but re-expressed it as a risk-driven halo, since risk (not shape) is Contour's differentiator and the hero interaction should teach that in the first five seconds.
