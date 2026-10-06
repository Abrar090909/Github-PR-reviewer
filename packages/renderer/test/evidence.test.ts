import type { GraphDoc } from "@contour/schema";
import { parseGraphDoc } from "@contour/schema";
import { postmarkRefactorGraph } from "@contour/schema/examples";
import { describe, expect, it } from "vitest";
import { render } from "../src/index.js";

const draw = (doc: GraphDoc): string => render(doc, { lens: "architecture", theme: "dark" }).svg;

describe("deterministic rendering with evidence indicators", () => {
  it("renders identical bytes across multiple runs with evidence attached", () => {
    const docWithEvidence: GraphDoc = {
      ...postmarkRefactorGraph,
      nodes: postmarkRefactorGraph.nodes.map((node, i) =>
        i === 0
          ? {
              ...node,
              evidence: [
                {
                  file: "src/worker.ts",
                  newStart: 10,
                  newEnd: 25,
                  reason: "Modified in PR",
                },
              ],
            }
          : node,
      ),
      edges: postmarkRefactorGraph.edges.map((edge, i) =>
        i === 0
          ? {
              ...edge,
              evidence: [
                {
                  file: "src/caller.ts",
                  newStart: 50,
                  newEnd: 60,
                  reason: "Edge invocation changed",
                },
              ],
            }
          : edge,
      ),
    };

    const svg1 = draw(docWithEvidence);
    const svg2 = draw(docWithEvidence);
    expect(svg1).toBe(svg2);

    // Also verify that the evidence dots are present in the SVG
    expect(svg1).toContain('class="ev-dot"');
  });

  it("does not render evidence indicators when elements lack evidence", () => {
    const svgWithout = draw(postmarkRefactorGraph);
    expect(svgWithout).not.toContain('class="ev-dot"');
  });

  it("evidence indicator presence is deterministic across round trips", () => {
    const docWithEvidence: GraphDoc = {
      ...postmarkRefactorGraph,
      nodes: postmarkRefactorGraph.nodes.map((node, i) =>
        i === 0
          ? {
              ...node,
              evidence: [
                {
                  file: "src/worker.ts",
                  newStart: 10,
                  newEnd: 25,
                  reason: "Modified in PR",
                },
              ],
            }
          : node,
      ),
    };

    const json = JSON.stringify(docWithEvidence);
    const reparsed = parseGraphDoc(JSON.parse(json));

    expect(draw(reparsed)).toBe(draw(docWithEvidence));
  });
});
