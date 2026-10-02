# Contour — Backend Working Document
### How repo inspection, diagram generation, risk scoring, and coverage detection actually work

This document goes one level deeper than the earlier technical documentation — it explains the *actual algorithms and data flow* behind each backend feature, and closes with a debugging checklist for the failure modes most likely to be causing a broken or empty output right now.

---

## 0. Installation & Onboarding — From the Moment the User Clicks "Install"

Everything in Sections 1–10 depends on this flow completing correctly first. If this handshake is broken or incomplete, every later step silently has nothing to work with (no installation token, no baseline graph, no repo access) — worth ruling out before debugging the analysis pipeline itself.

### 0.1 The Click Itself

The screen shown when a user clicks "Install" (choosing "All repositories" or "Only select repositories", reviewing permissions) is rendered entirely by GitHub — Contour has no code running at this point. GitHub is just asking the user to consent to the permissions your App manifest declared when you registered it (Read code/issues/metadata, Read+write checks/PRs).

### 0.2 The Redirect & `installation` Webhook

Once the user clicks the green **Install** button:

1. GitHub creates an "installation" record on its side (an `installation_id`) scoped to the chosen account and repos.
2. GitHub sends your app an `installation` webhook event (`action: "created"`) to the same webhook endpoint used for PR events — this is the very first signal your backend receives.
3. GitHub also redirects the user's browser to your App's configured **Setup URL** (e.g., `https://yourapp.com/setup?installation_id=123&setup_action=install`) — this is what the user actually sees land in their browser.

```ts
// apps/web/app/api/webhooks/github/route.ts (relevant branch)
if (payload.action === "created" && event === "installation") {
  await db.installations.upsert({
    id: payload.installation.id,
    accountLogin: payload.installation.account.login,
    accountType: payload.installation.account.type, // "User" | "Organization"
    repositorySelection: payload.installation.repository_selection, // "all" | "selected"
    createdAt: new Date()
  });
  // Kick off baseline graph pre-build (Section 0.4) — don't block the webhook response on this
  await enqueueBaselineBuildJob(payload.installation.id);
}
```

Respond to the webhook within GitHub's timeout (ack fast, do the real work async) exactly as with PR events — installation events aren't special-cased for this rule.

### 0.3 The Setup Page (what the user actually sees)

The Setup URL redirect is your first real UI moment post-install — don't leave this as a bare "Thanks!" page:

1. Confirm which repos were selected (fetch via `GET /installation/repositories` using a freshly minted installation access token).
2. Let the user set per-installation preferences up front: sensitivity (`strict`/`balanced`/`lenient`), preferred LLM provider, and optionally their own API key for the BYO-key tier.
3. Show a "we'll comment on your next PR automatically — or open one now to see it in action" message, since there's nothing to show yet if no PR exists.

### 0.4 Minting an Installation Access Token

Every API call Contour makes into a customer's repo (fetching diffs, cloning, posting comments) uses a short-lived **installation access token**, not your App's long-lived private key directly:

```ts
// apps/web/lib/auth.ts
import { App } from "@octokit/app";

const app = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: Buffer.from(process.env.GITHUB_APP_PRIVATE_KEY!, "base64").toString("utf8"),
});

async function getInstallationToken(installationId: number): Promise<string> {
  const { token } = await app.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    { installation_id: installationId }
  );
  return token; // expires in 1 hour — mint fresh per job, never cache long-term
}
```

This token is what gets passed into `fetchRepoSnapshot()` from Section 2.1 — if this minting step fails (wrong private key format, expired JWT, wrong App ID), the clone step fails silently downstream with an auth error that can look unrelated at first glance.

### 0.5 Baseline Graph Pre-Build (so the first PR isn't slow)

Rather than waiting for the user's first PR to build the whole-repo graph from scratch (Section 2, which can take real time on a large repo), kick off an async "baseline build" job immediately after installation:

```
installation.created webhook
  → mint installation token
  → for each selected repo: enqueue a low-priority "build baseline graph" job
     (same logic as Section 2.1–2.5, just triggered by install instead of by a PR)
  → cache the resulting graph keyed by (repoFullName, currentDefaultBranchSHA)
```

This means when the user's first real PR arrives, Step 1 of the main pipeline (Section 9) finds a warm cache instead of building from zero — the difference between the first comment appearing in seconds versus minutes, which matters a lot for a brand-new user's first impression.

### 0.6 Handling Installation Changes

Two more `installation`-family events need handling, both straightforward but easy to forget:

