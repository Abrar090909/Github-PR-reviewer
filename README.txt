<div align="center">

# Contour

**Automated architecture diagrams for every pull request — powered by AI.**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Live App](https://img.shields.io/badge/app-contour--wheat.vercel.app-brightgreen)](https://contour-wheat.vercel.app)
[![CI](https://github.com/Abrar090909/Github-PR-reviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/Abrar090909/Github-PR-reviewer/actions/workflows/ci.yml)

</div>

---

Contour reads your pull request diff and posts a visual dependency graph as a GitHub comment — showing exactly what changed, what it connects to, and where the risk is. No configuration files. No model keys to manage. Just install and review.

## Screenshots

**Architecture view** — see which services, APIs, and data stores are affected, with change indicators (new / changed / removed) on every node.

![Architecture view — PR #2841 New Checkout & Payment System](docs/screenshots/architecture-view.png)

**Data flow view** — trace the sequence of calls and async triggers through your system end-to-end.

![Data flow view — PR #2841 Firestore Broadcast Pipeline](docs/screenshots/dataflow-view.png)

---

## How it works

```
PR opened / updated
       │
       ▼
  GitHub webhook  ──►  Contour worker
                              │
                    ┌─────────┴──────────┐
                    │                    │
              Read diff             Call LLM
              via token          (Gemini / GPT)
                    │                    │
                    └─────────┬──────────┘
                              │
                         GraphDocument
                              │
                    ┌─────────┴──────────┐
                    │                    │
             SVG renderer          Post / update
           (light + dark)         PR comment
```

1. A PR is opened, reopened, or a new commit is pushed
2. Contour fetches the diff using a short-lived installation token
3. The LLM analyzes the diff and returns a structured `GraphDocument`
4. The SVG renderer produces light and dark theme diagrams
5. A single PR comment is created (or updated in-place on subsequent pushes)

---

## Monorepo structure

```
apps/
  web/              → Hosted app — landing page + webhook API (Next.js 15)

packages/
  schema/           → Zod contracts — GraphDocument, PatchDocument, RenderManifest
  renderer/         → SVG diagram engine (layout algorithm + SVG painter)
  cli/              → Local analysis and rendering CLI
  action/           → Self-hosted GitHub Action entry point
```

---

## Hosted GitHub App (zero-config)

The default installation path. Repository owners install Contour once, select repositories, and every PR is analyzed automatically — no workflow to commit, no model key to provision.

**Install:** [contour-wheat.vercel.app](https://contour-wheat.vercel.app)

See [HOSTED_APP_SETUP.txt](HOSTED_APP_SETUP.txt) for the full deployment and GitHub App registration guide.

---

## Self-hosted GitHub Action

For teams that want to run Contour in their own CI account with their own model key.

### 1. Add the workflow step

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: Abrar090909/Github-PR-reviewer/packages/action@master
  with:
    api-key: ${{ secrets.GEMINI_API_KEY }}
```

### 2. Add the required permissions

```yaml
permissions:
  contents: write
  pull-requests: write
```

### 3. (Optional) Change the LLM provider

```yaml
- uses: Abrar090909/Github-PR-reviewer/packages/action@master
  with:
    provider: openai           # gemini | openai | anthropic
    model: gpt-4o
    base-url: https://api.openai.com/v1
    api-key: ${{ secrets.OPENAI_API_KEY }}
```

See [packages/action/README.txt](packages/action/README.txt) for the complete workflow reference.

---

## Local development

```bash
# Install dependencies
pnpm install

# Start the Next.js landing page
pnpm dev                # → http://localhost:3000

# Run the full type-check + lint + test suite
pnpm typecheck
pnpm lint
pnpm test

# Build all packages
pnpm build
```

### Analyze a PR locally

```bash
# Build the CLI first
pnpm --filter @contour/cli build

# Analyze a diff
node packages/cli/dist/bin.js analyze \
  --base <base-sha> \
  --head <head-sha> \
  --provider gemini \
  --api-key-env GEMINI_API_KEY \
  --out /tmp/contour/graph.json

# Render the diagrams
node packages/cli/dist/bin.js render /tmp/contour/graph.json \
  --out /tmp/contour/assets
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript throughout |
| Web app | Next.js 15 (App Router) |
| Build system | Turborepo + pnpm workspaces |
| Schema | Zod |
| Diagram engine | Custom SVG layout + painter |
| LLM backends | Gemini · OpenAI · Anthropic (pluggable) |
| Database | Supabase (Postgres) |
| Queue | Upstash QStash |
| Cache | Upstash Redis |
| Deployment | Vercel |

---

## Production check

After deploying the hosted app:

1. Install the GitHub App on a test repository
2. Open a pull request with a small source change
3. Confirm QStash delivers `/api/jobs/analyze` successfully
4. Confirm the PR receives a Contour comment with both light and dark diagrams
5. Push another commit — confirm the same comment is updated, not duplicated
6. Remove repository access — confirm the installation and analysis rows are deleted

---

## License

[MIT](LICENSE)
