# Contour — AI-Native PR Risk & Architecture Copilot
### Solo-Founder Product & Technical Plan

---

## 1. Executive Summary

**One-liner:** Contour turns every pull request into a risk-scored architecture map — so reviewers see not just *what* changed, but *what could break* and *what's untested*, directly inside GitHub.

**Positioning vs. PR Lens (the inspiration):** PR Lens solved visualization — it draws the shape of a diff as an animated diagram. It does this well. But it stops at "here's what changed." Contour goes one step further: **"here's what changed, how risky it is, and what's not covered by tests."** Same underlying category (reduce cognitive load reviewing AI-generated PRs), different core value prop (risk + coverage intelligence, not just visualization), different UI (light, dense-data dashboard aesthetic instead of dark animated canvas).

**Target user:** Solo devs and small teams (2–15 engineers) shipping fast with AI coding agents (Cursor, Claude Code, Copilot), who no longer trust "I wrote every line" review habits and need a fast way to know *where to look*.

---

## 2. The Gap in the Market

| What exists (PR Lens) | What's missing (Contour's wedge) |
|---|---|
| Draws diagram of structural change | Doesn't say how *risky* the change is |
| Shows "what changed" | Doesn't show "what's untested" |
| Single-PR snapshot | No memory across PRs (no hotspot tracking) |
| Gemini-only backend | No multi-provider flexibility |
| Visualization-first | No actionable review checklist |

Contour's thesis: **visualization is a commodity feature; risk intelligence is the moat.** Any team can render a diff as a graph. Very few tools tell a reviewer *"stop and actually read this function — it touches billing and has zero test coverage."*

---

## 3. Product Differentiation (Core Features)

1. **Blast Radius Score** — every changed node (function/route/service) gets a 0–100 risk score based on: fan-in (how many callers), whether it touches auth/payment/data-write paths, and historical churn (how often this file has broken things before).
2. **Test Coverage Overlay** — cross-references the diff against the repo's test files; visually flags changed logic with zero corresponding test touch in the same PR.
3. **Behavior Delta, in English** — one LLM-generated sentence per changed function: *"Previously threw on null input; now silently returns undefined."* This is the single highest-value differentiator for AI-generated code, where structural diffs look clean but behavior silently shifts.
4. **Hotspot Memory** — a lightweight history store tracks which services get touched most often and how often those PRs later needed a hotfix, surfaced as a small trend indicator next to the node.
5. **Multi-provider LLM support** — Claude, Gemini, OpenAI, or self-hosted — key bring-your-own from day one, not an afterthought.
6. **Distinct UI** — light-mode-first, dense dashboard grid (think Linear/Vercel dashboard aesthetic), not the dark animated-canvas look. Static-by-default diagrams with an optional "walk the change" playback, rather than always-animated.

---

## 4. How It Works (End-to-End Pipeline)

```
Developer opens/updates PR
        │
        ▼
GitHub sends "pull_request" webhook event (opened, synchronize)
        │
        ▼
[Webhook Receiver] — verifies HMAC signature, enqueues job, returns 200 immediately
        │
        ▼
[Job Queue] — async worker picks up job (avoids GitHub's 10s webhook timeout)
        │
        ▼
[Diff Fetcher] — pulls the unified diff + changed file list via GitHub API
        │
        ▼
[Static Parser] — AST-parses changed files (per language) to extract functions/
  routes/exports touched, and cross-references test files that import them
        │
        ▼
[LLM Analysis Service] — sends structured diff + parsed symbols to Claude/Gemini/
  OpenAI with a strict JSON schema prompt → returns nodes, edges, risk scores,
  behavior-delta sentences
        │
        ▼
[Risk Scorer] — merges LLM output with static signals (fan-in count from call
  graph, historical churn from Hotspot DB) into final blast-radius score
        │
        ▼
[Renderer] — deterministic JSON-schema → SVG (own lightweight renderer, no
  headless browser) — architecture lens + coverage lens
        │
        ▼
[GitHub Comment Poster] — creates or updates one sticky comment on the PR
  with the rendered SVG + risk summary + "walk the change" link
        │
        ▼
[Hotspot DB] — logs this PR's touched services/files for future churn scoring
```

---

## 5. Architecture

### 5.1 High-Level System Diagram (textual)

