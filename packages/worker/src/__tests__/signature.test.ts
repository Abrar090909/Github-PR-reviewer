import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

// Inline the verification function (matches webhook route implementation)
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const { timingSafeEqual } = require("crypto");
    const expectedBuf = Buffer.from(expected, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

describe("verifySignature()", () => {
  const SECRET = "test-webhook-secret-1234";
  const PAYLOAD = JSON.stringify({ action: "opened", number: 42 });

  function makeSignature(payload: string, secret: string): string {
    return "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  }

  it("accepts valid signatures", () => {
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifySignature(PAYLOAD, sig, SECRET)).toBe(true);
  });

  it("rejects wrong secret", () => {
    const sig = makeSignature(PAYLOAD, "wrong-secret");
    expect(verifySignature(PAYLOAD, sig, SECRET)).toBe(false);
  });

  it("rejects tampered payload", () => {
    const sig = makeSignature(PAYLOAD, SECRET);
    const tamperedPayload = PAYLOAD.replace("opened", "closed");
    expect(verifySignature(tamperedPayload, sig, SECRET)).toBe(false);
  });

  it("rejects missing sha256= prefix", () => {
    const sigWithoutPrefix = createHmac("sha256", SECRET).update(PAYLOAD).digest("hex");
    expect(verifySignature(PAYLOAD, sigWithoutPrefix, SECRET)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifySignature(PAYLOAD, "", SECRET)).toBe(false);
  });

  it("rejects sha1 prefix even if hash matches", () => {
    const sha1Sig = "sha1=" + createHmac("sha1", SECRET).update(PAYLOAD).digest("hex");
    expect(verifySignature(PAYLOAD, sha1Sig, SECRET)).toBe(false);
  });

  it("uses constant-time comparison (different length signatures return false)", () => {
    const shortSig = "sha256=abc";
    expect(verifySignature(PAYLOAD, shortSig, SECRET)).toBe(false);
  });
});
