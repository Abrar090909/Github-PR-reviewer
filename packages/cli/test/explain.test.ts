import { minimalGraph, postmarkRefactorGraph } from "@contour/schema/examples";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { run } from "../src/cli.js";
import type { Terminal } from "../src/terminal.js";

let out: string[] = [];
let err: string[] = [];
const terminal: Terminal = { out: (line) => out.push(line), err: (line) => err.push(line) };

const invoke = (...argv: string[]) => run(argv, terminal, {});

describe("contour explain", () => {
  let tempDir: string;
  let graphPath: string;

  beforeEach(async () => {
    out = [];
    err = [];
    tempDir = await mkdtemp(join(tmpdir(), "contour-explain-test-"));
    graphPath = join(tempDir, "graph.json");
  });

  it("prints evidence attached to a node in a compact human-readable tree", async () => {
    const doc = structuredClone(minimalGraph);
    const node = doc.nodes[0]!;
    node.evidence = [
      {
        file: "src/health.ts",
        newStart: 10,
        newEnd: 25,
        symbol: "checkHealthRoute",
        reason: "Implements the health check endpoint.",
      },
    ];
    await writeFile(graphPath, JSON.stringify(doc), "utf8");

    const exitCode = await invoke("explain", node.id, graphPath);
    expect(exitCode).toBe(0);

    const output = out.join("\n");
    expect(output).toContain(`node "${node.id}" — 1 evidence entry`);
    expect(output).toContain("src/health.ts:10-25");
    expect(output).toContain("symbol: checkHealthRoute");
    expect(output).toContain("reason: Implements the health check endpoint.");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("prints evidence attached to an edge in a compact human-readable tree", async () => {
    const doc = structuredClone(postmarkRefactorGraph);
    const edge = doc.edges[0]!;
    edge.evidence = [
      {
        file: "src/sender.ts",
        newStart: 100,
        newEnd: 120,
        reason: "Connects email dispatcher to postmark provider.",
      },
    ];
    await writeFile(graphPath, JSON.stringify(doc), "utf8");

    const exitCode = await invoke("explain", edge.id, graphPath);
    expect(exitCode).toBe(0);

    const output = out.join("\n");
    expect(output).toContain(`edge "${edge.id}" — 1 evidence entry`);
    expect(output).toContain("src/sender.ts:100-120");
    expect(output).toContain("reason: Connects email dispatcher to postmark provider.");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("fails with exit code 1 when element has no evidence", async () => {
    const doc = structuredClone(minimalGraph);
    await writeFile(graphPath, JSON.stringify(doc), "utf8");

    const exitCode = await invoke("explain", doc.nodes[0]!.id, graphPath);
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("carries no evidence");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("fails with exit code 1 when element id is unknown", async () => {
    const doc = structuredClone(minimalGraph);
    await writeFile(graphPath, JSON.stringify(doc), "utf8");

    const exitCode = await invoke("explain", "non-existent-id", graphPath);
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("has no node or edge with id");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("fails with exit code 1 when graph file does not exist", async () => {
    const exitCode = await invoke("explain", "some-node", join(tempDir, "missing.json"));
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("cannot read");

    await rm(tempDir, { recursive: true, force: true });
  });

  it("fails with exit code 1 when graph file is invalid GraphDoc", async () => {
    await writeFile(graphPath, JSON.stringify({ invalid: "document" }), "utf8");

    const exitCode = await invoke("explain", "some-node", graphPath);
    expect(exitCode).toBe(1);
    expect(err.join("\n")).toContain("is not a valid graph document");

    await rm(tempDir, { recursive: true, force: true });
  });
});