```
┌─────────────┐     webhook      ┌──────────────────┐
│   GitHub    │ ───────────────▶ │  Webhook Receiver │  (Next.js API route,
│ (PR events) │                  │  + HMAC verify    │   stateless, Vercel)
└─────────────┘                  └────────┬──────────┘
                                           │ enqueue
                                           ▼
                                  ┌──────────────────┐
                                  │   Job Queue       │  (Upstash Redis / QStash)
                                  └────────┬──────────┘
                                           ▼
                                  ┌──────────────────┐
                                  │  Worker (async)   │  (Vercel Function /
                                  │                    │   Fly.io / Railway)
                                  └────────┬──────────┘
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
            ┌────────────────┐   ┌──────────────────┐  ┌──────────────────┐
            │  GitHub API     │   │  LLM Provider(s)  │  │  Hotspot DB       │
            │  (diff, files)  │   │  Claude/Gemini/   │  │  (Postgres/       │
            │                 │   │  OpenAI           │  │   Supabase)       │
            └────────────────┘   └──────────────────┘  └──────────────────┘
                     │                     │                     │
                     └─────────────┬───────┴─────────────┬───────┘
                                    ▼                     
                          ┌──────────────────┐
                          │  Renderer          │  (pure function, JSON → SVG,
                          │  (own package)     │   zero external deps)
                          └────────┬───────────┘
                                   ▼
                          ┌──────────────────┐
                          │  Comment Poster    │  → posts/updates sticky
                          │                    │    comment on the PR
                          └────────────────────┘
```

### 5.2 Component Breakdown

