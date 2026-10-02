import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type AnalysisJob = {
  deliveryId: string;
  installationId: number;
  repositoryId: number;
  repoFullName: string;
  prNumber: number;
  baseSha: string;
  headSha: string;
  baseRef?: string;
  headRef?: string;
  prTitle?: string;
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  throw new Error("NEXT_PUBLIC_APP_URL is required");
}

export function analysisWorkerUrl(): string {
  return `${appBaseUrl()}/api/jobs/analyze`;
}

export async function enqueueAnalysis(job: AnalysisJob): Promise<string> {
  const destination = analysisWorkerUrl();
  const qstashBase = (process.env.QSTASH_URL || "https://qstash.upstash.io").replace(/\/+$/, "");
  const response = await fetch(`${qstashBase}/v2/publish/${destination}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${required("QSTASH_TOKEN")}`,
      "content-type": "application/json",
      "upstash-method": "POST",
      "upstash-retries": "4",
      "upstash-deduplication-id": job.deliveryId,
      "upstash-redact-fields": "body",
    },
    body: JSON.stringify(job),
    signal: AbortSignal.timeout(10_000),
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`QStash publish failed (${response.status}): ${body.slice(0, 300)}`);
  const parsed = JSON.parse(body) as { messageId?: string };
  if (!parsed.messageId) throw new Error("QStash publish response did not include a messageId");
  return parsed.messageId;
}

type QStashClaims = { iss?: string; sub?: string; exp?: number; nbf?: number; body?: string };

const decodeJson = <T>(encoded: string): T =>
  JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as T;

const equal = (left: string, right: string): boolean => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

const unpadded = (value: string): string => value.replace(/=+$/, "");

function verifyWithKey(jwt: string, key: string, rawBody: string, expectedUrl: string): boolean {
  const parts = jwt.split(".");
  if (parts.length !== 3) return false;
  const [encodedHeader, encodedClaims, signature] = parts;
  if (!encodedHeader || !encodedClaims || !signature) return false;

  try {
    const header = decodeJson<{ alg?: string }>(encodedHeader);
    if (header.alg !== "HS256") return false;
    const expectedSignature = createHmac("sha256", key)
      .update(`${encodedHeader}.${encodedClaims}`)
      .digest("base64url");
    if (!equal(unpadded(signature), unpadded(expectedSignature))) return false;

    const claims = decodeJson<QStashClaims>(encodedClaims);
    const now = Math.floor(Date.now() / 1000);
    if (claims.iss !== "Upstash" || claims.sub !== expectedUrl) return false;
    if (typeof claims.exp !== "number" || claims.exp < now) return false;
    if (typeof claims.nbf !== "number" || claims.nbf > now + 5) return false;

    const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("base64url");
    return typeof claims.body === "string" && equal(unpadded(claims.body), unpadded(bodyHash));
  } catch {
    return false;
  }
}

export function verifyQStashRequest(signature: string, rawBody: string): boolean {
  if (!signature) return false;
  const keys = [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY]
    .filter((key): key is string => Boolean(key));
  if (keys.length === 0) throw new Error("QStash signing keys are required");
  return keys.some((key) => verifyWithKey(signature, key, rawBody, analysisWorkerUrl()));
}
