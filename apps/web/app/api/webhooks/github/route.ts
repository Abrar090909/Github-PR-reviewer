import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHmac } from "crypto";
import { Redis } from "@upstash/redis";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import type { JobPayload } from "@contour/shared";
import { processJob } from "@contour/worker";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL || "https://placeholder.upstash.io",
  token: process.env.UPSTASH_REDIS_TOKEN || "placeholder-token",
});

// ── Signature verification (mandatory, constant-time) ─────────────────────────

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const expectedBuf = Buffer.from(expected, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Read raw body (needed for HMAC verification) ──────────────────────
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const deliveryId = req.headers.get("x-github-delivery") ?? uuidv4();
  const event = req.headers.get("x-github-event") ?? "";

  // ── 2. Verify signature ───────────────────────────────────────────────────
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── 3. Dedup on delivery ID (24h TTL) ─────────────────────────────────────
  if (process.env.UPSTASH_REDIS_URL && !process.env.UPSTASH_REDIS_URL.includes("placeholder")) {
    try {
      const dedupKey = `dedup:${deliveryId}`;
      const alreadySeen = await redis.set(dedupKey, "1", { nx: true, ex: 86400 });
      if (alreadySeen === null) {
        // Key already existed — duplicate delivery
        return NextResponse.json({ message: "Duplicate delivery, ignored" }, { status: 200 });
      }
    } catch (err) {
      console.warn("[webhook] Redis dedup check failed, continuing:", err);
    }
  }

  // ── 4. Parse payload ──────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 5. Route by event type ────────────────────────────────────────────────
  try {
    if (event === "pull_request") {
      await handlePullRequest(payload, deliveryId);
    } else if (event === "installation") {
      await handleInstallation(payload);
    } else if (event === "installation_repositories") {
      await handleInstallationRepos(payload);
    }
    // Acknowledge fast (well under GitHub's 10s timeout)
    return NextResponse.json({ message: "Accepted" }, { status: 200 });
  } catch (err) {
    console.error("[webhook] Error handling event:", err);
    // Still return 200 to prevent GitHub from disabling the webhook
    return NextResponse.json({ message: "Error queued for retry" }, { status: 200 });
  }
}

async function handlePullRequest(
  payload: Record<string, unknown>,
  deliveryId: string
): Promise<void> {
  const action = payload.action as string;
  if (!["opened", "synchronize", "reopened"].includes(action)) return;

  const pr = payload.pull_request as Record<string, unknown>;
  const repo = payload.repository as Record<string, unknown>;
  const installation = payload.installation as Record<string, unknown>;

  const jobPayload: JobPayload = {
    jobId: uuidv4(),
    installationId: Number(installation.id),
    repoFullName: String(repo.full_name),
    prNumber: Number((pr as any).number),
    headSha: String((pr as any).head?.sha),
    deliveryId,
  };

  // Ensure installation row exists in DB if configured
  if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes("placeholder")) {
    try {
      await db.from("installations").upsert(
        {
          id: jobPayload.installationId,
          account_login: String((payload.installation as any)?.account?.login ?? ""),
          preferred_provider: "gemini",
          sensitivity: "balanced",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch (err) {
      console.warn("[webhook] DB installation upsert failed, continuing:", err);
    }
  }

  // Enqueue job to Redis/QStash for async processing
  // If Redis is not configured (or in development), process in background
  const hasRedis = process.env.UPSTASH_REDIS_URL && !process.env.UPSTASH_REDIS_URL.includes("placeholder");
  if (!hasRedis || process.env.NODE_ENV === "development") {
    // Fire and forget — do not await (must respond in <2s)
    processJob(jobPayload).catch((err) =>
      console.error("[worker] Job failed:", err)
    );
  } else {
    // Production: enqueue to QStash
    await redis.lpush("contour:jobs", JSON.stringify(jobPayload));
  }
}

async function handleInstallation(payload: Record<string, unknown>): Promise<void> {
  const action = payload.action as string;
  const installation = payload.installation as Record<string, unknown>;

  if (action === "deleted") {
    // Purge all data for this installation
    await db.from("installations").delete().eq("id", Number(installation.id));
    // Cascade delete handles pr_analyses and file_hotspots via FK constraints
  } else if (action === "created") {
    await db.from("installations").upsert({
      id: Number(installation.id),
      account_login: String((installation as any).account?.login ?? ""),
      preferred_provider: "gemini",
      sensitivity: "balanced",
    }, { onConflict: "id", ignoreDuplicates: true });
  }
}

async function handleInstallationRepos(payload: Record<string, unknown>): Promise<void> {
  const action = payload.action as string;
  const installation = payload.installation as Record<string, unknown>;

  if (action === "removed") {
    const removedRepos = (payload.repositories_removed as Array<{ full_name: string }>) ?? [];
    for (const repo of removedRepos) {
      await db.from("pr_analyses")
        .delete()
        .eq("installation_id", Number(installation.id))
        .eq("repo_full_name", repo.full_name);
      await db.from("file_hotspots")
        .delete()
        .eq("installation_id", Number(installation.id))
        .eq("repo_full_name", repo.full_name);
    }
  }
}