| Component | Responsibility | Suggested Tech |
|---|---|---|
| Webhook Receiver | Verify signature, ack fast, enqueue | Next.js API route (Vercel) |
| Job Queue | Decouple slow work from webhook timeout | Upstash Redis + QStash, or BullMQ |
| Worker | Orchestrates fetch → parse → LLM → render → post | Node.js worker (Vercel Function or small container) |
| Diff Fetcher | Pull PR diff, file list, existing comment ID | Octokit (GitHub REST/GraphQL SDK) |
| Static Parser | AST parse changed files, build local call graph, find test references | `ts-morph` (TS/JS), `tree-sitter` (multi-language) |
| LLM Analysis Service | Turn diff + parsed symbols into structured JSON (nodes/edges/behavior deltas) | Claude API / Gemini / OpenAI, schema-constrained output |
| Risk Scorer | Combine LLM risk hints + fan-in + churn history into 0–100 score | Plain TS logic, no LLM needed here |
| Renderer | Deterministic schema → SVG | Custom package (own IP, like PR Lens's renderer) |
| Comment Poster | Create/update the sticky GitHub comment | Octokit |
| Hotspot DB | Store per-file/service touch history + past incident tags | Postgres (Supabase) |
| GitHub App | Auth, install flow, permission scoping | GitHub Apps platform (registered once, not built) |

### 5.3 Data Contract (Schema, LLM output)

```json
{
  "kind": "graph",
  "lenses": ["architecture", "coverage"],
  "nodes": [
    {
      "id": "checkout-service",
      "label": "checkout-service",
      "delta": "modified",
      "riskScore": 78,
      "riskReasons": ["touches payment path", "3 callers", "no test in this PR"],
      "behaviorDelta": "Now retries failed charges up to 3x instead of failing immediately.",
      "testCoverage": "none-in-diff"
    }
  ],
  "edges": [
    { "from": "checkout-api", "to": "checkout-service", "label": "POST /charge" }
  ]
}
```

---

## 6. Security (Production-Grade, Non-Negotiable)

1. **Webhook signature verification** — every incoming GitHub webhook must be validated against `X-Hub-Signature-256` using the app's webhook secret (HMAC-SHA256, constant-time comparison). Reject anything that fails this before any processing.
2. **GitHub App least-privilege permissions** — request only: Read access to code/metadata, Read+write to checks/PRs. No admin, no repo-delete, no billing scopes.
3. **No permanent code storage** — diffs and file contents are processed in-memory/ephemeral queue only; nothing beyond the structured JSON output (nodes/edges/scores) and file *paths* touch the database. Raw source code is never persisted to disk or DB.
4. **LLM data handling** — use providers with API-tier data-retention opt-outs (Anthropic/OpenAI enterprise APIs don't train on API data by default) and state this explicitly in your privacy policy. For paying customers, offer a "bring your own key" mode so their code never even transits your infrastructure's LLM billing account.
5. **Secrets management** — GitHub App private key, webhook secret, and LLM API keys stored in a secrets manager (Vercel encrypted env vars for MVP; migrate to Doppler/AWS Secrets Manager as you scale), never in source control, rotated on any suspected leak.
6. **Idempotency** — GitHub retries webhook deliveries; dedupe on `X-GitHub-Delivery` header ID so a retried event doesn't double-post a comment or double-charge LLM calls.
7. **Rate limiting & abuse prevention** — cap jobs per installation per hour; a malicious or runaway repo (huge monorepo PRs, bot-generated PR storms) shouldn't be able to exhaust your LLM budget or GitHub API rate limit.
8. **Sandboxed parsing** — AST parsing of untrusted user code should run in a resource-limited, timeout-bound worker process — never `eval` or execute the PR's actual code.
9. **Least-privilege DB access** — worker uses a scoped DB role (read/write only to its own tables), not a superuser connection string.
10. **Audit logging** — log every webhook received, job processed, and comment posted (metadata only, not code content) for debugging and incident response.
11. **Uninstall = data deletion** — when a GitHub App is uninstalled from a repo, purge that installation's Hotspot DB rows within a defined SLA (e.g., 30 days) — this matters for trust and for GDPR-style expectations even if you're not formally regulated yet.

---

## 7. Production Operations

- **Observability:** structured logging (pino/winston) + a lightweight APM (Sentry for errors, Axiom or Better Stack for logs) — a solo founder needs to *see* failures without babysitting servers.
- **Retries with backoff:** LLM calls and GitHub API calls should retry on 429/5xx with exponential backoff; after N failures, post a graceful fallback comment ("Contour couldn't analyze this PR — retrying shortly") rather than silent failure.
- **Cost control:** LLM tokens are your primary variable cost. Cap max diff size sent to the LLM (chunk huge PRs, summarize instead of sending 10k-line diffs raw); cache results keyed by commit SHA so re-runs of an unchanged PR don't re-bill.
- **Scaling path:** MVP runs fine on Vercel Functions + Upstash Redis + Supabase Postgres — all serverless, near-zero idle cost, which matters pre-revenue. Move heavy AST parsing to a dedicated worker (Railway/Fly.io) only once volume demands it.
- **Large PR / monorepo handling:** same principle as PR Lens — degrade gracefully. One file changed → minimal render. Huge diff → group by directory/lane and only deep-analyze the highest-risk files (by fan-in/history), summarizing the rest.

---

## 8. Tech Stack (Matched to Existing Skillset)

| Layer | Choice | Why |
|---|---|---|
| Web app / dashboard | Next.js 15 + TypeScript + Tailwind | Already your daily stack |
| Webhook + API routes | Next.js API routes on Vercel | Zero new infra to learn |
| Queue | Upstash Redis (QStash) | Serverless-friendly, pay-per-use |
| Database | Supabase (Postgres) | Already used in your other projects |
| GitHub integration | Octokit + GitHub Apps | Standard, well-documented |
| AST parsing | `ts-morph` (TS/JS first), expand via `tree-sitter` later | Fast to ship a JS/TS-only MVP |
| LLM | Claude API primary (your existing integration experience), pluggable for Gemini/OpenAI | Multi-provider from day one is the differentiator |
| Renderer | Custom TypeScript package, pure function → SVG | Matches PR Lens's "zero dependency, deterministic" approach; becomes your own IP |
| Hosting | Vercel (app) + Supabase (DB) + Upstash (queue) | Minimal ops overhead for a solo founder |

---

## 9. MVP Scope (Buildable Solo, ~4–6 Weeks)

**Phase 1 (Weeks 1–2): Core pipeline, JS/TS repos only**
- GitHub App registration + webhook receiver + signature verification
- Diff fetch + basic AST parse (function/route level only)
- Single LLM call → structured JSON (nodes/edges/risk score, no coverage yet)
- Static renderer → SVG, posted as one PR comment

**Phase 2 (Weeks 3–4): Differentiators**
- Test coverage overlay (does the diff touch a file with no corresponding test change)
- Behavior-delta sentence per changed function
- Hotspot DB (basic churn tracking per file)

**Phase 3 (Weeks 5–6): Polish & launch**
- Distinct UI/branding pass (light dashboard aesthetic)
- Multi-provider LLM toggle (Claude default, Gemini/OpenAI optional)
- Landing page + "Hall of Fame" gallery (redraw 3–4 famous OSS PRs, same trick PR Lens used for social proof)
- Ship free-for-open-source, paid tier for private repos

---

## 10. Business Model (Solo-Founder Lens)

- **Free tier:** unlimited use on public/open-source repositories (drives GitHub-native distribution and social proof, exactly like PR Lens's "Hall of Fame" gallery strategy).
- **Paid tier:** private repos, priced per seat or per repo (e.g., $12–20/dev/month), with a "bring your own LLM key" discount tier for cost-sensitive teams.
- **Distribution:** GitHub Marketplace listing, dev-Twitter/X launch showing before/after diagrams on real popular OSS PRs, a `npx skills add` one-liner for developers already using AI coding agents (matches how the original hooks into agent workflows).
- **Moat over time:** the Hotspot DB — the longer a team uses Contour, the more valuable its churn/incident history becomes, creating switching cost that pure visualization tools don't have.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM cost blowup on huge PRs | Cap diff size sent per call, chunk + summarize, cache by commit SHA |
| GitHub API rate limits | Use GraphQL for batched fetches, cache installation tokens, respect secondary rate limits |
| False-positive risk scores erode trust | Start conservative — under-flag rather than cry wolf; let users tune sensitivity per repo |
| Original (PR Lens) adds coverage/risk features first | Your edge is being first to *combine* risk + coverage + hotspot memory as one product, not any single feature alone — ship fast |
| Security incident (leaked webhook secret, etc.) | Secrets rotation runbook, minimal permission scopes, no code persistence, documented incident response plan even as a solo founder |

---

## 12. Success Metrics (Early Stage)

- Installs (GitHub App installations) — top-of-funnel
- Weekly active repos (posted at least 1 comment that week)
- % of flagged high-risk nodes that reviewers actually commented on (engagement proxy for "was this useful")
- Conversion from free (public repo) → paid (private repo) installs
