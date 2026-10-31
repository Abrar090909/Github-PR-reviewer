import { createHash, timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { safeParseGraphDoc } from "@contour/schema";
import { db } from "@/lib/db";
import { buildMap } from "@/lib/hosted/map";
import type { Review } from "@/lib/hosted/review";
import Viewer from "./Viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review map",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const matches = (token: string, expectedHash: string): boolean => {
  const actual = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

async function load(analysisId: string, token: string) {
  if (!token || !/^[0-9a-f-]{36}$/i.test(analysisId)) return undefined;
  const { data: analysis } = await db
    .from("pr_analyses")
    .select("graph_document,asset_token_hash,status,installation_id,repository_id,repo_full_name,pr_number,head_sha")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis?.asset_token_hash || !matches(token, analysis.asset_token_hash)) return undefined;
  if (analysis.status === "failed" || !analysis.graph_document) return undefined;

  // Same rule as the diagram images: a removed or suspended installation closes the page.
  const [{ data: installation }, { data: repository }] = await Promise.all([
    db.from("installations").select("suspended_at").eq("id", analysis.installation_id).maybeSingle(),
    db.from("installation_repositories")
      .select("repository_id")
      .eq("installation_id", analysis.installation_id)
      .eq("repository_id", analysis.repository_id)
      .maybeSingle(),
  ]);
  if (!installation || installation.suspended_at || !repository) return undefined;

  const graph = safeParseGraphDoc(analysis.graph_document);
  if (!graph.ok) return undefined;
  // Read apart from the rest: before the review migration runs the column is missing.
  const { data: reviewed } = await db.from("pr_analyses").select("review").eq("id", analysisId).maybeSingle();
  return buildMap(graph.value, (reviewed?.review as Review | null | undefined) ?? null, {
    repo: analysis.repo_full_name as string,
    prNumber: analysis.pr_number as number,
    headSha: analysis.head_sha as string,
  });
}

export default async function ReviewMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ analysisId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ analysisId }, { t }] = await Promise.all([params, searchParams]);
  const model = await load(analysisId, t ?? "");
  if (!model) notFound();
  return <Viewer model={model} />;
}
