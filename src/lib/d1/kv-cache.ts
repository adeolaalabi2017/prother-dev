/**
 * Read-through JSON cache on the `CACHE` KV namespace, for D1 aggregates that
 * scan many rows and tolerate a few minutes of staleness.
 *
 * Budget: each key costs one KV write per TTL on the free tier (1,000/day
 * across the namespace), so keep TTLs in minutes and keys few.
 *
 * Any KV failure falls through to the loader. A null result means "no data"
 * and is never cached, so an empty preview D1 cannot poison the key.
 */
import { getKv } from "@/lib/rate-limit";

/**
 * Loads currently running in this isolate, by key. Callers that miss the cache
 * at the same moment (the homepage reads one bundle from three sections at
 * once) share a single load instead of each running the full D1 aggregate.
 * KV is eventually consistent and the first write is not visible to the other
 * callers yet, so without this every concurrent caller pays for the scan.
 */
const inflight = new Map<string, Promise<unknown>>();

export function kvCached<T>(
  key: string,
  ttlSec: number,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const running = inflight.get(key) as Promise<T | null> | undefined;
  if (running) return running;
  const p = kvReadThrough(key, ttlSec, load).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p;
}

async function kvReadThrough<T>(
  key: string,
  ttlSec: number,
  load: () => Promise<T | null>,
): Promise<T | null> {
  const kv = await getKv();
  if (kv) {
    try {
      const raw = await kv.get(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // KV outage or corrupt entry: serve from the loader.
    }
  }
  const value = await load();
  if (kv && value !== null) {
    try {
      await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSec });
    } catch {
      // Write limit or outage: the value is still good for this request.
    }
  }
  return value;
}
