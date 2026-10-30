import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { run } from "../../src/cli.js";
import type { Terminal } from "../../src/terminal.js";

export const API = "https://canvas.test";
export const REGISTRY = ".contour/canvas.json";
export const GOLDEN = fileURLToPath(
  new URL("../../../schema/examples/postmark-refactor.graph.json", import.meta.url),
);

type RegistryEntry = {
  name: string;
  source: string;
  api: string;
  writeToken?: string;
  pending?: string;
  rev: number;
};

export const setupCanvasTest = () => {
  const originalCwd = process.cwd();
  let directory = "";
  const output: { out: string[]; err: string[] } = { out: [], err: [] };
  const terminal: Terminal = {
    out: (line) => output.out.push(line),
    err: (line) => output.err.push(line),
  };
  const fetchMock = vi.fn<typeof fetch>();
  // A test that times out keeps running: its commands share this process's
  // cwd, fetch and output with the next test, and on Windows their git
  // children pin the directory against removal (EBUSY). So teardown first
  // refuses new commands — one started after the chdir back would run in the
  // real checkout — then waits out the ones already running.
  const inFlight = new Set<Promise<number>>();
  let closed = true;
  const invoke = (...argv: string[]): Promise<number> => {
    if (closed)
      return Promise.reject(
        new Error(`invoked after its test ended: ${argv.join(" ")}`),
      );
    const running = run(argv, terminal, {});
    inFlight.add(running);
    void running.finally(() => inFlight.delete(running)).catch(() => undefined);
    return running;
  };
  const registry = async (): Promise<Record<string, RegistryEntry>> =>
    JSON.parse(await readFile(REGISTRY, "utf8")).canvases;
  const createCheckout = () => mkdtemp(join(directory, "checkout-"));

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "contour-canvas-"));
    process.chdir(directory);
    output.out = [];
    output.err = [];
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    await writeFile("drawn.graph.json", await readFile(GOLDEN, "utf8"), "utf8");
    closed = false;
  });

  afterEach(async () => {
    closed = true;
    await Promise.allSettled([...inFlight]);
    process.chdir(originalCwd);
    vi.unstubAllGlobals();
    // Windows holds a directory a moment after the last handle in it closes.
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  });

  return { output, fetchMock, invoke, registry, createCheckout };
};
