import { describe, it, expect } from "vitest";
import { parseHunks, mapHunksToSymbols, extractSubgraph } from "../subgraph.js";
import { patchGraph, type RepoGraph } from "../graph-cache.js";
import type { ParsedSymbol } from "@contour/shared";

describe("subgraph and hunk parsing", () => {
  const sampleDiff = `
diff --git a/src/auth.ts b/src/auth.ts
index 83db48f..bf269f4 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,4 +10,6 @@ export function verifyToken(token: string) {
+  if (!token) throw new Error("Missing token");
+  return jwt.verify(token, SECRET);
 }
diff --git a/src/payment.ts b/src/payment.ts
index 0000000..1234567 100644
--- /dev/null
+++ b/src/payment.ts
@@ -0,0 +1,5 @@
+export function chargeCard(amount: number) {
+  return stripe.charges.create({ amount });
+}
`;

  it("parses diff hunks correctly", () => {
    const hunks = parseHunks(sampleDiff);
    expect(hunks.length).toBe(2);

    expect(hunks[0]).toEqual({
      filePath: "src/auth.ts",
      startLine: 10,
      endLine: 15,
    });

    expect(hunks[1]).toEqual({
      filePath: "src/payment.ts",
      startLine: 1,
      endLine: 5,
    });
  });

  it("maps hunks to symbols in changed files", () => {
    const hunks = parseHunks(sampleDiff);
    const symbols: ParsedSymbol[] = [
      {
        name: "verifyToken",
        kind: "function",
        filePath: "src/auth.ts",
        fanIn: 4,
        hasTestReference: true,
      },
      {
        name: "unrelatedFunction",
        kind: "function",
        filePath: "src/unrelated.ts",
        fanIn: 1,
        hasTestReference: false,
      },
    ];

    const changes = mapHunksToSymbols(hunks, symbols);
    expect(changes.length).toBe(1);
    expect(changes[0].symbol.name).toBe("verifyToken");
    expect(changes[0].delta).toBe("changed");
  });

  it("extracts N-hop subgraph around changed symbols with edges", () => {
    const symbols: ParsedSymbol[] = [
      {
        name: "verifyToken",
        kind: "function",
        filePath: "src/auth.ts",
        fanIn: 5,
        hasTestReference: true,
      },
      {
        name: "refreshToken",
        kind: "function",
        filePath: "src/auth.ts",
        fanIn: 2,
        hasTestReference: true,
      },
      {
        name: "billingService",
        kind: "service",
        filePath: "src/billing.ts",
        fanIn: 1,
        hasTestReference: false,
      },
    ];

    const changed = [{ symbol: symbols[0], delta: "changed" as const }];
    const subgraph = extractSubgraph(changed, symbols, 1);

    expect(subgraph.changedIds).toEqual(["src/auth.ts#verifyToken"]);
    // Should include both changed symbol and same-file neighbor refreshToken
    expect(subgraph.symbols.map((s) => s.name)).toContain("verifyToken");
    expect(subgraph.symbols.map((s) => s.name)).toContain("refreshToken");
    // Should not include unrelated billingService
    expect(subgraph.symbols.map((s) => s.name)).not.toContain("billingService");

    // Edge should exist between same-file symbols
    expect(subgraph.edges).toContainEqual({
      from: "src/auth.ts#verifyToken",
      to: "src/auth.ts#refreshToken",
    });
  });

  it("patches cached graph incrementally by replacing only changed files", () => {
    const cachedGraph: RepoGraph = {
      repoFullName: "acme/api",
      baseSha: "abc1234",
      builtAt: "2026-01-01T00:00:00.000Z",
      symbols: [
        {
          name: "oldVerifyToken",
          kind: "function",
          filePath: "src/auth.ts",
          fanIn: 2,
          hasTestReference: false,
        },
        {
          name: "getDatabase",
          kind: "function",
          filePath: "src/db.ts",
          fanIn: 10,
          hasTestReference: true,
        },
      ],
    };

    const newAuthSymbol: ParsedSymbol = {
      name: "newVerifyToken",
      kind: "function",
      filePath: "src/auth.ts",
      fanIn: 3,
      hasTestReference: true,
    };

    const patched = patchGraph(cachedGraph, [newAuthSymbol], ["src/auth.ts"]);

    expect(patched.symbols.length).toBe(2);
    // src/db.ts should be preserved
    expect(patched.symbols.find((s) => s.filePath === "src/db.ts")?.name).toBe("getDatabase");
    // src/auth.ts should be replaced with updated symbol
    expect(patched.symbols.find((s) => s.filePath === "src/auth.ts")?.name).toBe("newVerifyToken");
    expect(patched.symbols.find((s) => s.name === "oldVerifyToken")).toBeUndefined();
  });
});
