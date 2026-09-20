import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext → Cloudflare configuration.
// Default: no cache overrides (ISR/SSG revalidation cache is in-memory per
// isolate). Upgrade path (DEPLOY.md → "Caching"): wire kvIncrementalCache or
// r2IncrementalCache once a KV/R2 binding exists.
export default defineCloudflareConfig({});
