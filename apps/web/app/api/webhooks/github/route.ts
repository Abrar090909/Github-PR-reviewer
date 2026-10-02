import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enqueueAnalysis, type AnalysisJob } from "@/lib/hosted/queue";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

function verifySignature(secret: string, body: string, signature: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | undefined =>
  typeof value === "object" && value !== null ? (value as RecordValue) : undefined;
const string = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const number = (value: unknown): number | undefined => typeof value === "number" ? value : undefined;

async function addRepositories(installationId: number, values: unknown[]): Promise<void> {
  const rows = values.flatMap((value) => {
    const repository = record(value);
    const repositoryId = number(repository?.id);
    const fullName = string(repository?.full_name);
    if (!repositoryId || !fullName) return [];
    return [{
      installation_id: installationId,
      repository_id: repositoryId,
      repo_full_name: fullName,
      private: repository?.private === true,
      added_at: new Date().toISOString(),
    }];
  });
  if (rows.length === 0) return;
  const { error } = await db.from("installation_repositories").upsert(rows);
  if (error) throw error;
}

async function handleInstallation(payload: RecordValue): Promise<void> {
  const installation = record(payload.installation);
  const account = record(installation?.account);
  const id = number(installation?.id);
  const accountLogin = string(account?.login);
  if (!id || !accountLogin) throw new Error("installation payload is missing its identity");

  const action = string(payload.action);
  if (action === "deleted") {
    const { error } = await db.from("installations").delete().eq("id", id);
    if (error) throw error;
    return;
  }

  const { error } = await db.from("installations").upsert({
    id,
    account_id: number(account?.id),
    account_login: accountLogin,
    account_type: string(account?.type),
    repository_selection: string(installation?.repository_selection),
    suspended_at: action === "suspend" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  const repositories = Array.isArray(payload.repositories) ? payload.repositories : [];
  await addRepositories(id, repositories);
}

async function handleInstallationRepositories(payload: RecordValue): Promise<void> {
  const installationId = number(record(payload.installation)?.id);
  if (!installationId) throw new Error("repository installation event has no installation id");
  await addRepositories(
    installationId,
    Array.isArray(payload.repositories_added) ? payload.repositories_added : [],
  );

  const removedIds = (Array.isArray(payload.repositories_removed) ? payload.repositories_removed : [])
    .map((value) => number(record(value)?.id))
    .filter((value): value is number => value !== undefined);
  if (removedIds.length === 0) return;

  const { error } = await db
    .from("installation_repositories")
    .delete()
    .eq("installation_id", installationId)
    .in("repository_id", removedIds);
  if (error) throw error;

  const { error: analysesError } = await db
    .from("pr_analyses")
    .delete()
    .eq("installation_id", installationId)
    .in("repository_id", removedIds);
  if (analysesError) throw analysesError;
}

function toAnalysisJob(payload: RecordValue, deliveryId: string): AnalysisJob | undefined {
  const installationId = number(record(payload.installation)?.id);
  const repository = record(payload.repository);
  const pullRequest = record(payload.pull_request);
  const base = record(pullRequest?.base);
  const head = record(pullRequest?.head);
  const repositoryId = number(repository?.id);
  const repoFullName = string(repository?.full_name);
  const prNumber = number(pullRequest?.number) ?? number(payload.number);
  const baseSha = string(base?.sha);
  const headSha = string(head?.sha);
  if (!installationId || !repositoryId || !repoFullName || !prNumber || !baseSha || !headSha) return undefined;

  return {
    deliveryId,
    installationId,
    repositoryId,
    repoFullName,
    prNumber,
    baseSha,
    headSha,
    baseRef: string(base?.ref),
    headRef: string(head?.ref),
    prTitle: string(pullRequest?.title),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  if (!verifySignature(secret, rawBody, req.headers.get("x-hub-signature-256") ?? ""))
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let payload: RecordValue;
  try {
    const value = record(JSON.parse(rawBody));
    if (!value) throw new Error("not an object");
    payload = value;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = req.headers.get("x-github-event") ?? "";
  const deliveryId = req.headers.get("x-github-delivery") ?? "";
  if (!deliveryId) return NextResponse.json({ error: "missing delivery id" }, { status: 400 });

  try {
    if (event === "installation") await handleInstallation(payload);
    if (event === "installation_repositories") await handleInstallationRepositories(payload);

    const actionablePullRequest =
      event === "pull_request" && ["opened", "reopened", "synchronize"].includes(string(payload.action) ?? "");
    if (actionablePullRequest) {
      const job = toAnalysisJob(payload, deliveryId);
      if (!job) return NextResponse.json({ error: "incomplete pull request payload" }, { status: 400 });

      const redis = getRedis();
      const dedupKey = `github-delivery:${deliveryId}`;
      const accepted = await redis.set(dedupKey, "1", { nx: true, ex: 86_400 });
      if (accepted) {
        try {
          await enqueueAnalysis(job);
        } catch (error) {
          await redis.del(dedupKey);
          throw error;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[github-webhook]", error);
    return NextResponse.json({ error: "event processing failed" }, { status: 500 });
  }
}
