import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { rateLimits } from "./db/schema";

/**
 * Fixed-window rate limiter backed by the database so it holds across
 * serverless instances. Returns whether the call is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  const db = await getDb();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const hashedKey = createHash("sha256").update(key).digest("hex");

  const [row] = await db
    .insert(rateLimits)
    .values({ key: hashedKey, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });

  // Opportunistic cleanup of stale windows (cheap, indexed by primary key prefix).
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now - 24 * 3600 * 1000)));
  }

  const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return { ok: row.count <= limit, retryAfter };
}
