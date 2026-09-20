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

## GitHub Action

Add to your workflow:

```yaml
- uses: Abrar090909/Github-PR-reviewer@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

## Tech stack

- **TypeScript** throughout
- **Zod** for schema validation
- **Next.js** for the landing page
- **Turborepo + pnpm** workspaces
- **OpenAI / Gemini / Anthropic** — pluggable LLM backends

## License

MIT
