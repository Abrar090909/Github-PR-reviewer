import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const matches = (token: string, expectedHash: string): boolean => {
  const actual = Buffer.from(createHash("sha256").update(token).digest("hex"));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ analysisId: string; assetId: string }> },
): Promise<NextResponse> {
  const { analysisId, assetId } = await context.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return new NextResponse("Not found", { status: 404 });

  const { data: analysis, error: analysisError } = await db
    .from("pr_analyses")
    .select("asset_token_hash,status,installation_id,repository_id")
    .eq("id", analysisId)
    .maybeSingle();
  if (analysisError || !analysis?.asset_token_hash || !matches(token, analysis.asset_token_hash))
    return new NextResponse("Not found", { status: 404 });
  if (analysis.status === "failed" || analysis.status === "stale")
    return new NextResponse("Not found", { status: 404 });

  const [{ data: installation }, { data: repository }] = await Promise.all([
    db.from("installations").select("suspended_at").eq("id", analysis.installation_id).maybeSingle(),
    db.from("installation_repositories")
      .select("repository_id")
      .eq("installation_id", analysis.installation_id)
      .eq("repository_id", analysis.repository_id)
      .maybeSingle(),
  ]);
  if (!installation || installation.suspended_at || !repository)
    return new NextResponse("Not found", { status: 404 });

  const { data: asset, error: assetError } = await db
    .from("analysis_assets")
    .select("svg")
    .eq("analysis_id", analysisId)
    .eq("asset_id", decodeURIComponent(assetId))
    .maybeSingle();
  if (assetError || !asset?.svg) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(asset.svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