- `installation_repositories` (`action: "added"`) — new repos selected after initial install → enqueue a baseline build for just the new repos.
- `installation_repositories` (`action: "removed"`) or `installation` (`action: "deleted"`) — purge that repo's (or the whole installation's) rows from `pr_analyses` and `file_hotspots` (the `on delete cascade` from the DB schema in the technical docs handles this automatically once you delete the `installations` row).

### 0.7 From Here, the Rest of the Doc Applies

Once an installation exists, has a valid token-minting path, and (ideally) a pre-built baseline graph, the very next `pull_request` webhook event flows into the main pipeline described starting at Section 1 below — repo inspection now has something to load instead of starting cold.

---

## 1. The Core Insight Most Implementations Get Wrong

A diff alone is not enough to draw a meaningful diagram. `git diff` only shows you lines that changed — it has no idea that `sendEmail()` on line 40 is called from three other files, or that it hits a payment API. **You need a baseline understanding of the whole repository's structure *before* you ever look at the diff.** The diff then tells you *which nodes in that pre-built graph moved*.

If the current implementation is only parsing the diff text and feeding it straight to an LLM, that's almost certainly why it's failing — the LLM has no repo-wide context to know what a function connects to, so it can't produce a real flow diagram, only a re-statement of the diff.

**Correct order of operations:**
```
1. Build (or load cached) whole-repo symbol graph  ← repo inspection
2. Parse the diff → map changed lines to symbols in that graph
3. Extract the changed symbols + their N-hop neighbors from the graph
4. Send ONLY that relevant subgraph + diff to the LLM for enrichment
5. Score risk, check coverage
6. Lay out and render the subgraph as SVG
7. Post as PR comment
```

Steps 1–3 are pure static analysis (no LLM). Step 4 is the only step that needs an LLM. This split matters: static analysis is deterministic and free; the LLM is expensive and should only touch the small, already-relevant subgraph — not the whole repo.

---

## 2. Repo Inspection Engine (Step 1 — the part most likely broken)

### 2.1 Fetching the Repo

Two viable approaches:

| Approach | When to use | Trade-off |
|---|---|---|
| Shallow git clone (`git clone --depth 1`) into a temp dir | Default — needed for real AST parsing of every file | Slower per PR (seconds), needs disk in the worker |
| GitHub Contents API (fetch individual files) | Fallback for very large repos, or MVP before you've built cloning | Slow if you need many files (N API calls), rate-limit risk |

**Recommended default:** shallow clone the PR's head branch into an ephemeral directory in the worker, deleted after the job completes. This is what lets you actually run a real parser (`ts-morph`, `tree-sitter`) against real files instead of guessing from diff text alone.

```ts
// worker/src/repo-fetcher.ts
async function fetchRepoSnapshot(installationToken: string, repoFullName: string, ref: string) {
  const tmpDir = `/tmp/contour-${crypto.randomUUID()}`;
  const authedUrl = `https://x-access-token:${installationToken}@github.com/${repoFullName}.git`;
  await exec(`git clone --depth 1 --branch ${ref} ${authedUrl} ${tmpDir}`);
  return tmpDir; // caller is responsible for cleanup
}
```

### 2.2 Filtering Files Before Parsing

Parsing every file in a repo (including `node_modules`, build output, lockfiles) is the single most common cause of a hung or empty job.

- Respect `.gitignore` (use the `ignore` npm package to parse it properly rather than hand-rolled regex).
- Hard-exclude regardless of `.gitignore`: `node_modules/`, `.next/`, `dist/`, `build/`, `.git/`, any file over ~500KB (generated/minified files).
- Only parse source extensions relevant to your supported languages for v1: `.ts`, `.tsx`, `.js`, `.jsx` (expand to Python/Go/etc. later via additional `tree-sitter` grammars).

### 2.3 Building the Symbol Table (per file)

For each surviving file, parse it with `ts-morph` (TS/JS) and extract:

- Every exported function/class/const-arrow-function, with its name and file path
- Every route definition (framework-specific detection — e.g., Next.js: files under `app/api/**/route.ts` exporting `GET`/`POST`; Express: `router.get(...)` call expressions)
- Every import statement, resolved to an absolute file path (this is the step that most often breaks — see 2.4)

```ts
// worker/src/parser/extract-symbols.ts
import { Project, SyntaxKind } from "ts-morph";

