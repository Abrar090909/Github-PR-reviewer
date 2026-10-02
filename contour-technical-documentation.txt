# Contour — Technical Documentation

Version: 0.1.0 (MVP)
Audience: engineers building, deploying, or contributing to Contour

---

## 1. Overview

Contour is a GitHub App that analyzes pull requests and posts a risk-scored architecture diagram as a sticky PR comment. This document covers project structure, setup, configuration, API contracts, database schema, and deployment — for engineering reference, not product strategy.

---

## 2. Project Structure

```
contour/
├── apps/
│   └── web/                     # Next.js app — dashboard + API routes
│       ├── app/
│       │   ├── api/
│       │   │   ├── webhooks/
│       │   │   │   └── github/route.ts     # GitHub webhook receiver
│       │   │   └── installations/route.ts  # Manage app installations
│       │   ├── dashboard/                  # Repo settings, sensitivity tuning
│       │   └── (marketing)/                # Landing page, gallery
│       └── lib/
│           ├── github.ts        # Octokit client wrapper
│           ├── auth.ts          # GitHub App JWT + installation token minting
│           └── db.ts            # Supabase client
├── packages/
│   ├── worker/                  # Async job processor
│   │   ├── src/
│   │   │   ├── index.ts         # Queue consumer entrypoint
│   │   │   ├── diff-fetcher.ts
│   │   │   ├── parser/           # AST parsing per language
│   │   │   ├── llm/               # Provider-agnostic LLM client
│   │   │   ├── risk-scorer.ts
│   │   │   └── comment-poster.ts
│   ├── renderer/                # Pure function: schema JSON → SVG
│   │   ├── src/
│   │   │   ├── render.ts
│   │   │   ├── layout/
│   │   │   └── theme/
│   │   └── schema.json          # JSON Schema for the graph document
│   └── shared/                  # Shared types, constants
├── infra/
│   ├── supabase/
│   │   └── migrations/          # SQL migrations
│   └── github-app-manifest.yml  # App manifest for one-click setup
└── .github/
    └── workflows/
        └── pr-lens-action.yml   # Optional CI-based alternative to the App
```

---

## 3. Environment Variables

| Variable | Used by | Description |
|---|---|---|
| `GITHUB_APP_ID` | web, worker | Numeric App ID from GitHub App settings |
| `GITHUB_APP_PRIVATE_KEY` | web, worker | PEM private key, base64-encoded in env |
| `GITHUB_WEBHOOK_SECRET` | web | Used to verify `X-Hub-Signature-256` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | web | OAuth for dashboard login |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | web, worker | DB access (service role only in worker, never client-exposed) |
| `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` | web, worker | Job queue |
| `ANTHROPIC_API_KEY` | worker | Default LLM provider |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | worker | Optional alternate providers (customer-supplied for BYO-key tier) |
| `MAX_DIFF_LINES_PER_CALL` | worker | Cap to control LLM cost, default `800` |
| `SENTRY_DSN` | web, worker | Error tracking |

Secrets are never committed. Local dev uses `.env.local` (gitignored); production uses Vercel encrypted env vars.

---

## 4. Setup (Local Development)

1. Clone the repo, `pnpm install` at the root (monorepo via Turborepo).
2. Create a GitHub App for local testing via the manifest flow:
   - Run `pnpm dlx smee-client --url https://smee.io/<your-channel>` to proxy webhooks to `localhost:3000`.
   - Register the app using `infra/github-app-manifest.yml`, pointing the webhook URL at your smee channel.
3. Copy `.env.example` to `.env.local`, fill in the values from step 2 plus your LLM API key.
4. Run Supabase migrations: `pnpm supabase db push`.
5. Start the app: `pnpm dev` (runs `apps/web` and `packages/worker` concurrently via Turborepo pipeline).
6. Install the app on a personal test repo, open a PR, confirm a comment is posted.

---

## 5. Webhook Handling

**Endpoint:** `POST /api/webhooks/github`

**Verification (mandatory, first step in the handler):**
```ts
import { timingSafeEqual, createHmac } from "crypto";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}
```

**Events handled:**
| Event | Action |
|---|---|
| `pull_request` (opened, synchronize, reopened) | Enqueue analysis job |
| `installation` (deleted) | Purge installation's rows from Hotspot DB |
| `installation_repositories` (removed) | Purge rows scoped to removed repos |

**Idempotency:** every inbound delivery's `X-GitHub-Delivery` header is stored in a short-TTL dedup table (Redis, 24h TTL) before enqueueing; duplicate deliveries are dropped.

**Response contract:** the handler acknowledges within 2 seconds (enqueue only, no synchronous processing) to stay well under GitHub's 10-second webhook timeout.

---

## 6. Job Queue Contract

Job payload enqueued to Redis/QStash:

```json
{
  "jobId": "uuid",
  "installationId": 123456,
  "repoFullName": "owner/repo",
  "prNumber": 42,
  "headSha": "a1b2c3d",
  "deliveryId": "github-delivery-id"
}
```

Worker consumes, and on completion writes a result row keyed by `(repoFullName, headSha)` so re-processing the same commit (e.g., a retried webhook) is served from cache instead of re-billing the LLM.

---

## 7. LLM Analysis Contract

**Prompt strategy:** system prompt enforces strict JSON-only output validated against `packages/renderer/schema.json` before rendering; any response failing schema validation is retried once, then falls back to a "structural-diagram-only, no risk score" degraded render rather than failing the whole job.

