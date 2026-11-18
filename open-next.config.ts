import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

// OpenNext → Cloudflare configuration.
//
// ISR/SSG pages are stored in R2 (binding NEXT_INC_CACHE_R2_BUCKET) so every
// data centre shares one rendered copy, with a per-colo Cache API layer in
// front to keep R2 reads down. R2 rather than KV: ~900 tool pages crawled
// daily would exceed the KV free tier's 1,000 writes/day.
//
// enableCacheInterception serves ISR/SSG cache hits without booting the Next
// server, which is most of the per-request CPU on the Workers Free plan
// (10ms limit). memoryQueue dedupes background revalidations per isolate;
// no tag cache is needed because the app never calls revalidatePath/Tag.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: memoryQueue,
  enableCacheInterception: true,
});
