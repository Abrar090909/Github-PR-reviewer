import type { Metadata } from "next";
import { postmarkRefactorGraph as graph } from "@contour/schema/examples";
import { buildMap } from "@/lib/hosted/map";
import Viewer from "../[analysisId]/Viewer";

export const metadata: Metadata = {
  title: "Example review map",
  description: "The interactive map Contour opens from a pull request comment, on the example that ships with Contour.",
};

/** The review map for the bundled example document, so anyone can try it without installing. */
export default function ExampleMapPage() {
  const pr = graph.provenance.pullRequest;
  const model = buildMap(graph, { status: "complete", headSha: graph.provenance.head.sha, findings: [], dropped: 0 }, {
    repo: `${graph.provenance.repo.owner}/${graph.provenance.repo.name}`,
    prNumber: pr?.number ?? 1,
    headSha: graph.provenance.head.sha,
  });
  return <Viewer model={model} />;
}
