import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase pauses a free project after a week without database activity, and
 * a paused project makes every webhook fail. Vercel Cron calls this once a
 * day; one real query through the API is enough to count as activity.
 */
const authorized = (req: NextRequest): boolean => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await db.from("installations").select("id", { head: true, count: "exact" });
  if (error) return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true });
}
