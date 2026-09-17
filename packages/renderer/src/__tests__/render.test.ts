import { describe, it, expect } from "vitest";
import { render } from "../render.js";
import type { GraphDocument } from "@contour/shared";

const FIXTURE: GraphDocument = {
  schemaVersion: "1",
  kind: "graph",
  lenses: ["architecture", "coverage"],
  lanes: [
    { id: "api", label: "API" },
    { id: "services", label: "Services" },
  ],
  nodes: [
    {
      id: "auth-route",
      label: "auth-route",
      sublabel: "POST /login",
      kind: "route",
      delta: "modified",
      lane: "api",
      riskScore: 72,
      riskReasons: ["auth path", "2 callers"],
      behaviorDelta: "Now rate-limits by IP before checking credentials.",
      testCoverage: "covered",
    },
    {
      id: "user-service",
      label: "user-service",
      sublabel: "services/user.ts",
      kind: "service",
      delta: "new",
      lane: "services",
      riskScore: 35,
      riskReasons: ["new code", "low fan-in"],
      behaviorDelta: null,
      testCoverage: "none-in-diff",
    },
  ],
  edges: [
    { from: "auth-route", to: "user-service", label: "findUser()" },
  ],
};

describe("render()", () => {
  it("returns a valid SVG string", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("includes node labels", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg).toContain("auth-route");
    expect(svg).toContain("user-service");
  });

  it("includes risk chip scores", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg).toContain("72"); // auth-route risk score
    expect(svg).toContain("35"); // user-service risk score
  });

  it("renders untested tag for none-in-diff nodes", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg).toContain("○ untested");
  });

  it("renders behavior delta annotation for high-risk nodes", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg).toContain("rate-limits by IP");
  });

  it("is deterministic — same input produces same output", () => {
    const { svg: svg1 } = render(FIXTURE, { lens: "architecture", theme: "light" });
    const { svg: svg2 } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(svg1).toBe(svg2);
  });

  it("handles single-node compact layout", () => {
    const singleNode: GraphDocument = {
      ...FIXTURE,
      nodes: [FIXTURE.nodes[0]],
      edges: [],
    };
    const { svg } = render(singleNode, { lens: "architecture", theme: "light" });
    expect(svg).toContain("<svg");
  });

  it("renders in dark theme", () => {
    const { svg } = render(FIXTURE, { lens: "architecture", theme: "dark" });
    expect(svg).toContain("#0D1117"); // dark background
  });

  it("returns correct dimensions", () => {
    const { width, height } = render(FIXTURE, { lens: "architecture", theme: "light" });
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("collapses monorepo graphs with 6+ lanes", () => {
    const largeDoc: GraphDocument = {
      ...FIXTURE,
      lanes: Array.from({ length: 7 }, (_, i) => ({ id: `lane-${i}`, label: `Lane ${i}` })),
      nodes: Array.from({ length: 14 }, (_, i) => ({
        ...FIXTURE.nodes[0],
        id: `node-${i}`,
        lane: `lane-${i % 7}`,
      })),
    };
    const { svg } = render(largeDoc, { lens: "architecture", theme: "light" });
    expect(svg).toContain("Large PR");
  });
});
