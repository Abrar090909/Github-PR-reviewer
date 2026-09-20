# Contour — Production Readiness Review

**Repo:** `Abrar090909/Github-PR-reviewer` ("Contour")
**Scope of this review:** GitHub App + Next.js dashboard + async worker + Supabase + Redis/QStash queue, built on top of the `coldteadotai/pr-lens` concept.
**How this review was produced:** GitHub blocks automated directory crawling on this repo, so this is based on `contour-technical-documentation.md` and `BACKEND_WORKING.md` in the repo (which include real code excerpts for the webhook handler, token minting, and repo-fetcher) plus the `.env.example`/`.gitignore`. It is **not** a line-by-line audit of every file. Treat every item below as "verify this in the actual source," not as a confirmed finding — a few are already handled correctly per the docs and are called out as such.

Legend: 🔴 blocker · 🟠 fix before real users · 🟡 hardening / nice-to-have

---

## 1. Before You Flip This to Production

- [ ] 🔴 Secret-bearing git clone doesn't leak the installation token (§2.1)
- [ ] 🔴 Webhook raw body is verified *before* any JSON parsing (§2.2)
- [ ] 🔴 Dashboard/API routes check installation ownership, not just "is logged in" (§2.4)
- [ ] 🟠 Every LLM-controlled string is escaped before it reaches the SVG template (§2.5)
- [ ] 🟠 Rate limiter uses an atomic counter, not read-then-write (§2.6)
- [ ] 🟠 QStash/worker callback endpoint validates request signatures (§2.7)
- [ ] 🟠 Temp clone dirs are cleaned up in a `finally`, even on parse errors (§2.8)
- [ ] 🟡 Sentry breadcrumbs are scrubbed of tokens/diff content (§4.2)
- [ ] 🟡 CI has dependency + secret scanning, not just lint/typecheck (§5)

---

## 2. Security Findings

### 2.1 🔴 Installation token embedded in a shelled-out git URL

`BACKEND_WORKING.md` (§2.1) shows:

