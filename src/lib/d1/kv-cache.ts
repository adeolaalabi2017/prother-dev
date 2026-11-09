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

export async function kvCached<T>(
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
