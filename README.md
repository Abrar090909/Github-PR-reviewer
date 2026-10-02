# Contour

Automated pull request diagrams, powered by AI.

Contour analyzes every PR and posts a visual dependency graph directly in the GitHub comment — showing exactly what changed, what it touches, and where the risk is.

## How it works

1. A PR is opened or updated
2. The GitHub Action triggers the Contour engine
3. An LLM analyzes the diff and produces a structured `GraphDocument`
4. The renderer converts it to an SVG diagram (light + dark theme)
5. A comment with the diagram is posted to the PR

## Monorepo structure

```
apps/
  web/              → Landing page (Next.js)

packages/
  schema/           → Zod contracts — the GraphDocument type
  renderer/         → SVG diagram engine (layout + painting)
  cli/              → CLI tool for local analysis
  action/           → GitHub Action entry point
  agent-skill/      → AI agent skill definition
```

## Quick start

```bash
pnpm install
pnpm dev          # starts the landing page at http://localhost:3000
```

## Hosted GitHub App

The default product is a zero-configuration GitHub App: a repository owner
installs Contour, selects repositories, and every new or updated pull request is
analyzed automatically. The service owns the model key; customers do not add a
workflow or a secret. See [HOSTED_APP_SETUP.md](HOSTED_APP_SETUP.md) for the
deployment and GitHub App registration steps.

## Self-hosted GitHub Action

The Action remains available for teams that want to run Contour in their own
CI account with their own model key.

Add to your workflow:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: Abrar090909/Github-PR-reviewer/packages/action@master
  with:
    api-key: ${{ secrets.GEMINI_API_KEY }}
```

The action defaults to Gemini. Set `provider`, `model`, and `base-url` to use
OpenAI or another OpenAI-compatible endpoint. See the
[Action setup guide](packages/action/README.md) for the complete workflow and
required permissions.

## Tech stack

- **TypeScript** throughout
- **Zod** for schema validation
- **Next.js** for the landing page
- **Turborepo + pnpm** workspaces
- **OpenAI / Gemini / Anthropic** — pluggable LLM backends

## License

MIT
