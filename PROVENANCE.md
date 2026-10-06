# Project provenance

This repository is the canonical development repository for **Contour**, maintained by Abrar Ahmed.

Contour is a monorepo for pull-request architecture visualization. Its distinguishing behavior is implemented inside this repository rather than delegated to a single third-party diagramming library or generic PR-summary wrapper.

## Custom subsystems

- `packages/renderer` contains the custom diagram layout, routing, geometry, SVG, atlas, correction, and render-manifest logic.
- `packages/schema` contains the graph contract, patch contract, validation, referential-integrity rules, snapshot rules, and ordered graph mutation logic.
- `apps/web` contains the hosted GitHub App pipeline, including webhook handling, queued analysis, PR comment publication, authentication, rate limiting, and persistence.
- `packages/cli`, `packages/action`, and `skills/contour` provide local CLI, GitHub Action, and agent-oriented execution surfaces over the same graph model.

## Original implementation characteristics

The renderer is intentionally deterministic across environments and avoids system-dependent layout behavior.

The graph schema is executable: patch operations carry ordering and conflict semantics and must produce another valid snapshot or fail explicitly.

Model-produced graph data is treated as untrusted input and validated before rendering or publication.

Rendered assets are content-addressed and paired with manifests to prevent stale or mismatched review diagrams.

## Repository identity

Canonical repository: `Abrar090909/Github-PR-reviewer`

License: MIT

The repository history, package documentation, tests, CI configuration, and source together document the current Contour implementation.