function extractSymbols(filePath: string, project: Project) {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const symbols: Symbol[] = [];

  sourceFile.getFunctions().forEach(fn => {
    if (fn.isExported()) {
      symbols.push({ id: `${filePath}#${fn.getName()}`, kind: "function", name: fn.getName(), filePath });
    }
  });

  // Route detection example (Next.js App Router convention)
  if (filePath.includes("/app/api/") && filePath.endsWith("route.ts")) {
    ["GET", "POST", "PUT", "DELETE", "PATCH"].forEach(method => {
      const exportDecl = sourceFile.getFunction(method);
      if (exportDecl) {
        symbols.push({ id: `route:${method}:${filePath}`, kind: "route", name: `${method} ${routePathFromFile(filePath)}`, filePath });
      }
    });
  }

  return symbols;
}
```

### 2.4 Resolving Imports Into a Call Graph (the second most common breakage point)

Naively resolving `import { sendEmail } from "../lib/email"` requires correctly handling:
- Relative paths (`../`, `./`) resolved against the importing file's directory
- **`tsconfig.json` path aliases** (`@/lib/email` → `src/lib/email`) — if you skip parsing `compilerOptions.paths`, every aliased import silently fails to resolve and your graph ends up with disconnected, orphaned nodes. This is very likely your current bug if diagrams render but show no edges.
- Barrel files (`index.ts` re-exporting from other files) — needs one extra resolution hop
- Package imports (`from "stripe"`) — these terminate the graph at a labeled "external" node rather than trying to parse `node_modules`

```ts
function resolveImportPath(importPath: string, importingFile: string, tsconfigPaths: Record<string, string[]>): string | "external" {
  if (importPath.startsWith(".")) {
    return path.resolve(path.dirname(importingFile), importPath);
  }
  for (const [alias, targets] of Object.entries(tsconfigPaths)) {
    const aliasPrefix = alias.replace("/*", "");
    if (importPath.startsWith(aliasPrefix)) {
      return path.resolve(targets[0].replace("/*", ""), importPath.slice(aliasPrefix.length));
    }
  }
  return "external"; // node_modules / package import
}
```

Once every import resolves to either a real file or `"external"`, walk each file's call expressions (`ts-morph`'s `getDescendantsOfKind(SyntaxKind.CallExpression)`) and match the called identifier against the resolved import map to produce edges: `{ from: callerSymbolId, to: calleeSymbolId }`.

### 2.5 Caching the Baseline Graph

Re-parsing an entire repo on every single PR push is slow and wasteful. Cache the whole-repo graph keyed by the base branch's commit SHA; on a new PR event, only re-parse files that changed since the cached SHA (diff the file list, re-parse just those files, patch the cached graph). Store the cached graph as compressed JSON in your database or object storage (S3/Supabase Storage), not in Redis long-term (it can get large on bigger repos).

---

## 3. Diff-to-Symbol Mapping (Step 2)

Given the unified diff and the symbol table from Step 1, map each diff hunk to the symbol(s) it falls inside:

```ts
function mapHunksToSymbols(hunks: DiffHunk[], fileSymbols: Symbol[]): SymbolChange[] {
  return hunks.flatMap(hunk => {
    const touched = fileSymbols.filter(sym =>
      sym.filePath === hunk.filePath &&
      rangesOverlap(hunk.startLine, hunk.endLine, sym.startLine, sym.endLine)
    );
    return touched.map(sym => ({
      symbol: sym,
      delta: hunk.isNewFile ? "new" : hunk.isDeletedFile ? "removed" : "changed"
    }));
  });
}
```

**Common breakage here:** if your parser records a symbol's line range only at declaration time (e.g., just the `function foo(` line) instead of its full body range, hunks landing inside the function body won't overlap and will be missed entirely, silently under-reporting changed symbols. Always capture `getStart()`/`getEnd()` on the full node (`ts-morph`'s `.getStartLineNumber()` / `.getEndLineNumber()` on the function node, not just its name identifier).

---

## 4. Extracting the Relevant Subgraph (Step 3)

Once you know which symbols changed, extract them plus their **N-hop neighbors** (default N=1, configurable) from the cached whole-repo graph — this bounds the diagram size regardless of repo size, and is what actually gets sent downstream.

```ts
function extractSubgraph(changedSymbolIds: string[], fullGraph: Graph, hops = 1): Graph {
  let frontier = new Set(changedSymbolIds);
  const included = new Set(changedSymbolIds);
  for (let i = 0; i < hops; i++) {
    const next = new Set<string>();
    for (const edge of fullGraph.edges) {
      if (frontier.has(edge.from)) next.add(edge.to);
      if (frontier.has(edge.to)) next.add(edge.from);
    }
    next.forEach(id => included.add(id));
    frontier = next;
  }
  return {
    nodes: fullGraph.nodes.filter(n => included.has(n.id)),
    edges: fullGraph.edges.filter(e => included.has(e.from) && included.has(e.to))
  };
}
```

If your diagrams are currently showing *only* the changed nodes with no surrounding context (no callers/callees), this step is likely missing entirely — that's what makes a diagram feel like "just the diff restated" instead of genuinely useful.

---

## 5. LLM Enrichment (Step 4 — the only step that needs the model)

**What gets sent:** the extracted subgraph (Step 4's output, already small and relevant) + the actual diff text for just the changed symbols + a strict JSON schema instruction.

**What does NOT get sent:** the whole repo, the whole diff of unrelated files, or raw file contents beyond the changed symbols' bodies — keeping the prompt small keeps cost and latency down and reduces hallucination surface area.

```
SYSTEM PROMPT (fixed):
You are analyzing a code change. You will be given a subgraph of symbols
(nodes + edges already computed by static analysis) and the diff for the
changed symbols only. Do NOT invent nodes or edges not present in the input
graph. For each changed node, add:
- riskReasons: short phrases explaining why this change might be risky
- behaviorDelta: one plain-English sentence describing what changed about
  the function's behavior (or null if purely cosmetic/rename)
Respond with ONLY valid JSON matching this schema: <schema here>
```

**Why "do NOT invent nodes" matters:** if the LLM is allowed to freely generate the graph structure from scratch (rather than annotating a graph you already computed), it will hallucinate edges that don't exist, especially in unfamiliar codebases — this is a very common cause of diagrams that "look plausible but are wrong." Static analysis should own graph structure; the LLM should only own the *semantic annotation* layer (behavior delta, risk reasoning).

**Validation:** parse the LLM's JSON response and validate against your schema (e.g., with `zod`) before touching the renderer. On validation failure, retry once with a stricter reminder appended; on second failure, fall back to rendering the graph with structure only (no risk reasons/behavior deltas) rather than failing the whole job.

---

## 6. Risk Scoring (Step 5 — concrete formula)

Combine three independent signals into one 0–100 score — don't let the LLM alone decide the number, since that's inconsistent run-to-run:

```
riskScore = clamp(
    (fanInWeight * normalizedFanIn) +
    (sensitivePathWeight * sensitivePathFlag) +
    (churnWeight * normalizedHistoricalChurn) +
    (llmJudgmentWeight * llmRiskHint),
  0, 100
)

Suggested weights: fanIn 25%, sensitivePath 30%, churn 20%, llmJudgment 25%
```

- `normalizedFanIn`: count of distinct callers of this symbol across the whole-repo graph (not just the subgraph), scaled 0–1 against the repo's own max fan-in (so it's relative to codebase size, not an absolute count).
- `sensitivePathFlag`: 1 if the file path or symbol name matches a configurable keyword list (`auth`, `payment`, `billing`, `admin`, `delete`, `password`, `token`) — this is a simple regex check, not an LLM call, and should be user-configurable per installation since "sensitive" varies by product.
- `normalizedHistoricalChurn`: from the Hotspot DB — how often this file has been touched in the last 90 days, scaled 0–1.
- `llmRiskHint`: the LLM's own 0–100 judgment from the enrichment step, used as one input among several rather than the sole source of truth.

---

## 7. Test Coverage Detection (Step 5, parallel to risk scoring)

Two levels of sophistication, ship the first before attempting the second:

**Level 1 (static, no test execution — ship this first):** for each changed symbol, search the repo's test files (glob `**/*.test.ts`, `**/*.spec.ts`) for any import or string reference to that symbol's name, in the same PR's diff. If a test file touching that symbol is *also* part of this diff → `covered`. If the symbol is referenced in an existing test file but that test file wasn't touched in this PR → `covered` (existing coverage, not stale). If no test file references the symbol at all → `none-in-diff`.

**Level 2 (real coverage data, v2 feature):** if the repo already runs `--coverage` in CI, parse the generated `lcov.info` report (via the `lcov-parse` package) and map actual line-coverage percentages onto changed lines — this is strictly more accurate than Level 1's reference-based heuristic but requires CI integration, so treat it as a post-MVP upgrade rather than a launch blocker.

---

## 8. Diagram Layout & Rendering (Step 6)

**Why not a force-directed graph library:** force-directed layouts (e.g., d3-force) produce different node positions on every run for the same input, which breaks the "one sticky comment, rewritten on every push" UX — a reviewer scanning the same PR twice should see the same layout, not a shuffled one. Use a **deterministic grid/lane layout** instead:

```ts
function layoutGraph(graph: Graph): PositionedGraph {
  // 1. Assign each node to a lane based on file path heuristics (api/, services/, lib/, etc.)
  const lanes = groupBy(graph.nodes, node => inferLane(node.filePath));

  // 2. Within each lane, topologically sort by edge direction so callers sit above callees
  const sortedLanes = Object.entries(lanes).map(([lane, nodes]) => ({
    lane, nodes: topologicalSort(nodes, graph.edges)
  }));

  // 3. Assign fixed x per lane column, fixed y-step per rank within the lane
  const LANE_WIDTH = 340, ROW_HEIGHT = 90;
  return sortedLanes.flatMap((laneGroup, laneIndex) =>
    laneGroup.nodes.map((node, rowIndex) => ({
      ...node,
      x: laneIndex * LANE_WIDTH,
      y: rowIndex * ROW_HEIGHT
    }))
  );
}
```

**Edge routing:** for a v1, straight or simple orthogonal (right-angle) lines between node anchor points are sufficient — true collision-avoiding edge routing (e.g., what draw.io does) is a significant project on its own and shouldn't block launch. Only invest in curved/bundled edge routing once straight lines are visibly causing overlap on real customer repos.

**SVG generation:** once every node has `{x, y, width, height}`, generating SVG is mechanical string templating — no charting library needed:

```ts
function nodeToSvg(node: PositionedNode): string {
  return `
    <rect x="${node.x}" y="${node.y}" width="300" height="70" rx="8"
          fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1"/>
    <rect x="${node.x}" y="${node.y}" width="4" height="70" fill="${deltaColor(node.delta)}"/>
    <text x="${node.x + 16}" y="${node.y + 30}" font-family="Inter" font-size="14">${escapeXml(node.label)}</text>
    <circle cx="${node.x + 270}" cy="${node.y + 20}" r="14" fill="${riskColor(node.riskScore)}"/>
    <text x="${node.x + 270}" y="${node.y + 24}" text-anchor="middle" fill="white" font-size="11">${node.riskScore}</text>
  `;
}
```

**Pruning for large graphs:** if the subgraph exceeds ~15 nodes, sort by risk score descending and render only the top 15 plus their direct neighbors, with a text note ("+22 more components, view full graph on dashboard") rather than attempting to fit everything into one comment-sized SVG.

---

## 9. Full Pipeline Working Summary (all steps together)

```
Webhook received
  → verify signature, enqueue job (see technical docs for this part)
  → Worker picks up job:
     1. Load cached whole-repo graph for base SHA (or build fresh if no cache/first run)
     2. Shallow-clone head branch, re-parse only files changed since base SHA, patch graph
     3. Fetch unified diff via GitHub API
     4. Map diff hunks → changed symbols (Section 3)
     5. Extract 1-hop subgraph around changed symbols (Section 4)
     6. Static: compute fan-in, sensitive-path flags, pull churn history from Hotspot DB
     7. Static: check test coverage (Section 7, Level 1)
     8. LLM call: annotate subgraph with riskReasons + behaviorDelta only (Section 5)
     9. Merge static risk signals + LLM judgment → final riskScore per node (Section 6)
     10. Layout subgraph deterministically (Section 8)
     11. Render to SVG
     12. Post/update sticky PR comment
     13. Write result to pr_analyses table, update file_hotspots touch counts
```

---

## 10. Debugging Checklist (if the current system produces empty/wrong output)

Work through these in order — they're listed roughly by how often each one is the actual root cause:

1. **Empty or disconnected graph (nodes with no edges):** almost always a `tsconfig.json` path-alias resolution bug (Section 2.4). Log every unresolved import and check whether they're all aliased imports failing silently to `"external"`.
2. **Diagram only shows the exact changed lines, nothing else:** you're skipping the whole-repo baseline graph and subgraph extraction (Sections 1–4) and going straight from diff to LLM. Fix the pipeline ordering first — this is the most likely root cause given your description.
3. **LLM output ignored or crashes the renderer:** missing schema validation (Section 5) — log the raw LLM response before parsing; malformed JSON is common and needs a retry-then-fallback path, not a hard crash.
4. **Same PR shows a different layout on every push:** using a non-deterministic layout algorithm (force-directed) instead of the fixed grid/lane approach in Section 8.
5. **Job times out / never posts a comment:** likely parsing the entire repo (including `node_modules`) on every run instead of respecting `.gitignore` and caching the baseline graph (Sections 2.2, 2.5).
6. **Coverage always shows "none-in-diff" even for well-tested code:** your test-file symbol-reference search (Section 7) is probably matching only exact filename conventions and missing valid but differently-named test files — widen the glob pattern and check by content reference, not just filename.
7. **Risk scores all cluster near the same number:** you're likely using only the LLM's judgment (Section 6's `llmRiskHint`) with no static signals blended in — LLMs tend to regress toward a "medium risk" default without concrete fan-in/churn data anchoring the score.