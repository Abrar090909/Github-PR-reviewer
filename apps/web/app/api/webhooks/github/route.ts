import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Security: raw body is read FIRST, signature is verified BEFORE any JSON.parse
// This is the correct order — calling req.json() first loses the raw bytes
// and makes HMAC verification unreliable or bypassed.
// ---------------------------------------------------------------------------

const GITHUB_SIGNATURE_HEADER = "x-hub-signature-256";
const GITHUB_EVENT_HEADER = "x-github-event";
const GITHUB_DELIVERY_HEADER = "x-github-delivery";

function verifySignature(secret: string, body: string, signature: string): boolean {
  if (!signature.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const expectedBuf = Buffer.from(`sha256=${expected}`, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");

  // Length check before timingSafeEqual — comparing buffers of different
  // lengths would throw and reveal information about the expected length.
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Read raw body FIRST — before any JSON parsing.
  const rawBody = await req.text();

  const signature = req.headers.get(GITHUB_SIGNATURE_HEADER) ?? "";
  const event = req.headers.get(GITHUB_EVENT_HEADER) ?? "";
  const delivery = req.headers.get(GITHUB_DELIVERY_HEADER) ?? "";

  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] GITHUB_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  }

  // 2. Verify HMAC signature using the raw string body.
  if (!verifySignature(webhookSecret, rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // 3. Only now is it safe to parse the body as JSON.
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // 4. Acknowledge fast — GitHub expects a 2xx within 10 s.
  //    Hand off to background processing; do not block the response.
  void handleEvent(event, delivery, payload);

  return NextResponse.json({ ok: true }, { status: 200 });
}

async function handleEvent(
  event: string,
  delivery: string,
  payload: unknown,
): Promise<void> {
  // Accepted events for Contour analysis.
  if (event !== "pull_request") return;

  const pr = payload as Record<string, unknown>;
  const action = pr["action"];

  // Only process actionable PR events.
  if (action !== "opened" && action !== "synchronize" && action !== "reopened") return;

  console.info(`[webhook] ${delivery} — pull_request.${action}`);

  // TODO: enqueue job to worker (QStash / Upstash / Vercel Queue) with the
  //       pull_request payload. The worker must also validate the QStash
  //       callback signature (Upstash-Signature header) before processing.
}
