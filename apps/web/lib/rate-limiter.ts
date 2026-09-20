import "server-only";

// ---------------------------------------------------------------------------
// Atomic rate limiter using Redis INCR + EXPIRE.
//
// Security note: A naïve read-then-compare-then-write implementation races
// when multiple webhook deliveries arrive concurrently for the same installation
// (e.g. several PRs pushed at once). Using Redis INCR makes the increment
// atomic regardless of concurrency — no two requests can both read "29" and
// both decide they are under the limit.
//
// This module works with any Redis client that exposes `incr` and `expire`
// (ioredis, upstash/redis, node-redis). Wire in your client below.
// ---------------------------------------------------------------------------

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; retryAfter: number };

export type RateLimiter = {
  /**
   * Checks and increments the counter for the given key.
   * Returns `allowed: true` when the request is within the limit,
   * `allowed: false` with a `retryAfter` (seconds) when it is not.
   */
  check(key: string): Promise<RateLimitResult>;
};

export type RedisLike = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  ttl(key: string): Promise<number>;
};

/**
 * Creates a rate limiter that allows `maxRequests` per `windowSeconds` window
 * for each unique key (typically `installation:<id>`).
 *
 * The window is sliding per-key rather than global — each key gets its own
 * independent counter that resets `windowSeconds` after the *first* request
 * in that window.
 *
 * Example:
 *   const limiter = createRateLimiter(redis, { maxRequests: 30, windowSeconds: 3600 });
 *   const result = await limiter.check(`installation:${installationId}`);
 *   if (!result.allowed) {
 *     return Response.json({ error: "rate limited" }, { status: 429,
 *       headers: { "Retry-After": String(result.retryAfter) } });
 *   }
 */
export function createRateLimiter(
  redis: RedisLike,
  options: { maxRequests: number; windowSeconds: number },
): RateLimiter {
  const { maxRequests, windowSeconds } = options;

  return {
    async check(key: string): Promise<RateLimitResult> {
      // INCR is atomic — the counter is incremented exactly once regardless
      // of how many concurrent callers reach this point simultaneously.
      const count = await redis.incr(key);

      if (count === 1) {
        // First request in this window — set the expiry now.
        // If this call fails the key will never expire (leak), so we let
        // the error surface rather than swallowing it.
        await redis.expire(key, windowSeconds);
      }

      if (count > maxRequests) {
        // Already over the limit. Tell the caller how long to wait.
        const ttl = await redis.ttl(key);
        return { allowed: false, retryAfter: Math.max(ttl, 0) };
      }

      const resetAt = new Date(Date.now() + windowSeconds * 1000);
      return { allowed: true, remaining: maxRequests - count, resetAt };
    },
  };
}
