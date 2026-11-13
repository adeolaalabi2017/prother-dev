/**
 * Cooldown rate limiting shared across Worker isolates.
 *
 * - On Workers: backed by the `CACHE` KV namespace, so every isolate and
 *   PoP sees the same cooldown key (KV is eventually consistent, so this is
 *   a best-effort throttle, not a hard quota).
 * - Local dev / no binding: falls back to a bounded in-memory map.
 *
 * Callers check with `isCoolingDown` before doing work and only call
 * `recordCooldown` after the action succeeds, so failed attempts don't
 * burn the user's window.
 */
type KV = import("@cloudflare/workers-types").KVNamespace;

// KV rejects expirationTtl below 60 seconds.
const KV_MIN_TTL_SEC = 60;
const MEMORY_MAX_KEYS = 5000;
const memory = new Map<string, number>();

async function getKv(): Promise<KV | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    return ((ctx.env as Record<string, unknown>).CACHE as KV | undefined) ?? null;
  } catch {
    return null;
  }
}

function pruneMemory(now: number, windowMs: number) {
  for (const [k, t] of memory) {
    if (now - t >= windowMs) memory.delete(k);
  }
  // Still full of live entries: drop the oldest (Map keeps insertion order).
  while (memory.size >= MEMORY_MAX_KEYS) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

/** True when `key` was recorded less than `windowMs` ago. */
export async function isCoolingDown(key: string, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const kv = await getKv();
  if (kv) {
    try {
      const raw = await kv.get(`rl:${key}`);
      const last = raw ? Number(raw) : NaN;
      return Number.isFinite(last) && now - last < windowMs;
    } catch {
      // KV outage: fall through to the local map rather than blocking posts.
    }
  }
  const last = memory.get(key);
  return last !== undefined && now - last < windowMs;
}

/** Starts the cooldown window for `key`. */
export async function recordCooldown(key: string, windowMs: number): Promise<void> {
  const now = Date.now();
  if (memory.size >= MEMORY_MAX_KEYS) pruneMemory(now, windowMs);
  memory.delete(key);
  memory.set(key, now);
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.put(`rl:${key}`, String(now), {
      expirationTtl: Math.max(KV_MIN_TTL_SEC, Math.ceil(windowMs / 1000)),
    });
  } catch {
    // best effort
  }
}

/**
 * The client IP as Cloudflare saw it. Only `cf-connecting-ip` is trusted:
 * Cloudflare sets it and strips client-supplied copies, whereas
 * X-Forwarded-For is attacker-controlled. Null off Cloudflare (local dev),
 * where callers should skip IP limits instead of pooling everyone together.
 */
export function trustedClientIp(req: Request): string | null {
  return req.headers.get("cf-connecting-ip")?.trim() || null;
}

/**
 * Count-based quota: allow `limit` actions per `windowMs` for `key`.
 * Returns true and records the hit when under quota; false when over.
 * Same KV-or-memory backing (and best-effort consistency) as cooldowns.
 */
export async function consumeQuota(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const kvKey = `rq:${key}`;
  const kv = await getKv();
  let hits: number[] = [];
  let fromKv = false;
  if (kv) {
    try {
      const raw = await kv.get(kvKey);
      hits = raw ? (JSON.parse(raw) as number[]).filter((t) => Number.isFinite(t)) : [];
      fromKv = true;
    } catch {
      // KV outage: fall through to the local map.
    }
  }
  if (!fromKv) {
    const raw = quotaMemory.get(kvKey);
    hits = raw ? [...raw] : [];
  }
  hits = hits.filter((t) => now - t < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  if (quotaMemory.size >= MEMORY_MAX_KEYS) quotaMemory.delete(quotaMemory.keys().next().value!);
  quotaMemory.set(kvKey, hits);
  if (kv) {
    try {
      await kv.put(kvKey, JSON.stringify(hits), {
        expirationTtl: Math.max(KV_MIN_TTL_SEC, Math.ceil(windowMs / 1000)),
      });
    } catch {
      // best effort
    }
  }
  return true;
}
const quotaMemory = new Map<string, number[]>();

/** SHA-256 hex of the client IP, so raw addresses never sit in KV keys. */
export async function hashIp(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`prother:${ip}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