**Provider abstraction (`packages/worker/src/llm/`):**
```ts
interface LLMProvider {
  analyze(input: AnalysisInput): Promise<GraphDocument>;
}
// Implementations: AnthropicProvider, GeminiProvider, OpenAIProvider
// Selected per-installation via a `preferred_provider` column, default Anthropic
```

**Output schema (`GraphDocument`):** see the shared schema below (Section 8).

---

## 8. Core Data Schema

```json
{
  "kind": "graph",
  "lenses": ["architecture", "coverage"],
  "lanes": [{ "id": "api", "label": "API" }],
  "nodes": [
    {
      "id": "string",
      "label": "string",
      "kind": "route | service | function | store",
      "delta": "new | modified | removed",
      "lane": "string",
      "riskScore": "number (0-100)",
      "riskReasons": ["string"],
      "behaviorDelta": "string | null",
      "testCoverage": "covered | none-in-diff | not-applicable"
    }
  ],
  "edges": [
    { "from": "string", "to": "string", "label": "string" }
  ]
}
```

This schema is versioned (`schemaVersion` field, not shown above for brevity) so the renderer can support older cached documents after future schema changes.

---

## 9. Database Schema (Supabase / Postgres)

```sql
create table installations (
  id bigint primary key,              -- GitHub installation ID
  account_login text not null,
  preferred_provider text default 'anthropic',
  sensitivity text default 'balanced', -- 'strict' | 'balanced' | 'lenient'
  created_at timestamptz default now()
);

create table pr_analyses (
  id uuid primary key default gen_random_uuid(),
  installation_id bigint references installations(id) on delete cascade,
  repo_full_name text not null,
  pr_number int not null,
  head_sha text not null,
  graph_document jsonb not null,
  comment_id bigint,                  -- GitHub comment ID, for updates
  created_at timestamptz default now(),
  unique (repo_full_name, head_sha)
);

create table file_hotspots (
  id uuid primary key default gen_random_uuid(),
  installation_id bigint references installations(id) on delete cascade,
  repo_full_name text not null,
  file_path text not null,
  touch_count int default 1,
  last_touched_at timestamptz default now(),
  unique (installation_id, repo_full_name, file_path)
);
```

Notes:
- `graph_document` stores only the structured JSON output — never raw source code.
- `on delete cascade` on `installation_id` ensures uninstalling the App purges all associated data automatically.

---

## 10. Comment Posting Logic

1. Query `pr_analyses` for an existing `comment_id` for this `(repoFullName, prNumber)`.
2. If found, `PATCH` the existing comment (keeps thread clean, matches the "one sticky comment, rewritten on every push" UX).
3. If not found, `POST` a new comment and store the returned `comment_id`.
4. Comment body embeds the rendered SVG inline (data URI or hosted asset) plus a markdown summary table of top 3 highest-risk nodes.

---

## 11. Renderer Package

- Pure function: `render(doc: GraphDocument, options: { lens: string; theme: string }): { svg: string }`.
- No headless browser, no layout engine dependency — custom deterministic layout algorithm (grid-lane based, same category of approach as the inspiration project).
- Text measured against an embedded width table (not a live font engine) so CI output is byte-identical across environments.
- Motion (for the "walk the change" playback on the web dashboard, not the static PR comment) implemented via `<animateMotion>` SVG markup — no JavaScript required, works even where GitHub strips scripts from rendered comments.

---

## 12. Deployment

| Component | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | Auto-deploy on `main` push |
| `packages/worker` | Vercel Functions (MVP) → Railway/Fly.io (scale) | Move once execution time or memory needs exceed serverless limits |
| Database | Supabase (managed Postgres) | Automated backups enabled |
| Queue | Upstash Redis | Serverless, pay-per-request |
| Secrets | Vercel encrypted env vars (MVP) → Doppler (scale) | Rotate on any suspected leak |

**CI/CD:** GitHub Actions runs lint + typecheck + unit tests on every PR to the Contour repo itself (dogfooding: Contour can analyze its own PRs once live). Deploys are gated on green CI.

---

## 13. Testing Strategy

- **Unit tests:** risk-scorer logic, schema validation, signature verification — pure functions, no network.
- **Integration tests:** webhook receiver against recorded GitHub payload fixtures (`__fixtures__/pull_request.opened.json`, etc.).
- **Renderer snapshot tests:** fixed `GraphDocument` inputs → byte-identical SVG output, catching any layout regression.
- **Manual QA:** a dedicated `contour-testbed` public repo used to trigger real webhook events end-to-end before each release.

---

## 14. Rate Limiting & Cost Guards

- Per-installation cap: max N analysis jobs/hour (configurable, default 30) enforced at the queue-consumer level.
- Diff size guard: if a PR's diff exceeds `MAX_DIFF_LINES_PER_CALL`, the worker groups changes by directory and only sends the highest fan-in files to the LLM in full; the rest are summarized by static analysis alone (file names + change type, no LLM call).
- GitHub API: uses conditional requests (`ETag`) and GraphQL batching to minimize calls against the installation's rate limit.

---

## 15. Glossary

- **Installation** — a GitHub App install on one account/org, scoped to selected repos.
- **GraphDocument** — the structured JSON contract between the LLM analysis step and the renderer.
- **Blast radius** — the computed risk score for a changed node, combining LLM judgment + static fan-in + historical churn.
- **Hotspot** — a file/service with elevated historical touch frequency, tracked to bias future risk scores.
