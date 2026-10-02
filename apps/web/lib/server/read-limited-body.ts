import "server-only";
import type { NextRequest } from "next/server";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readLimitedBody(req: NextRequest, maxBytes: number): Promise<string> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

export function hasJsonContentType(req: NextRequest): boolean {
  return /^application\/(?:json|[a-z0-9!#$&^_.+-]+\+json)(?:\s*;|$)/i.test(
    req.headers.get("content-type") ?? "",
  );
}
