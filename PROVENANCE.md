# Project provenance and architecture

This repository is the canonical development repository for **Contour**, designed and maintained by Abrar Ahmed (`Abrar090909`).

Contour is an integrated monorepo for pull-request architecture visualization. Its distinguishing behavior is implemented directly inside this repository rather than delegated to third-party diagramming libraries or generic PR-summary wrappers.

## Authorship and licensing

- **Author & Maintainer**: Abrar Ahmed
- **Canonical Repository**: `https://github.com/Abrar090909/Github-PR-reviewer`
- **License**: MIT across all packages and tools
- **Package Scopes**: The `@contour/*` npm package names (`@contour/schema`, `@contour/renderer`, `@contour/cli`, `@contour/action`, `@contour/agent-skill`, `@contour/web`) represent the internal workspace packages of this monorepo. All packages link back to this canonical repository.

## Custom subsystems & implementation

1. **Custom hand-built layout and routing engine (`packages/renderer`)**
   - Built entirely from first principles without depending on dagre, d3, mermaid, or browser DOM rendering.
   - Implements custom DAG ranking (longest-path layer assignment), cycle breaking, lane-aware cluster placement, bezier-bounded curve geometry, and congestion-aware orthogonal channel routing.
   - Guaranteed deterministic: renders byte-identical SVG outputs regardless of execution environment, system fonts, or locale.

2. **Executable graph contracts and patch evolution (`packages/schema`)**
   - Defines `GraphDoc` and `PatchDoc` with strict referential integrity, snapshot invariants, and conflict codes.
   - Graph patches execute deterministically with cascading deletions (pruning disconnected edges, walkthrough steps, and views) to evolve baseline architecture maps incrementally across PR merges.

3. **Evidence Trace and PR diff grounding (`packages/cli`)**
   - Binds architecture elements directly to exact source ranges in the pull-request diff.
   - Diff grounding parses unified diff hunks from Git and verifies model assertions, feeding machine-readable errors back into a bounded correction round to eliminate hallucinations.
   - Inspectable via `contour explain <element-id> [graph-file]` with zero API calls.

4. **Coding agent skills & execution surfaces (`packages/agent-skill`, `skills/contour`)**
   - Provides an LLM agent skill package enabling autonomous coding agents to author, validate, and render architecture graphs directly within dev workflows.

5. **Hosted GitHub App & pipeline (`apps/web`)**
   - Production webhook handling, queued diff analysis, content-addressed asset rendering, and idempotent PR comment updates.

The repository history, package documentation, comprehensive test suites, CI configuration, and source together document the original Contour implementation.