```ts
const authedUrl = `https://x-access-token:${installationToken}@github.com/${repoFullName}.git`;
await exec(`git clone --depth 1 --branch ${ref} ${authedUrl} ${tmpDir}`);
```

Two separate problems here:

- **The token leaks via `ps`.** Any process on the same host (other tenants' jobs, a monitoring agent, a compromised dependency) can read the full command line — including the embedded token — via `ps aux` or `/proc/<pid>/cmdline` while the clone is running. On a shared worker handling multiple customers' installation tokens sequentially, this is a real cross-tenant leak path, not theoretical.
- **String-built shell command = injection surface.** `exec()` runs through a shell. `repoFullName` and `ref` come from GitHub's webhook payload — normally safe, but if anything upstream ever passes a less-trusted value into this function (e.g. a user-editable "custom branch" field on the dashboard), this is a shell injection vector.

**Fix:** use `execFile`/`spawn` with an argument array (no shell interpolation), and keep the token out of argv — either a short-lived `GIT_ASKPASS` script, `git -c http.extraHeader="Authorization: Bearer <token>"` passed via an env var read at runtime, or a maintained library (`simple-git`, `isomorphic-git`) that supports header-based auth instead of a URL-embedded credential.

### 2.2 🔴 Confirm raw-body verification order in the webhook route

The signature check itself (`contour-technical-documentation.md` §5) is correct — `timingSafeEqual`, `sha256=` prefix, length check before comparison. That part is solid.

What isn't shown, and is the single most common bug in this exact pattern: if `apps/web/app/api/webhooks/github/route.ts` calls `req.json()` (or any body parser) *before* computing the HMAC, the raw bytes are gone and you're hashing a re-serialized object that may not byte-match what GitHub signed — verification either silently always fails, or worse, someone finds a payload that re-serializes identically but changes semantically. Read the raw text body first, verify, *then* `JSON.parse` it.

### 2.3 🟠 Confirm the service-role Supabase client never reaches a client bundle

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely (correctly kept out of `NEXT_PUBLIC_*`). In a Next.js app the common way this leaks isn't a typo'd env var — it's `lib/db.ts` (server-only) getting imported, transitively, into a component that ends up in the client bundle. Add the `server-only` package import at the top of `apps/web/lib/db.ts` so the build fails loudly instead of shipping the key.

### 2.4 🟠 Dashboard reads need explicit ownership checks, not just RLS-off-by-default trust

Because the app uses the service-role key server-side, **RLS provides zero protection for these queries** — every authorization decision has to happen in application code. Concretely: when a logged-in dashboard user requests `pr_analyses` or `file_hotspots`, does the route verify that `installation_id` belongs to *their* GitHub account/org before querying, or does it trust an `installation_id` passed in the URL/query string? If it's the latter, that's an IDOR — user A can read user B's private repo's risk data by changing an ID in the request. This is the single most common bug class in service-role-backed dashboards, precisely because RLS being off removes the safety net that would normally catch it.

### 2.5 🟠 Escape every LLM-produced string field, not just the label

The renderer snippet in `BACKEND_WORKING.md` (§8) shows `escapeXml(node.label)` — good — but `riskReasons`, `behaviorDelta`, and edge `label` aren't shown going through the same treatment. Since these strings originate from an LLM that was fed diff content from a PR (which, on a public/OSS repo, means **untrusted external contributors control part of the model's input**), any of these fields could end up containing `</text><script>...` or similar if a PR is deliberately crafted to try to influence the model's output. GitHub strips `<script>` from rendered PR comments, but the dashboard's "walk the change" playback renders this SVG live in a browser — that context does execute scripts. Escape all text-bearing fields, not just `label`.

### 2.6 🟠 Rate limiter: make the increment atomic

`MAX_JOBS_PER_HOUR` (default 30) is "enforced at the queue-consumer level" per the docs. If that's implemented as "read count → compare → write count+1" against Redis, concurrent webhook deliveries for the same installation (e.g. several PRs pushed at once) can race past the limit. Use `INCR` + `EXPIRE` (or a Redis `MULTI`) so the check is atomic regardless of concurrency.

### 2.7 🟠 Validate QStash (or equivalent) callback signatures

If the worker is invoked via an HTTP callback from QStash, confirm the handler validates `Upstash-Signature` against `QSTASH_CURRENT_SIGNING_KEY`/`QSTASH_NEXT_SIGNING_KEY` (both are provisioned for key rotation, so the code should check against either). Without this, anyone who finds the worker's callback URL can POST a fabricated job payload directly, bypassing the webhook signature check entirely and potentially triggering jobs against arbitrary `installationId`/`repoFullName` pairs.

### 2.8 🟡 Guarantee temp-dir cleanup on the failure path

`fetchRepoSnapshot()` returns a `tmpDir` with "caller is responsible for cleanup" (§2.1). Make sure that cleanup is in a `finally` block around the whole parse pipeline, not just after the happy path — a parse error partway through a large repo will otherwise leave cloned private-repo source sitting on disk. On a shared/multi-tenant worker this is both a disk-exhaustion risk and a data-isolation concern (another tenant's job shouldn't be able to read a leftover directory from someone else's clone).

### 2.9 🟡 OAuth login flow (dashboard)

Confirm the `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` OAuth flow uses a `state` parameter (CSRF protection) and that the resulting session cookie is `httpOnly`, `secure`, and `sameSite=lax` or stricter.

### 2.10 🟡 BYO-key tier (customer-supplied LLM keys)

If a customer's own `GEMINI_API_KEY`/`OPENAI_API_KEY` is stored per-installation, confirm it's encrypted at rest (not a plaintext DB column) and never appears in logs or Sentry events — a stack trace from a failed LLM call is a very easy place for a raw API key to end up in a third-party log aggregator by accident.

---

## 3. Known Functional Bugs (from your own `BACKEND_WORKING.md` §10)

Worth folding into this doc rather than leaving buried in a second file — these are launch blockers for *correctness*, separate from security, and your own debugging checklist already identifies the likely root causes:

| Symptom | Likely cause | Fix |
|---|---|---|
| Graph nodes with no edges | `tsconfig.json` path-alias resolution failing silently to `"external"` | Log every unresolved import; parse `compilerOptions.paths` explicitly |
| Diagram = restated diff, no context | Pipeline skips baseline whole-repo graph, goes diff → LLM directly | Enforce the 7-step order in §1 of `BACKEND_WORKING.md`; add a test asserting subgraph extraction ran |
| Renderer crash on LLM output | Missing/weak Zod validation before render | Validate shape *and* bound string lengths (§2.5 above also applies here — a passing-shape response can still be huge) |
| Same PR renders differently on repeat pushes | Non-deterministic (force-directed) layout | Confirm the grid/lane layout in §8 is what's actually wired in, not a leftover d3-force call |
| Jobs time out, no comment posted | Parsing `node_modules`/`dist` instead of respecting `.gitignore` | Confirm the `ignore` package is actually used, not a partial hand-rolled filter |
| Coverage always "none-in-diff" | Test-file glob too narrow | Widen glob, match by content reference not just filename convention |
| Risk scores cluster near one value | Static signals not blended in, LLM judgment used alone | Confirm the weighted formula in §6 is implemented, not just documented |

---

## 4. Operational Readiness

### 4.1 Deploy topology (as documented)
`apps/web` → Vercel · `worker` → Vercel Functions now, Railway/Fly.io once it outgrows serverless limits · DB → Supabase · Queue → Upstash. This is a reasonable MVP topology. Watch the worker's execution-time limit specifically — a cold, uncached large-repo clone + parse could realistically exceed a serverless function's max duration before you've deliberately migrated off it.

### 4.2 🟡 Scrub Sentry of secrets and source content
`graph_document` is documented as "never raw source code" in the DB — good discipline. Make sure the same rule holds for Sentry: an unhandled exception during diff/AST parsing can easily end up with file contents or an installation token in the breadcrumb trail. Add a `beforeSend` scrubber.

### 4.3 Backups / data retention
Supabase automated backups are mentioned — confirm a retention window and that `pr_analyses`/`file_hotspots` deletion on uninstall (`on delete cascade`) is verified to actually fire, not just documented.

---

## 5. CI/CD Hardening

Current CI (per docs): lint + typecheck + unit tests, gating deploys. Add before public launch:

- [ ] Dependency vulnerability scanning (`npm audit` in CI, or Dependabot/Snyk) — you're running third-party parsers (`ts-morph`, `tree-sitter`) against untrusted repo content, which is exactly the kind of surface where a dependency CVE matters more than average
- [ ] Secret scanning (`gitleaks` or GitHub's own secret scanning) as a second layer, even though `.gitignore` already correctly excludes `.env*` and `*.pem`
- [ ] A SAST pass (Semgrep's default ruleset is enough to start) given §2.1's shell-exec pattern — worth catching automatically so it doesn't reappear elsewhere in the codebase

---

## 6. What's Already Solid

Worth naming explicitly so review effort goes where it's needed:

- HMAC webhook verification uses `timingSafeEqual` with a length check — correct pattern, not the naive `===` comparison people usually ship first
- Installation tokens are minted fresh per job and never cached long-term
- Idempotency via `X-GitHub-Delivery` dedup in Redis (24h TTL)
- Webhook handler acknowledges fast and enqueues rather than processing synchronously
- `on delete cascade` on `installation_id` gives you uninstall-cleanup for free
- The LLM prompt explicitly forbids inventing graph structure ("Do NOT invent nodes or edges") — a real, non-obvious prompt-injection/hallucination mitigation most clones of this idea skip